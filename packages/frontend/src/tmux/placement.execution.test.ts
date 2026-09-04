import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'bun:test';
import { tmuxPlacementArgs } from './placement';

const tmux = (args: string[]) => execFileSync('tmux', args, { encoding: 'utf8' });

describe('tmux placement execution', () => {
  test('runs the inline command in a left split', async () => {
    const session = `agent-console-placement-${process.pid}`;
    tmux(['new-session', '-d', '-s', session]);
    try {
      tmux(['set-option', '-t', session, 'remain-on-exit', 'on']);
      tmux(['split-window', '-t', session, ...tmuxPlacementArgs('left', '/bin/echo').slice(1)]);

      await Bun.sleep(25);
      const panes = tmux(['list-panes', '-t', session, '-F', '#{pane_dead}\t#{pane_dead_status}'])
        .trim()
        .split('\n');
      expect(panes).toHaveLength(2);
      expect(panes.some((pane) => pane === '1\t0')).toBe(true);
    } finally {
      tmux(['kill-session', '-t', session]);
    }
  });
});
