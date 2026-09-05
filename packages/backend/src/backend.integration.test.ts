import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { createConnection, type Socket } from 'node:net';
import { join } from 'node:path';

const socketPath = join('/tmp', `pi-manager-test-${process.pid}.sock`);
const backendPath = join(import.meta.dir, 'backend.ts');
let backend: Bun.Subprocess;

const waitForSocket = async (): Promise<void> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (existsSync(socketPath)) return;
    await Bun.sleep(20);
  }
  throw new Error('backend test socket did not start');
};

const connect = (): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    socket.setEncoding('utf8');
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });

const nextMessage = (socket: Socket): Promise<Record<string, any>> =>
  new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
        socket.removeListener('data', onData);
        resolve(JSON.parse(line));
        return;
      }
    };
    socket.on('data', onData);
    socket.once('error', reject);
  });

const send = (socket: Socket, message: Record<string, unknown>): void => {
  socket.write(`${JSON.stringify(message)}\n`);
};

describe('manager backend socket', () => {
  beforeAll(async () => {
    if (existsSync(socketPath)) unlinkSync(socketPath);
    backend = Bun.spawn(['bun', 'run', backendPath], {
      env: { ...process.env, PI_MANAGER_SOCKET: socketPath },
      stdout: 'ignore',
      stderr: 'ignore',
    });
    await waitForSocket();
  });

  afterAll(async () => {
    backend.kill();
    await backend.exited;
    if (existsSync(socketPath)) unlinkSync(socketPath);
  });

  test('publishes state changes to state subscribers', async () => {
    const subscriber = await connect();
    send(subscriber, { type: 'subscribe', topics: ['state'] });
    expect((await nextMessage(subscriber)).type).toBe('state-snapshot');

    const command = await connect();
    send(command, { type: 'set-focus', id: 'integration-agent' });
    command.destroy();

    const message = await nextMessage(subscriber);
    expect(message.type).toBe('state-changed');
    expect(message.state).toEqual({ focusId: 'integration-agent', activeId: null });
    subscriber.destroy();
  });

  test('publishes active state changes to state subscribers', async () => {
    const subscriber = await connect();
    send(subscriber, { type: 'subscribe', topics: ['state'] });
    expect((await nextMessage(subscriber)).type).toBe('state-snapshot');

    const command = await connect();
    send(command, { type: 'set-active', id: 'active-integration-agent' });
    command.destroy();

    const message = await nextMessage(subscriber);
    expect(message.type).toBe('state-changed');
    expect(message.state.activeId).toBe('active-integration-agent');
    subscriber.destroy();
  });

  test('deduplicates submission events', async () => {
    const subscriber = await connect();
    send(subscriber, { type: 'subscribe', topics: ['submissions'] });
    expect((await nextMessage(subscriber)).type).toBe('state-snapshot');
    const command = await connect();
    send(command, { type: 'set-submission', id: 'integration-agent', eventId: 'integration-event' });
    send(command, { type: 'set-submission', id: 'integration-agent', eventId: 'integration-event' });

    const message = await nextMessage(subscriber);
    expect(message).toEqual({
      type: 'submission',
      agentId: 'integration-agent',
      eventId: 'integration-event',
    });

    await Bun.sleep(30);
    command.destroy();
    subscriber.destroy();
  });

  test('forwards lifecycle events to lifecycle subscribers', async () => {
    const subscriber = await connect();
    send(subscriber, { type: 'subscribe', topics: ['lifecycle'] });
    expect((await nextMessage(subscriber)).type).toBe('state-snapshot');
    const producer = await connect();
    send(producer, {
      type: 'agent.created',
      data: { id: 'created-agent', tmuxSession: 'integration-session', tmuxWindow: '@1' },
    });

    const message = await nextMessage(subscriber);
    expect(message).toEqual({
      type: 'agent.created',
      agent: { id: 'created-agent', tmuxSession: 'integration-session', tmuxWindow: '@1' },
    });

    producer.destroy();
    subscriber.destroy();
  });

  test('returns backend-owned search results', async () => {
    const producer = await connect();
    send(producer, {
      type: 'agent.created',
      data: { id: 'search-agent', status: 'working', summary: 'Fix billing retry' },
    });
    await Bun.sleep(10);

    const search = await connect();
    send(search, { type: 'search', query: 'billing', requestId: 'search-1' });
    expect(await nextMessage(search)).toEqual({
      type: 'search-results',
      requestId: 'search-1',
      query: 'billing',
      agents: [{ id: 'search-agent', status: 'working', summary: 'Fix billing retry' }],
    });
    producer.destroy();
    search.destroy();
  });
});
