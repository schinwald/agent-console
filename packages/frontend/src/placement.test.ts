import { describe, expect, test } from 'bun:test';
import { parsePlacement } from './placement';
import { tmuxPlacementArgs } from './tmux/placement';

describe('frontend placement', () => {
  test('defaults to inline', () => {
    expect(parsePlacement([])).toBe('inline');
  });

  test('parses each explicit placement', () => {
    expect(parsePlacement(['--placement', 'left'])).toBe('left');
    expect(parsePlacement(['--placement=right'])).toBe('right');
    expect(parsePlacement(['--placement', 'floating'])).toBe('floating');
  });

  test('rejects invalid placement arguments', () => {
    expect(() => parsePlacement(['--placement', 'bottom'])).toThrow('Usage: agent-console');
  });

  test('builds tmux commands that launch inline Agent Console', () => {
    expect(tmuxPlacementArgs('left', '/usr/local/bin/agent-console')).toEqual([
      'split-window', '-h', '-b', '-l', '48', '"/usr/local/bin/agent-console" --placement inline',
    ]);
    expect(tmuxPlacementArgs('right', '/usr/local/bin/agent-console')).toEqual([
      'split-window', '-h', '-l', '48', '"/usr/local/bin/agent-console" --placement inline',
    ]);
    expect(tmuxPlacementArgs('floating', '/usr/local/bin/agent-console')).toEqual([
      'display-popup', '-E', '"/usr/local/bin/agent-console" --placement inline',
    ]);
  });
});
