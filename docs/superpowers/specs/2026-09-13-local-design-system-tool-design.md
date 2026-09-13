# Local design-system tool (Phase 1) — design spec

Date: 2026-09-13

## Scope

This spec covers Phase 1 of `docs/superpowers/specs/2026-09-13-ui-design-workflow-design.md`:
a dev-only, in-app tool for editing the design-token cascade live and seeing
the effect on real components immediately, replacing the disconnected static
mockup at `design_system/index.html`.

**Not covered here** (deferred, each a future task if it's ever needed):
- Growing coverage beyond `StringOrientationToggle` — that's Phase 4.
- Per-tier granular reset (component vs. brand vs. global independently) —
  v1 ships one reset control; see "Reset" below for what it actually does.
- Instance-tier tooling — not exercised anywhere yet.
- A second brand / `[data-brand=x]` switching — no second brand exists.

## Problem this solves

`design_system/index.html` is a hand-styled facsimile of the app's
components (534 lines of standalone HTML/CSS), not the real component code.
Tuning it doesn't touch the real app, and applying a result means manually
retyping values into `tokens.css` — the exact copy-paste step this tool
exists to remove. This spec makes the tool render the *actual* live
component, editable in place, writing directly to the real token file.

## Current repo state (verified 2026-09-13)

- `src/styles/tokens.css` holds the global tier (`--radius`,
  `--sidebar-width`) and brand tier (`--color-accent`, `--color-border`),
  plus a component-tier block for `.dsys-toggle` (`--toggle-radius`,
  `--toggle-border-color`). Its own header comment already documents that
  `--background`, `--foreground`, and `[data-theme="light"]` are deliberately
  left in `globals.css` for this phase to migrate.
- `src/app/globals.css` still defines `--background`/`--foreground` directly
  and aliases `--color-accent`/`--color-border` into Tailwind's `@theme
  inline` namespace so utility classes (`bg-accent`, `border-border`, etc.)
  can use them. **Tailwind does not define these values** — it only
  re-exposes whatever `tokens.css` defines under Tailwind's naming scheme.
  `tokens.css` (and, for the toggle, the `.dsys-toggle` block) is the one
  source of truth.
- No `middleware.ts` exists anywhere in the repo. Confirmed via
  `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`:
  "If the environment variable `NODE_ENV` is unassigned, Next.js
  automatically assigns `development` when running the `next dev` command,
  or `production` for all other commands" — so a plain
  `process.env.NODE_ENV !== 'development'` check in the route/handler
  themselves is sufficient; no middleware needed.
- No deploy config exists (no Dockerfile, no Vercel config) — the app isn't
  deployed anywhere yet as far as the repo shows.
- `StringOrientationToggle` (shared by `FretboardDiagram` and
  `SheetDiagram`) is the only component on the cascade's component tier.

## Design

### Route & gating

`src/app/dev/design-system/page.tsx` — a Server Component. First line checks
`process.env.NODE_ENV !== 'development'` and calls `notFound()` if so. The
API route below repeats the same check independently (defense in depth: the
page and the API are two separate entry points, and either one being
reachable without the other guarded would defeat the purpose).

### Token editing

One Route Handler, colocated at `src/app/dev/design-system/api/tokens/route.ts`.

`PATCH` body: `{ property: string, value: string }`.

- `property` is checked against a hardcoded allow-list — the exact set of
  custom properties this tool knows about (see "Token fields" below). Any
  other value is rejected (400), never written.
- `value` is checked against a shape matching that property's kind before
  writing: color properties must match `/^#[0-9a-fA-F]{3,8}$/`; size
  properties must match `/^\d+(\.\d+)?px$/`. Anything else is rejected
  (400). This is a real trust boundary — the endpoint only exists in dev,
  but anything on the machine can reach it, and it writes straight into a
  CSS file the whole live app imports.
- On a valid request, it reads `tokens.css`, replaces that property's
  declaration line in place with a line-anchored regex (each declaration is
  single-line and semicolon-terminated today — verified against the actual
  file), and writes the file back. If the property's line isn't found, the
  handler fails loudly (500 with a clear message) rather than silently
  no-op-succeeding.

### Reset

One button, one `POST` to a dedicated sibling route,
`src/app/dev/design-system/api/tokens/reset/route.ts` — kept separate from the
edit endpoint rather than overloaded onto it, since the two have different
request shapes (reset takes no body) and different trust-boundary checks
(no `property`/`value` validation applies here). It does
**not** overwrite the whole file. For each property in the allow-list, it
reads that property's currently-*committed* value (`git show
HEAD:src/styles/tokens.css`, parsed once, matched per property) and rewrites
just that property's line in the live file to match — using the exact same
per-line regex replace as the edit path. Any line in the file that isn't one
of the tool's known properties is never touched, whether it was hand-edited,
committed, or not.

This means "reset" = "back to what's currently committed," which is the
correct reading of "default" here since `tokens.css`'s committed state *is*
the only defaults that exist in this system — there's no separate defaults
source (Tailwind's own built-in scale doesn't drive any of these properties,
per "Current repo state" above).

**No separate backup file.** Git already is the safety net: nothing is lost
until you deliberately `git commit` over an experimental value, the same as
any other change in this repo. A second backup mechanism would duplicate
that without adding real protection, and would raise its own staleness
questions (when does it refresh?) that git doesn't have.

### Token fields (the allow-list)

| Property | Tier | Kind |
|---|---|---|
| `--radius` | global | size |
| `--sidebar-width` | global | size |
| `--color-accent` | brand | color |
| `--color-border` | brand | color |
| `--background` | brand | color |
| `--foreground` | brand | color |
| `--toggle-radius` | component | size |
| `--toggle-border-color` | component | color |

This same list drives both the API's allow-list and the page's editable
fields — defined once (a shared const/type in one file both import), so a
typo in either place is a compile error, not a silent runtime mismatch.

### Palette migration

Move `--background`, `--foreground`, and `[data-theme="light"]` out of
`globals.css` into `tokens.css`'s brand tier, values unchanged. Add an
explicit `[data-theme="dark"]` block (today dark only ever comes from
`prefers-color-scheme`) so the tool's theme switcher can force either mode
regardless of the OS setting. `globals.css` keeps only the `@theme inline`
Tailwind aliasing and the `body` rule.

### The page

Renders the real `StringOrientationToggle` (both its states, toggleable),
with one labeled input per row of the table above, a light/dark switcher
(sets a `data-theme` attribute on the preview wrapper client-side — this is
a preview-only control, never written to disk), and one Reset button.
Editing a field calls the `PATCH` endpoint; Next's file watcher picks up the
resulting `tokens.css` change and hot-reloads every open tab of the app,
not just this page.

### Testing

The regex replace, the allow-list validation, and the reset logic are pure
enough to unit test with `node:test` against in-memory fixture strings (not
the real file) — matching the repo's existing test conventions. The page's
rendering and hot-reload behavior are verified manually via `npm run dev` +
browser, matching Phase 0's convention for this class of component (no DOM
test harness in this repo, by deliberate choice).

## Definition of done

- `/dev/design-system` renders `StringOrientationToggle` live, editable via the
  fields in the table above, backed by real writes to `tokens.css`.
- Editing a field updates the live app (not just the tool's own page) via
  hot reload.
- Reset restores every allow-listed property to its currently-committed
  value, and never touches any other line in the file.
- `--background`, `--foreground`, and the theme overrides live in
  `tokens.css`; `globals.css` no longer declares them directly.
- Visiting `/dev/design-system` (page or API) in a production build (`next
  build && next start`) returns a 404.
- `design_system/index.html` is deleted.
- `npm run verify:full` passes.
