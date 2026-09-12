import { fallbackStringNames, groupNotesByStep, type TimedNote } from "./tabNotation";

const CELL_WIDTH = 3; // e.g. "-3-" or "-12" -- wide enough for two-digit frets

// Plain-text guitar tab, one line per string, lowest string first, high
// string's label lowercased (matching the pitch-name convention everywhere
// else). No tuning is passed in here -- unlike the DB row's real tuning,
// this only ever needs string *names* for the left-hand gutter, so it falls
// back to the standard low-to-high names for however many strings the notes
// actually use (see tabNotation.ts's fallbackStringNames).
export function renderAsciiTab(notes: TimedNote[]): string {
  const nStrings = notes.reduce((max, n) => Math.max(max, n.string + 1), 6);
  const names = fallbackStringNames(nStrings);
  const steps = groupNotesByStep(notes);

  const rows: string[] = names.map((name, i) => `${i === nStrings - 1 ? name.toLowerCase() : name}|`);

  for (const step of steps) {
    const byString = new Map(step.map((n) => [n.string, n.fret]));
    for (let s = 0; s < nStrings; s++) {
      const fret = byString.get(s);
      const cell = fret === undefined ? "-".repeat(CELL_WIDTH) : String(fret).padStart(CELL_WIDTH - 1, "-") + "-";
      rows[s] += cell;
    }
  }

  return rows.map((row) => row + "|").join("\n");
}
