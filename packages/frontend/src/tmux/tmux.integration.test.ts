import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';

const socketName = `pi-manager-test-${process.pid}`;
const sessionName = `pi-manager-session-${process.pid}`;

const tmux = (args: string[]): string =>
  execFileSync('tmux', ['-L', socketName, '-f', '/dev/null', ...args], { encoding: 'utf8' }).trim();

const hasTmux = (() => {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('tmux integration smoke tests', () => {
  test('creates and navigates isolated windows and panes', () => {
    if (!hasTmux) return;

    try {
      tmux(['new-session', '-d', '-s', sessionName, '-n', 'agent']);
      tmux(['new-window', '-t', sessionName, '-n', 'webhook']);
      tmux(['select-window', '-t', `${sessionName}:agent`]);
      expect(tmux(['display-message', '-p', '-t', sessionName, '#{window_name}'])).toBe('agent');

      tmux(['split-window', '-d', '-t', `${sessionName}:agent`]);
      expect(tmux(['list-panes', '-t', `${sessionName}:agent`, '-F', '#{pane_id}']).split('\n')).toHaveLength(2);

      tmux(['select-window', '-t', `${sessionName}:webhook`]);
      expect(tmux(['display-message', '-p', '-t', sessionName, '#{window_name}'])).toBe('webhook');
    } finally {
      try {
        tmux(['kill-session', '-t', sessionName]);
      } catch {
        // Session may not have been created.
      }
    }
  });
});
