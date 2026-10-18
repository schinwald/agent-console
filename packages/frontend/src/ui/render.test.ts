import { expect, test } from 'bun:test';
import { hasWorkingAgents, safeStatus } from './render';

test('hasWorkingAgents only enables animation for working agents', () => {
  expect(hasWorkingAgents([])).toBe(false);
  expect(hasWorkingAgents([{ status: 'IDLE' }, { status: 'DONE' }])).toBe(false);
  expect(hasWorkingAgents([{ status: 'WORKING' }, { status: 'IDLE' }])).toBe(true);
});

test('safeStatus falls back for additive or unknown values', () => {
  expect(safeStatus('WORKING')).toBe('WORKING');
  expect(safeStatus('exited')).toBe('IDLE');
  expect(safeStatus('')).toBe('IDLE');
});
