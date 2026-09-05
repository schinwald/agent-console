import { describe, expect, test } from 'bun:test';
import { createLogger } from './logger';

describe('backend logger', () => {
  test('filters events below the configured level', () => {
    const lines: string[] = [];
    const logger = createLogger('info', (line) => lines.push(line));

    logger.debug('tmux', 'ignored');
    logger.info('backend', 'started', { socket: '/tmp/socket' });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      level: 'info',
      component: 'backend',
      message: 'started',
      socket: '/tmp/socket',
    });
  });

  test('preserves reserved fields when event fields collide', () => {
    const lines: string[] = [];
    const logger = createLogger('debug', (line) => lines.push(line));

    logger.warn('backend', 'started', {
      level: 'debug',
      component: 'tmux',
      message: 'overridden',
    });

    expect(JSON.parse(lines[0])).toEqual({
      level: 'warn',
      component: 'backend',
      message: 'started',
    });
  });
});
