# UI design workflow & local design system — design spec

Date: 2026-09-13

## Scope

This spec covers the **workflow and tooling** for going from idea to shipped
UI without burning a disproportionate amount of Claude tokens or Figma's
rate-limited MCP quota: the entry points into a new UI idea, the Figma/Claude
handoff, the local design-system tool, and where a future taste-evaluation
skill plugs in. It is sequenced into phases that are each independently
buildable and shippable.

**Not covered here** (each is its own future brainstorm/spec):
- The design system's actual token values, brand definitions, and full
  component inventory beyond the bootstrap minimum (Phase 0 seeds real
  values; Phase 4 grows them).
- The taste-skill's concrete rubric (Phase 5 only reserves where it plugs
  in).
- Figma↔code sync automation beyond a manual, human-maintained convention.
- Control-center integration — that surface doesn't exist as code yet; the
  token architecture stays portable for it but nothing is built for it now.
- A skills/plugins/dependencies index — raised during this brainstorm as a
  useful but unrelated idea; tracked separately, not part of this spec.

## Problem this solves

UI feature work has been consuming a full day's Claude token budget per
feature. Diagnosis surfaced three compounding causes, none of them
dominant on their own:

1. **Full builds used as sketches** — real React/Tailwind code written just
   to see what an idea looks like, then reworked or discarded.
2. **Long refinement loops** — many "tweak this, no try that" rounds after
   an already-reasonable first pass.
3. **Re-deriving context every session** — re-explaining the app, the
   design system, and personal taste preferences before real work starts.

A fourth constraint, discovered while designing around this: Figma's
`get_design_context` MCP tool is capped at **6 calls per month** on the
free Starter plan (verified via Figma's own developer docs and help
center: [Get started with the Figma MCP server](https://help.figma.com/hc/en-us/articles/39216419318551-Get-started-with-the-Figma-MCP-server),
[Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)).
That quota, not Claude tokens, is the tighter budget for the Figma-handoff
step and has to be spent deliberately, not exploratorily.

Also verified: Figma Starter is capped at 3 files total, has no Dev Mode,
and has no team/shared libraries — local components, styles, and variables
work fine *within* a single file, but can't be published across files.
Code Connect (automated Figma↔code component binding) requires an
Organization/Enterprise plan with a Full or Dev seat — not available here.
([Starter plan overview](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview),
[Code Connect help](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect))
Consequence: the whole design system lives in one Figma file, and keeping
its components aligned with the code design system is a manual convention,
not tooled automation — deferred until a real drift happens (YAGNI).

## Current repo state (verified 2026-09-13, corrected same day after
deeper inspection — see note below)

- Single Next.js app (not a monorepo). No separate control-center app
  exists yet.
- `src/app/studio/page.tsx` (the standalone `/studio` route file) has been
  deleted from disk, but the deletion is **not yet committed** (`git
  status` shows it as a pending `D`). This was **not** an abandonment of
  studio's design — `StudioShell` (its shell component) is imported by
  `src/app/page.tsx`, i.e. it now **is** the app's root page. `/songs/[id]`
  is a redirect to `/` for old links, not a live page.
- **Correction:** `globals.css`'s `--color-accent`, `--color-border`,
  `--radius`, `--sidebar-width`, and the `[data-theme="light"]` override
  are **not orphaned** — they are live and used pervasively today, in
  `StudioShell`, `AppHeader`, `DetailToolbar`, `TabSelector`,
  `SongListRow`, `FretboardDiagram`, and `SheetDiagram` (verified by
  grepping for each variable name and Tailwind's derived utility classes,
  e.g. `border-border`, `bg-accent/10`, `border-accent`). Only
  `--space-1` through `--space-8` have zero references anywhere outside
  their own definition — those are the actual dead code. The block's
  comments (referencing `docs/studio-theme/DESIGN.md` and a `STATUS.md`
  that don't exist) are stale documentation from before the shell became
  the root page, not a signal that the tokens themselves are unused.
- `StringOrientationToggle.tsx` (shared by `FretboardDiagram` and
  `SheetDiagram`) is itself inconsistent with the rest of the app: its
  border color is a one-off `color-mix(in srgb, var(--foreground) 25%,
  transparent)` instead of the shared `--color-border` token, and it uses
  Tailwind's default `rounded-md` (6px) instead of the app's actual shared
  `--radius` (12px) that `SongDetailPane`/`SongListRow` already use.
- `design_system/index.html` is a standalone, disconnected static HTML
  token-tuning playground (534 lines) whose output was manually
  copy-pasted into `globals.css`. It does not render real app components.
- `scripts/verify.sh` (wired to `npm run verify` / `--full`) runs
  typecheck → lint → unit tests, with an optional production build on
  `--full`. It's a plain sequential script, straightforward to extend with
  a new check.
- No `middleware.ts` and no `NODE_ENV`-based gating exists anywhere in the
  repo today.

**Note on this correction:** the original version of this section called
the entire token block "orphaned by the studio deletion" based on the
comment text alone, without checking whether the variables were actually
still referenced. They were. This is exactly the failure mode "verify,
don't assert" exists to prevent — caught here by grepping actual usage
before writing the implementation plan, not by trusting the code's own
stale comments.

## Workflow

### Entry points (both, chosen per situation)

- **Brief-first** (avoids the blank page): drop ideas/requirements in
  chat; Claude proposes 1–3 cheap, structure-level directions (not styled
  builds). Optionally rendered via the Claude Design canvas artifact for
  inline visual refinement of the cheap sketch — no Claude Code Desktop
  required, it's a browser-viewable published link. Pick or blend one
  direction, then build it for real in Figma with actual design-system
  components.
- **Figma-first**: build a pixel-accurate wireframe directly in Figma
  using the design system's local components/variables, screenshot it,
  send the screenshot to Claude. Claude reflects back a cheap low-fidelity
  HTML "here's what I understood" (structure only, no branding) for
  confirmation or correction. This loop (screenshot + cheap HTML) is free
  and unlimited — it never touches Figma's MCP quota.

Both converge on the same next stage: a Figma frame built from real
design-system components, confirmed structurally correct.

### Locking & branding (still free, in Figma)

Finalize the frame in Figma; apply/swap brand theming via Figma's local
variables (duplicate variable collections per brand rather than modes, if
mode count turns out to be capped on Starter — a two-minute check to make
inside Figma the first time it matters, not assumed now). No Claude, no
tokens, no MCP quota spent at this stage.

### Implementation (the one paid step, once per feature)

Exactly one `get_design_context` MCP call against the locked frame — the
only place in the workflow that spends the 6-per-month Figma quota. Claude
implements using existing design-system tokens/components only, never
inventing new hex/px values. Acceptance bar: **token-faithful, not
pixel-perfect** — correct tokens and structure; minor deviations (a few
px, exact shadow blur) are accepted rather than iterated on.

**Quota-exhaustion policy** (explicit, not left implicit): if the monthly
`get_design_context` allowance is spent, the fallback is a screenshot-only
implementation — Claude maps the screenshot to existing tokens/components
by inspection rather than extracting exact values, accepting more manual
correction as the cost of the degraded mode, rather than blocking work
until the quota resets.

### Taste-skill gate (reserved, built later — Phase 5)

Manually triggered by the user, always. Claude may proactively suggest
"this looks like a good point to run the taste check," but never runs it
unasked. Lives at the **user level** (`~/.claude/skills/`), not in this
repo, since it's a personal baseline meant to be compared against other
design systems and reused across future projects — unlike the
design-system skill below, which is repo-specific. When built: a hybrid
of mechanical checks (no hardcoded colors/spacing outside the token file,
contrast ratios, spacing-scale adherence — reusing Phase 2's check) and
judgment (composition, hierarchy, "does this feel premium").

### Local design-system tool

A dev-only route in this app (e.g. `/dev/design-system`), gated out of
production, listing every real component rendered live off the actual
token cascade — not a mockup, and not Storybook (avoids a new dependency
for a benefit the existing Next.js + Tailwind stack already provides).
Editing a token's value at global/brand/component scope updates the
preview live via hot reload, at zero cost and with no Claude involvement.
**Reset** at any scope deletes that scope's override; the value falls
through to the level below. **Push** means committing the resulting
CSS/token changes to git — nothing is live in the real app until that
commit. This tool replaces both `design_system/index.html` and the
Storybook idea.

### Token architecture

Lives at `src/styles/tokens.css`, imported into `globals.css` — separated
out so Phase 2's check has one unambiguous path to exclude, and so it can
be lifted out wholesale once a second (control-center) consumer exists.

A proper cascade, designed for extension from day one: **global → brand
→ component → instance**, implemented as CSS custom properties scoped by
selector (`:root` → `[data-brand=x]` → component-scoped vars) so a
"reset" is always just deleting an override, never a restructure. The
**instance** tier is the escape hatch for one-off tweaks (a single button
on one page, not every button of that brand): expressed as a narrower
override of the same custom property at the point of use (e.g. an inline
`style` on that one element), never a new hardcoded value — so Phase 2's
check still passes it, since it's still reading from the token system,
just scoped tighter. Adding a new brand or component later must only ever
mean adding an override layer. Format stays plain CSS custom properties —
framework-neutral, so it can serve a future control-center surface without
Next.js coupling, even though no such surface exists yet. Scope is
**app-wide**, not limited to any one route, starting from a single brand.

## Phased execution plan

Each phase has one clear deliverable, depends only on the phase(s)
directly before it, and is independently shippable — stopping after any
phase still leaves something working.

**Phase 0 — Bootstrap the loop**
Pre-step: re-verify the "Current repo state" section above is still
accurate (`git status`, a look at `globals.css` and its variables' actual
usage) before acting on it — it's a snapshot from 2026-09-13, not a live
fact, and was itself already wrong once. Then commit the pending `/studio`
deletion; fix the stale comments (remove references to nonexistent docs);
remove only the genuinely unused `--space-1..8`. The live tokens
(`--color-accent`, `--color-border`, `--radius`, `--sidebar-width`,
`[data-theme="light"]`) are **migrated**, not deleted — moved into
`src/styles/tokens.css`'s cascade structure with their current values
preserved, so nothing visually changes for the app as a whole.
Then: run the full workflow loop once, for real, on
`StringOrientationToggle` — already live, used in two places
(`FretboardDiagram`, `SheetDiagram`), and already has both a color
property and a shape property to migrate, which conveniently also fixes
its two pre-existing inconsistencies with the rest of the app: swap its
one-off `color-mix(...)` border for the shared `--color-border` token, and
its Tailwind-default `rounded-md` (6px) for the shared `--radius` (12px)
already used elsewhere. This is a real, small, visible fix (rounder
corners on that one button) — noted here so it isn't a surprise, not a
regression. For a single brand, app-wide. This both proves the loop and
formalizes `src/styles/tokens.css`'s real shape (global → brand →
component → instance cascade) around tokens that already exist, resolving
the circularity of designing tooling around a system that doesn't exist
yet — it already partly does, just not in cascade form.
Deliverable: one real, correctly-themed component in the app, plus the
established token file with the app's actual live tokens inside it.

**Phase 1 — Local design-system tool**
Dev-only route rendering Phase 0's component(s) off the real token
cascade, with reset controls at component/brand/global scope and a theme
switcher. Gated out of production with an explicit `NODE_ENV` check (no
such gating mechanism exists in the repo today — this is a real task, not
an assumed detail). Delete `design_system/index.html` once this tool
covers its role.
Depends on: Phase 0's token file.

**Phase 2 — Mechanical token-faithfulness check**
Extend `scripts/verify.sh` with a check that flags hardcoded hex/px values
outside the token file's path (explicitly excluded, since that's the one
file where such values are correct) — and matches Tailwind's
arbitrary-value bracket syntax (`bg-[#...]`, `text-[...px]`), not just bare
hex, since that's the more likely place a non-token value gets introduced.
Replaces judgment ("is this token-faithful?") with a boolean check, per
this repo's own engineering principle.
Depends on: Phase 0 (needs `src/styles/tokens.css` to exist).

**Phase 3 — Claude-facing design-system skill**
A project-scoped skill (checked into this repo) documenting the current
token cascade, component inventory, and the Figma/local-tool workflow,
loaded on demand rather than by default. Reserves an explicit note that
the taste skill (Phase 5) is separate, user-scoped, and not yet built.
Depends on: Phase 0 (needs real content to document).

**Phase 4 — Scale to more components and brands**
Repeat Phase 0's loop to grow real coverage; each addition is independent
of the others (adding one component never requires touching another). The
quota-exhaustion policy (screenshot-only fallback) applies from here
onward, once call volume is more than incidental.
Depends on: Phases 0–3 (tool, check, and skill should exist before volume
ramps up).

**Phase 5 — Taste-skill build** (future, unscheduled)
The evaluation gate itself: manually triggered, hybrid mechanical +
judgment, user-scoped. Starts when there's enough real component coverage
(Phase 4) to have something worth evaluating a pattern against.

## Explicitly deferred

- Acceptance/"done" checks per phase — deferred to the implementation plan
  (writing-plans skill), not fixed in this design doc, per explicit
  preference.
- A skills/plugins/dependencies index — separate small task, unrelated to
  this spec. npm dependencies are already fully indexed by
  `package.json`/`package-lock.json`; installed Claude Code plugins are
  already tracked by its own plugin/marketplace system. The one real gap
  (personal/project-authored skills have no purpose+date index anywhere)
  could reuse the existing `MEMORY.md` pattern, but that's out of scope
  here.
- Figma variable-mode-count limits on Starter — unverified with full
  confidence from search alone; check directly inside Figma the first time
  a brand-swap-via-modes is attempted, and fall back to duplicate variable
  collections if modes are capped.
- The brand palette is currently split across `globals.css`
  (`--background`/`--foreground`/`[data-theme="light"]`) and
  `src/styles/tokens.css` (`--color-accent`/`--color-border`) — deliberate,
  not forgotten; Phase 1 should finish the migration when it builds the
  theme switcher.
