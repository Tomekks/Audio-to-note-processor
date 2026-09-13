// Shared by SheetDiagram and FretboardDiagram (and the ASCII/db layer) --
// grouping, naming, string-thickness and line-wrapping math that's identical
// regardless of which view is drawing it. Fretboard-specific segment-window
// logic lives separately in lib/fretboard.ts; see its RULES.md for why.

// A single played note. `startTimeSec` is what groupNotesByStep uses to
// decide which notes are a chord (same value) vs separate steps -- see
// SheetDiagram.RULES.md rule 2. `durationSec` is carried through from the
// source data but deliberately unused by any rendering here (see
// SheetDiagram.RULES.md's "not real musical notation" section). Matches
// contracts/tab.schema.json's notes[] shape -- durationSec is required
// there (the pipeline always produces it) and technique is optional; kept
// in sync here for contract parity even though nothing renders technique
// yet (no view draws hammer-ons/slides/etc. -- YAGNI, not an oversight, and
// groupNotesByStep below deliberately doesn't propagate it either).
export type TimedNote = {
  // 0 = lowest (thickest) string -- tuning[string] is that string's open
  // pitch, and tuning[tuning.length - 1] is always the highest string.
  string: number;
  fret: number;
  startTimeSec: number;
  durationSec: number;
  technique?: "hammer-on" | "pull-off" | "slide" | "bend" | "palm-mute";
};

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// e.g. 64 -> "E". Octave-agnostic -- callers only ever want the string's
// pitch class (open-string labels), never a specific octave.
export function pitchClassName(midi: number): string {
  return PITCH_CLASSES[((midi % 12) + 12) % 12];
}

export function fretToMidi(tuning: number[], string: number, fret: number): number {
  return tuning[string] + fret;
}

// Where a string's line/row falls, top to bottom. highOnTop flips the whole
// stack -- see SheetDiagram.RULES.md rule 4 / FretboardDiagram.RULES.md rule 5.
export function getDisplayRow(stringIndex: number, nStrings: number, highOnTop: boolean): number {
  return highOnTop ? nStrings - 1 - stringIndex : stringIndex;
}

// e/B/G tied at the thinnest, D/A/E each a step thicker -- see either
// RULES.md's identically-worded rule. Indexed from the top (highest, thinnest)
// string backwards so this reads the same regardless of nStrings.
const THIN_STRINGS_FROM_TOP = 3;
const THINNEST = 1.5;
const STEP = 0.6;

export function stringThickness(stringIndex: number, nStrings: number): number {
  const fromTop = nStrings - 1 - stringIndex;
  if (fromTop < THIN_STRINGS_FROM_TOP) return THINNEST;
  return THINNEST + (fromTop - THIN_STRINGS_FROM_TOP + 1) * STEP;
}

// Groups notes into playback steps: notes sharing a startTimeSec are one
// step (a chord), in ascending time order. See SheetDiagram.RULES.md rule 2.
export function groupNotesByStep(notes: TimedNote[]): { string: number; fret: number }[][] {
  const byTime = new Map<number, { string: number; fret: number }[]>();
  for (const note of notes) {
    const step = byTime.get(note.startTimeSec);
    if (step) step.push({ string: note.string, fret: note.fret });
    else byTime.set(note.startTimeSec, [{ string: note.string, fret: note.fret }]);
  }
  return [...byTime.entries()].sort(([a], [b]) => a - b).map(([, step]) => step);
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// How many steps fit across the measured container width -- see
// SheetDiagram.RULES.md rule 1. Always at least 1, so a very narrow
// container still shows something rather than dividing by a negative/zero
// count.
export function computeStepsPerLine(availableWidth: number, stepWidth: number, padLeft: number, padRight: number): number {
  const usable = availableWidth - padLeft - padRight;
  return Math.max(1, Math.floor(usable / stepWidth));
}

// Inverse of a system's xForIndex (padLeft + i*stepWidth + stepWidth/2) --
// which step index a pointer x falls in, clamped to the system's actual
// step count. Used for the loop drag-select (SheetDiagram.RULES.md rule 10).
export function stepIndexForX(x: number, stepWidth: number, padLeft: number, stepCount: number): number {
  const raw = Math.floor((x - padLeft) / stepWidth);
  return Math.min(Math.max(raw, 0), Math.max(stepCount - 1, 0));
}

export type LoopRangeLike = { start: number; end: number };

// Clips a global loop range down to one system's local (0-based) index
// space, or null if the range doesn't touch this system at all. See
// SheetDiagram.RULES.md rule 10 -- a drag is scoped to one system, but the
// committed loopRange is global, so every system needs its own local view.
export function intersectLoopRangeWithSystem(
  loopRange: LoopRangeLike | null,
  startIdx: number,
  systemLength: number,
): LoopRangeLike | null {
  if (!loopRange) return null;
  const lastIdx = startIdx + systemLength - 1;
  const start = Math.max(loopRange.start, startIdx);
  const end = Math.min(loopRange.end, lastIdx);
  if (start > end) return null;
  return { start: start - startIdx, end: end - startIdx };
}

// Standard 6-string names, low to high -- used as a display fallback
// wherever only note.string indices are available, not a real tuning (see
// lib/renderTab.ts). Extended generically for anything wider than 6.
function fallbackStringNames(nStrings: number): string[] {
  const standard = ["E", "A", "D", "G", "B", "e"];
  if (nStrings <= standard.length) return standard.slice(standard.length - nStrings);
  const extra = Array.from({ length: nStrings - standard.length }, (_, i) => `S${nStrings - standard.length - i}`);
  return [...extra, ...standard];
}

export { fallbackStringNames };

// Rough "how long is this song" stat -- last note's end time, rounded up to
// the nearest second, formatted m:ss. Deliberately approximate: there's no
// real tail/decay data, just the notes themselves (see
// SheetDiagram.RULES.md's "not real musical notation" section on why
// duration isn't treated as authoritative anywhere else either).
export function formatSongLength(notes: TimedNote[]): string {
  const end = notes.reduce((max, n) => Math.max(max, n.startTimeSec + n.durationSec), 0);
  const totalSeconds = Math.ceil(end);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
