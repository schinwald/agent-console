import { describe, expect, test } from 'bun:test';
import { matchesTmuxContext } from './tmux';

describe('tmux active binding matcher', () => {
  test('matches lifecycle-created agent binding to current window', () => {
    expect(
      matchesTmuxContext(
        { session: 'project', window: '@4', pane: '%8' },
        { session: 'project', window: '@4', pane: '%8' },
      ),
    ).toBe(true);
  });

  test('matches a lifecycle agent against hook-reported window', () => {
    const hookContext = { session: 'playground', window: '@158', pane: '%180' };
    const createdAgentBinding = { session: 'playground', window: '@158', pane: '%181' };

    expect(matchesTmuxContext(createdAgentBinding, hookContext)).toBe(true);
  });

  test('matches an updated lifecycle agent against hook-reported window', () => {
    const hookContext = { session: 'playground', window: '@161', pane: '%237' };
    const updatedAgentBinding = { session: 'playground', window: '@161', pane: '%238' };

    expect(matchesTmuxContext(updatedAgentBinding, hookContext)).toBe(true);
  });

  test('does not activate an agent in another window', () => {
    expect(
      matchesTmuxContext(
        { session: 'project', window: '@4', pane: '%8' },
        { session: 'project', window: '@5', pane: '%8' },
      ),
    ).toBe(false);
  });
});
