import { describe, expect, test } from 'bun:test';
import { projectTmuxBinding, TmuxBindingIndex } from './bindings';

describe('tmux binding index', () => {
  test('stores reconciled bindings without modifying lifecycle agents', () => {
    const index = new TmuxBindingIndex();
    const agents = [{ id: 'agent-a', pid: 101 }, { id: 'agent-b', pid: 102 }];

    index.reconcile(agents, () => new Map([
      ['agent-a', { session: 'project', window: '@1', pane: '%1' }],
    ]));

    expect(index.get('agent-a')).toEqual({ session: 'project', window: '@1', pane: '%1' });
    expect(index.get('agent-b')).toBeUndefined();
    expect(agents).toEqual([{ id: 'agent-a', pid: 101 }, { id: 'agent-b', pid: 102 }]);
  });

  test('projects cached binding into tmux protocol fields', () => {
    expect(
      projectTmuxBinding(
        { id: 'agent-a', pid: 101 },
        { session: 'project', window: '@4', pane: '%8' },
      ),
    ).toEqual({
      id: 'agent-a',
      pid: 101,
      tmuxSession: 'project',
      tmuxWindow: '@4',
      tmuxPane: '%8',
    });
  });

  test('hydrates registry agents into bindings before command handling', () => {
    const index = new TmuxBindingIndex();
    const registryAgents = [{ id: 'restored-agent', pid: 101 }];

    index.reconcile(registryAgents, () => new Map([
      ['restored-agent', { session: 'project', window: '@4', pane: '%8' }],
    ]));

    expect(index.get('restored-agent')).toEqual({ session: 'project', window: '@4', pane: '%8' });
  });

  test('drops bindings for closed agents while preserving remaining cached locations', () => {
    const index = new TmuxBindingIndex();
    index.reconcile(
      [{ id: 'agent-a' }, { id: 'agent-b' }],
      () => new Map([
        ['agent-a', { session: 'project', window: '@1' }],
        ['agent-b', { session: 'project', window: '@2' }],
      ]),
    );

    index.reconcile([{ id: 'agent-b' }], () => new Map([
      ['agent-b', { session: 'project', window: '@2' }],
    ]));

    expect(index.get('agent-a')).toBeUndefined();
    expect(index.get('agent-b')).toEqual({ session: 'project', window: '@2' });
  });
});
