import { describe, expect, test } from 'bun:test';
import { helpText, parseCommand, versionText } from './cli';
import { version } from './version';

describe('frontend CLI arguments', () => {
  test('shows help before parsing placement', () => {
    expect(parseCommand(['--help'])).toEqual({ type: 'help' });
    expect(parseCommand(['--help', '--placement', 'bottom'])).toEqual({ type: 'help' });
    expect(helpText).toContain('Usage: agent-console');
    expect(helpText).toContain('--version');
  });

  test('shows version before parsing placement', () => {
    expect(parseCommand(['--version'])).toEqual({ type: 'version' });
    expect(parseCommand(['--version', '--placement', 'bottom'])).toEqual({ type: 'version' });
    expect(versionText()).toBe(`${version}\n`);
  });

  test('preserves placement commands', () => {
    expect(parseCommand([])).toEqual({ type: 'run', placement: 'inline' });
    expect(parseCommand(['--placement', 'left'])).toEqual({ type: 'run', placement: 'left' });
  });
});
