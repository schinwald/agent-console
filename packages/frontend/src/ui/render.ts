import type { Agent, Status } from './types';

export const visibleLength = (value: string): number =>
  value.replace(/\u001b\[[0-9;]*m/g, '').length;

export const statusStyles: Record<Status, { icon: string; color: string }> = {
  WAITING: { icon: '●', color: '\u001b[91m' },
  WORKING: { icon: '⟳', color: '\u001b[93m' },
  IDLE: { icon: '○', color: '\u001b[96m' },
  DONE: { icon: '●', color: '\u001b[92m' },
};

export const workingFrames = ['◜', '◝', '◞', '◟'];

/** Unknown lifecycle values must never make the terminal renderer crash. */
export const safeStatus = (status: string): Status =>
  status in statusStyles ? status as Status : 'IDLE';

export const hasWorkingAgents = (agents: readonly Pick<Agent, 'status'>[]): boolean =>
  agents.some((agent) => agent.status === 'WORKING');
