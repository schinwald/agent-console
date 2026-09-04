import { createConnection, type Socket } from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ManagerMessage, StateMessage } from '@agent-console/protocol';

export type { LifecycleMessage, ManagerMessage, StateMessage, ViewState } from '@agent-console/protocol';

export const communicationSocket =
  process.env.PI_MANAGER_SOCKET ?? join(homedir(), 'Library', 'Application Support', 'AgentConsole', 'communication.sock');

export type StateConnection = {
  socket: Socket;
  subscribe(topics?: string[]): void;
  getState(): void;
  search(query: string, requestId?: string): void;
  setFocus(id: string | null): void;
  clearFocus(): void;
  setActive(id: string | null): void;
  clearActive(): void;
  setSubmission(id: string, eventId: string): void;
  close(): void;
};

export function connectToManager(
  onState: (message: ManagerMessage) => void,
  onError: (error: Error) => void = () => undefined,
): Promise<StateConnection> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(communicationSocket);
    let buffer = '';
    let settled = false;

    socket.setEncoding('utf8');
    socket.on('connect', () => {
      settled = true;
      resolve(createConnectionApi(socket));
    });
    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
        try {
          const message = JSON.parse(line) as ManagerMessage;
          onState(message);
        } catch {
          onError(new Error('Invalid manager response'));
        }
      }
    });
    socket.on('error', (error) => {
      if (!settled) reject(error);
      else onError(error);
    });
  });
}

function createConnectionApi(socket: Socket): StateConnection {
  const send = (message: Record<string, unknown>) => {
    if (!socket.destroyed) socket.write(`${JSON.stringify(message)}\n`);
  };

  return {
    socket,
    subscribe: (topics = ['state']) => send({ type: 'subscribe', topics }),
    getState: () => send({ type: 'get-state' }),
    search: (query, requestId) => send({ type: 'search', query, requestId }),
    setFocus: (id) => send({ type: 'set-focus', id }),
    clearFocus: () => send({ type: 'clear-focus' }),
    setActive: (id) => send({ type: 'set-active', id }),
    clearActive: () => send({ type: 'clear-active' }),
    setSubmission: (id, eventId) => send({ type: 'set-submission', id, eventId }),
    close: () => socket.destroy(),
  };
}
