# Local Design-System Tool (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only `/dev/design-system` route that renders the real
`StringOrientationToggle` live, lets you edit its token cascade values in
place (writing straight to `src/styles/tokens.css`), and reset those edits
back to whatever's currently committed — replacing the disconnected static
mockup at `design_system/index.html`.

**Architecture:** A shared allow-list module (`tokenFields.ts`) names the
exact 8 CSS custom properties this tool knows about; a pure, dependency-free
module (`tokenCss.ts`) knows how to read, validate, rewrite, and reset those
properties inside a CSS text blob; two Route Handlers do the file/git I/O
around those pure functions; one client page wires them to real inputs and
the real `StringOrientationToggle`. Everything is gated to development only,
checked independently in the page and in each route.

**Tech Stack:** Next.js 16 App Router (Route Handlers, `notFound()`), plain
`node:fs`/`node:child_process` (no new dependency), `node:test` for unit
tests (already the repo's runner).

**Spec:** `docs/superpowers/specs/2026-09-13-local-design-system-tool-design.md`
— read it before starting; it documents the current repo state (verified
2026-09-13) that this plan builds on, including the fact that Tailwind does
not define these tokens' values, `tokens.css` does.

## Global Constraints

- Route lives at `/dev/design-system` (`src/app/dev/design-system/`). Both the page
  and every Route Handler under it check
  `process.env.NODE_ENV !== "development"` independently and call
  `notFound()` if so — confirmed via
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
  that `notFound()` works in both Server Components and Route Handlers in
  this Next version, and that `next build`/`next start` always run with
  `NODE_ENV=production` unless overridden.
- Reset never overwrites the whole `tokens.css` file — only the 8
  allow-listed properties, each restored to its currently git-committed
  (`HEAD`) value. Anything else in the file, hand-edited or not, committed
  or not, is left untouched.
- The allow-list (`TOKEN_FIELDS`) is defined once in `tokenFields.ts` and
  imported everywhere it's needed (API validation, the page's fields) — no
  second copy of the property list anywhere.
- No new dependency. Plain `fs`, `child_process` (`git show`), hand-rolled
  regex validation.
- Pure CSS-editing logic (`tokenCss.ts`) is unit-tested with `node:test`
  against in-memory fixture strings, never the real file. The Route
  Handlers and the page itself are thin I/O/UI wrappers around that already-
  tested logic and are verified manually via `npm run dev` — matching this
  repo's existing convention for this class of component (no DOM test
  harness by deliberate choice, per the Phase 0 plan).
- `design_system/index.html` is deleted once this tool covers its role.

---

### Task 1: Migrate `--background`/`--foreground`/theme overrides into the token cascade

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/app/globals.css`
- Modify: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: nothing new — extends Phase 0's existing `tokens.css` structure.
- Produces: `--background` (`#ffffff`) and `--foreground` (`#171717`) now
  defined in `tokens.css`'s brand tier, plus explicit `[data-theme="dark"]`
  (`#0a0a0a`/`#ededed`) and `[data-theme="light"]` (`#faf9f5`/`#141413`)
  blocks. Task 2's `TOKEN_FIELDS` allow-list references `--background` and
  `--foreground` by these same names.

- [ ] **Step 1: Write the failing test additions**

Replace `src/styles/tokens.test.ts` with:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify the two new ones fail**

Run: `node --test src/styles/tokens.test.ts`
Expected: the two pre-existing tests still PASS; "defines the migrated
design tokens" and "no longer declares the migrated tokens directly" now
FAIL (missing `--background`/`--foreground` in `tokens.css`, still present
in `globals.css`); "defines explicit dark and light theme overrides" FAILS
(no `[data-theme="dark"]` yet).

- [ ] **Step 3: Rewrite `src/styles/tokens.css`**

```css
/* Design-system token cascade: global -> brand -> component -> instance.
   Migrated from globals.css's former flat block (2026-09-13) -- values
   unchanged, now organized so a tier can be extended without
   restructuring the ones below it. See
   docs/superpowers/specs/2026-09-13-ui-design-workflow-design.md for the
   full design.

   Brand tier's --background/--foreground and theme overrides joined this
   file 2026-09-13 too (Phase 1) -- previously left in globals.css on
   purpose until the local design-system tool needed them.

   Component-tier classes use a `dsys-` prefix (e.g. .dsys-toggle) --
   follow that convention for new ones rather than inventing another. */

:root {
  /* Global tier: values with no brand identity of their own. */
  --radius: 12px;
  --sidebar-width: 280px;

  /* Brand tier ("default", the only brand today). Kept at :root rather
     than under a `[data-brand="default"]` selector because there is
     nothing to select between yet -- promote this block to that selector
     (and add the attribute to the app shell) the moment a second brand
     exists. Do not add the attribute speculatively before then. */
  --color-accent: #cc785c;
  --color-border: #e6dfd8;
  --background: #ffffff;
  --foreground: #171717;
}

/* Brand tier, dark mode default: applies when the OS prefers dark and no
   explicit [data-theme] override below matches. */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

/* Brand tier, explicit theme overrides -- either one wins over the OS
   preference above regardless of it, since these come later in the
   cascade and match on a strictly narrower selector. */
[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ededed;
}

[data-theme="light"] {
  --background: #faf9f5;
  --foreground: #141413;
}

/* Component tier: StringOrientationToggle (shared by FretboardDiagram and
   SheetDiagram). Reset = delete this block; values fall back to the
   tiers above. */
.dsys-toggle {
  --toggle-radius: var(--radius);
  --toggle-border-color: var(--color-border);
}
```

- [ ] **Step 4: Rewrite `src/app/globals.css`**

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Only color tokens are promoted into Tailwind's utility-generating
     namespace -- radius/sidebar-width stay plain CSS vars, consumed via
     arbitrary-value syntax or inline style. See src/styles/tokens.css. */
  --color-accent: var(--color-accent);
  --color-border: var(--color-border);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test src/styles/tokens.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 6: Manual visual check (values are unchanged, so this should be a no-op)**

```bash
npm run dev
```

Open `http://localhost:3000/` — confirm it looks identical to before (same
background/foreground colors in both light and dark OS mode). This is a
pure refactor: nothing should visibly change.

- [ ] **Step 7: Run verify**

Run: `npm run verify`
Expected: typecheck, lint, and all unit tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/app/globals.css src/styles/tokens.test.ts
git commit -m "feat: migrate background/foreground theme tokens into the cascade"
```

---

### Task 2: Token allow-list and pure CSS-editing functions

**Files:**
- Create: `src/app/dev/design-system/tokenFields.ts`
- Create: `src/app/dev/design-system/tokenFields.test.ts`
- Create: `src/app/dev/design-system/tokenCss.ts`
- Create: `src/app/dev/design-system/tokenCss.test.ts`

**Interfaces:**
- Consumes: nothing new — operates on plain CSS text (fixture strings in
  tests; the real `tokens.css` content once wired up in Tasks 3–4).
- Produces: `TOKEN_FIELDS: TokenField[]` where
  `TokenField = { property: string; tier: "global" | "brand" | "component"; kind: "color" | "size" }`;
  `isValidValue(kind: TokenField["kind"], value: string): boolean`;
  `getTokenValue(cssText: string, property: string): string | undefined`;
  `setTokenValue(cssText: string, property: string, value: string): string`
  (throws `Error` if the property has no existing declaration);
  `resetTokenValues(cssText: string, committedCssText: string): string`.
  Task 3 consumes `TOKEN_FIELDS`, `isValidValue`, `setTokenValue`. Task 4
  consumes `resetTokenValues`. Task 5 consumes `TOKEN_FIELDS`.

- [ ] **Step 1: Write the failing test for the allow-list**

Create `src/app/dev/design-system/tokenFields.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { TOKEN_FIELDS } from "./tokenFields";

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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/app/dev/design-system/tokenFields.test.ts`
Expected: FAIL — `./tokenFields` does not exist yet.

- [ ] **Step 3: Create `src/app/dev/design-system/tokenFields.ts`**

```typescript
// Single source of truth for which design tokens the /dev/design-system tool
// can edit -- both the API routes' validation allow-list and the page's
// editable fields read from this same array, so a typo in one place is a
// compile error, not a silent mismatch between what the UI shows and what
// the API accepts.
//
// See docs/superpowers/specs/2026-09-13-local-design-system-tool-design.md
// ("Token fields (the allow-list)") for why exactly these eight.

export type TokenTier = "global" | "brand" | "component";
export type TokenKind = "color" | "size";

export type TokenField = {
  property: string;
  tier: TokenTier;
  kind: TokenKind;
};

export const TOKEN_FIELDS: TokenField[] = [
  { property: "--radius", tier: "global", kind: "size" },
  { property: "--sidebar-width", tier: "global", kind: "size" },
  { property: "--color-accent", tier: "brand", kind: "color" },
  { property: "--color-border", tier: "brand", kind: "color" },
  { property: "--background", tier: "brand", kind: "color" },
  { property: "--foreground", tier: "brand", kind: "color" },
  { property: "--toggle-radius", tier: "component", kind: "size" },
  { property: "--toggle-border-color", tier: "component", kind: "color" },
];
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/app/dev/design-system/tokenFields.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing tests for the pure CSS functions**

Create `src/app/dev/design-system/tokenCss.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { isValidValue, getTokenValue, setTokenValue, resetTokenValues } from "./tokenCss";

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
```

- [ ] **Step 6: Run it to verify it fails**

Run: `node --test src/app/dev/design-system/tokenCss.test.ts`
Expected: FAIL — `./tokenCss` does not exist yet.

- [ ] **Step 7: Create `src/app/dev/design-system/tokenCss.ts`**

```typescript
import { TOKEN_FIELDS, type TokenField } from "./tokenFields";

const COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
const SIZE_PATTERN = /^\d+(\.\d+)?px$/;

// Validates a value's shape against its token's kind -- a real trust
// boundary check, not cosmetic: this runs before anything is written into
// tokens.css, the file the whole live app imports.
export function isValidValue(kind: TokenField["kind"], value: string): boolean {
  return kind === "color" ? COLOR_PATTERN.test(value) : SIZE_PATTERN.test(value);
}

function declarationRegex(property: string): RegExp {
  // Matches a single-line, semicolon-terminated custom-property
  // declaration for exactly this property name -- anchored on the leading
  // `--name:` right after optional indentation, so e.g. `--radius` never
  // matches inside `--toggle-radius`.
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^([ \\t]*${escaped}:[ \\t]*).*?;`, "m");
}

// Reads a property's current value out of a tokens.css text blob.
// Returns undefined if the property has no declaration in this text.
export function getTokenValue(cssText: string, property: string): string | undefined {
  const match = declarationRegex(property).exec(cssText);
  if (!match) return undefined;
  return match[0].slice(match[1].length, -1).trim();
}

// Rewrites one property's declaration line in place. Throws if the
// property has no existing declaration to rewrite -- failing loudly
// rather than silently no-op-succeeding, since a caller that thinks it
// wrote a value it didn't would be a worse bug than a thrown error.
export function setTokenValue(cssText: string, property: string, value: string): string {
  const match = declarationRegex(property).exec(cssText);
  if (!match) {
    throw new Error(`tokens.css has no existing declaration for ${property}`);
  }
  const prefix = match[1];
  const start = match.index;
  const end = match.index + match[0].length;
  return cssText.slice(0, start) + prefix + value + ";" + cssText.slice(end);
}

// Resets every known token field to its value in `committedCssText`
// (typically the git HEAD copy of tokens.css), rewriting only those
// fields' own lines in `cssText` -- anything else in the file, edited by
// the tool or by hand, committed or not, is left untouched.
export function resetTokenValues(cssText: string, committedCssText: string): string {
  let result = cssText;
  for (const field of TOKEN_FIELDS) {
    const committedValue = getTokenValue(committedCssText, field.property);
    if (committedValue === undefined) continue;
    result = setTokenValue(result, field.property, committedValue);
  }
  return result;
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `node --test src/app/dev/design-system/tokenCss.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 9: Run verify**

Run: `npm run verify`
Expected: typecheck, lint, and all unit tests (including the new files)
pass.

- [ ] **Step 10: Commit**

```bash
git add src/app/dev/design-system/tokenFields.ts src/app/dev/design-system/tokenFields.test.ts src/app/dev/design-system/tokenCss.ts src/app/dev/design-system/tokenCss.test.ts
git commit -m "feat: add design-token allow-list and pure CSS edit/reset functions"
```

---

### Task 3: Token editing API route

**Files:**
- Create: `src/app/dev/design-system/api/tokens/route.ts`

**Interfaces:**
- Consumes: `TOKEN_FIELDS` from `../../tokenFields`; `isValidValue`,
  `setTokenValue` from `../../tokenCss` (both from Task 2).
- Produces: a `PATCH` handler at `/dev/design-system/api/tokens`. Task 5's page
  calls it with `fetch("/dev/design-system/api/tokens", { method: "PATCH", body: JSON.stringify({ property, value }) })`.

This task's route logic is a thin I/O wrapper around Task 2's already-unit-
tested pure functions — per this repo's convention (see the Global
Constraints), it's verified manually rather than with an automated route
test, since a real test would mean writing to the real `tokens.css` from
the test suite.

- [ ] **Step 1: Create `src/app/dev/design-system/api/tokens/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TOKEN_FIELDS } from "../../tokenFields";
import { isValidValue, setTokenValue } from "../../tokenCss";

const TOKENS_CSS_PATH = path.join(process.cwd(), "src", "styles", "tokens.css");

type EditRequestBody = { property?: unknown; value?: unknown };

export async function PATCH(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const body = (await request.json().catch(() => null)) as EditRequestBody | null;
  const property = typeof body?.property === "string" ? body.property : null;
  const value = typeof body?.value === "string" ? body.value : null;

  if (property === null || value === null) {
    return NextResponse.json({ error: "property and value must be strings" }, { status: 400 });
  }

  const field = TOKEN_FIELDS.find((f) => f.property === property);
  if (!field || !isValidValue(field.kind, value)) {
    return NextResponse.json({ error: "invalid property or value" }, { status: 400 });
  }

  const cssText = readFileSync(TOKENS_CSS_PATH, "utf8");
  let updated: string;
  try {
    updated = setTokenValue(cssText, property, value);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  writeFileSync(TOKENS_CSS_PATH, updated, "utf8");

  return NextResponse.json({ property, value });
}
```

- [ ] **Step 2: Run verify (typecheck + lint catch mistakes here even without a route test)**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

In another terminal:

```bash
curl -i -X PATCH http://localhost:3000/dev/design-system/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"property": "--color-accent", "value": "#000000"}'
```

Expected: `200`, body `{"property":"--color-accent","value":"#000000"}`.
Confirm the file changed: `grep -- "--color-accent:" src/styles/tokens.css`
should show `#000000`. Open `http://localhost:3000/` — the accent color
should have visibly changed after Next's hot reload picks up the file
change.

```bash
curl -i -X PATCH http://localhost:3000/dev/design-system/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"property": "--not-a-real-token", "value": "#000000"}'
```

Expected: `400`.

```bash
curl -i -X PATCH http://localhost:3000/dev/design-system/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"property": "--color-accent", "value": "not-a-color"}'
```

Expected: `400` (fails `isValidValue`).

- [ ] **Step 4: Revert the manual test edit**

```bash
git checkout -- src/styles/tokens.css
```

(Task 4 will build the reset endpoint that does this for real; for now,
restore the working tree by hand so the commit below is clean.)

- [ ] **Step 5: Commit**

```bash
git add src/app/dev/design-system/api/tokens/route.ts
git commit -m "feat: add the design-token editing API route"
```

---

### Task 4: Token reset API route

**Files:**
- Create: `src/app/dev/design-system/api/tokens/reset/route.ts`

**Interfaces:**
- Consumes: `resetTokenValues` from `../../../tokenCss` (Task 2).
- Produces: a `POST` handler at `/dev/design-system/api/tokens/reset`, no
  request body. Task 5's page calls it with
  `fetch("/dev/design-system/api/tokens/reset", { method: "POST" })`.

- [ ] **Step 1: Create `src/app/dev/design-system/api/tokens/reset/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resetTokenValues } from "../../../tokenCss";

const TOKENS_CSS_RELATIVE_PATH = "src/styles/tokens.css";
const TOKENS_CSS_PATH = path.join(process.cwd(), TOKENS_CSS_RELATIVE_PATH);

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const cssText = readFileSync(TOKENS_CSS_PATH, "utf8");
  const committedCssText = execFileSync(
    "git",
    ["show", `HEAD:${TOKENS_CSS_RELATIVE_PATH}`],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  const reset = resetTokenValues(cssText, committedCssText);
  writeFileSync(TOKENS_CSS_PATH, reset, "utf8");

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Run verify**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 3: Manual verification — this is the important one, since it proves the non-destructive reset behavior the spec exists to guarantee**

With `npm run dev` still running:

```bash
curl -s -X PATCH http://localhost:3000/dev/design-system/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"property": "--radius", "value": "40px"}' > /dev/null

grep -- "--radius:" src/styles/tokens.css
# Expect: --radius: 40px;

curl -s -X POST http://localhost:3000/dev/design-system/api/tokens/reset > /dev/null

grep -- "--radius:" src/styles/tokens.css
# Expect: --radius: 12px;  (back to the committed value)

git status --short src/styles/tokens.css
# Expect: no output -- reset restored the file to exactly its committed content
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dev/design-system/api/tokens/reset/route.ts
git commit -m "feat: add the design-token reset API route"
```

---

### Task 5: The `/dev/design-system` page

**Files:**
- Create: `src/app/dev/design-system/page.tsx`
- Create: `src/app/dev/design-system/DesignSystemTool.tsx`

**Interfaces:**
- Consumes: `TOKEN_FIELDS` from `./tokenFields` (Task 2);
  `StringOrientationToggle` from `@/components/StringOrientationToggle`
  (existing); the two API routes from Tasks 3–4.
- Produces: the `/dev/design-system` page itself — nothing later in this plan
  consumes it.

- [ ] **Step 1: Create `src/app/dev/design-system/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { DesignSystemTool } from "./DesignSystemTool";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DesignSystemTool />;
}
```

- [ ] **Step 2: Create `src/app/dev/design-system/DesignSystemTool.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import { TOKEN_FIELDS } from "./tokenFields";

function readCurrentValues(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  for (const field of TOKEN_FIELDS) {
    values[field.property] = style.getPropertyValue(field.property).trim();
  }
  return values;
}

export function DesignSystemTool() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [highOnTop, setHighOnTop] = useState(false);

  useEffect(() => {
    setValues(readCurrentValues());
  }, []);

  function handleFieldChange(property: string, value: string) {
    setValues((prev) => ({ ...prev, [property]: value }));
  }

  async function handleFieldCommit(property: string, value: string) {
    await fetch("/dev/design-system/api/tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property, value }),
    });
  }

  async function handleReset() {
    await fetch("/dev/design-system/api/tokens/reset", { method: "POST" });
    setValues(readCurrentValues());
  }

  return (
    <div data-theme={theme === "system" ? undefined : theme} className="min-h-screen p-8">
      <h1 className="text-xl font-semibold mb-6">Design System</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">Theme</h2>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className="rounded-[var(--radius)] border px-3 py-1.5 text-sm"
              style={{
                borderColor: "var(--color-border)",
                fontWeight: theme === option ? 600 : 400,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">StringOrientationToggle</h2>
        <StringOrientationToggle highOnTop={highOnTop} onToggle={() => setHighOnTop((v) => !v)} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wide mb-2">Tokens</h2>
        <div className="flex flex-col gap-3">
          {TOKEN_FIELDS.map((field) => (
            <label key={field.property} className="flex items-center gap-3 text-sm">
              <span className="w-48 font-mono">{field.property}</span>
              <span className="w-24 text-xs uppercase" style={{ color: "var(--color-border)" }}>
                {field.tier}
              </span>
              <input
                type="text"
                value={values[field.property] ?? ""}
                onChange={(e) => handleFieldChange(field.property, e.target.value)}
                onBlur={(e) => handleFieldCommit(field.property, e.target.value)}
                className="rounded-[var(--radius)] border px-2 py-1 font-mono text-sm"
                style={{ borderColor: "var(--color-border)" }}
              />
            </label>
          ))}
        </div>
      </section>

      <button
        onClick={handleReset}
        className="rounded-[var(--radius)] border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--color-border)" }}
      >
        Reset all
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run verify**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 4: Manual verification in the browser**

```bash
npm run dev
```

1. Open `http://localhost:3000/dev/design-system`. Confirm the page loads: a
   theme switcher, the real toggle button, one row per token field, and a
   "Reset all" button.
2. Change the `--color-accent` field's input and click elsewhere (blur it).
   Open `http://localhost:3000/` in a second tab — confirm the accent
   color there has updated too (same hot reload as Task 3's manual check,
   now driven from the UI instead of curl).
3. Click "Reset all". Confirm the field goes back to `#cc785c` and
   `git status --short src/styles/tokens.css` shows no changes.
4. Click the "dark" theme button — confirm the toggle button's border
   color and the page background switch to the dark values, regardless of
   your OS's current appearance setting. Click "light", confirm the same
   in the other direction. Click "system", confirm it now follows the OS
   setting again.

- [ ] **Step 5: Confirm the production gate**

```bash
# stop npm run dev first (Ctrl-C)
npm run build
npm run start
```

In another terminal:

```bash
curl -i http://localhost:3000/dev/design-system
# Expect: 404

curl -i -X PATCH http://localhost:3000/dev/design-system/api/tokens \
  -H "Content-Type: application/json" -d '{"property":"--radius","value":"1px"}'
# Expect: 404
```

Stop `npm run start` (Ctrl-C) once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/app/dev/design-system/page.tsx src/app/dev/design-system/DesignSystemTool.tsx
git commit -m "feat: add the /dev/design-system live token-editing page"
```

---

### Task 6: Remove the replaced static mockup and do a final full verify

**Files:**
- Delete: `design_system/index.html`
- Delete: `design_system/` (now empty)

- [ ] **Step 1: Delete the old tool**

```bash
rm -rf design_system
```

- [ ] **Step 2: Run the full verify, including a production build**

Run: `npm run verify:full`
Expected: PASS — typecheck, lint, all unit tests, and the production build
all succeed with `design_system/` gone.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete design_system/index.html, replaced by the /dev/design-system tool"
```

## Definition of done

- `/dev/design-system` renders `StringOrientationToggle` live, editable via the
  8 fields in `TOKEN_FIELDS`, backed by real writes to `tokens.css`.
- Editing a field updates the live app (not just the tool's own page) via
  hot reload.
- Reset restores every allow-listed property to its currently-committed
  value, and never touches any other line in the file (verified in Task 4,
  Step 3, via `git status` showing a clean file afterward).
- `--background`, `--foreground`, and the theme overrides live in
  `tokens.css`; `globals.css` no longer declares them directly.
- Visiting `/dev/design-system` (page or API) in a production build (`next
  build && next start`) returns a 404.
- `design_system/index.html` is deleted.
- `npm run verify:full` passes.
