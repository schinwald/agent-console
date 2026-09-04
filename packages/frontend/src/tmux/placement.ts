import type { Placement } from '../placement';

const inlineCommand = (binary: string): string => `${JSON.stringify(binary)} --placement inline`;

export const tmuxPlacementArgs = (placement: Exclude<Placement, 'inline'>, binary: string): string[] => {
  const command = inlineCommand(binary);
  switch (placement) {
    case 'left':
      return ['split-window', '-h', '-b', '-l', '48', command];
    case 'right':
      return ['split-window', '-h', '-l', '48', command];
    case 'floating':
      return ['display-popup', '-E', command];
  }
};
