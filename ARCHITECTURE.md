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

- `npm test` — unit tests (`node --test`, no separate framework) for the
  pure functions in `src/lib/`.
- `npm run test:e2e` — one Playwright smoke test (`e2e/home.spec.ts`): loads
  the homepage, asserts zero console errors. First run needs
  `npx playwright install chromium` (one-time browser binary download). Not
  run in CI — run locally before a deploy or after a risky change.
- `npm run verify` — typecheck → lint → unit tests. What to run locally.
- `npm run verify:full` — the same, plus a production build. What CI runs.
- `npm run db:seed` — inserts one sample song into the real Turso DB
  (validated against `tab.schema.json` first).

## CI

`.github/workflows/web.yml` runs `verify:full` on push/PR, path-filtered to
files that actually affect the web app (`src/**`, `contracts/**`, etc.) so
future pipeline/Control Center changes don't trigger it. Deliberately
excluded: the full audio pipeline (heavy ML dependencies, not CI-friendly)
and any deploy step (Vercel deploys stay manual). `pipeline/` and
`control-center/` will get their own path-filtered workflows once they
exist.

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
