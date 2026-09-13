import test from "node:test";
import assert from "node:assert/strict";
import {
  pitchClassName,
  fretToMidi,
  getDisplayRow,
  stringThickness,
  groupNotesByStep,
  chunk,
  computeStepsPerLine,
  stepIndexForX,
  intersectLoopRangeWithSystem,
  formatSongLength,
} from "./tabNotation.ts";

test("pitchClassName matches standard tuning (E2 A2 D3 G3 B3 E4)", () => {
  // contracts/tab.schema.json's own documented example: [40, 45, 50, 55, 59, 64]
  assert.deepEqual([40, 45, 50, 55, 59, 64].map(pitchClassName), ["E", "A", "D", "G", "B", "E"]);
});

test("pitchClassName wraps correctly for out-of-first-octave MIDI values", () => {
  assert.equal(pitchClassName(0), "C");
  assert.equal(pitchClassName(127), "G");
});

test("fretToMidi adds fret to the string's open pitch", () => {
  assert.equal(fretToMidi([40, 45, 50, 55, 59, 64], 0, 3), 43);
});

test("getDisplayRow: highOnTop flips the stack, false doesn't", () => {
  assert.equal(getDisplayRow(0, 6, true), 5);
  assert.equal(getDisplayRow(0, 6, false), 0);
  assert.equal(getDisplayRow(5, 6, true), 0);
});

test("stringThickness: e/B/G tied thinnest, D/A/E step up (RULES.md rule 7)", () => {
  assert.equal(stringThickness(5, 6), 1.5); // e
  assert.equal(stringThickness(4, 6), 1.5); // B
  assert.equal(stringThickness(3, 6), 1.5); // G
  assert.equal(stringThickness(2, 6), 2.1); // D
  assert.equal(stringThickness(1, 6), 2.7); // A
  assert.equal(stringThickness(0, 6), 3.3); // low E
});

test("groupNotesByStep: sorts by time, single notes become one-note steps", () => {
  const notes = [
    { string: 4, fret: 2, startTimeSec: 1.5, durationSec: 0.5 },
    { string: 5, fret: 0, startTimeSec: 0, durationSec: 0.5 },
  ];
  assert.deepEqual(groupNotesByStep(notes), [[{ string: 5, fret: 0 }], [{ string: 4, fret: 2 }]]);
});

test("groupNotesByStep: notes sharing a startTimeSec become one chord step, not split", () => {
  const notes = [
    { string: 0, fret: 3, startTimeSec: 2, durationSec: 0.5 },
    { string: 1, fret: 2, startTimeSec: 2, durationSec: 0.5 },
    { string: 2, fret: 0, startTimeSec: 2, durationSec: 0.5 },
  ];
  assert.deepEqual(groupNotesByStep(notes), [
    [
      { string: 0, fret: 3 },
      { string: 1, fret: 2 },
      { string: 2, fret: 0 },
    ],
  ]);
});

test("chunk splits into fixed-size groups, last group holds the remainder", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("chunk with a non-positive size returns everything as one chunk", () => {
  assert.deepEqual(chunk([1, 2, 3], 0), [[1, 2, 3]]);
});

test("computeStepsPerLine divides available width, always at least 1", () => {
  assert.equal(computeStepsPerLine(500, 38, 26, 16), 12);
  assert.equal(computeStepsPerLine(10, 38, 26, 16), 1); // narrower than padding alone
});

test("stepIndexForX inverts a system's x-position math, clamped to the step count", () => {
  assert.equal(stepIndexForX(107, 38, 26, 10), 2);
  assert.equal(stepIndexForX(0, 38, 26, 10), 0); // left of the system clamps to 0
  assert.equal(stepIndexForX(10000, 38, 26, 10), 9); // past the end clamps to the last step
});

test("intersectLoopRangeWithSystem: null range stays null", () => {
  assert.equal(intersectLoopRangeWithSystem(null, 0, 16), null);
});

test("intersectLoopRangeWithSystem: clips a global range to the system's local index space", () => {
  assert.deepEqual(intersectLoopRangeWithSystem({ start: 10, end: 20 }, 16, 16), { start: 0, end: 4 });
});

test("intersectLoopRangeWithSystem: a range that doesn't touch this system returns null", () => {
  assert.equal(intersectLoopRangeWithSystem({ start: 0, end: 5 }, 16, 16), null);
});

test("formatSongLength: rounds the last note's end time up to whole seconds, m:ss", () => {
  const notes = [
    { string: 0, fret: 0, startTimeSec: 0, durationSec: 0.5 },
    { string: 0, fret: 0, startTimeSec: 3, durationSec: 1.5 },
  ];
  assert.equal(formatSongLength(notes), "0:05");
});

test("formatSongLength: an empty song is 0:00", () => {
  assert.equal(formatSongLength([]), "0:00");
});
