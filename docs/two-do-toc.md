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

### Built since (Phase 0.5 / early Phase 2)

- **Project is a real app** — Vite + React PWA, Supabase schema, data-access layer with mock fallback, viewer-aware lane resolver (tested).
- **Cards wired to the data layer** — reads via `data.js`, lane badges resolved per viewer, realtime subscriptions (live in real mode).
- **Desktop responsive** — expands at ≥760px; Cards shows columns side-by-side.
- **The Grown-Up review tray** — full-screen takeover, draft cards, swipe + buttons to accept/dismiss, files via `data.js`. Built against a **stub parser**.
- **Pluggable parser** — `lib/parser.js` behind one interface; swap path stub → Claude → local home-lab service, UI unchanged.
- **Item detail editor** — tap any card or calendar event → full-screen slide-in editor (title, lane, date, notes, exciting+emoji, persistent, column, amount, delete). Saves via the data layer.
- **Add buttons work** — the + FAB and add-sheet create real items (Event/Task/Shopping/Expense) and open the editor.
- **Move cards** — ‹ › on each card shifts it between columns.
- **Dates navigation** — prev/next for day/week/month with real date math; calendar events come from the data layer and are clickable to edit.

### Not built yet

- **Real AI parsing** — stub only; Claude backend is the next parser step (then a local home-lab service).
- **Voice capture** — mic is decorative; no Web Speech API wiring.
- **Live persistence** — data layer + Supabase schema exist; real persistence/sync awaits onboarding/auth (mock works now).
- **Auth & shared space** — no accounts, no two-person pairing, no invite flow.
- **Onboarding** — the 3-screen flow (name, colour, invite) doesn't exist.
- **Drag-and-drop & column editing** — cards move via ‹ › buttons today; true drag-drop, reorder, rename/add/delete columns still pending.
- **Recurrence** — no repeat rules or series-vs-occurrence editing.
- **Nudges & push** — no in-app nudges, no PWA service worker, no notifications.
- **Context tags & surfacing** — no `@home`/`@out` engine; geofencing untouched (phase 3 anyway).
- **Settings** — no lane colour, label-style, or column configuration.

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
