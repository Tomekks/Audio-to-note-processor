import test from "node:test";
import assert from "node:assert/strict";
import { TOKEN_FIELDS } from "./tokenFields.ts";

test("TOKEN_FIELDS matches the spec's allow-list exactly", () => {
  const expected = [
    { property: "--radius", tier: "global", kind: "size" },
    { property: "--sidebar-width", tier: "global", kind: "size" },
    { property: "--color-accent", tier: "brand", kind: "color" },
    { property: "--color-border", tier: "brand", kind: "color" },
    { property: "--background", tier: "brand", kind: "color" },
    { property: "--foreground", tier: "brand", kind: "color" },
    { property: "--toggle-radius", tier: "component", kind: "size" },
    { property: "--toggle-border-color", tier: "component", kind: "color" },
  ];
  assert.deepEqual(TOKEN_FIELDS, expected);
});
