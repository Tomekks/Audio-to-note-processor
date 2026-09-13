<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Engineering principles (this repo)

Principles for anyone — human or AI — working on this repo. Understand the
actual problem before applying any of these — a fix in the wrong place is a
second bug, not a fix. Mechanics and proof live in `ARCHITECTURE.md`.

1. **Mechanism over judgment.** Prefer deterministic checks and scripts
   over repeated, uncaptured judgment. If it can be a boolean pass/fail,
   make it one. If it genuinely needs a human eye or ear, keep that manual
   and rare.
2. **Verify, don't assert.** `npm run verify:full` passing is the floor,
   not the ceiling. Run real checks before calling anything done.
   Self-critique non-trivial plans before finalizing them.
3. **Modularity: the swap test.** Before wiring two parts together, ask:
   could either side be replaced without changing its caller? If not, the
   boundary is wrong.
4. **No work ahead of proven need.** Don't add a dependency, abstraction,
   or option until a second real case needs it — check in order first:
   already in this codebase → standard library → an already-installed
   dependency → a one-line fix → only then, the smallest new thing. State
   what's deliberately left out, not just what's built. Never minimized:
   input validation at trust boundaries, data-loss handling, security.
5. **Explain simply, completely.** State the reasoning, not just the
   conclusion. A follow-up "why" means it wasn't complete; filler to wade
   through means it wasn't simple.
