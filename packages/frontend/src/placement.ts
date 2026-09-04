export const placements = ['inline', 'left', 'right', 'floating'] as const;
export type Placement = (typeof placements)[number];

const isPlacement = (value: string): value is Placement =>
  (placements as readonly string[]).includes(value);

export const parsePlacement = (args: string[]): Placement => {
  if (args.length === 0) return 'inline';

  const [first, second, ...rest] = args;
  const value = first.startsWith('--placement=')
    ? first.slice('--placement='.length)
    : first === '--placement' ? second : undefined;
  const consumed = first.startsWith('--placement=') ? 1 : first === '--placement' ? 2 : 0;

  if (value && isPlacement(value) && rest.length === 0 && args.length === consumed) return value;
  throw new Error(`Usage: agent-console [--placement ${placements.join('|')}]`);
};
