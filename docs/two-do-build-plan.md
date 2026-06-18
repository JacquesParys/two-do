# Two-Do — Build Plan

*Companion to [`two-do-toc.md`](two-do-toc.md). Nails down the data model first (stack-agnostic), then details Phase 0 (Foundations) and Phase 1 (Core loop). Phases 2–3 stay high-level until we get there.*

> **Stack:** deliberately undecided. The data model below is described in neutral terms (entities, fields, relationships) so it maps cleanly onto either a relational store (Postgres/Supabase) or a document store (Firestore). Vendor choice happens at the top of Phase 0.

---

## Part 1 — The data model

### 1.1 Modelling principles

These come straight from the specs and the shell, and they constrain every entity below.

1. **Two people, one space.** Everything lives inside a single `Space` shared by exactly two `Person` records. No orgs, no teams, no permissions — both people read and write everything.
2. **Neutral lane slots, viewer-aware labels.** Lane is stored as `partnerA` / `partnerB` / `shared`. The user-facing **Me / You / Us** is *rendered per viewer* and is **never stored**. Whoever is logged in sees their own slot as "Me". This is a presentation concern, not a data one.
3. **One item spine, four specializations.** Tasks, Events, Shopping items, and Expenses share a common core (id, title, lane, notes, emoji, timestamps) and add their own fields. Model this as either a single `item` table with a `type` discriminator + nullable type-specific columns, or a shared base with per-type extensions — the choice is a stack detail, not a design one.
4. **Columns are data, not code.** Kanban columns are their own records with an editable label and a protected `role`. A card points at a column; `role` (not the label) drives behaviour.
5. **Money math is derived, never stored as a single balance.** The who-owes-who number is computed from expenses + settlements on read. Don't persist a mutable balance.
6. **Capture beats organization.** Every item must be creatable with just a title + lane; everything else is optional. The schema must not require fields that would block a fast capture.

### 1.2 Entity catalog

Fields marked *opt* are nullable/optional. Types are conceptual (`id`, `text`, `int`, `money`, `timestamp`, `enum`, `bool`, `ref→X`).

**Space** — the shared container.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| name | text, opt | e.g. "Jacques & ___" |
| labelStyle | enum | `me_you_us` (default) · `this_that_both` · `custom` · `players` |
| customLabels | json, opt | when labelStyle = custom: { partnerA, partnerB, shared } |
| createdAt | timestamp | |

**Person** — one of the two partners.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| slot | enum | `partnerA` or `partnerB` — the neutral slot this person maps to |
| displayName | text | |
| laneColor | text (hex) | chosen at onboarding, editable in settings |
| authRef | text | link to auth provider identity |

> **Me/You/Us is derived:** given the logged-in person's `slot`, render their own slot as **Me**, the other person's slot as **You**, and `shared` as **Us**. The "Us" lane has its own neutral color from the app palette (not person-chosen).

**Item** — the shared spine (discriminated by `type`).

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| type | enum | `task` · `event` · `shopping` · `expense` |
| title | text | user-typed, **never** modified by AI/puns |
| lane | enum | `partnerA` · `partnerB` · `shared` |
| claimedBy | ref→Person, opt | a `shared` item one person has "got" — doesn't change lane, matters for money math |
| notes | text, opt | |
| emoji | text, opt | user- or AI-suggested |
| color | text (hex), opt | custom **node color**; overrides the lane color for this item's wash/glow (the lane *badge* still shows Me/You/Us). Exciting items glow in this node color. |
| kind | enum | `routine` · `exciting` — on the **spine** so tasks *and* events can be exciting; drives glow / sleeps / emoji |
| createdBy | ref→Person | attribution (so "remind me" resolves) |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp, opt | soft-delete; filtered out on read |
| parentItemId | ref→Item, opt | child of a card/event: a subtask step **or** a member of a list attached to it. Top-level views exclude children. |
| linkedListId | ref→List, opt | a card/event that **references** a standing list (shown inline; one source of truth). Distinct from `listId` membership. |

> **Views are field-driven, `type` is the primary nature.** An item appears in a view based on which placement fields are set, **not** its `type`: `columnId` → board (Cards), `startAt`/`dueAt` → calendar (Dates), `listId` → list (Lists). One item can satisfy several at once — a dated task is both a card and a calendar entry ("one thing, three views"). So `type` only drives capture defaults / icon / which editor fields show. The fields below are grouped by the type that *usually* sets them, but any of them may be combined on one item (e.g. a `task` with a `listId` shows in both Cards and Lists).

**Task fields** (when `type = task`)

| Field | Type | Notes |
|---|---|---|
| dueAt | timestamp, opt | no date = the someday/floating pile |
| locationContext | enum/text, opt | `@home` · `@out` · `@work` · custom; hidden by default, drives surfacing |
| columnId | ref→Column | which kanban column the card sits in |
| state | enum | `open` · `done` · `parked` (parked ≠ overdue) |
| persistentUntilDone | bool | opt-in resurfacing nudge |
| recurFreq / recurUntil / recurExcept | enum / ts / jsonb, opt | embedded recurrence — `daily`·`weekly`·`monthly`, optional end, skipped occurrence keys. Occurrences are expanded on read, never stored. |

**Event fields** (when `type = event`)

| Field | Type | Notes |
|---|---|---|
| startAt | timestamp | |
| endAt | timestamp, opt | |
| recurFreq / recurUntil / recurExcept | enum / ts / jsonb, opt | embedded recurrence — `daily`·`weekly`·`monthly`, optional end, skipped occurrence keys. Occurrences are expanded on read, never stored. |

*(`kind` lives on the Item spine now — see above — so events read routine/exciting from there.)*

**Shopping fields** (when `type = shopping`)

| Field | Type | Notes |
|---|---|---|
| listId | ref→List | **general list membership** — any item type can be filed into a list, not shopping-only (a `task` with a `listId` appears in Lists too) |
| qty | text, opt | "x2", "500g" — free text, not numeric |
| priceEstimate | money, opt | |
| store | ref→Store, opt | drives the per-store grouping the shell already does |
| checked | bool | check-off state |
| checkedAt | timestamp, opt | for ordering the "Done" section |

**Expense fields** (when `type = expense`)

| Field | Type | Notes |
|---|---|---|
| amount | money | always `$` |
| paidBy | ref→Person | who actually paid |
| costAttribution | enum | `partnerA` · `partnerB` · `split` (whose cost it is) |
| category | text/emoji, opt | a glanceable tag — **not** a budgeting system |
| spentAt | timestamp | |
| fromShoppingItemId | ref→Item, opt | when a checked shopping item rolled into an expense |

**Column** — kanban column (editable label, protected role).

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| label | text | "Today", "Soon", or anything the user renames it to |
| order | int | left-to-right position |
| role | enum | `none` · `done` · `someday` — behaviour sticks regardless of label |

> Defaults seeded per space: Today (`none`) · Soon (`none`) · Someday (`someday`) · Done (`done`). `done` = counts as complete; `someday` = never nagged.

**List** — a named, standalone shopping/task list (a space-level container shown as a tab). Items join via `listId`. A list *attached* to a specific card or event is a different mechanism — child items via `parentItemId` — not a row here.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| name | text | "Groceries", "House", "Keep forgetting" |
| emoji | text, opt | shown on the tab |
| hasStores | bool | toggles per-store grouping in the view |
| order | int | |

**Store** — a shop, for grouping shopping items.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| name | text | "No Frills", "Metro", "Home Depot" |
| color | text (hex), opt | badge color |

**Bill** — a recurring expense template.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| name | text | "Rent", "Netflix" |
| amount | money | |
| frequency | enum | `monthly` · `weekly` · etc. |
| nextDueAt | timestamp | |
| autoCreateExpense | bool | spawn an Expense when due (phase 3 nicety) |

**SavingsGoal** — a named pot.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| name | text | "Japan 2027" |
| emoji | text, opt | |
| target | money | |
| linkedItemId | ref→Item, opt | the exciting event this pot funds |

*(No stored `saved` — progress is the sum of `GoalContribution` rows below.)*

**GoalContribution** *(optional, cleaner than a mutable `saved`)*

| Field | Type | Notes |
|---|---|---|
| id | id | |
| goalId | ref→SavingsGoal | |
| amount | money | |
| at | timestamp | |
| by | ref→Person | |

**Settlement** — a "we squared up" event that zeroes the running balance.

| Field | Type | Notes |
|---|---|---|
| id | id | |
| spaceId | ref→Space | |
| amount | money | |
| from | ref→Person | |
| to | ref→Person | |
| at | timestamp | |

**Recurrence — embedded on the Item** (resolved decision; no separate table). Fields `recurFreq` (`daily`·`weekly`·`monthly`), `recurUntil`, `recurExcept` (skipped date keys). Occurrences are **expanded on read** for the visible window by `src/lib/recurrence.js` (`occursOn` / `occurrenceFor` / `itemsOnDay`) — virtual, never stored, carrying a `_master` ref. Virtual occurrences are tap-only (open the master series); drag/resize is disabled on them.

**ReminderSetting** *(phase 2, listed for completeness)* — per-item nudge config: `itemId`, `nudgeAt`, `persistent` bool, `channel` (in-app / push).

### 1.3 Relationships (text diagram)

```
Space 1───2 Person
Space 1───* Item ──< type >── Task | Event | Shopping | Expense
Space 1───* Column        Task *───1 Column
Space 1───* List          Shopping *───1 List
Space 1───* Store         Shopping *───0..1 Store
Space 1───* Bill
Space 1───* SavingsGoal   SavingsGoal 0..1───1 Item(event)
Space 1───* Settlement
Expense *───1 Person (paidBy)
SavingsGoal 1───* GoalContribution
```

### 1.4 Derived / computed (never stored)

- **Me / You / Us** — from viewer's `slot` vs item `lane`.
- **Who-owes-who balance** — fold over Expenses (by `paidBy` and `costAttribution`) minus Settlements. Split expenses divide 50/50; `claimedBy` on shared items can reassign cost.
- **"X sleeps"** — `dueAt`/`startAt` minus today, in days, for exciting future items.
- **Due hint** — relative format ("Tomorrow", "In 3 days") from `dueAt`.
- **Sub-task progress** — `done / total` over an item's child items (`parentItemId`), where a child's `state = done` counts. Same mechanism as a list attached to a card/event. See `getSubtaskProgress` in `src/lib/data.js`.

### 1.5 Resolved decisions

All model questions are now settled:

- **Stack → Supabase** (Postgres + row-level security + realtime + auth).
- **Item storage → single `items` table** with a `type` discriminator and nullable type-specific columns.
- **View membership → field-driven, not type-filtered.** `type` is the primary-nature hint; presence of `columnId` / `startAt`·`dueAt` / `listId` decides board / calendar / list membership, so one item can appear in several views.
- **`listId` is general list membership** — any item type can be filed into a list (resolves the spec's "a task that lives in a list also shows up as a card").
- **Sub-tasks → child Items via `parentItemId`** (reverses the earlier lightweight-`Subtask`-table call). The same mechanism models a checklist/list attached to a card or event, so there is one concept instead of two. The standalone `subtask` table is dropped.
- **List relationships are three-way:** `listId` (item is a line *in* a standing list), `linkedListId` (a card/event *references* a standing list, shown inline — one source of truth, no duplication), and `parentItemId` (ad-hoc child checklist on an item). A "grocery run" event uses `linkedListId` to point at the live Groceries list.
- **Goal progress → summed `GoalContribution` rows** (audit trail; no stored `saved`).
- **`exciting` vs event `kind` → single `kind` enum on the Item spine** (`routine` · `exciting`), applying to tasks and events.
- **Deletes → soft-delete** via `deletedAt`, filtered on read.

---

## Part 2 — Phase 0: Foundations

**Goal:** turn the static shell into a real app skeleton — the existing views reading and writing real, synced data for two accounts. No new features; same screens, now alive.

**Definition of done:** both partners can log in on separate devices, see the same Space, and a change one makes (e.g. checking a shopping item) appears for the other in near-real-time. Data survives refresh.

### 0.1 Stack — DECIDED
- **Supabase** (Postgres + RLS + realtime + auth) for the data layer.
- **Vite + React PWA** for the client (formalizes the existing shell).
- Realtime sync via Supabase channels; two-account auth via Supabase Auth.

### 0.2 Project scaffolding
- Stand up the React/Vite project; port `two-do-shell.jsx` in as the starting UI.
- Extract the inline `COLORS`/font setup into a shared theme module (no visual change).
- Add **PWA scaffolding early**: web manifest + service worker registration (empty push handler for now). This shapes the client even though nudges arrive in Phase 2.

### 0.3 Backend + schema
- Implement the §1.2 entities in the chosen store.
- Seed logic: creating a Space provisions the four default Columns and a couple of starter Lists.
- Enforce the two-person invariant at the data layer.

### 0.4 Auth + shared space
- Minimal auth: two accounts, one Space. No permissions/roles.
- Map each account to a `Person` with a `slot`. Implement the **viewer-aware Me/You/Us** resolution as a client-side helper keyed on the logged-in person.

### 0.5 Data access + realtime
- A typed data layer (queries + mutations) the views call instead of using mock arrays.
- Wire **realtime subscriptions** so both clients stay in sync.
- Replace the shell's hardcoded mock data in all four views with live reads.

### 0.6 Verify
- Two-device manual test: create / edit / check-off / settle reflects across both sessions.
- Refresh-persistence test.
- `prefers-reduced-motion` still respected; no regression in the shell's look.

**Sequencing:** 0.1 → 0.2 (parallel with 0.3) → 0.4 → 0.5 → 0.6. 0.2 and 0.3 can run together once the stack is chosen.

---

## Part 3 — Phase 1: Core loop

**Goal:** a genuinely usable shared planner — manual entry, editing, and all three views fully functional on real data. No AI yet.

**Definition of done:** a couple could actually run their week in Two-Do using only manual entry.

### 1.1 Manual capture (the FAB add-sheet, made real)
- Wire the existing add-sheet (Event / Task / Shopping item / Expense) to create real Items.
- Enforce "capture beats organization": title + lane is enough; everything else optional and deferrable.
- Quick-add paths already in the shell (calendar long-press, list quick-add row) write real data.

### 1.2 Item detail view
- Build the **full-screen slide-in-from-right** detail page (currently missing).
- Editable inline: title, lane (tappable badge), date/time, location context, notes, sub-tasks, recurrence, exciting toggle + emoji picker, persistent-until-done toggle, delete.
- Auto-save on change; back gesture/button returns.

### 1.3 Cards (kanban) interactions
- Drag-and-drop between columns (desktop) / move action (mobile); persist `columnId`.
- Column editing: rename, reorder, add, delete — with **protected `done`/`someday` roles** and UX that communicates the role survives a rename.
- Done-detection and never-nag (someday) driven by `role`.

### 1.4 Dates (calendar) interactions
- Real events/dated tasks render from data across day/week/month.
- Create via long-press; open via tap → detail view.
- Lane filtering (all / Me / You / Us). Routine-vs-exciting styling from data.

### 1.5 Lists interactions
- Persist check-off, the done-section ordering, per-store grouping and filters.
- Create/rename/delete lists; add/edit items; set store + qty + lane.
- Checked shopping item can **roll into an Expense** (sets `fromShoppingItemId`).

### 1.6 Two Cents (finance)
- Log expenses (amount `$`, paidBy, costAttribution, category, date).
- **Compute and show the who-owes-who balance** from expenses + settlements; settle-up zeroes it.
- Bills CRUD + monthly picture. Savings goals CRUD with contributions and progress; optional link to an exciting event.

### 1.7 Sub-tasks / break-it-down
- Add/check/reorder sub-tasks on any task; progress bar reflects `done/total`.

### 1.8 Onboarding
- The 3-screen flow: welcome + name, pick lane colour, invite the other half (link/code to join the one Space).
- All of it editable later in **Settings** (lane colour, label style, column names/order, display name).

### 1.9 Verify
- End-to-end: a full mock week entered by hand across all four views, two devices, synced.
- Edge cases: no-date someday items never nagged; renamed Done column still completes; settle-up math correct; reduced-motion honored.

**Sequencing:** 1.8 onboarding first (you need a Space + colours to test the rest meaningfully) → 1.1 capture → 1.2 detail view (unblocks editing everywhere) → 1.3/1.4/1.5 views in parallel → 1.6 finance → 1.7 sub-tasks → 1.9 verify.

---

## Part 4 — Phases 2 & 3 (high-level)

**Phase 2 — The magic.** The Grown-Up AI parsing endpoint + the full-screen **review tray** (chat clarification → stack of editable draft cards → swipe accept/dismiss → file). Voice capture (Web Speech API) into the same pipeline. Soft + persistent-until-done **nudges via push** (the Phase 0 PWA scaffolding pays off here). Recurrence polish (occurrence-vs-series edits). *This is where "capture beats organization" actually lands.*

**Phase 3 — The ambition.** Context-aware surfacing: time-of-day first, then real geofencing (needs device location permissions — the hard one). Focus / body-doubling mode that walks a task's sub-steps one at a time. Finance niceties: auto-bills from recurring, goal↔event funding links. Optional one-way `.ics` export feed.

---

## Immediate next step

With the data model agreed, the first concrete build action is **Phase 0.1 — choose the stack**, since 0.2/0.3 can't start until the data layer is picked. Everything in Part 1 is stack-agnostic and ready to translate the moment that call is made.

---

*Living document. Update alongside [`two-do-toc.md`](two-do-toc.md) as phases land.*
