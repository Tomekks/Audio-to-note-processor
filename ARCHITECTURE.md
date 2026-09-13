# Architecture

This file describes the current, real state of the project — updated in
place as things change, never appended to as a log. For the reasoning
behind the testing/contracts/CI choices below, see the planning conversation
that produced them (not duplicated here as a separate decision log — see
"Anti-bloat rules" at the bottom for why).

## The three parts

1. **Audio processing** (`pipeline/` — planned, not built yet). Local-only,
   a 4-step pipeline (ingest → separate → transcribe → tab generate) that
   turns an audio file into a guitar tab. No DB writes — that's Control
   Center's job, not this part's.
2. **Web app** (`src/`, this repo's root — **built**). Next.js on Vercel,
   reads published songs from a Turso (libSQL) DB via Drizzle ORM, renders
   them as Sheet/Fretboard/Ascii tab views with a metronome.
3. **Control Center** (`control-center/` — planned, not built yet). A local
   web app to trigger pipeline runs and publish the result to Turso,
   replacing manual CLI invocation.

## Contracts

`contracts/notes.schema.json` (audio processing → guitar logic) and
`contracts/tab.schema.json` (guitar logic → UI/DB) are the two JSON-Schema
boundaries between the parts — small, versioned (`schemaVersion`), the
single source of truth for both the Python pipeline and the TypeScript web
app. `tab.schema.json` is enforced at runtime, not just checked by types:
`src/lib/validateTab.ts` validates any object before it's written to the DB
(today, only `scripts/seed.ts`'s insert; any future write path — Control
Center's publish step — must call the same validator, reshaping its payload
into the contract's shape first, same as `seed.ts` does).

## Commands

- `npm test` — unit tests (`node --test`, no separate framework): the
  pure functions in `src/lib/`, plus other unit-level checks like
  `src/styles/tokens.test.ts`.
- `npm run test:e2e` — one Playwright smoke test (`e2e/home.spec.ts`): loads
  the homepage, asserts zero console errors. First run needs
  `npx playwright install chromium` (one-time browser binary download). Not
  run in CI — run locally before a deploy or after a risky change.
- `npm run verify` — typecheck → lint → unit tests. What to run locally.
- `npm run verify:full` — the same, plus a production build. What CI runs.
- `npm run db:seed` — inserts one sample song into the real Turso DB
  (validated against `tab.schema.json` first).
- `/dev/design-system` — `next dev`-only route for live-editing the token
  cascade (`src/styles/tokens.css`) against the real UI; 404s outside development.

## CI

`.github/workflows/web.yml` runs `verify:full` on push/PR, path-filtered to
files that actually affect the web app (`src/**`, `contracts/**`, etc.) so
future pipeline/Control Center changes don't trigger it. Deliberately
excluded: the full audio pipeline (heavy ML dependencies, not CI-friendly)
and any deploy step (Vercel deploys stay manual). `pipeline/` and
`control-center/` will get their own path-filtered workflows once they
exist. Needs `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` set as repo secrets
(Settings → Secrets and variables → Actions) — without them the build fails
at "Collecting page data" (the `/` route touches the DB at build-analysis
time). `.github/dependabot.yml` keeps npm and Actions dependencies current
via automated weekly PRs, with `ignore`/`groups` rules for known-broken or
peer-linked bumps (typescript/eslint majors, react+react-dom together).
Dependabot-triggered CI runs get the lighter `verify` (no build) instead of
`verify:full` — GitHub doesn't expose secrets to them, so the DB-dependent
build can't run there regardless. A dependency-bump PR still needs a human
to run `npm run build` locally before merging — a deliberate, acknowledged
trade-off, not a silent gap.

## Environment variables

`src/db/client.ts` fails fast with a clear error if `TURSO_DATABASE_URL` or
`TURSO_AUTH_TOKEN` is missing, instead of surfacing libsql's own cryptic
"URL_INVALID" error several frames deeper — this is exactly the failure that
first surfaced in CI before secrets were configured. See `.env.example` for
what's needed.

## Future structure: pipeline/ conventions (ICM Pipeline form)

When `pipeline/` is built (Phase B), structure it as numbered stage folders,
each with its own small `CONTEXT.md` contract — four fixed headings, every
stage's copied from `pipeline/_templates/CONTEXT.md` rather than started
blank, so the shape can't drift stage to stage:

- `## Inputs` — exact paths, split working (this run) vs. reference (every run)
- `## Process` — numbered, short; real detail lives in a linked reference
  file, not inlined here
- `## Outputs` — destination paths
- `## Human Check` — exactly one explicit, checkable action (e.g. "listen to
  `stems/other.wav` — does guitar come through recognizably"), not vague review

**Token budget**: a stage's full context (its `CONTEXT.md` + any reference
file it points to + its actual input) should land in the 2,000–8,000 token
range — this bounds the documentation/reference footprint, not the raw
audio/note data a stage processes. Expect variance: simple stages
(`s01_ingest`, `s02_separate` — call a tool, write a file) sit near the low
end; `s04_tab` (needs `tab.schema.json` plus guitar-logic conventions) will
legitimately sit near the high end. If a stage's contract keeps growing past
that, it's a signal the stage is doing more than one job, not a cue to
compress the writing.

**`scripts/verify-e2e.sh`** (the future formalized manual walkthrough)
should `cat` each stage's `CONTEXT.md` when it reaches that stage rather
than re-typing its Human Check instructions — one home per fact, not two
copies that can drift. It should fail loudly, not silently, if a stage's
`CONTEXT.md` is missing, so a renamed/reordered stage folder breaks visibly
instead of silently skipping a check.

**Walk test** — the one rule governing this file too, not a separate
"when to split" heuristic: could a fresh session get oriented from ~2 reads,
staying under ~8k tokens? `scripts/verify.sh` prints a note if this file
crosses ~150 lines, as a mechanical nudge to actually ask that question
rather than relying on remembering to.

## Anti-bloat rules

This project is a rebuild of a sibling project that grew a large parallel
process-documentation system (drift logs, session handoffs, a multi-file
decision log, hand-built dashboards, two AI agent frameworks at once, a
separate code-health audit tool) — more lines of process tracking than
actual code, most of it churned by commits that changed no behavior. This
repo deliberately doesn't repeat that:

- No drift logs, session-handoff docs, or pending-actions trackers.
- No dashboards committed as code — use GitHub Issues/Projects if a backlog
  view is wanted.
- No multi-file decision log — decisions live in code comments (e.g.
  `tabNotation.ts` → `SheetDiagram.RULES.md`/`FretboardDiagram.RULES.md`) or
  commit messages.
- One AI agent framework in use at a time, not several in parallel.
- No separate code-health audit tool — `eslint`, `tsc --noEmit`, and the
  test suites are the signal.
