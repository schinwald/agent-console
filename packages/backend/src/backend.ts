import { createServer, type Socket } from 'node:net';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { ViewStateStore, type StateChange, type Submission } from './store';
import type { AgentMetadata, ManagerCommand, ManagerMessage } from '@agent-console/protocol';
import { SubmissionDeduper } from './deduper';
import { TmuxBindingIndex } from './bindings';
import { discoverTmuxBinding, discoverTmuxBindings, matchesTmuxContext, navigateToAgent, type TmuxContext } from './tmux';
import { findUntrackedPiProcesses, listPiPids } from './untracked-pi';
import { profile } from '@agent-console/client/profiler';
import { logger } from './logger';

export const communicationSocket =
  process.env.PI_MANAGER_SOCKET ?? join(homedir(), 'Library', 'Application Support', 'AgentConsole', 'communication.sock');

type AgentCreated = AgentMetadata;
type Command = ManagerCommand;
type Message = ManagerMessage;

const store = new ViewStateStore();
const agents = new Map<string, AgentMetadata>();
const bindings = new TmuxBindingIndex();
const registryPath = process.env.PI_MANAGER_REGISTRY ?? join(homedir(), '.pi', 'manager', 'instances.json');
try {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as { instances?: Record<string, AgentMetadata & { status?: string }> };
  for (const agent of Object.values(registry.instances ?? {})) {
    if (agent.status !== 'closed') agents.set(agent.id, agent);
  }
} catch {
  // Lifecycle events will populate the backend when the registry is unavailable.
}
const subscribers = new Map<Socket, Set<string>>();
const submissionDeduper = new SubmissionDeduper();
let activeTmuxContext: TmuxContext | null = null;
let reportedUntrackedPiPids = ''; 
function send(socket: Socket, message: Message): void {
  if (!socket.destroyed) socket.write(`${JSON.stringify(message)}\n`);
}

function broadcast(change: StateChange): void {
  const message: Message = {
    type: 'state-changed',
    state: change.state,
    revision: change.revision,
  };
  for (const [socket, topics] of subscribers) {
    if (topics.has('state')) send(socket, message);
  }
}

function broadcastSubmission(submission: Submission): void {
  const message: Message = {
    type: 'submission',
    agentId: submission.agentId,
    eventId: submission.eventId,
  };
  for (const [socket, topics] of subscribers) {
    if (topics.has('submissions')) send(socket, message);
  }
}

function broadcastLifecycle(message: Message): void {
  for (const [socket, topics] of subscribers) {
    if (topics.has('lifecycle')) send(socket, message);
  }
}

function refreshBindings(): void {
  bindings.reconcile(agents.values(), discoverTmuxBindings);
  const untracked = findUntrackedPiProcesses(
    [...agents.values()].flatMap((agent) => typeof agent.pid === 'number' ? [agent.pid] : []),
    listPiPids(),
    (pid) => discoverTmuxBinding({ id: `untracked:${pid}`, pid }),
  );
  const signature = JSON.stringify(untracked);
  if (signature !== reportedUntrackedPiPids) {
    reportedUntrackedPiPids = signature;
    if (untracked.length > 0) {
      logger.warn('backend', 'untracked Pi processes', {
        processes: untracked,
        remediation: 'restart affected Pi so pi-agent-lifecycle registers it',
      });
    }
  }
}

function withBinding(agent: AgentMetadata): AgentMetadata {
  const binding = bindings.get(agent.id);
  if (!binding) return agent;
  return {
    ...agent,
    tmuxSession: binding.session,
    tmuxWindow: binding.window,
    tmuxPane: binding.pane,
  };
}

// Registry bootstrap precedes server startup, so existing agents are navigable immediately.
refreshBindings();

function activateIfCurrentTmuxAgent(agentId: string): void {
  const binding = bindings.get(agentId);
  const matches = Boolean(binding && activeTmuxContext && matchesTmuxContext(binding, activeTmuxContext));
  logger.debug('backend', 'lifecycle activation', { agentId, binding, activeTmuxContext, matches });
  if (matches) store.setActive(agentId);
}

function broadcastAgentCreated(agent: AgentCreated): void {
  agents.set(agent.id, agent);
  refreshBindings();
  activateIfCurrentTmuxAgent(agent.id);
  broadcastLifecycle({ type: 'agent.created', agent: withBinding(agent) });
}

function searchAgents(query: string): AgentMetadata[] {
  const normalized = query.trim().toLowerCase();
  return [...agents.values()].filter((agent) => {
    if (!normalized) return true;
    return Object.values(agent)
      .filter((value) => ['string', 'number', 'boolean'].includes(typeof value))
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  }).map(withBinding);
}

store.subscribe(broadcast);
store.onSubmission((submission) => {
  broadcastSubmission(submission);
  const agent = agents.get(submission.agentId);
  const boundAgent = agent ? withBinding(agent) : undefined;
  logger.info('backend', 'submission received', {
    agentId: submission.agentId,
    eventId: submission.eventId,
    binding: boundAgent
      ? { session: boundAgent.tmuxSession, window: boundAgent.tmuxWindow, pane: boundAgent.tmuxPane, pid: boundAgent.pid }
      : null,
  });
  if (boundAgent) navigateToAgent(boundAgent);
});

function handleCommand(socket: Socket, command: Command): void {
  try {
    switch (command.type) {
      case 'subscribe': {
        subscribers.set(socket, new Set(command.topics ?? ['state']));
        const snapshot = store.snapshot();
        send(socket, {
          type: 'state-snapshot',
          state: snapshot.state,
          revision: snapshot.revision,
        });
        return;
      }
      case 'agent.created':
        if (command.data?.id) broadcastAgentCreated(command.data);
        break;
      case 'instance.updated':
        if (command.data?.id) {
          const current = agents.get(command.data.id);
          agents.set(command.data.id, { ...current, ...command.data });
          refreshBindings();
          activateIfCurrentTmuxAgent(command.data.id);
          broadcastLifecycle({ type: command.type, data: withBinding(agents.get(command.data.id) as AgentMetadata) });
        }
        break;
      case 'instance.closed':
        if (command.data?.id) {
          agents.delete(command.data.id);
          bindings.remove(command.data.id);
          broadcastLifecycle({ type: command.type, data: command.data as Record<string, unknown> });
        }
        break;
      case 'search':
        send(socket, {
          type: 'search-results',
          requestId: command.requestId,
          query: command.query ?? '',
          agents: searchAgents(command.query ?? ''),
        });
        return;
      case 'get-state': {
        const snapshot = store.snapshot();
        send(socket, {
          type: 'state-snapshot',
          state: snapshot.state,
          revision: snapshot.revision,
        });
        return;
      }
      case 'set-focus':
        store.setFocus(command.id ?? null);
        break;
      case 'clear-focus':
        store.clearFocus();
        break;
      case 'set-active':
        store.setActive(command.id ?? null);
        break;
      case 'sync-tmux-active': {
        refreshBindings();
        activeTmuxContext = {
          session: command.data?.tmuxSession,
          window: command.data?.tmuxWindow,
          pane: command.data?.tmuxPane,
        };
        const activeId = [...bindings.all()].find(([, binding]) =>
          matchesTmuxContext(binding, activeTmuxContext as TmuxContext),
        )?.[0] ?? null;
        logger.debug('backend', 'synced tmux active agent', { activeTmuxContext, activeId });
        store.setActive(activeId);
        break;
      }
      case 'clear-active':
        store.clearActive();
        break;
      case 'set-submission': {
        if (!command.id || !command.eventId) throw new Error('submission requires id and eventId');
        if (!submissionDeduper.isDuplicate(command.eventId)) {
          store.submit({ agentId: command.id, eventId: command.eventId });
        }
        break;
      }
      default:
        throw new Error('unknown command');
    }
    send(socket, { type: 'ack', requestId: command.requestId, ok: true });
  } catch (error) {
    send(socket, {
      type: 'error',
      requestId: command.requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'invalid command',
    });
  }
}

if (existsSync(communicationSocket)) unlinkSync(communicationSocket);
mkdirSync(dirname(communicationSocket), { recursive: true });

const server = createServer((socket) => {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
      try {
        const command = JSON.parse(line) as Command;
        profile(`backend.command.${command.type}`, () => handleCommand(socket, command));
      } catch {
        send(socket, { type: 'error', ok: false, error: 'invalid JSON' });
      }
    }
  });
  socket.on('close', () => subscribers.delete(socket));
  socket.on('error', () => subscribers.delete(socket));
});

server.listen(communicationSocket, () => {
  logger.info('backend', 'started', { socket: communicationSocket });
});

function shutdown(): void {
  for (const socket of subscribers.keys()) socket.destroy();
  server.close(() => {
    if (existsSync(communicationSocket)) unlinkSync(communicationSocket);
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
