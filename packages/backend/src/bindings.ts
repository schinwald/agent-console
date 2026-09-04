import type { AgentMetadata } from '@agent-console/protocol';
import type { TmuxBinding } from './tmux';

export type BindingResolver = (agents: Iterable<AgentMetadata>) => Map<string, TmuxBinding>;

export const projectTmuxBinding = (agent: AgentMetadata, binding?: TmuxBinding): AgentMetadata =>
  binding
    ? {
        ...agent,
        tmuxSession: binding.session,
        tmuxWindow: binding.window,
        tmuxPane: binding.pane,
      }
    : agent;

export class TmuxBindingIndex {
  #bindings = new Map<string, TmuxBinding>();

  get(agentId: string): TmuxBinding | undefined {
    return this.#bindings.get(agentId);
  }

  all(): ReadonlyMap<string, TmuxBinding> {
    return this.#bindings;
  }

  reconcile(agents: Iterable<AgentMetadata>, resolve: BindingResolver): void {
    const list = [...agents];
    const knownIds = new Set(list.map((agent) => agent.id));
    for (const id of this.#bindings.keys()) {
      if (!knownIds.has(id)) this.#bindings.delete(id);
    }
    for (const [id, binding] of resolve(list)) this.#bindings.set(id, binding);
  }

  remove(agentId: string): void {
    this.#bindings.delete(agentId);
  }
}
