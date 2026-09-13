#!/usr/bin/env bash
# The command that answers "is this actually done" for this repo.
# Default (local use): typecheck -> lint -> unit tests. Fast, no build --
# a local `npm run dev` session already proves the app runs, so running
# `next build` a second time here would just be the same check paid for
# twice.
# --full (CI use): also runs the production build. CI has no human watching
# a dev server, so it's the only place that check has to happen.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== typecheck (next typegen && tsc --noEmit) =="
npx next typegen
npx tsc --noEmit

echo "== lint =="
npm run lint

echo "== unit tests =="
npm test

if [ "${1:-}" = "--full" ]; then
  echo "== production build =="
  npm run build
fi

# Informational only -- never fails the check. A mechanical nudge for the
# "walk test" ARCHITECTURE.md itself describes: past ~150 lines, a fresh
# session likely can't orient in ~2 reads anymore.
arch_lines=$(wc -l < ARCHITECTURE.md | tr -d ' ')
if [ "$arch_lines" -gt 150 ]; then
  echo ""
  echo "note: ARCHITECTURE.md is $arch_lines lines -- past the point a fresh"
  echo "session orients in ~2 reads. Consider splitting into a thin root"
  echo "router + a small contract file per part (see its own 'walk test' note)."
fi

# Same idea, for AGENTS.md -- lower threshold since it has no opt-out: it
# loads on every session touching this repo, unlike ARCHITECTURE.md which
# only costs tokens when something pulls it in.
agents_lines=$(wc -l < AGENTS.md | tr -d ' ')
if [ "$agents_lines" -gt 40 ]; then
  echo ""
  echo "note: AGENTS.md is $agents_lines lines -- it loads on every session"
  echo "regardless of task size. Merge a principle into an existing one or"
  echo "move it to ARCHITECTURE.md before adding a new one."
fi

echo ""
echo "VERIFY: PASS"
