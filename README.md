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
npm test         # unit tests (lanes, recurrence, data layer, tokens, parser)
```

Without Supabase credentials the app boots in **mock mode** — in-memory data, no sync — so you can develop the UI offline.

## Connect a backend

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor (tables + RLS + the `bootstrap_space` onboarding function).
3. Enable **Realtime** on the tables you subscribe to (`item`, `board_column`, `list`, `store`, `savings_goal`, `bill`, …) — Database → Replication, or `alter publication supabase_realtime add table item, board_column, list, store;`.
4. **Auth**: email + password. For a friction-free dev setup, turn **off** Authentication → Providers → Email → **Confirm email** so sign-up is instant (no confirmation email, no rate limits). Leave it on if you want email verification.
5. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart `npm run dev`.

With those set, the app leaves mock mode and shows an **email + password sign-in** (with sign-up and a "keep me signed in" toggle — on = session persists across restarts, off = clears when the browser closes). On first sign-in it auto-creates your space + two people (you as one partner, a placeholder for the other you can rename) via the `bootstrap_space` RPC — no manual seeding needed. Sign out from the **⎋** button in the header.

## Enable real AI parsing (The Grown-Up)

The brain-dump parser is pluggable (`src/lib/parser.js`). Without a parser URL it uses a local heuristic **stub**; point it at a backend and it upgrades automatically — same contract for Claude now and a home-lab service later.

1. Deploy the reference function: `supabase functions deploy parse --no-verify-jwt`
2. Set the key: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (optional `ANTHROPIC_MODEL`)
3. In `.env.local`: `VITE_PARSER_URL=https://<project>.functions.supabase.co/parse`

Contract (any backend can implement it): `POST { text, viewerSlot } → { drafts: [...] }`. See [`supabase/functions/parse/index.ts`](supabase/functions/parse/index.ts).

## Project layout

```
docs/                   specs, UI spec, handoff, TOC, build plan
.github/workflows/      GitHub Pages deploy
supabase/
  schema.sql            data model: tables + RLS + bootstrap_space RPC (+ seed trigger)
  seed-demo.sql         optional demo data for a real space (targets your account by email)
  functions/parse/      reference AI-parse edge function
src/
  main.jsx              entry → AuthGate
  AuthGate.jsx          mock passthrough / email-password sign-in / first-run bootstrap
  TwoDoShell.jsx        app shell: tabs, input bar, FAB, lane filter, modal wiring
  ItemDetail.jsx        item editor: type, lane, color, date, recurrence, linked lists
  ReviewTray.jsx        the Grown-Up confirm-before-file flow
  ColumnsEditor.jsx     kanban column editor
  theme.js              design tokens (color/space/type/radius/shadow/motion) + injected CSS
  components/
    primitives.jsx      Card, Chip, LaneBadge, ProgressBar, LinkedListChips, LaneFill, …
    Modal.jsx           accessible overlay (role/Esc/focus-trap; center | sheet | push)
    LaneFilter.jsx      Me/You/Us/all filter
  views/
    DatesView.jsx       calendar (Dates) — day / week / month, recurrence expansion
    DayTimeline.jsx     24h day timeline with drag-to-move / resize
    CardsView.jsx       kanban (Cards)
    ListsView.jsx       lists (Lists)
    TwoCentsView.jsx    finance (Two Cents)
    helpers.js          formatDue + card adapter (nodeColor, proximity, linked lists)
  lib/
    supabase.js         client + mock-mode flag + remember-me storage
    auth.js             sign-up/in, session, ensureBootstrap
    data.js             single data-access layer (Supabase + mock fallback)
    lanes.js            viewer-aware Me/You/Us resolver
    recurrence.js       occurrence expansion (occursOn / occurrenceFor / itemsOnDay)
    parser.js           pluggable brain-dump parser (stub → Claude → local)
```

## Deploy

- **Vercel / Netlify (quickest):** import the repo, set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, deploy. Serves at the domain root — no extra config.
- **GitHub Pages:** `.github/workflows/deploy.yml` builds with `BASE_PATH=/two-do/` and publishes `dist/` (Settings → Pages → Source: **GitHub Actions**; add the two vars as Actions **secrets**).

Every push to `master` auto-redeploys.

## Status

Live and in two-person daily use — deployed, with real Supabase auth + persistence and a shared space. Built so far: the field-driven item model ("one item, three views"), the layered/tactile UI + design-token system, the Dates **day-timeline** (drag-to-move/resize) and week drag-to-reschedule, **embedded recurrence**, standalone + **linked** lists and subtasks (via `parent_item_id`), per-item custom colors, and the finance tab. The phased plan and source-of-truth rules live in [`docs/two-do-build-plan.md`](docs/two-do-build-plan.md) and [`docs/two-do-toc.md`](docs/two-do-toc.md).

Known follow-ups: partner-invite/join flow (a second person currently joins by being linked to the space's `partner_b`), recurrence per-occurrence edits + richer rules, and the Phase-2 niceties (nudges/push, voice capture, the review-tray clarifying chat).
