import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const tokensPath = join(import.meta.dirname, "tokens.css");
const globalsPath = join(import.meta.dirname, "..", "app", "globals.css");

test("tokens.css exists and defines the migrated design tokens", () => {
  assert.ok(existsSync(tokensPath), "src/styles/tokens.css should exist");
  const contents = readFileSync(tokensPath, "utf8");
  for (const declaration of [
    "--radius: 12px",
    "--sidebar-width: 280px",
    "--color-accent: #cc785c",
    "--color-border: #e6dfd8",
    "--background: #ffffff",
    "--foreground: #171717",
  ]) {
    assert.ok(contents.includes(declaration), `tokens.css should declare ${declaration}`);
  }
});

test("tokens.css defines explicit dark and light theme overrides", () => {
  const contents = readFileSync(tokensPath, "utf8");
  assert.ok(contents.includes('[data-theme="dark"]'), 'tokens.css should define a [data-theme="dark"] override');
  assert.ok(contents.includes('[data-theme="light"]'), 'tokens.css should define a [data-theme="light"] override');
  for (const declaration of [
    "--background: #0a0a0a",
    "--foreground: #ededed",
    "--background: #faf9f5",
    "--foreground: #141413",
  ]) {
    assert.ok(contents.includes(declaration), `tokens.css should declare ${declaration}`);
  }
});

test("globals.css imports tokens.css and no longer declares the migrated tokens directly", () => {
  const contents = readFileSync(globalsPath, "utf8");
  assert.ok(
    contents.includes('@import "../styles/tokens.css"'),
    "globals.css should import the token cascade file"
  );
  for (const declaration of [
    "--radius:",
    "--sidebar-width:",
    "--color-accent: #cc785c",
    "--color-border: #e6dfd8",
    "--background: #ffffff",
    "--foreground: #171717",
  ]) {
    assert.ok(!contents.includes(declaration), `globals.css should no longer directly declare ${declaration}`);
  }
  assert.ok(!contents.includes('[data-theme="light"]'), "globals.css should no longer declare the light theme override");
});

test("the toggle component tier stays wired to its consumer", () => {
  const tokens = readFileSync(tokensPath, "utf8");
  const toggle = readFileSync(join(import.meta.dirname, "..", "components", "StringOrientationToggle.tsx"), "utf8");
  assert.ok(tokens.includes(".dsys-toggle"), "tokens.css should define the component tier class");
  assert.ok(toggle.includes("dsys-toggle"), "the component should carry the component-tier class");
  for (const v of ["--toggle-radius", "--toggle-border-color"]) {
    assert.ok(tokens.includes(`${v}:`), `tokens.css should define ${v}`);
    assert.ok(toggle.includes(`var(${v})`), `the component should read ${v}`);
  }
});
