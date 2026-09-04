import { describe, expect, test } from 'bun:test';
import { getBoxWidth, getSessionWidth, truncateText } from './layout';

describe('frontend layout', () => {
  test('clamps box width to terminal boundaries', () => {
    expect(getBoxWidth(80)).toBe(78);
    expect(getBoxWidth(10)).toBe(8);
    expect(getBoxWidth(200)).toBe(100);
    expect(getBoxWidth(undefined)).toBe(42);
  });

  test('truncates long text with an ellipsis', () => {
    expect(truncateText('abcdefgh', 5)).toBe('abcd…');
    expect(truncateText('abc', 5)).toBe('abc');
  });

  test('limits session column width to the available layout', () => {
    expect(getSessionWidth(40, [10, 20])).toBe(20);
    expect(getSessionWidth(20, [100])).toBe(11);
  });
});
