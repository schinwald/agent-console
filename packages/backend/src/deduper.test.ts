import { describe, expect, test } from 'bun:test';
import { SubmissionDeduper } from './deduper';

describe('SubmissionDeduper', () => {
  test('rejects repeated event ids within the ttl', () => {
    const deduper = new SubmissionDeduper(60_000);

    expect(deduper.isDuplicate('event-1', 1_000)).toBe(false);
    expect(deduper.isDuplicate('event-1', 1_001)).toBe(true);
  });

  test('allows an event id again after the ttl', () => {
    const deduper = new SubmissionDeduper(60_000);

    expect(deduper.isDuplicate('event-1', 1_000)).toBe(false);
    expect(deduper.isDuplicate('event-1', 61_001)).toBe(false);
  });

  test('tracks event ids independently', () => {
    const deduper = new SubmissionDeduper(60_000);

    expect(deduper.isDuplicate('event-1', 1_000)).toBe(false);
    expect(deduper.isDuplicate('event-2', 1_000)).toBe(false);
    expect(deduper.isDuplicate('event-1', 1_001)).toBe(true);
    expect(deduper.isDuplicate('event-2', 1_001)).toBe(true);
  });
});
