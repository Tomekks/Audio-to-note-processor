// Pure fret-window math for FretboardDiagram's segments -- see
// FretboardDiagram.RULES.md, which this implements exactly (rules 1-2).

// A segment's fret window is this many cells wide for the common case --
// uniform, not tight-fit to whatever's actually fretted (rule 1).
export const FIXED_CELLS = 4;

// Which fret window (inclusive) a step's dots should be drawn against.
// - All-open (every fret 0, or no notes at all): fixed window starting at
//   fret 1 (rule 2).
// - Fits within FIXED_CELLS: fixed-width window anchored at the lowest
//   fretted note, so every "normal" step is the same width.
// - Wider than FIXED_CELLS: the real span, never truncated (rule 1).
export function getStepWindow(frets: number[]): { start: number; end: number } {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return { start: 1, end: FIXED_CELLS };

  const min = Math.min(...fretted);
  const max = Math.max(...fretted);
  const span = max - min + 1;
  if (span <= FIXED_CELLS) return { start: min, end: min + FIXED_CELLS - 1 };
  return { start: min, end: max };
}
