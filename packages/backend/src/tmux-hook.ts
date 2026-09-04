import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readActiveContext } from './tmux';
import type { ManagerCommand } from '@agent-console/protocol';

const communicationSocket =
  process.env.PI_MANAGER_SOCKET ?? join(homedir(), 'Library', 'Application Support', 'AgentConsole', 'communication.sock');
const context = readActiveContext();
const command: ManagerCommand = {
  type: 'sync-tmux-active',
  data: { tmuxSession: context.session, tmuxWindow: context.window, tmuxPane: context.pane },
};

const socket = createConnection(communicationSocket, () => {
  socket.end(`${JSON.stringify(command)}\n`);
});
socket.on('error', () => process.exitCode = 1);
