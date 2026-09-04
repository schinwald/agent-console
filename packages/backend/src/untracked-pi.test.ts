import { describe, expect, test } from 'bun:test';
import { findUntrackedPiProcesses } from './untracked-pi';

describe('untracked Pi detector', () => {
  test('reports live Pi processes absent from lifecycle registry', () => {
    expect(
      findUntrackedPiProcesses(
        [100],
        [100, 200],
        (pid) => pid === 200 ? { session: 'playground', window: '@161', pane: '%237' } : undefined,
      ),
    ).toEqual([
      { pid: 200, binding: { session: 'playground', window: '@161', pane: '%237' } },
    ]);
  });
});
