export type ViewState = {
  focusId: string | null;
  activeId: string | null;
};

export type AgentMetadata = {
  id: string;
  tmuxSession?: string;
  tmuxWindow?: string;
  tmuxPane?: string;
  [key: string]: unknown;
};

export type ManagerCommand = {
  type:
    | 'subscribe'
    | 'get-state'
    | 'search'
    | 'set-focus'
    | 'clear-focus'
    | 'set-active'
    | 'sync-tmux-active'
    | 'clear-active'
    | 'set-submission'
    | 'agent.created'
    | 'instance.updated'
    | 'instance.closed';
  id?: string;
  eventId?: string;
  requestId?: string;
  query?: string;
  topics?: string[];
  data?: AgentMetadata | { id: string } | { tmuxSession?: string; tmuxWindow?: string; tmuxPane?: string };
};

export type StateMessage = {
  type: 'state-snapshot' | 'state-changed';
  state: ViewState;
  revision: number;
};

export type LifecycleMessage =
  | { type: 'agent.created'; agent: AgentMetadata }
  | { type: 'instance.updated' | 'instance.closed'; data: Record<string, unknown> };

export type SearchResultsMessage = {
  type: 'search-results';
  requestId?: string;
  query: string;
  agents: AgentMetadata[];
};

export type ManagerMessage =
  | StateMessage
  | LifecycleMessage
  | SearchResultsMessage
  | { type: 'submission'; agentId: string; eventId: string }
  | { type: 'ack'; requestId?: string; ok: true }
  | { type: 'error'; requestId?: string; ok: false; error: string };
