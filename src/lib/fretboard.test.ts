import test from "node:test";
import assert from "node:assert/strict";
import { getStepWindow, FIXED_CELLS } from "./fretboard.ts";

test("getStepWindow: an all-open step gets a fixed window starting at fret 1 (RULES.md rule 2)", () => {
  assert.deepEqual(getStepWindow([0, 0]), { start: 1, end: FIXED_CELLS });
  assert.deepEqual(getStepWindow([]), { start: 1, end: FIXED_CELLS });
});

test("getStepWindow: a step that fits within FIXED_CELLS gets a uniform-width window anchored at the lowest fret", () => {
  assert.deepEqual(getStepWindow([3]), { start: 3, end: 3 + FIXED_CELLS - 1 });
  assert.deepEqual(getStepWindow([0, 3, 5]), { start: 3, end: 3 + FIXED_CELLS - 1 });
});

test("getStepWindow: a step wider than FIXED_CELLS shows its real span, never truncated (RULES.md rule 1)", () => {
  assert.deepEqual(getStepWindow([2, 9]), { start: 2, end: 9 });
});
