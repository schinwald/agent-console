import type { Agent } from './types';

export const filterAgents = (agents: Agent[], query: string): Agent[] => {
  const normalized = query.toLowerCase();
  return agents.filter((agent) =>
    `${agent.tmuxSession} ${agent.status} ${agent.description}`
      .toLowerCase()
      .includes(normalized),
  );
};

export const clampSelection = (index: number, length: number): number =>
  Math.min(index, Math.max(0, length - 1));

export const moveSelection = (index: number, length: number, direction: -1 | 1): number =>
  length > 0 ? (index + direction + length) % length : 0;
