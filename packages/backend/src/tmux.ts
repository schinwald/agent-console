import { execFileSync } from 'node:child_process';
import type { AgentMetadata } from '@agent-console/protocol';

export type TmuxContext = { session?: string; window?: string; pane?: string };
export type TmuxBinding = TmuxContext;

type TmuxPane = TmuxBinding & { pid: number };

const debugTmux = (message: string): void => {
  if (process.env.AGENT_CONSOLE_DEBUG === '1') process.stderr.write(`[agent-console:debug] ${message}\n`);
};

export const resolveTmuxSocket = (
  env: Record<string, string | undefined> = process.env,
  uid: number = process.getuid?.() ?? 0,
): string => env.AGENT_CONSOLE_TMUX_SOCKET ?? `/private/tmp/tmux-${uid}/default`;

const tmuxArgs = (args: string[]): string[] => ['-S', resolveTmuxSocket(), ...args];

const runTmux = (args: string[]): void => {
  const resolvedArgs = tmuxArgs(args);
  const command = `tmux ${resolvedArgs.join(' ')}`;
  try {
    const stderr = execFileSync('tmux', resolvedArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    process.stderr.write(`[agent-console] tmux success command=${JSON.stringify(command)} stderr=${JSON.stringify(stderr)}\n`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[agent-console] tmux failure command=${JSON.stringify(command)} error=${JSON.stringify(detail)}\n`);
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
  try {
    const output = execFileSync(
      'tmux',
      tmuxArgs(['list-panes', '-a', '-F', '#{pane_pid}\t#{session_name}\t#{window_id}\t#{pane_id}']),
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [pid, session, window, pane] = line.split('\t');
        return { pid: Number(pid), session, window, pane };
      })
      .filter((pane) => Number.isInteger(pane.pid) && pane.pid > 0);
  } catch (error) {
    process.stderr.write(`[agent-console] tmux pane discovery failed error=${JSON.stringify(error instanceof Error ? error.message : String(error))}\n`);
    return [];
  }
};

export const discoverTmuxBindings = (agents: Iterable<AgentMetadata>): Map<string, TmuxBinding> => {
  const panes = listPanes();
  debugTmux(`socket=${resolveTmuxSocket()} panes=${JSON.stringify(panes)}`);
  const parents = new Map<number, number | undefined>();
  const parentOf = (pid: number): number | undefined => {
    if (!parents.has(pid)) parents.set(pid, processParent(pid));
    return parents.get(pid);
  };
  const bindings = new Map<string, TmuxBinding>();
  for (const agent of agents) {
    if (typeof agent.pid !== 'number') continue;
    const pane = panes.find((candidate) => isProcessInPane(agent.pid, candidate.pid, parentOf));
    if (pane) bindings.set(agent.id, { session: pane.session, window: pane.window, pane: pane.pane });
  }
  debugTmux(`agentPids=${JSON.stringify(list.map((agent) => ({ id: agent.id, pid: agent.pid })))} bindings=${JSON.stringify([...bindings])}`);
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
  const output = execFileSync('tmux', tmuxArgs(['display-message', '-p', '#{session_name}\t#{window_id}\t#{pane_id}']), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  const [session, window, pane] = output.split('\t');
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
