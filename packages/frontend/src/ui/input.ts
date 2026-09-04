export type InputKey = { name?: string; ctrl?: boolean };

export const specialKeys: Record<string, InputKey> = {
  '\u001b[A': { name: 'up' },
  '\u001b[B': { name: 'down' },
  '[A': { name: 'up' },
  '[B': { name: 'down' },
  '\r': { name: 'return' },
  '\n': { name: 'return' },
  '\u007f': { name: 'backspace' },
  '\u001b': { name: 'escape' },
  '\u0003': { name: 'c', ctrl: true },
  '\u0006': { name: 'f', ctrl: true },
};
