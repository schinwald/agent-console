import { describe, expect, test } from 'bun:test';
import { ViewStateStore } from './store';

describe('ViewStateStore', () => {
  test('starts with empty focus and active state', () => {
    const store = new ViewStateStore();

    expect(store.snapshot()).toEqual({
      state: { focusId: null, activeId: null },
      revision: 0,
    });
  });

  test('updates focus and active state independently', () => {
    const store = new ViewStateStore();

    expect(store.setFocus('agent-a')).toEqual({
      state: { focusId: 'agent-a', activeId: null },
      revision: 1,
    });
    expect(store.setActive('agent-b')).toEqual({
      state: { focusId: 'agent-a', activeId: 'agent-b' },
      revision: 2,
    });
  });

  test('notifies subscribers and supports unsubscribe', () => {
    const store = new ViewStateStore();
    const changes: number[] = [];
    const unsubscribe = store.subscribe(({ revision }) => changes.push(revision));

    store.setFocus('agent-a');
    unsubscribe();
    store.setActive('agent-a');

    expect(changes).toEqual([1]);
  });

  test('clears focus and active state', () => {
    const store = new ViewStateStore();
    store.setFocus('agent-a');
    store.setActive('agent-a');

    expect(store.clearFocus().state).toEqual({ focusId: null, activeId: 'agent-a' });
    expect(store.clearActive().state).toEqual({ focusId: null, activeId: null });
  });

  test('publishes submissions to subscribers', () => {
    const store = new ViewStateStore();
    const submissions: string[] = [];
    store.onSubmission(({ agentId, eventId }) => submissions.push(`${agentId}:${eventId}`));

    store.submit({ agentId: 'agent-a', eventId: 'event-1' });
    store.submit({ agentId: 'agent-a', eventId: 'event-1' });

    expect(submissions).toEqual(['agent-a:event-1', 'agent-a:event-1']);
  });
});
