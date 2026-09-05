import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { argv, execPath, stdin as input, stdout as output } from 'node:process';
import {
  connectToManager,
  type ManagerMessage,
  type StateMessage,
  type StateConnection,
} from '@agent-console/client';
import { profileStart } from '@agent-console/client/profiler';
import { getBoxWidth, getSessionWidth, truncateText } from './layout';
import { specialKeys, type InputKey } from './input';
import { clampSelection, filterAgents, moveSelection } from './selection';
import { statusStyles, visibleLength, workingFrames } from './render';
import type { Agent, Status } from './types';
import { parsePlacement } from '../placement';
import { tmuxPlacementArgs } from '../tmux/placement';

const reset = '\u001b[0m';
const dim = '\u001b[2m';
const borderDim = '\u001b[2;90m';
const bold = '\u001b[1m';
const white = '\u001b[97m';
const green = '\u001b[92m';
const selection = '\u001b[2;37m';
const selectedBackground = '\u001b[48;2;41;46;66m';
const agents: Agent[] = [];

const selectAgent = async (): Promise<Agent | null> => {
  if (!input.isTTY || !output.isTTY) {
    const readline = createInterface({ input, output });
    const answer = await readline.question('Select agent number (or q): ');
    readline.close();
    if (answer.trim().toLowerCase() === 'q') return null;
    return agents[Number(answer) - 1] ?? null;
  }

  let selectedIndex = 0;
  let searchQuery = '';
  let filteredAgents = agents;
  let selectionRows = new Map<number, number>();
  let animationFrame = 0;
  let lastClick: { index: number; time: number } | null = null;
  let submissionCounter = 0;
  let managerConnection: StateConnection | undefined;
  let viewState: StateMessage['state'] = { focusId: null, activeId: null };

  let handleInput = (_character: string, _key?: InputKey) => undefined;

  const render = () => {
    const finishProfile = profileStart('frontend.render');
    const boxWidth = getBoxWidth(output.columns);
    filteredAgents = filterAgents(agents, searchQuery);
    const focusedId = viewState.focusId;
    const stateFocusedIndex = focusedId
      ? filteredAgents.findIndex((agent) => agent.id === focusedId)
      : -1;
    if (stateFocusedIndex >= 0) selectedIndex = stateFocusedIndex;
    selectedIndex = clampSelection(selectedIndex, filteredAgents.length);
    selectionRows = new Map();

    const sessionWidth = getSessionWidth(
      boxWidth,
      agents.map((agent) => agent.tmuxSession.length),
    );

    const printLine = (content = '', selected = false) => {
      const padding = ' '.repeat(Math.max(0, boxWidth - 2 - visibleLength(content)));
      const styled = selected
        ? `${selectedBackground}${content.replaceAll(reset, `${reset}${selectedBackground}`)}${padding}${reset}`
        : `${content}${padding}`;
      output.write(`${borderDim}│${reset} ${styled} ${borderDim}│${reset}\n`);
    };

    output.write('\u001b[2J\u001b[H');
    output.write(`${borderDim}╭─${reset}${bold} AGENTS ${reset}${borderDim}${'─'.repeat(boxWidth - 9)}╮${reset}\n`);
    printLine(`${bold}>${reset} ${white}${searchQuery}${reset}${white}█${reset}`);
    output.write(`${borderDim}├${'─'.repeat(boxWidth)}┤${reset}\n`);

    let renderedRows = 3;
    filteredAgents.forEach((agent, index) => {
      const selected = viewState.focusId !== null
        ? agent.id === viewState.focusId
        : index === selectedIndex;
      const style = statusStyles[agent.status];
      const icon = agent.status === 'WORKING' ? workingFrames[animationFrame] : style.icon;
      const marker = selected ? `${selection}▌${reset}` : ' ';
      const active = agent.id === viewState.activeId;
      const activeLabel = active ? ` ${green}(active)${reset}` : '';
      const tmuxSession = truncateText(agent.tmuxSession, sessionWidth);
      const paddedSession = `${white}${tmuxSession}${reset}${activeLabel}${' '.repeat(
        Math.max(0, sessionWidth - tmuxSession.length),
      )}`;
      const status = `${style.color}${agent.status}${reset}`;
      const prefix = `${marker} ${style.color}${icon}${reset} ${paddedSession}`;
      const statusGap = ' '.repeat(
        Math.max(1, boxWidth - 2 - visibleLength(prefix) - visibleLength(status)),
      );
      const firstRow = `${prefix}${statusGap}${status}`;
      const secondRow = `${marker}   ${dim}${truncateText(agent.description, Math.max(1, boxWidth - 8))}${reset}`;
      selectionRows.set((index * 2) + 4, index);
      printLine(firstRow, selected);
      selectionRows.set((index * 2) + 5, index);
      printLine(secondRow, selected);
      renderedRows += 2;
    });

    if (filteredAgents.length === 0) {
      printLine(`${dim}No matching agents${reset}`);
      renderedRows += 1;
    }

    const targetHeight = output.rows || 25;
    while (renderedRows < targetHeight - 1) {
      printLine();
      renderedRows += 1;
    }
    output.write(`${borderDim}╰${'─'.repeat(boxWidth)}╯${reset}`);
    finishProfile();
  };

  const updateFocus = (agentId: string | null) => {
    viewState = { ...viewState, focusId: agentId };
    managerConnection?.setFocus(agentId);
    render();
  };

  const onInputData = (data: Buffer) => {
    const text = data.toString();
    const mouseEvent = /\u001b\[<([0-9]+);([0-9]+);([0-9]+)([mM])/.exec(text);
    if (mouseEvent) {
      const button = Number(mouseEvent[1]);
      const optionIndex = selectionRows.get(Number(mouseEvent[3]));
      if (button !== 0 || mouseEvent[4] !== 'M' || optionIndex === undefined) return;
      const now = Date.now();
      const isDoubleClick = lastClick?.index === optionIndex && now - lastClick.time < 400;
      lastClick = { index: optionIndex, time: now };
      selectedIndex = optionIndex;
      const agentId = filteredAgents[optionIndex]?.id ?? null;
      updateFocus(agentId);
      if (isDoubleClick && agentId) {
        managerConnection?.setSubmission(
          agentId,
          `${process.pid}:${Date.now()}:${submissionCounter++}`,
        );
      }
      return;
    }

    if (specialKeys[text]) return handleInput('', specialKeys[text]);
    for (const character of text) handleInput(character);
  };

  output.on('resize', render);
  input.setRawMode(true);
  input.resume();
  input.on('data', onInputData);
  output.write('\u001b[?25l\u001b[?1000h\u001b[?1006h');
  render();
  void connectToManager(
    (message: ManagerMessage) => {
      if (message.type === 'state-snapshot' || message.type === 'state-changed') {
        viewState = message.state;
      } else if (message.type === 'search-results') {
        agents.splice(
          0,
          agents.length,
          ...message.agents.map((data) => ({
            id: data.id,
            tmuxSession: typeof data.tmuxSession === 'string' ? data.tmuxSession : 'unattached',
            tmuxWindow: typeof data.tmuxWindow === 'string' ? data.tmuxWindow : undefined,
            tmuxPane: typeof data.tmuxPane === 'string' ? data.tmuxPane : undefined,
            pid: typeof data.pid === 'number' ? data.pid : undefined,
            status: String(data.status ?? 'IDLE').toUpperCase() as Status,
            description: typeof data.summary === 'string' ? data.summary : 'No summary',
          })),
        );
      } else {
        managerConnection?.search(searchQuery);
      }
      render();
    },
    () => undefined,
  )
    .then((connection) => {
      managerConnection = connection;
      connection.subscribe(['state', 'lifecycle']);
      connection.search('');
      render();
    })
    .catch(() => undefined);

  return new Promise((resolve) => {
    const finish = (agent: Agent | null) => {
      clearInterval(timer);
      input.removeListener('data', onInputData);
      output.removeListener('resize', render);
      input.setRawMode(false);
      input.pause();
      managerConnection?.close();
      output.write('\u001b[?25h\u001b[?1000l\u001b[?1006l\u001b[2J\u001b[H');
      resolve(agent);
    };

    handleInput = (character, key) => {
      if (key?.ctrl && key.name === 'c') return finish(null);
      if (key?.name === 'up') {
        if (filteredAgents.length > 0) {
          selectedIndex = moveSelection(selectedIndex, filteredAgents.length, -1);
          updateFocus(filteredAgents[selectedIndex]?.id ?? null);
        }
        return;
      }
      if (key?.name === 'down') {
        if (filteredAgents.length > 0) {
          selectedIndex = moveSelection(selectedIndex, filteredAgents.length, 1);
          updateFocus(filteredAgents[selectedIndex]?.id ?? null);
        }
        return;
      }
      if (key?.name === 'backspace') {
        searchQuery = searchQuery.slice(0, -1);
        selectedIndex = 0;
        managerConnection?.search(searchQuery);
        return render();
      }
      if (key?.name === 'return' && filteredAgents.length > 0) {
        const agentId = filteredAgents[selectedIndex]?.id;
        if (agentId) {
          managerConnection?.setSubmission(
            agentId,
            `${process.pid}:${Date.now()}:${submissionCounter++}`,
          );
        }
        return render();
      }
      if (key?.name === 'escape' || (character === 'q' && searchQuery === '')) return finish(null);
      if (character && character >= ' ' && !key?.ctrl) {
        searchQuery += character;
        selectedIndex = 0;
        managerConnection?.search(searchQuery);
        render();
      }
    };

    const timer = setInterval(() => {
      animationFrame = (animationFrame + 1) % workingFrames.length;
      render();
    }, 140);

  });
};

const main = async () => {
  const placement = parsePlacement(argv.slice(2));
  if (placement !== 'inline') {
    execFileSync('tmux', tmuxPlacementArgs(placement, execPath), { stdio: 'inherit' });
    return;
  }
  await selectAgent();
};

void main();
