\# Two-Do — Product Spec (v0.2)

&#x20;

\*A shared planning app for two people with ADHD. Part calendar, part to-do list, part shopping list, part money-wrangler — and pun-forward by design.\*

&#x20;

> Working name: \*\*Two-Do\*\*. Other contenders in the appendix. Rename freely.

&#x20;

> \*\*What changed in v0.2:\*\* the five open questions from v0.1 §14 are now resolved. Headlines: the calendar \*\*stands alone\*\* (Two-Do is the source of truth, no external sync); \*\*voice input ships day one\*\*; \*\*money stays simple\*\* (just the three jobs, no category budgeting); \*\*card columns are user-editable\*\*; and \*\*push notifications are in\*\*, which sets the client target as a \*\*PWA\*\*. Resolved decisions are folded into the relevant sections below, and §14 now records them rather than asking them.

&#x20;

\-----

&#x20;

\## 1. The one-sentence pitch

&#x20;

A single shared brain for two partners — where you can dump thoughts in plain language (typed \*or spoken\*), have them sorted into the right place automatically, and see everything as a calendar, a card board, or a list, with gentle context-aware nudges so things actually get done.

&#x20;

\## 2. Who it’s for

&#x20;

Exactly two people and their shared life. Not a family app, not a team app. The data model assumes \*\*two people plus a shared lane\*\* — nothing more. This keeps everything simpler: assignment is always one of three lanes (Me / You / Us), permissions don’t exist (you both see and edit everything), and there’s no invite flow beyond the second person joining the space.

&#x20;

\## 3. Core design principles

&#x20;

These are the rails. When a feature decision is unclear, fall back to these.

&#x20;

1\. \*\*Capture beats organization.\*\* The fastest path from “thought in head” to “saved somewhere” wins. Sorting can happen later or automatically; never make capture the bottleneck.

1\. \*\*No guilt.\*\* Overdue things don’t turn red and scream. The tone stays light. ADHD brains already supply the shame; the app shouldn’t.

1\. \*\*Context is king.\*\* A task is only useful when it’s surfaced at a moment you can act on it. Location and time-of-day shape what you see, not just a flat due date.

1\. \*\*One thing, three views.\*\* Calendar, cards, and lists are windows onto the \*same\* data — never separate silos. Editing in one updates all.

1\. \*\*Puns are load-bearing.\*\* The humor isn’t decoration; it’s what makes a chore app something you’ll actually open. Heavy pun density, applied to labels, empty states, and nudges — never to data the user typed.

\## 4. The three lanes (assignment model)

&#x20;

Everything — tasks, events, shopping items, expenses — is assigned to one of three lanes. Underneath, the model stores three neutral slots: \*\*`partnerA`\*\*, \*\*`partnerB`\*\*, and \*\*`shared`\*\*. Nothing gendered, nothing hardcoded to a specific household — so the app works for any pairing.

&#x20;

What the user \*sees\* is \*\*Me / You / Us\*\*, rendered per viewer:

&#x20;

\- \*\*Me\*\* — the lane belonging to whoever is currently logged in.

\- \*\*You\*\* — the other partner’s lane.

\- \*\*Us\*\* — the shared/joint lane (same for both).

\*\*Viewer-aware rendering is the key detail.\*\* The labels swap based on who’s looking. A task stored against `partnerA` shows as “Me” when partner A is viewing and “You” when partner B is viewing. The record never changes — only its label does. The app already knows who’s logged in (it’s a two-person space), so this comes for free. “Us” reads the same for everyone.

&#x20;

This is deliberately chosen over fixed labels: fixed labels would force each partner to see their own items tagged “You,” which reads wrong. Per-viewer swapping keeps it personal for both.

&#x20;

A “Us” item can optionally be \*claimed\* by one person (“I’ve got this one”) without changing its shared nature, which matters for the who-owes-who math later.

&#x20;

> \*\*Colours over labels for scanning.\*\* On the calendar and card board, each lane also carries a colour/avatar set at setup. A colour dot reads faster at a glance than a word and sidesteps labels entirely in dense views.

&#x20;

\### 4a. Label style (optional)

&#x20;

Me / You / Us is the default and needs zero setup. For anyone who wants something different, a toggle offers alternatives that map onto the same two-slot model:

&#x20;

\- \*\*Me / You / Us\*\* \*(default — per-viewer, no setup)\*

\- \*\*This one / That one / Both\*\* \*(fixed \& neutral — identical for whoever looks, so no per-viewer swapping)\*

\- \*\*Custom names\*\* — type each person’s name or handle plus a label for the shared lane

\- \*\*Player 1 / Player 2 / Co-op\*\* \*(playful, fits the tone)\*

\## 5. Item types

&#x20;

All four share a common spine (title, lane, optional notes, created-at, optional emoji/tag) and then specialize:

&#x20;

\### 5.1 Tasks (to-dos)

&#x20;

\- Optional due date/time \*\*or\*\* no date at all (a someday/maybe pile is essential for ADHD).

\- Optional \*\*location context\*\*: `@home`, `@out`, `@work`, or a custom place. Drives context-aware surfacing.

\- \*\*Sub-tasks / break-it-down\*\*: any task can be exploded into smaller steps. This is a key ADHD support — a daunting “do taxes” becomes five checkable micro-steps.

\- States: open → done. Plus a soft “parked” state for things deliberately set aside (distinct from overdue).

\- Recurrence (see §7).

\### 5.2 Events (calendar)

&#x20;

\- Has a real start/end time. Shows on the calendar.

\- Tagged as \*\*routine\*\* (recurring life admin — bins out, meds, standing calls) or \*\*exciting\*\* (date night, gigs, trips). The app visually distinguishes them so the calendar isn’t a wall of grey obligation — the fun stuff \*looks\* fun.

\- Recurrence (see §7).

\### 5.3 Shopping items

&#x20;

\- Live on named lists (Groceries, Hardware, “Things we keep forgetting”).

\- Each item: name, optional quantity, lane (who’s it for / who’s buying), optional price estimate.

\- Check-off mode for in-store use; checked items can roll into the finance side as an actual expense.

\### 5.4 Expenses / financial entries

&#x20;

\- An amount, a payer (Me / You / Us-account), a category, a date.

\- Feeds the three money jobs in §8.

\## 6. The chat info-dump (the headline feature)

&#x20;

A single text box either of you can fire thoughts into, free-form, any time — \*\*typed or spoken\*\* (see §6a). Real AI parsing (via an API call) turns the dump into structured drafts.

&#x20;

\*\*Flow:\*\*

&#x20;

1\. Either partner types or speaks a brain-dump, e.g.:

> “ok so we need cat food and bin bags, dentist for me thursday afternoon, pay the council tax it’s like 180 quid, and book somewhere nice for our anniversary in march”

&#x20;

1\. The AI parses this into \*\*proposed items\*\*, each pre-sorted:

\- \*Cat food\* → Shopping (Groceries), lane Us

\- \*Bin bags\* → Shopping (Groceries), lane Us

\- \*Dentist\* → Event, Thursday PM, lane You (routine)

\- \*Council tax £180\* → Task + Expense, lane Us

\- \*Anniversary booking, March\* → Task (exciting), lane Us

1\. The proposals appear as a \*\*review tray\*\* — confirm-before-filing. You can tap to accept all, edit any, or bin the misreads. Nothing enters your real data until confirmed (protects against the AI mishearing and you losing trust in the system).

\*\*Why confirm-before-file even though you chose “real AI parsing”:\*\* the two aren’t in conflict. The parsing is AI; the \*filing\* is gated by a one-tap confirm. This is the single most important trust mechanism in the app — get it wrong and people stop dumping.

&#x20;

\*\*Attribution:\*\* each dump remembers who sent it, so “remind \*me\*” vs “remind \*her\*” resolves correctly.

&#x20;

\### 6a. Voice input \*(resolved: day one)\*

&#x20;

Voice is in from the first release, not deferred. It’s the most natural fit for “capture beats organization” — speaking a brain-dump is faster than typing one, especially on the move.

&#x20;

\- \*\*Implementation:\*\* use the device’s native speech-to-text (the Web Speech API in the PWA). The transcript flows into the \*\*same\*\* AI parser the typed dump uses — voice is just another way to fill the same box, not a separate pipeline.

\- \*\*The confirm tray earns its keep here.\*\* Speech-to-text adds a second layer of mishearing on top of the AI parse, so the review-before-file gate matters more for voice than for typed input. No special-casing needed — the existing tray already covers it.

\- \*\*Attribution still holds:\*\* whoever triggered the voice capture is the dump’s author, so “remind me” resolves correctly.

\## 7. Scheduling \& recurrence

&#x20;

Three flavours, all first-class:

&#x20;

\- \*\*Routine / recurring\*\*: standard repeat rules (daily, weekly, every-other-Tuesday, monthly, etc.) with an optional end. Used for life admin.

\- \*\*One-off exciting\*\*: single events flagged as the good stuff; surfaced with extra visual love and an optional countdown (“19 sleeps till the gig”).

\- \*\*Floating / no-date\*\*: the someday pile. Critically \*not\* nagged about — it’s a holding pen, not a debt.

Recurrence should support “next occurrence only” edits vs “whole series” edits, because ADHD plans change constantly.

&#x20;

\## 8. Financial planner \*(resolved: keep it simple — three jobs only, no category budgeting)\*

&#x20;

Three jobs, all in scope, sharing the expense data spine. Deliberately \*\*not\*\* a budgeting app — no envelopes, no per-category limits, no monthly category targets. Category is a single free-text/emoji tag for glanceability, not a budgeting system. This avoids the over-build trap and keeps finance shippable.

&#x20;

1\. \*\*Shared bills / budget\*\*: track recurring bills (rent, utilities, subscriptions), see a simple monthly picture. Bills can auto-create as recurring expenses.

1\. \*\*Split / who-owes-who\*\*: every expense has a payer and a “whose cost is this” (Me / You / Us-split). A running balance shows who’s currently up. Settling up zeroes it. Keep the math dead simple and always visible — no spreadsheets.

1\. \*\*Savings goals for fun stuff\*\*: named pots (“Japan 2027”, “new sofa”) with a target and progress. Contributions logged manually. The exciting-events side can link to a pot (“this trip is funded from Japan 2027”).

> Full category budgeting lives in the parking lot (Appendix B) if the appetite ever appears — but it’s explicitly out of scope for v1.

&#x20;

\## 9. The three views

&#x20;

Same data, three lenses:

&#x20;

\### 9.1 Calendar view \*(resolved: stand-alone — Two-Do is the source of truth)\*

&#x20;

Day / week / month. Events and dated tasks appear here. Routine vs exciting are visually distinct (colour/icon). Lanes are filterable (show just Me, just You, just Us, or all).

&#x20;

\*\*Stand-alone, not a mirror.\*\* Two-Do owns the calendar outright — there is no two-way sync with Google or Apple calendars. This removes the single biggest architectural fork in v0.1: no external calendar API, no reconciliation logic, no “which side wins” conflict handling. The calendar is fully under Two-Do’s control.

&#x20;

\- \*\*Trade-off accepted:\*\* events live only in Two-Do. If you already keep a calendar elsewhere, this is a second place to look.

\- \*\*Escape hatch for later:\*\* a \*\*one-way export\*\* (a read-only `.ics` feed others can subscribe to) is a much smaller lift than full integration. It’s \*not\* in scope for v1, but it’s the natural answer if the “I want to see this in my main calendar” itch ever shows up. Noted so it isn’t mistaken for full sync.

\### 9.2 Card board (Kanban) \*(resolved: editable columns, with defaults)\*

&#x20;

Columns \*\*default\*\* to something ADHD-friendly — \*\*Today / Soon / Someday / Done\*\* — but are \*\*user-editable\*\*: rename, reorder, add, and remove. The board is \*not\* a rigid backlog. Cards are draggable between columns. Each card shows lane, due hint, and sub-task progress. This is the “what should I actually do now” view.

&#x20;

\*\*Data-model note (the consequential part):\*\* columns become their own configurable entity rather than hardcoded task states. A card’s column is just a pointer to a column record. Two columns carry \*\*protected behavioural roles\*\* even though their labels are editable:

&#x20;

\- \*\*Done\*\* — the closed/complete role. Cards here count as done regardless of what the column is renamed to.

\- \*\*Someday\*\* — the never-nagged holding-pen role (ties to the floating/no-date pile in §7). Cards here are not surfaced by nudges.

Everything else is free. So a couple can rename “Soon” to “This week” or add a “Waiting on someone” column without breaking done-detection or accidentally turning the someday pile into a nag source.

&#x20;

\### 9.3 Shopping + finance

&#x20;

Lists for shopping (check-off mode), and the money dashboard (balance, bills, goals). Grouped sensibly so a quick “what do we need / where are we at” glance works.

&#x20;

\*(Chat info-dump is an always-available input layer, reachable from every view — think of it as the front door, not a fourth room.)\*

&#x20;

\## 10. ADHD support layer

&#x20;

This is a differentiator, not a footnote.

&#x20;

\- \*\*Soft nudges\*\*: gentle, dismissible reminders. Never red, never guilt-tripping. A nudge that’s ignored just… waits.

\- \*\*Persistent-until-done (opt-in, per item)\*\*: for the genuinely important stuff, a reminder that keeps gently resurfacing rather than vanishing after one buzz. Per-item toggle so it’s not the default firehose.

\- \*\*Body-doubling / break-it-down\*\*: the sub-task feature plus a “start with one tiny step” framing. Optionally a focus/companion mode where the app walks you through a task’s steps one at a time.

\- \*\*Context-aware surfacing (your key ask)\*\*: this is the ambitious one. The app uses location + time to push the \*right\* things:

&#x20; - At home → home tasks bubble up (`@home`).

&#x20; - Out and about → errand and shopping reminders fire (`@out`, nearby-shop nudges).

&#x20; - Time-of-day shaping (morning routine items in the morning, etc.).

&#x20; - \*\*Build note:\*\* real geofencing needs device location permissions and is genuinely harder than the rest of the app. Treat it as a \*\*phase 3\*\* capability — ship time-of-day + manual context tags first, add true location triggers once the core works. Flagged here so the data model (location tags on tasks) is ready for it from day one. The PWA target (see §10a / §12) makes the eventual geofencing path more reachable than plain responsive web would.

\### 10a. Nudge delivery \*(resolved: push notifications, via PWA)\*

&#x20;

Nudges are delivered by \*\*push notifications\*\*, not in-app only. A reminder you only see when you’ve already opened the app isn’t much of a reminder for an ADHD brain.

&#x20;

\- \*\*Client implication:\*\* push pulls the client target to a \*\*PWA\*\* (installable web app with service-worker push) rather than plain responsive web. This is the midpoint that keeps you on a single web codebase while getting lock-screen-style reminders — and it doubles as the foundation for phase-3 geofencing.

\- \*\*Known caveat (iOS):\*\* iOS only supports web push for PWAs \*\*added to the home screen\*\*, and delivery is less reliable than native. If push reliability turns out to be critical for the \*\*persistent-until-done\*\* feature specifically, that’s the thing that would eventually justify a native wrapper. Not a v1 blocker — just the known ceiling.

\- In-app nudges still exist; push is the \*additional\* channel, not a replacement. Email is out of scope.

\## 11. Tone \& pun guidelines (heavy)

&#x20;

Puns go on \*\*chrome, not content\*\*. Label the furniture, never rewrite what the user typed.

&#x20;

\- App/section names: \*Two-Do\* (the app), \*The Brain Drain\* (info-dump box), \*Choreography\* (recurring chores), \*Owe Snap\* (who-owes-who balance), \*Fund \& Games\* (savings goals), \*Aisle Be There\* (shopping), \*Sleeps\* (countdowns).

\- Empty states: e.g. an empty Today column → “Nothing due. Suspiciously calm. Enjoy it or fill it.”

\- Nudges carry the light tone but stay genuinely useful and never guilt-laden.

\- \*\*Hard rule:\*\* humor never obscures function. If a pun makes a button’s purpose unclear, the pun loses.

\## 12. Tech direction

&#x20;

v0.2 firms several of these up from “orientation” to “decided,” driven by the resolved questions.

&#x20;

\- \*\*Client: a PWA\*\* (installable, service-worker push). Decided by the push-notification choice (§10a). Covers both of you on phone + laptop on one codebase; positions you for phase-3 geofencing without a rewrite. Native wrappers only become necessary if push reliability for persistent-until-done proves insufficient on iOS.

\- \*\*Shared cloud, live-synced\*\* (both see the same data in real time) is required. That points to a hosted backend with a realtime database (e.g. a Postgres-backed service with realtime, or a Firebase-style store). Two users, so the backend load is trivial.

\- \*\*Calendar is internal\*\* (§9.1) — no external calendar API or sync layer. One less integration to build and keep healthy.

\- \*\*AI parsing\*\* is an API call from the backend (keeps the key off-device and lets you tune the prompt centrally). Both typed and voice dumps hit this same endpoint; voice is transcribed client-side first (§6a).

\- \*\*Voice capture\*\* uses the browser’s native speech-to-text (Web Speech API), so there’s no separate audio-processing service to run.

\- \*\*Auth\*\*: minimal — two accounts, one shared space. No org/permission complexity.

\## 13. Suggested build phases

&#x20;

1\. \*\*Phase 1 (core loop):\*\* the three lanes, the four item types, the three views (with \*\*editable card columns\*\*), manual entry, shared sync, \*\*stand-alone calendar\*\*. The skeleton that’s useful even without AI.

1\. \*\*Phase 2 (the magic):\*\* chat info-dump with AI parsing + confirm tray, including \*\*voice capture\*\*; soft/persistent nudges delivered via \*\*push (PWA)\*\*; recurrence polish.

1\. \*\*Phase 3 (the ambition):\*\* context-aware location surfacing (geofencing); focus/body-doubling mode; finance niceties (auto-bills from recurring, goal linking); optional one-way `.ics` calendar export.

Shipping Phase 1 first means you have something real in hand before the hard parts.

&#x20;

> Note: voice (§6a) is committed for “day one” in the product sense, but technically rides alongside the AI parser, so it lands in Phase 2 with the rest of the info-dump. Push/PWA scaffolding is worth standing up early in Phase 1 even though nudges arrive in Phase 2, since it shapes the client.

&#x20;

\## 14. Resolved decisions (was: open questions)

&#x20;

All five v0.1 open questions are now settled:

&#x20;

1\. \*\*Calendar integration → stand-alone.\*\* Two-Do is the source of truth; no Google/Apple sync. One-way `.ics` export parked for phase 3. \*(See §9.1, §12.)\*

1\. \*\*Voice input → yes, day one.\*\* Native speech-to-text into the same AI parser; confirm tray covers the extra mishearing risk. \*(See §6a.)\*

1\. \*\*Money granularity → simple.\*\* Just the three jobs in §8; no category budgeting. Category is a glanceable tag, not a budget. \*(See §8.)\*

1\. \*\*Default card columns → flexible.\*\* Ship Today / Soon / Someday / Done, but columns are user-editable; Done and Someday keep protected behavioural roles. \*(See §9.2.)\*

1\. \*\*Nudge channels → push notifications.\*\* Delivered via PWA; in-app retained; email out of scope. iOS web-push reliability is the known ceiling. \*(See §10a, §12.)\*

New questions that these decisions surfaced (worth settling before prototyping, but none are blockers):

&#x20;

1\. \*\*`.ics` export\*\* — confirm it’s genuinely phase 3 and not wanted sooner, since standalone-calendar makes “see it in my main calendar” a foreseeable ask.

1\. \*\*Persistent-until-done on iOS\*\* — decide a fallback if web push proves too unreliable for the important-reminder case (e.g. accept the limitation for v1, or earmark a native wrapper).

1\. \*\*Column-role UX\*\* — how to communicate that Done/Someday behave specially when renamed, so a user doesn’t rename “Done” to something confusing and lose the thread.

\## Appendix A — name candidates

&#x20;

Two-Do · Pear (as in pair) · WeDo · Ours-To-Do · Dual Carriageway · The Joint Account (if money-forward) · Tandem

&#x20;

\## Appendix B — parking lot (“and more?”)

&#x20;

\- Meal planning that auto-generates the shopping list

\- “Spin the wheel” for indecision (pick a someday task / a date-night idea at random)

\- Shared notes / brain-dump archive you can search later

\- Mood or energy check-in that adjusts how much the app surfaces (“low spoons today” → show less)

\- Recurring-bill reminders that pre-fill the expense

\- Reward/streak mechanic — \*if\* it can be done without becoming a guilt engine

\- Full category budgeting (explicitly deferred from §8)

\- One-way `.ics` calendar export feed (from §9.1)

