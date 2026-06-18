# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Two-Do is a shared planning PWA for two people with ADHD — calendar + kanban + shopping lists + money tracker. Vite + React front end, Supabase (Postgres + RLS + realtime + auth) back end.

## Commands

```bash
npm install
npm run dev        # start the app; runs in MOCK mode if no Supabase env
npm run build      # production build
npm run preview    # serve the production build
npm test           # run unit tests once (vitest run)

npx vitest                          # watch mode
npx vitest run src/lib/lanes.test.js  # a single test file
npx vitest run -t "lane label"        # tests matching a name
```

Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the app boots in **mock mode** (in-memory data, no sync) — the normal way to develop the UI. Copy `.env.example` → `.env.local` to connect a real backend. Backend/AI setup (running `supabase/schema.sql`, `supabase functions deploy parse`, secrets) is documented in `README.md`.

## Architecture

The pieces below cut across multiple files and are the things worth understanding before editing.

**Mock-mode duality.** `src/lib/supabase.js` sets `isMockMode = true` when the Supabase env vars are absent (and exports `supabase = null`). `src/lib/data.js` is the **single data-access layer** — every view imports from it and never touches Supabase directly. Each function branches on `isMockMode`: a real Supabase query, or an in-memory mock backend that mirrors the real row shapes. Mock-mode mutations push into a module-level `mock` object so the UI stays optimistic. **Any new backend feature must keep the mock branch working**, or the app breaks offline.

**Auth gate (real mode only).** `src/main.jsx` renders `src/AuthGate.jsx`, not the shell directly. In mock mode `AuthGate` passes straight through to `TwoDoShell`. With real Supabase it shows an **email + password sign-in/sign-up** (`src/lib/auth.js`) with a "keep me signed in" toggle — the client uses a hybrid localStorage/sessionStorage in `src/lib/supabase.js` (`setRemember`). On first login it calls the `bootstrap_space` security-definer RPC (in `schema.sql`) to create the space + two `person` rows linked to `auth.uid()` — needed because RLS (`app_space_id()`) keys off `person.auth_user_id`, a chicken-and-egg the RPC resolves. Don't gate mock mode behind auth. Note: unit tests force mock mode via `test.env` in `vite.config.js` (so a real `.env.local` doesn't make tests hit the live backend).

**Viewer-aware lanes** (`src/lib/lanes.js`). A lane is **stored** as a neutral slot — `partner_a` | `partner_b` | `shared`. What a user **sees** (Me / You / Us) is **derived per viewer and never stored**: whoever is logged in sees their own slot as "Me", the other as "You", shared as "Us". Use `laneLabel` / `laneColor` / `laneRole(laneSlot, viewerSlot, space)` for any lane rendering. `space.label_style` can swap the wording (`me_you_us`, `this_that_both`, `players`, `custom`). An item's **node color** (used for its card wash, fill, and exciting glow) is `item.color || laneColor` — a custom `item.color` overrides the lane color, but the lane *badge* still shows Me/You/Us identity. Exciting items glow in the node color (not a fixed coral).

**Pluggable brain-dump parser** — "The Grown-Up" (`src/lib/parser.js`). `parseBrainDump(text, ctx)` returns structured `Draft`s. If `VITE_PARSER_URL` is set it POSTs `{ text, viewerSlot } → { drafts }` to a remote (Claude now, a home-lab service later — same contract); otherwise it falls back to a local regex/heuristic **stub** so the app works with no AI. The reference edge function is `supabase/functions/parse/index.ts`. Drafts are normalized/clamped by `normalizeDraft` before use.

**Recurrence is embedded + expanded on read.** Items carry `recur_freq`/`recur_until`/`recur_except` (no separate table). `src/lib/recurrence.js` (`occursOn`/`occurrenceFor`/`itemsOnDay`) expands recurring items into **virtual occurrences** for the visible day/week/month — never stored, each carrying a `_master` ref. `DatesView.eventsOn(day)` does the expansion; occurrences are tap-only (open the master series), with drag/resize disabled, marked `↻`.

**Single `item` table, field-driven views.** All of tasks, events, shopping items, and expenses live in one `item` table with `kind` (`routine` | `exciting`) on the spine and **soft-delete via `deleted_at`** (queries filter `deleted_at is null`). Crucially, **`type` is the item's *primary nature*, not a view filter** — which view shows an item is decided by *which placement fields are populated*: `column_id` → board (Cards), `start_at`/`due_at` → calendar (Dates), `list_id` → a list (Lists). One item can satisfy several at once (a dated task is both a card and a calendar entry — the "one thing, three views" principle). The `data.js` accessors reflect this: `listCards` (has `column_id`), `listCalendar` (has a date), `listListItems` (has `list_id`) — **not** filtered by `type`.

**List relationships are three-way.** (1) `item.list_id` — the item is a line *in* a standing list (`list` table); these populate the Lists tab. (2) `item.linked_list_id` — a card/event *references* a standing list, shown inline on it (one source of truth, no duplication); `ItemDetail` renders the linked list via `listItemsForList(listId)`. (3) `item.parent_item_id` — a self-referential link that is the single mechanism for both a task's break-it-down subtasks and an *ad-hoc* checklist attached to a card/event (all child items of a parent). Top-level view queries exclude children (`parent_item_id is null`); fetch them with `listChildren(parentId)`, and `getSubtaskProgress(parentIds)` returns `{done,total}` per parent for the card footer. The data model + RLS + seed live in `supabase/schema.sql` (the data-model source of truth). Some values are **derived, never stored**: the who-owes-who balance (`computeBalance` — split expenses divide 50/50, settlements net it down) and savings-goal progress (summed contributions).

**Shell + four tabs.** `src/TwoDoShell.jsx` is the app shell: four chip tabs, the bottom brain-dump input bar → `src/ReviewTray.jsx` (the confirm-before-file flow), the `src/ItemDetail.jsx` editor, `LaneFilter`, and the floating "+" FAB add-sheet. Views reload by bumping a `dataVersion` state key passed down via `onChanged` / `onSaved`. The kanban view uses `@dnd-kit` for drag, persisting positions through `moveCards`.

**View naming.** Each tab maps to a like-named view component:

| Tab label (UI) | Component file | What it is |
|---|---|---|
| Dates | `src/views/DatesView.jsx` | calendar |
| Cards | `src/views/CardsView.jsx` | kanban |
| Lists | `src/views/ListsView.jsx` | shopping / lists |
| Two Cents | `src/views/TwoCentsView.jsx` | finance |

The tab labels live in the `TABS` array in `TwoDoShell.jsx`, matched **positionally** to the `views` array — keep the two arrays in sync when adding or reordering tabs. (These views were once called `Daze / Juggle / Hoard`; that punny naming has been fully retired across code and docs.)

**Styling.** Inline styles only — no CSS framework. Design tokens (colors, fonts, keyframes) live in `src/theme.js` (`COLORS`, `ensureFonts()`); shared UI bits in `src/components/primitives.jsx`. Global app CSS (themed scrollbars, FAB float, PWA chrome) is in `index.html`. PWA config (`vite-plugin-pwa`, manifest, workbox) is in `vite.config.js`.

## Conventions & gotchas

- Views read and write **only** through `src/lib/data.js`; don't import `supabase` into a view.
- Lanes are stored neutral (`partner_a`/`partner_b`/`shared`) and displayed per-viewer — never store "Me/You/Us".
- Vitest runs with `environment: "node"` (see `vite.config.js`) — tests cover logic (lanes, parser), not the DOM.
- `docs/` holds the spec set (product spec, UI spec, build plan, handoff) and is the **source of truth for product behavior**; `docs/two-do-toc.md` indexes it.
- The app is **live and deployed** against real Supabase (auth + persistence, two-person shared space); all four views are wired to the data layer. Remaining work is feature polish, not scaffolding (see Status in `README.md` and `docs/two-do-build-plan.md`).
