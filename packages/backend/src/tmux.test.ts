import { afterEach, describe, expect, test } from 'bun:test';
import { isProcessInPane, navigateToAgent, resolveTmuxSocket } from './tmux';

const originalSpawnSync = Bun.spawnSync;

const captureTmuxLogs = (operation: () => void): Array<Record<string, unknown>> => {
  const writes: string[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    writes.push(chunk.toString());
    return true;
  }) as typeof process.stderr.write;
  try {
    operation();
  } finally {
    process.stderr.write = originalWrite;
  }
  return writes.map((line) => JSON.parse(line) as Record<string, unknown>);
};

const tmuxResult = (success: boolean, exitCode: number, stdout: string, stderr: string) => ({
  success,
  exitCode,
  stdout: new TextEncoder().encode(stdout),
  stderr: new TextEncoder().encode(stderr),
}) as ReturnType<typeof Bun.spawnSync>;

afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
});

describe('tmux process binding', () => {
  const parentLookup = (parents: Record<number, number | undefined>) =>
    (pid: number): number | undefined => parents[pid];

  test('resolves default and overridden tmux sockets', () => {
    expect(resolveTmuxSocket({}, 502)).toBe('/private/tmp/tmux-502/default');
    expect(resolveTmuxSocket({ AGENT_CONSOLE_TMUX_SOCKET: '/tmp/custom-tmux.sock' }, 502)).toBe('/tmp/custom-tmux.sock');
  });

  test('matches a descendant process to its pane process', () => {
    expect(
      isProcessInPane(42, 10, parentLookup({ 42: 20, 20: 10 })),
    ).toBe(true);
  });

  test('rejects a process from another pane', () => {
    expect(
      isProcessInPane(42, 10, parentLookup({ 42: 20, 20: 1 })),
    ).toBe(false);
  });

  test('stops on process ancestry cycles and invalid ids', () => {
    expect(isProcessInPane(42, 10, parentLookup({ 42: 42 }))).toBe(false);
    expect(isProcessInPane(0, 10, parentLookup({}))).toBe(false);
  });

  test('captures tmux stdout, stderr, and exit details on success', () => {
    const calls: unknown[][] = [];
    Bun.spawnSync = ((command: string[], options: unknown) => {
      calls.push([command, options]);
      return tmuxResult(true, 0, 'selected window\n', 'tmux warning\n');
    }) as typeof Bun.spawnSync;

    const logs = captureTmuxLogs(() => {
      navigateToAgent({ id: 'agent-1', tmuxSession: 'project', tmuxWindow: '@4' });
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([
      expect.arrayContaining(['tmux', 'select-window', '-t', 'project:@4']),
      { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
    ]);
    expect(logs).toEqual([
      expect.objectContaining({
        level: 'info',
        component: 'tmux',
        message: 'command succeeded',
        stdout: 'selected window',
        stderr: 'tmux warning',
        exitCode: 0,
        success: true,
      }),
    ]);
  });

  test('reports tmux stderr and exit details on failure', () => {
    Bun.spawnSync = (() => tmuxResult(false, 1, '', 'no server running\n')) as typeof Bun.spawnSync;

    const logs = captureTmuxLogs(() => {
      navigateToAgent({ id: 'agent-1', tmuxSession: 'project', tmuxWindow: '@4' });
    });

    expect(logs).toEqual([
      expect.objectContaining({
        level: 'error',
        component: 'tmux',
        message: 'command failed',
        stdout: '',
        stderr: 'no server running',
        exitCode: 1,
        success: false,
      }),
    ]);
  });

  test('reports an unavailable tmux executable without throwing', () => {
    Bun.spawnSync = (() => {
      throw new Error('Executable not found in $PATH: "tmux"');
    }) as typeof Bun.spawnSync;

    const logs = captureTmuxLogs(() => {
      navigateToAgent({ id: 'agent-1', tmuxSession: 'project', tmuxWindow: '@4' });
    });

    expect(logs).toEqual([
      expect.objectContaining({
        level: 'error',
        component: 'tmux',
        message: 'command failed',
        stdout: '',
        stderr: '',
        exitCode: null,
        success: false,
        error: 'Executable not found in $PATH: "tmux"',
      }),
    ]);
  });
});
