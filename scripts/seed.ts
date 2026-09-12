// Inserts one sample song so a fresh Turso DB shows something real in the
// UI right after `db:migrate`, instead of "No songs published yet." Run
// with `npm run db:seed`. Safe to run more than once -- each run adds
// another row (ids are random), so re-seeding just grows the song list
// rather than erroring.
import { db } from "../src/db/client";
import { songs } from "../src/db/schema";
import type { TimedNote } from "../src/lib/tabNotation";

// Standard EADGBe tuning, MIDI note numbers for each open string, low to high.
const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

// A short two-bar riff: a descending run on the low strings, then a chord.
const notes: TimedNote[] = [
  { string: 0, fret: 0, startTimeSec: 0 },
  { string: 0, fret: 2, startTimeSec: 0.5 },
  { string: 0, fret: 3, startTimeSec: 1 },
  { string: 1, fret: 0, startTimeSec: 1.5 },
  { string: 1, fret: 2, startTimeSec: 2 },
  { string: 1, fret: 3, startTimeSec: 2.5 },
  // chord: open low E, D, G, open high e
  { string: 0, fret: 0, startTimeSec: 3 },
  { string: 2, fret: 0, startTimeSec: 3 },
  { string: 3, fret: 0, startTimeSec: 3 },
  { string: 5, fret: 0, startTimeSec: 3 },
];

async function main() {
  await db.insert(songs).values({
    title: "Practice Riff",
    artist: "Guitar Practice Tabs",
    tempoBpm: 90,
    tuning: STANDARD_TUNING,
    notes,
  });
  console.log("Seeded 1 song.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
