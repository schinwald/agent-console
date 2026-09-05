import { execFileSync } from 'node:child_process';
import type { TmuxBinding } from './tmux';
import { logger } from './logger';

export type UntrackedPiProcess = {
  pid: number;
  binding?: TmuxBinding;
};

export const listPiPids = (): number[] => {
  try {
    return execFileSync('pgrep', ['-x', 'pi'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(Number)
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch (error) {
    logger.debug('untracked-pi', 'Pi process discovery failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

export const findUntrackedPiProcesses = (
  registeredPids: Iterable<number>,
  livePids: Iterable<number>,
  locate: (pid: number) => TmuxBinding | undefined,
): UntrackedPiProcess[] => {
  const registered = new Set(registeredPids);
  return [...livePids]
    .filter((pid) => !registered.has(pid))
    .map((pid) => ({ pid, binding: locate(pid) }));
};
