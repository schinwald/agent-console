import { describe, expect, test } from 'bun:test';
import { profile } from './profiler';

describe('profiler', () => {
  test('returns operation results when profiling is disabled', () => {
    expect(profile('test.operation', () => 42)).toBe(42);
  });
});
