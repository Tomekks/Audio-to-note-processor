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

echo ""
echo "VERIFY: PASS"
