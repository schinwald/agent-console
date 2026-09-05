import { execFileSync } from 'node:child_process';
import type { AgentMetadata } from '@agent-console/protocol';
import { logger } from './logger';

export type TmuxContext = { session?: string; window?: string; pane?: string };
export type TmuxBinding = TmuxContext;

type TmuxPane = TmuxBinding & { pid: number };

const debugTmux = (message: string, fields: Record<string, unknown> = {}): void => {
  logger.debug('tmux', message, fields);
};

export const resolveTmuxSocket = (
  env: Record<string, string | undefined> = process.env,
  uid: number = process.getuid?.() ?? 0,
): string => env.AGENT_CONSOLE_TMUX_SOCKET ?? `/private/tmp/tmux-${uid}/default`;

const tmuxArgs = (args: string[]): string[] => ['-S', resolveTmuxSocket(), ...args];

type TmuxCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  success: boolean;
  error?: string;
};

const runTmuxCommand = (args: string[]): TmuxCommandResult => {
  try {
    const result = Bun.spawnSync(['tmux', ...tmuxArgs(args)], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
    const decode = (output: Uint8Array) => new TextDecoder().decode(output).trim();
    return {
      stdout: decode(result.stdout),
      stderr: decode(result.stderr),
      exitCode: result.exitCode,
      success: result.success,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: '',
      exitCode: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const runTmux = (args: string[]): void => {
  const resolvedArgs = tmuxArgs(args);
  const command = `tmux ${resolvedArgs.join(' ')}`;
  const result = runTmuxCommand(args);
  const fields = { command, ...result };
  if (result.success) {
    logger.info('tmux', 'command succeeded', fields);
  } else {
    logger.error('tmux', 'command failed', fields);
  }
};

const processParent = (pid: number): number | undefined => {
  try {
    const value = execFileSync('ps', ['-p', String(pid), '-o', 'ppid='], { encoding: 'utf8' }).trim();
    const parent = Number(value);
    return Number.isInteger(parent) && parent > 0 ? parent : undefined;
  } catch {
    return undefined;
  }
};

export const isProcessInPane = (
  pid: number,
  panePid: number,
  parentOf: (pid: number) => number | undefined = processParent,
): boolean => {
  const seen = new Set<number>();
  let current: number | undefined = pid;
  while (current && !seen.has(current)) {
    if (current === panePid) return true;
    seen.add(current);
    current = parentOf(current);
  }
  return false;
};

const listPanes = (): TmuxPane[] => {
  const args = ['list-panes', '-a', '-F', '#{pane_pid}\t#{session_name}\t#{window_id}\t#{pane_id}'];
  const result = runTmuxCommand(args);
  if (!result.success) {
    logger.warn('tmux', 'pane discovery failed', { command: `tmux ${tmuxArgs(args).join(' ')}`, ...result });
    return [];
  }
  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [pid, session, window, pane] = line.split('\t');
      return { pid: Number(pid), session, window, pane };
    })
    .filter((pane) => Number.isInteger(pane.pid) && pane.pid > 0);
};

export const discoverTmuxBindings = (agents: Iterable<AgentMetadata>): Map<string, TmuxBinding> => {
  const list = [...agents];
  const panes = listPanes();
  debugTmux('discovered panes', { socket: resolveTmuxSocket(), panes });
  const parents = new Map<number, number | undefined>();
  const parentOf = (pid: number): number | undefined => {
    if (!parents.has(pid)) parents.set(pid, processParent(pid));
    return parents.get(pid);
  };
  const bindings = new Map<string, TmuxBinding>();
  for (const agent of list) {
    if (typeof agent.pid !== 'number') continue;
    const pane = panes.find((candidate) => isProcessInPane(agent.pid, candidate.pid, parentOf));
    if (pane) bindings.set(agent.id, { session: pane.session, window: pane.window, pane: pane.pane });
  }
  debugTmux('reconciled bindings', { agentPids: list.map((agent) => ({ id: agent.id, pid: agent.pid })), bindings: [...bindings] });
  return bindings;
};

export const discoverTmuxBinding = (agent: AgentMetadata): TmuxBinding | undefined =>
  discoverTmuxBindings([agent]).get(agent.id);

export const refreshTmuxBindings = (agents: Iterable<AgentMetadata>): AgentMetadata[] => {
  const list = [...agents];
  const bindings = discoverTmuxBindings(list);
  return list.map((agent) => {
    const binding = bindings.get(agent.id);
    return binding ? { ...agent, ...binding } : agent;
  });
};

export const navigateToAgent = (agent: AgentMetadata): void => {
  if (!agent.tmuxSession || !agent.tmuxWindow) return;
  // launchd has no TMUX client context; target the session directly.
  runTmux(['select-window', '-t', `${agent.tmuxSession}:${agent.tmuxWindow}`]);
  if (agent.tmuxPane) {
    runTmux(['select-pane', '-t', `${agent.tmuxSession}:${agent.tmuxWindow}.${agent.tmuxPane}`]);
  }
};

export const readActiveContext = (): TmuxContext => {
  const args = ['display-message', '-p', '#{session_name}\t#{window_id}\t#{pane_id}'];
  const result = runTmuxCommand(args);
  if (!result.success) {
    logger.error('tmux', 'active context lookup failed', { command: `tmux ${tmuxArgs(args).join(' ')}`, ...result });
    throw new Error(
      result.exitCode === null
        ? 'tmux active context lookup could not start'
        : `tmux active context lookup failed with exit code ${result.exitCode}`,
    );
  }
  const [session, window, pane] = result.stdout.split('\t');
  return { session, window, pane };
};

export const matchesTmuxContext = (binding: TmuxBinding, context: TmuxContext): boolean =>
  binding.session === context.session && binding.window === context.window;

export const findActiveAgent = (agents: Iterable<AgentMetadata>, context: TmuxContext): AgentMetadata | undefined =>
  [...agents].find(
    (agent) => agent.tmuxSession === context.session && agent.tmuxWindow === context.window,
  );

export const syncActiveAgent = (agents: Iterable<AgentMetadata>, sendActive: (id: string | null) => void): void => {
  const context = readActiveContext();
  sendActive(findActiveAgent(agents, context)?.id ?? null);
};
