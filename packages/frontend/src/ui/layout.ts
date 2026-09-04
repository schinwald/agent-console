export const truncateText = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1))}…`;

export const getBoxWidth = (columns: number | undefined, fallback = 44): number =>
  Math.max(1, Math.min(100, (columns || fallback) - 2));

export const getSessionWidth = (boxWidth: number, sessionLengths: number[]): number =>
  Math.min(Math.max(1, ...sessionLengths), Math.max(1, Math.floor(boxWidth * 0.55)));
