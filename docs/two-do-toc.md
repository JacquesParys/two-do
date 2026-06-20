# Two-Do — Table of Contents & Roadmap

*The index for this project. Start here. Links out to every other doc, records what's built vs. not, and lays out the road from the current prototype to a shipped app.*

---

## What Two-Do is

A shared planning PWA for **two people** (and their shared life) with ADHD. Part calendar, part kanban, part shopping list, part money-tracker — pun-forward by design. The whole product rests on five rails: capture beats organization, no guilt, context is king, one thing/three views, and puns are load-bearing.

---

## Source of truth (read before editing anything)

When docs disagree, resolve it like this:

1. **Trust the shell.** `two-do-shell.jsx` is the running prototype and the most current expression of the design. Where a spec and the shell conflict, the shell wins and the spec gets updated to match.
2. **Tab labels are `Dates / Cards / Lists / Two Cents`.** The React components (`DatesView` / `CardsView` / `ListsView` / `TwoCentsView`), the prototype, and the specs all use these names throughout. The original punny names `Daze / Juggle / Hoard` are retired.
3. **Currency is `$`.** All amounts, examples, and copy use dollars. (Spec text still has some UK `£`/council-tax examples — treat those as stale.)
4. The specs remain the authority on **product logic and intent**; the shell is the authority on **what the app actually looks like and does today**.

---

## Document reference

| Doc | Covers | Status |
|---|---|---|
| `two-do-toc.md` | This file — index, roadmap, build status, source-of-truth rules | Living |
| `two-do-build-plan.md` | Data model (stack-agnostic) + detailed Phase 0/1 plan; Phases 2–3 high-level | Current — build plan |
| `two-do-spec.md` | v0.1 product spec — original logic, the five open questions (now resolved) | Superseded by v0.2 for decisions; kept for history |
| `two-do-spec-v0_2.md` | v0.2 product spec — resolves the five questions (standalone calendar, voice day-one, simple finance, editable columns, push via PWA) | Current — product logic |
| `two-do-ui-spec.md` | UI spec — palette, type, navigation, per-view layouts, interaction model, onboarding, copy | Current — design intent (note label drift, see above) |
| `two-do-cowork-handoff.md` | Post-v0.2 UI/naming decisions + list of things not yet decided | Current — design deltas |
| `two-do-nav-drawer.md` | Nav moved from the top chip bar to a right-edge drawer (push-left) opened by a top-right menu button; sign-out moved in too | **Built** 2026-06-19 |
| `two-do-buttons-bottom.md` | Proposed — bottom rework: a canvas **metaball orbit** of four orbs (Me/You/Us/Grown-Up); tap = create-in-lane, drag-out = filter-to-lane; removes the lane chips + input bar entirely. Reference prototype in `plans/prototypes/` | Proposed — not yet built |
| `two-do-shell-audit.md` | Audit of both shell-chrome docs vs. the live shell + build notes for the nav drawer | Current — audit |
| `plans/two-do-dates-day-week-refinements.md` | Dates view: Week gained the Day header + a selectable week-start day strip (Monday default), timeline blocks gained height-scaled padding, the now-line is quieted + layered under entries; plus the app-wide implicit-scroll (no scrollbars) change | **Built** 2026-06-19 |
| `plans/two-do-grown-up-claude-api.md` | The Grown-Up parser × Claude API: harden (structured outputs, ISO dates, timeout) → context-aware routing → clarifying chat; Sonnet 4.6 default, Haiku later; why no MCP server (yet) | **Built** 2026-06-19 (all 3 phases) |
| `two-do-shell.jsx` | Running React prototype of the app shell | **Current — visual/behavioural source of truth** |

---

## Build status — what exists today

Everything below is **front-end only, mock data, no persistence**. The shell is a high-fidelity click-through, not a working app.

### Built (in the shell)

- **App frame:** four-tab navigation (Dates / Cards / Lists / Two Cents), header, content area, bottom input bar.
- **Dates (calendar):** day / week / month views, view toggle, today highlighting, event rows, exciting vs. routine treatment, long-press quick-add overlay.
- **Cards (kanban):** Today / Soon / Someday / Done columns, column selector with counts, cards with lane badge / due hint / sub-task progress, exciting-item glow + emoji + sleeps chip, punny empty states.
- **Lists (shopping/tasks):** multiple named lists, per-store grouping and store filter chips, tap-row-to-check with done section, quick-add row, lane badges, quantities.
- **Two Cents (finance):** balance readout ("Owe Snap"), monthly bills list, savings goals ("Fund & Games") with progress bars.
- **The Grown-Up input bar:** persistent, rotating pun placeholders, mic + send buttons (visual), "The Grown-Up" label.
- **Add FAB + add-sheet:** manual-entry path (Event / Task / Shopping item / Expense).
- **Design system in code:** color tokens, Fraunces + DM Sans, lane badges, sleeps chips, progress bars, exciting glow.

### Built — now live & deployed

The prototype is a real, shipped app: **deployed** (Vercel; a GitHub Pages workflow also exists), on **real Supabase** with email+password auth, RLS, persistence, and a **two-person shared space**. Highlights:

- **Field-driven taxonomy** — "one item, three views"; subtasks + ad-hoc *attached* checklists via `parent_item_id`; *linked* standing lists via `linked_list_ids` (many-to-many); optional per-item custom color.
- **Layered/tactile UI + design-token system** (color/space/type/radius/shadow/motion), shared primitives, and an accessible `Modal` (role/Esc/focus-trap; center/sheet/push). Proximity + completion **fill** backdrops; exciting glow in the item's node color.
- **Dates** — day/week/month; a **24h day-timeline** with drag-to-move/resize; **week drag-to-reschedule**; **recurrence** (daily/weekly/monthly) expanded on read.
- **Cards** — real **drag-and-drop** (dnd-kit), per-column add, column rename/reorder/add/delete, subtask progress.
- **Lists** — per-store grouping + filters, animated check-off, inline add, delete-from-done, inline editing of linked lists.
- **Two Cents** — wired to the data layer: bills, savings goals + contributions, "Owe Snap" from expenses + settlements.
- **Capture** — the Grown-Up review tray (stub parser) + create-as-editor with a type selector; pluggable `lib/parser.js`.

### Not built yet

- **Partner invite/join flow** — a second person currently joins by being linked to the space's `partner_b` (manual SQL); needs an invite link/code + join RPC.
- **Real AI parsing** — ✅ built: the `parse` edge function calls Claude with structured outputs, context-aware routing, and a clarifying-question round (`plans/two-do-grown-up-claude-api.md`). Local home-lab service can implement the same contract later. *Remaining: deploy + set `ANTHROPIC_API_KEY` / `VITE_PARSER_URL`.*
- **Recurrence v2** — per-occurrence ("this one only") edits + richer rules (interval N / weekdays / nth-weekday).
- **Voice capture** — mic is decorative (no Web Speech API).
- **Nudges & push** — no in-app nudges or notifications (PWA SW scaffolding is in place).
- **The Grown-Up clarifying chat** — ✅ built: one clarifying-question round before filing when a dump is ambiguous (`plans/two-do-grown-up-claude-api.md` §6).
- **Context tags & surfacing** — no `@home`/`@out` engine; geofencing untouched (phase 3).
- **Settings UI** — lane colour / label-style pickers (column config exists; per-item color exists).

---

## Roadmap

Phases follow the v0.2 spec, re-cut against what the shell already covers.

### Phase 0 — Foundations (the unglamorous enabling work)
Turn the prototype into a real app skeleton: pick the stack, stand up the backend + real-time data layer, wire minimal auth and the two-person shared space, and add PWA scaffolding (manifest + service worker) early so push has a home later. **Outcome:** the shell's views read and write real, synced data for two accounts.

### Phase 1 — Core loop (useful without AI)
The three lanes, four item types, and three views backed by real data and editable. Manual entry via the FAB add-sheet, item detail view, inline edits, kanban drag/column config, shopping check-off persistence, finance entries, onboarding. **Outcome:** a genuinely usable shared planner — no magic yet, but real.

### Phase 2 — The magic
The Grown-Up: AI parsing endpoint + the full-screen review tray (chat clarification → swipe accept/dismiss → file). Voice capture into the same pipeline. Soft + persistent-until-done nudges delivered via push (PWA). Recurrence polish. **Outcome:** capture-beats-organization actually delivered.

### Phase 3 — The ambition
Context-aware surfacing (time-of-day first, then geofencing). Focus / body-doubling mode. Finance niceties (auto-bills from recurring, goal↔event linking). Optional one-way `.ics` export. **Outcome:** the differentiators that make it more than a pretty to-do app.

---

## Open questions (not yet decided)

Carried from the handoff doc plus drift surfaced by the prototype:

- Exact hex palette and final type sizes (shell has working values; not yet "locked").
- Onboarding mechanics — how two people actually create and join one shared space.
- Column-role UX — communicating that Done/Someday behave specially when renamed.
- How parked items look vs. open ones.
- Nudge tone/copy — the full set, not just examples.
- `.ics` export — confirm it's genuinely phase 3.
- Persistent-until-done on iOS — fallback if web push proves unreliable.
- Document the shell's **additions** (FAB add-sheet, per-store grouping in Lists) into the UI spec.

---

*Living document. As decisions land, fold them in here and update the affected spec.*
