import { describe, expect, test } from 'bun:test';
import { clampSelection, filterAgents, moveSelection } from './selection';
import type { Agent } from './types';

const agents: Agent[] = [
  { tmuxSession: 'alpha', status: 'IDLE', description: 'Review API' },
  { tmuxSession: 'beta', status: 'WORKING', description: 'Fix worker' },
];

describe('frontend selection', () => {
  test('filters by session, status, or description', () => {
    expect(filterAgents(agents, 'alpha')).toEqual([agents[0]]);
    expect(filterAgents(agents, 'worker')).toEqual([agents[1]]);
    expect(filterAgents(agents, 'IDLE')).toEqual([agents[0]]);
  });

  test('clamps selection to available rows', () => {
    expect(clampSelection(4, 2)).toBe(1);
    expect(clampSelection(4, 0)).toBe(0);
  });

  test('moves selection circularly', () => {
    expect(moveSelection(0, 2, -1)).toBe(1);
    expect(moveSelection(1, 2, 1)).toBe(0);
    expect(moveSelection(0, 0, 1)).toBe(0);
  });
});
