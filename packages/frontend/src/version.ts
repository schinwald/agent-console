import packageJson from '../package.json' with { type: 'json' };

declare const AGENT_CONSOLE_VERSION: string | undefined;

export const version = typeof AGENT_CONSOLE_VERSION === 'string'
  ? AGENT_CONSOLE_VERSION
  : packageJson.version;
