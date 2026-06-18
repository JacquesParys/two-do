# Two-Do

A shared planning PWA for two people with ADHD. Part calendar, part kanban, part shopping list, part money-tracker — pun-forward by design.

See [`docs/two-do-toc.md`](docs/two-do-toc.md) for the full doc set, roadmap, and source-of-truth rules.

## Stack

- **Vite + React** PWA (installable, service worker via `vite-plugin-pwa`)
- **Supabase** (Postgres + RLS + realtime + auth) — see [`supabase/schema.sql`](supabase/schema.sql)

## Run it

```bash
npm install
npm run dev      # starts the app (MOCK mode if no Supabase env)
npm run build    # production build
npm test         # unit tests (viewer-aware lane logic)
```

Without Supabase credentials the app boots in **mock mode** — in-memory data, no sync — so you can develop the UI offline.

## Connect a backend

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Enable **Realtime** on the tables you subscribe to (`item`, `board_column`, `list`, …).
4. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Enable real AI parsing (The Grown-Up)

The brain-dump parser is pluggable (`src/lib/parser.js`). Without a parser URL it uses a local heuristic **stub**; point it at a backend and it upgrades automatically — same contract for Claude now and a home-lab service later.

1. Deploy the reference function: `supabase functions deploy parse --no-verify-jwt`
2. Set the key: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (optional `ANTHROPIC_MODEL`)
3. In `.env.local`: `VITE_PARSER_URL=https://<project>.functions.supabase.co/parse`

Contract (any backend can implement it): `POST { text, viewerSlot } → { drafts: [...] }`. See [`supabase/functions/parse/index.ts`](supabase/functions/parse/index.ts).

## Project layout

```
docs/                 specs, UI spec, handoff, TOC, build plan
supabase/schema.sql   the data model as Postgres (RLS + seed)
src/
  TwoDoShell.jsx      app shell: tabs, input bar, FAB, review-tray wiring
  ReviewTray.jsx      the Grown-Up confirm-before-file flow
  theme.js            design tokens (colors, fonts, float keyframes)
  components/
    primitives.jsx    LaneBadge, SleepsChip, ProgressBar, shared styles
  views/
    DatesView.jsx     calendar (Dates tab)
    CardsView.jsx     kanban (Cards tab) — wired to the data layer
    ListsView.jsx     lists (Lists tab)
    TwoCentsView.jsx  finance (Two Cents tab)
    helpers.js        formatDue + card adapter
  lib/
    supabase.js       client + mock-mode flag
    lanes.js          viewer-aware Me/You/Us resolver
    lanes.test.js     tests for the lane logic
    data.js           data-access layer (Supabase + mock fallback)
    parser.js         pluggable brain-dump parser (stub → Claude → local)
```

## Where we are

**Phase 0 (Foundations)** — schema, project scaffold, PWA, data layer, lane logic. The shell renders; wiring each view to the live data layer is the next increment. Phases 1–3 are detailed in the build plan.
