# Audio-to-note-processor

Turns a song into a playable, beginner-friendly guitar practice tab. See
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the full picture — the three parts
of the project, the data contracts between them, and where each test suite
lives. This file is just the "get it running" quick reference.

## Setup

```bash
npm install
cp .env.example .env   # fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
npm run db:migrate
npm run db:seed        # optional: adds one sample song so the UI shows real data
```

## Running

```bash
npm run dev            # local dev server, http://localhost:3000
```

## Checking your work

```bash
npm run verify          # typecheck + lint + unit tests (fast, no build)
npm run verify:full      # the same, plus a production build (what CI runs)
npm test                 # just the unit tests
npm run test:e2e         # one Playwright smoke test (needs `npx playwright install chromium` once)
```
