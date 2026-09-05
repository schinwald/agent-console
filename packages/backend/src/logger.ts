export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Write = (line: string) => void;

const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export const createLogger = (
  level = process.env.AGENT_CONSOLE_LOG_LEVEL ?? 'info',
  write: Write = (line) => process.stderr.write(`${line}\n`),
) => {
  const threshold = levels[level as LogLevel] ?? levels.info;
  const log = (eventLevel: LogLevel, component: string, message: string, fields: Record<string, unknown> = {}) => {
    if (levels[eventLevel] < threshold) return;
    write(JSON.stringify({ level: eventLevel, component, message, ...fields }));
  };
  return {
    debug: (component: string, message: string, fields?: Record<string, unknown>) => log('debug', component, message, fields),
    info: (component: string, message: string, fields?: Record<string, unknown>) => log('info', component, message, fields),
    warn: (component: string, message: string, fields?: Record<string, unknown>) => log('warn', component, message, fields),
    error: (component: string, message: string, fields?: Record<string, unknown>) => log('error', component, message, fields),
  };
};

export const logger = createLogger();
