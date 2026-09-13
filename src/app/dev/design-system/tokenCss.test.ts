import test from "node:test";
import assert from "node:assert/strict";
import { isValidValue, getTokenValue, setTokenValue, resetTokenValues } from "./tokenCss.ts";

test("isValidValue accepts well-formed values and rejects malformed ones", () => {
  assert.ok(isValidValue("color", "#cc785c"));
  assert.ok(isValidValue("color", "#fff"));
  assert.ok(!isValidValue("color", "cc785c"));
  assert.ok(!isValidValue("color", "red"));
  assert.ok(isValidValue("size", "12px"));
  assert.ok(isValidValue("size", "1.5px"));
  assert.ok(!isValidValue("size", "12"));
  assert.ok(!isValidValue("size", "12em"));
});

const FIXTURE = `:root {
  --radius: 12px;
  --color-accent: #cc785c;
}

.dsys-toggle {
  --toggle-radius: var(--radius);
}
`;

test("getTokenValue reads a property's current value", () => {
  assert.equal(getTokenValue(FIXTURE, "--radius"), "12px");
  assert.equal(getTokenValue(FIXTURE, "--color-accent"), "#cc785c");
  assert.equal(getTokenValue(FIXTURE, "--toggle-radius"), "var(--radius)");
});

test("getTokenValue returns undefined for a property with no declaration", () => {
  assert.equal(getTokenValue(FIXTURE, "--sidebar-width"), undefined);
});

test("setTokenValue rewrites only the target property's line", () => {
  const result = setTokenValue(FIXTURE, "--radius", "20px");
  assert.ok(result.includes("--radius: 20px;"));
  assert.ok(result.includes("--color-accent: #cc785c;"), "unrelated property should be untouched");
});

test("setTokenValue does not let a property name that's a substring of another get cross-matched", () => {
  // --radius is a substring of --toggle-radius; confirm editing one never
  // touches the other's declaration.
  const withRadiusEdited = setTokenValue(FIXTURE, "--radius", "20px");
  assert.ok(withRadiusEdited.includes("--toggle-radius: var(--radius);"), "editing --radius should not touch --toggle-radius");

  const withToggleEdited = setTokenValue(FIXTURE, "--toggle-radius", "8px");
  assert.ok(withToggleEdited.includes("--radius: 12px;"), "editing --toggle-radius should not touch --radius");
});

test("setTokenValue throws for a property with no existing declaration", () => {
  assert.throws(() => setTokenValue(FIXTURE, "--sidebar-width", "300px"));
});

test("resetTokenValues restores known properties to their committed values and leaves everything else alone", () => {
  const committed = FIXTURE;
  const edited = setTokenValue(setTokenValue(FIXTURE, "--radius", "99px"), "--color-accent", "#000000");
  const withHandEdit = edited + "\n/* a hand-added comment, untouched by reset */\n";
  const result = resetTokenValues(withHandEdit, committed);
  assert.ok(result.includes("--radius: 12px;"));
  assert.ok(result.includes("--color-accent: #cc785c;"));
  assert.ok(result.includes("/* a hand-added comment, untouched by reset */"));
});
