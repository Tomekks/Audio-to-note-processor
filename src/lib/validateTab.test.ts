import test from "node:test";
import assert from "node:assert/strict";
import { validateTab } from "./validateTab.ts";

const wellFormed = {
  schemaVersion: "1.0.0",
  title: "Practice Riff",
  tuning: [40, 45, 50, 55, 59, 64],
  tempoBpm: 90,
  notes: [{ string: 0, fret: 0, startTimeSec: 0, durationSec: 0.5 }],
};

test("validateTab accepts a well-formed payload", () => {
  assert.doesNotThrow(() => validateTab(wellFormed));
});

test("validateTab throws on a payload missing a required field", () => {
  const missingTuning: Record<string, unknown> = { ...wellFormed };
  delete missingTuning.tuning;
  assert.throws(() => validateTab(missingTuning), /tuning/);
});

test("validateTab throws on a note missing durationSec", () => {
  const badNotes = { ...wellFormed, notes: [{ string: 0, fret: 0, startTimeSec: 0 }] };
  assert.throws(() => validateTab(badNotes), /durationSec/);
});
