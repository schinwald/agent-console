import { expect, test } from 'bun:test';
import { hasWorkingAgents } from './render';

test('hasWorkingAgents only enables animation for working agents', () => {
  expect(hasWorkingAgents([])).toBe(false);
  expect(hasWorkingAgents([{ status: 'IDLE' }, { status: 'DONE' }])).toBe(false);
  expect(hasWorkingAgents([{ status: 'WORKING' }, { status: 'IDLE' }])).toBe(true);
});
