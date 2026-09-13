import test from "node:test";
import assert from "node:assert/strict";
import { renderAsciiTab } from "./renderTab.ts";

test("renderAsciiTab: a single fretted note lands in its own string's column", () => {
  const notes = [{ string: 0, fret: 3, startTimeSec: 0, durationSec: 0.5 }];
  assert.equal(renderAsciiTab(notes), "E|-3-|\nA|---|\nD|---|\nG|---|\nB|---|\ne|---|");
});

test("renderAsciiTab: the highest string's row label is lowercase", () => {
  const notes = [{ string: 5, fret: 0, startTimeSec: 0, durationSec: 0.5 }];
  assert.ok(renderAsciiTab(notes).split("\n").at(-1)?.startsWith("e|"));
});

test("renderAsciiTab: two-digit frets don't break column width", () => {
  const notes = [{ string: 5, fret: 12, startTimeSec: 0, durationSec: 0.5 }];
  assert.equal(renderAsciiTab(notes).split("\n").at(-1), "e|12-|");
});

test("renderAsciiTab: a chord (shared startTimeSec) puts both notes in the same column", () => {
  const notes = [
    { string: 0, fret: 0, startTimeSec: 0, durationSec: 0.5 },
    { string: 5, fret: 0, startTimeSec: 0, durationSec: 0.5 },
  ];
  const lines = renderAsciiTab(notes).split("\n");
  assert.equal(lines[0], "E|-0-|");
  assert.equal(lines.at(-1), "e|-0-|");
});
