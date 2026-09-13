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
  ]) {
    assert.ok(!contents.includes(declaration), `globals.css should no longer directly declare ${declaration}`);
  }
});
