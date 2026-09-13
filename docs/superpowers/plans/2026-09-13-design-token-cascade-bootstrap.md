# Design Token Cascade Bootstrap (Phase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalize the app's already-live design tokens into an
extensible global → brand → component cascade, and prove the cascade
works end-to-end by migrating one real, multi-use component onto it.

**Architecture:** The tokens currently live as a flat block inside
`globals.css`, misleadingly commented as "studio only" even though
they're used pervasively across the live app. This plan extracts them,
unchanged in value, into a new `src/styles/tokens.css` organized by tier
(global, then brand — one brand today, structured so a second can be
added without restructuring). It then migrates `StringOrientationToggle`
(used by both `FretboardDiagram` and `SheetDiagram`) onto a component-tier
block, which also fixes two small pre-existing inconsistencies: a one-off
border color instead of the shared token, and Tailwind's default radius
instead of the app's actual shared radius.

**Tech Stack:** Next.js (App Router) + Tailwind CSS v4 (`@theme inline`) +
plain CSS custom properties. Tests via `node --test` (already the repo's
unit-test runner) — no new dependency added.

**Spec:** `docs/superpowers/specs/2026-09-13-ui-design-workflow-design.md`
(Phase 0, and its "Current repo state" section — read that section before
starting; it documents exactly which tokens are live vs. dead, verified by
grep, not by trusting the code's own comments).

## Global Constraints

- Token cascade tiers: global → brand → component → instance (spec,
  "Token architecture"). This plan only reaches global/brand/component —
  instance tier is architecture, not exercised yet.
- Token file lives at `src/styles/tokens.css`, imported into `globals.css`
  (spec, "Token architecture").
- Format is plain CSS custom properties — no CSS-in-JS, no new build
  dependency (spec, "Token architecture").
- Reset semantics: deleting an override at any tier falls back to the
  tier below; never a restructure (spec, "Token architecture").
- This repo has no component/DOM test harness (no jsdom, no React Testing
  Library) and its one Playwright suite is a slow build-and-boot check,
  not built for tight iteration (see `playwright.config.ts`'s own doc
  comment). Do not add one for this plan — visual correctness for the one
  component task is verified manually, matching the existing convention in
  `FretboardDiagram.RULES.md` / `SheetDiagram.RULES.md` for this exact
  class of component.

---

### Task 1: Migrate the live tokens into `src/styles/tokens.css`

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/tokens.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing (first task in the sequence).
- Produces: CSS custom properties `--radius`, `--sidebar-width`,
  `--color-accent`, `--color-border`, defined in `src/styles/tokens.css`
  and imported by `globals.css`. Task 2 consumes `--radius` and
  `--color-border` by reference (`var(--radius)`, `var(--color-border)`).

- [ ] **Step 1: Re-verify repo state, then commit the pending `/studio` deletion (housekeeping, not part of this task's test cycle)**

If executing this plan significantly later than 2026-09-13, redo the spec's
"Current repo state" grep checks first (do `--color-accent`, `--color-border`,
`--radius`, `--sidebar-width` still resolve to the same live components?)
before trusting the values below — don't assume the snapshot still holds.

```bash
git status --short   # confirm it still shows: D src/app/studio/page.tsx
git add -A
git commit -m "chore: remove deleted /studio route file"
```

- [ ] **Step 2: Write the failing test**

Create `src/styles/tokens.test.ts`:

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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test src/styles/tokens.test.ts`
Expected: FAIL — `src/styles/tokens.css` does not exist yet (first
assertion throws/fails).

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
/* Design-system token cascade: global -> brand -> component -> instance.
   Migrated from globals.css's former flat block (2026-09-13) -- values
   unchanged, now organized so a tier can be extended without
   restructuring the ones below it. See
   docs/superpowers/specs/2026-09-13-ui-design-workflow-design.md for the
   full design. */

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
}
```

- [ ] **Step 5: Modify `src/app/globals.css`**

Replace the entire file with:

```css
@import "tailwindcss";
@import "../styles/tokens.css";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

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

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

[data-theme="light"] {
  --background: #faf9f5;
  --foreground: #141413;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test src/styles/tokens.test.ts`
Expected: PASS (both tests).

- [ ] **Step 7: Run full verify**

Run: `npm run verify`
Expected: typecheck, lint, and all unit tests pass (this also runs the
new test file as part of the suite).

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts src/app/globals.css
git commit -m "feat: migrate design tokens into a global/brand cascade file"
```

---

### Task 2: Migrate `StringOrientationToggle` onto the component tier

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/components/StringOrientationToggle.tsx`

**Interfaces:**
- Consumes: `--radius`, `--color-border` from `src/styles/tokens.css`
  (produced by Task 1).
- Produces: `.dsys-toggle` component-tier class and `--toggle-radius`,
  `--toggle-border-color` custom properties — nothing later in this plan
  consumes these, but Phase 4 (future, separate plan) will follow the
  same pattern for the next component.

- [ ] **Step 1: Add the component tier to `src/styles/tokens.css`**

Append to the end of the file:

```css

/* Component tier: StringOrientationToggle (shared by FretboardDiagram and
   SheetDiagram). Reset = delete this block; values fall back to the
   tiers above. */
.dsys-toggle {
  --toggle-radius: var(--radius);
  --toggle-border-color: var(--color-border);
}
```

- [ ] **Step 2: Modify `src/components/StringOrientationToggle.tsx`**

Replace the file's contents with:

```typescript
"use client";

// Shared by SheetDiagram and FretboardDiagram (2026-09-10) -- both views need
// the exact same "flip which end is on top" control, and it should look
// identical in both places rather than two independently-styled buttons that
// happen to say similar things. Extracted the same way tabNotation.ts's
// helpers were: once a second component needed it, not before.
//
// Styled through the design-token cascade (2026-09-13, see
// src/styles/tokens.css) rather than a one-off color-mix() and Tailwind's
// default radius -- this used to be the one shared control that didn't
// match the rest of the app's border/radius tokens.
export function StringOrientationToggle({ highOnTop, onToggle }: { highOnTop: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="dsys-toggle inline-flex items-center gap-1.5 rounded-[var(--toggle-radius)] border px-3 py-1.5 text-sm font-medium hover:opacity-70"
      style={{ borderColor: "var(--toggle-border-color)" }}
    >
      Flip to {highOnTop ? "thick E" : "thin e"} on top
    </button>
  );
}
```

This is a genuine, small visual change: the button's corners go from
Tailwind's default 6px (`rounded-md`) to the app's actual shared 12px
(`var(--radius)`), and its border color changes from a one-off
`color-mix(in srgb, var(--foreground) 25%, transparent)` to the shared
`--color-border` (`#e6dfd8`) already used by `AppHeader`, `DetailToolbar`,
`TabSelector`, and `StudioShell`. This is the intended fix — the toggle
becomes visually consistent with the rest of the app — not a regression.

- [ ] **Step 3: Run full verify**

Run: `npm run verify`
Expected: typecheck and lint pass (this is a styling-only change; no unit
test exercises this component's JSX, consistent with the rest of this
repo's visual components).

- [ ] **Step 4: Manual visual verification**

```bash
npm run dev
```

Then in a browser:
1. Open `http://localhost:3000/`.
2. If the song list is empty, stop the server, run `npm run db:seed`,
   then restart `npm run dev`.
3. Select the song **"Practice Riff"**.
4. The **Sheet** tab is active by default — confirm the "Flip to thin e on
   top" / "Flip to thick E on top" button now has visibly rounder corners
   than before (12px, matching the rounding on the song list rows) and a
   border color matching the hairline borders elsewhere on the page (e.g.
   the line under the header).
5. Switch to the **Fretboard** tab and confirm the same toggle looks
   identical there (it's the same shared component).

- [ ] **Step 5: Run the full check including a production build**

Run: `npm run verify:full`
Expected: PASS, including the production build — confirms the new
`@import` resolves correctly outside of dev mode too, not just under
`next dev`.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/components/StringOrientationToggle.tsx
git commit -m "feat: migrate StringOrientationToggle onto the token cascade's component tier"
```

---

## Definition of done for this plan

- `src/styles/tokens.css` exists, holds the app's real global/brand tokens
  with unchanged values, and is imported by `globals.css`.
- `globals.css` no longer directly declares the migrated tokens, and its
  stale `/studio`-only comments are gone.
- `StringOrientationToggle` reads its radius and border color from the
  cascade, resolving to the app's actual shared values (12px radius,
  `#e6dfd8` border) instead of its previous one-off values.
- `npm run verify:full` passes.
- The pending `/studio` deletion is committed; `git status` is clean.
- This closes Phase 0 of the spec. Phase 1 (the local dev-only
  design-system tool) is a separate plan, written once this one is done
  and merged — its exact shape depends on what this phase actually
  produces.
