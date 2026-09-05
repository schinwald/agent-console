import { describe, expect, test } from 'bun:test';
import { isProcessInPane, resolveTmuxSocket } from './tmux';

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
});
