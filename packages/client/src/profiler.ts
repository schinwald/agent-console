import { performance } from 'node:perf_hooks';

export const profilingEnabled = process.env.AGENT_CONSOLE_PROFILE === '1';

export const profileStart = (label: string): (() => void) => {
  if (!profilingEnabled) return () => undefined;

  const startedAt = performance.now();
  return () => {
    const elapsed = performance.now() - startedAt;
    process.stderr.write(`[agent-console:profile] ${label} ${elapsed.toFixed(2)}ms\n`);
  };
};

export const profile = <T>(label: string, operation: () => T): T => {
  const finish = profileStart(label);
  try {
    return operation();
  } finally {
    finish();
  }
};
