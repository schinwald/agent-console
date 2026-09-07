import { parsePlacement, type Placement } from './placement';
import { version } from './version';

export type Command =
  | { type: 'help' }
  | { type: 'version' }
  | { type: 'run'; placement: Placement };

export const helpText = `Usage: agent-console [--placement ${['inline', 'left', 'right', 'floating'].join('|')}]

Options:
  --help                 Show this help text
  --version              Show the Agent Console version
  --placement <position> Open in inline, left, right, or floating tmux placement
`;

export const parseCommand = (args: string[]): Command => {
  if (args.includes('--help')) return { type: 'help' };
  if (args.includes('--version')) return { type: 'version' };
  return { type: 'run', placement: parsePlacement(args) };
};

export const versionText = (): string => `${version}\n`;
