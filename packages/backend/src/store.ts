import type { ViewState } from './protocol';

export type { ViewState } from './protocol';

export type StateChange = {
  state: ViewState;
  revision: number;
};

type Listener = (change: StateChange) => void;

export type Submission = {
  agentId: string;
  eventId: string;
};

type SubmissionListener = (submission: Submission) => void;

export class ViewStateStore {
  private state: ViewState = { focusId: null, activeId: null };
  private revision = 0;
  private readonly listeners = new Set<Listener>();
  private readonly submissionListeners = new Set<SubmissionListener>();

  snapshot(): StateChange {
    return {
      state: { ...this.state },
      revision: this.revision,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onSubmission(listener: SubmissionListener): () => void {
    this.submissionListeners.add(listener);
    return () => this.submissionListeners.delete(listener);
  }

  submit(submission: Submission): void {
    for (const listener of this.submissionListeners) listener(submission);
  }

  setFocus(id: string | null): StateChange {
    return this.update({ focusId: id });
  }

  clearFocus(): StateChange {
    return this.setFocus(null);
  }

  setActive(id: string | null): StateChange {
    return this.update({ activeId: id });
  }

  clearActive(): StateChange {
    return this.setActive(null);
  }

  private update(next: Partial<ViewState>): StateChange {
    this.state = { ...this.state, ...next };
    this.revision += 1;
    const change = this.snapshot();
    for (const listener of this.listeners) listener(change);
    return change;
  }
}
