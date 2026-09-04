export type Status = 'WAITING' | 'WORKING' | 'IDLE' | 'DONE';

export type Agent = {
  id?: string;
  tmuxSession: string;
  tmuxWindow?: string;
  tmuxPane?: string;
  pid?: number;
  status: Status;
  description: string;
  active?: boolean;
};

export type ManagerStatus = 'idle' | 'working' | 'done' | 'closed';

export type ManagerInstance = {
  id: string;
  pid: number;
  status: ManagerStatus;
  summary?: string;
  tmuxSession?: string;
  tmuxWindow?: string;
  tmuxPane?: string;
};

export type ManagerRegistry = {
  instances: Record<string, ManagerInstance>;
};
