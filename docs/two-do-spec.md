Two-Do — Product Spec (v0.1)
A shared planning app for two people with ADHD. Part calendar, part to-do list, part shopping list, part money-wrangler — and pun-forward by design.

Working name: Two-Do. Other contenders in the appendix. Rename freely.


1. The one-sentence pitch
A single shared brain for two partners — where you can dump thoughts in plain language, have them sorted into the right place automatically, and see everything as a calendar, a card board, or a list, with gentle context-aware nudges so things actually get done.
2. Who it’s for
Exactly two people and their shared life. Not a family app, not a team app. The data model assumes two people plus a shared lane — nothing more. This keeps everything simpler: assignment is always one of three lanes (Me / You / Us), permissions don’t exist (you both see and edit everything), and there’s no invite flow beyond the second person joining the space.
3. Core design principles
These are the rails. When a feature decision is unclear, fall back to these.

Capture beats organization. The fastest path from “thought in head” to “saved somewhere” wins. Sorting can happen later or automatically; never make capture the bottleneck.
No guilt. Overdue things don’t turn red and scream. The tone stays light. ADHD brains already supply the shame; the app shouldn’t.
Context is king. A task is only useful when it’s surfaced at a moment you can act on it. Location and time-of-day shape what you see, not just a flat due date.
One thing, three views. Calendar, cards, and lists are windows onto the same data — never separate silos. Editing in one updates all.
Puns are load-bearing. The humor isn’t decoration; it’s what makes a chore app something you’ll actually open. Heavy pun density, applied to labels, empty states, and nudges — never to data the user typed.

4. The three lanes (assignment model)
Everything — tasks, events, shopping items, expenses — is assigned to one of three lanes. Underneath, the model stores three neutral slots: partnerA, partnerB, and shared. Nothing gendered, nothing hardcoded to a specific household — so the app works for any pairing.
What the user sees is Me / You / Us, rendered per viewer:

Me — the lane belonging to whoever is currently logged in.
You — the other partner’s lane.
Us — the shared/joint lane (same for both).

Viewer-aware rendering is the key detail. The labels swap based on who’s looking. A task stored against partnerA shows as “Me” when partner A is viewing and “You” when partner B is viewing. The record never changes — only its label does. The app already knows who’s logged in (it’s a two-person space), so this comes for free. “Us” reads the same for everyone.
This is deliberately chosen over fixed labels: fixed labels would force each partner to see their own items tagged “You,” which reads wrong. Per-viewer swapping keeps it personal for both.
A “Us” item can optionally be claimed by one person (“I’ve got this one”) without changing its shared nature, which matters for the who-owes-who math later.

Colours over labels for scanning. On the calendar and card board, each lane also carries a colour/avatar set at setup. A colour dot reads faster at a glance than a word and sidesteps labels entirely in dense views.

4a. Label style (optional)
Me / You / Us is the default and needs zero setup. For anyone who wants something different, a toggle offers alternatives that map onto the same two-slot model:

Me / You / Us (default — per-viewer, no setup)
This one / That one / Both (fixed & neutral — identical for whoever looks, so no per-viewer swapping)
Custom names — type each person’s name or handle plus a label for the shared lane
Player 1 / Player 2 / Co-op (playful, fits the tone)

5. Item types
All four share a common spine (title, lane, optional notes, created-at, optional emoji/tag) and then specialize:
5.1 Tasks (to-dos)

Optional due date/time or no date at all (a someday/maybe pile is essential for ADHD).
Optional location context: @home, @out, @work, or a custom place. Drives context-aware surfacing.
Sub-tasks / break-it-down: any task can be exploded into smaller steps. This is a key ADHD support — a daunting “do taxes” becomes five checkable micro-steps.
States: open → done. Plus a soft “parked” state for things deliberately set aside (distinct from overdue).
Recurrence (see §7).

5.2 Events (calendar)

Has a real start/end time. Shows on the calendar.
Tagged as routine (recurring life admin — bins out, meds, standing calls) or exciting (date night, gigs, trips). The app visually distinguishes them so the calendar isn’t a wall of grey obligation — the fun stuff looks fun.
Recurrence (see §7).

5.3 Shopping items

Live on named lists (Groceries, Hardware, “Things we keep forgetting”).
Each item: name, optional quantity, lane (who’s it for / who’s buying), optional price estimate.
Check-off mode for in-store use; checked items can roll into the finance side as an actual expense.

5.4 Expenses / financial entries

An amount, a payer (Me / You / Us-account), a category, a date.
Feeds the three money jobs in §8.

6. The chat info-dump (the headline feature)
A single text box either of you can fire thoughts into, free-form, any time. Real AI parsing (via an API call) turns the dump into structured drafts.
Flow:

Either partner types or speaks a brain-dump, e.g.:


“ok so we need cat food and bin bags, dentist for me thursday afternoon, pay the council tax it’s like 180 quid, and book somewhere nice for our anniversary in march”


The AI parses this into proposed items, each pre-sorted:


Cat food → Shopping (Groceries), lane Us
Bin bags → Shopping (Groceries), lane Us
Dentist → Event, Thursday PM, lane You (routine)
Council tax £180 → Task + Expense, lane Us
Anniversary booking, March → Task (exciting), lane Us


The proposals appear as a review tray — confirm-before-filing. You can tap to accept all, edit any, or bin the misreads. Nothing enters your real data until confirmed (protects against the AI mishearing and you losing trust in the system).

Why confirm-before-file even though you chose “real AI parsing”: the two aren’t in conflict. The parsing is AI; the filing is gated by a one-tap confirm. This is the single most important trust mechanism in the app — get it wrong and people stop dumping.
Attribution: each dump remembers who sent it, so “remind me” vs “remind her” resolves correctly.
7. Scheduling & recurrence
Three flavours, all first-class:

Routine / recurring: standard repeat rules (daily, weekly, every-other-Tuesday, monthly, etc.) with an optional end. Used for life admin.
One-off exciting: single events flagged as the good stuff; surfaced with extra visual love and an optional countdown (“19 sleeps till the gig”).
Floating / no-date: the someday pile. Critically not nagged about — it’s a holding pen, not a debt.

Recurrence should support “next occurrence only” edits vs “whole series” edits, because ADHD plans change constantly.
8. Financial planner
Three jobs, all in scope, sharing the expense data spine:

Shared bills / budget: track recurring bills (rent, utilities, subscriptions), see a simple monthly picture. Bills can auto-create as recurring expenses.
Split / who-owes-who: every expense has a payer and a “whose cost is this” (Me / You / Us-split). A running balance shows who’s currently up. Settling up zeroes it. Keep the math dead simple and always visible — no spreadsheets.
Savings goals for fun stuff: named pots (“Japan 2027”, “new sofa”) with a target and progress. Contributions logged manually. The exciting-events side can link to a pot (“this trip is funded from Japan 2027”).

“And more?” — parking-lot ideas in the appendix so v1 stays shippable.
9. The three views
Same data, three lenses:
9.1 Calendar view
Day / week / month. Events and dated tasks appear here. Routine vs exciting are visually distinct (colour/icon). Lanes are filterable (show just Me, just You, just Us, or all).
9.2 Card board (Kanban)
Columns are configurable but default to something ADHD-friendly: Today / Soon / Someday / Done, not a rigid backlog. Cards are draggable between columns. Each card shows lane, due hint, and sub-task progress. This is the “what should I actually do now” view.
9.3 Shopping + finance
Lists for shopping (check-off mode), and the money dashboard (balance, bills, goals). Grouped sensibly so a quick “what do we need / where are we at” glance works.
(Chat info-dump is an always-available input layer, reachable from every view — think of it as the front door, not a fourth room.)
10. ADHD support layer
This is a differentiator, not a footnote. Pulling together your answers:

Soft nudges: gentle, dismissible reminders. Never red, never guilt-tripping. A nudge that’s ignored just… waits.
Persistent-until-done (opt-in, per item): for the genuinely important stuff, a reminder that keeps gently resurfacing rather than vanishing after one buzz. Per-item toggle so it’s not the default firehose.
Body-doubling / break-it-down: the sub-task feature plus a “start with one tiny step” framing. Optionally a focus/companion mode where the app walks you through a task’s steps one at a time.
Context-aware surfacing (your key ask): this is the ambitious one. The app uses location + time to push the right things:

At home → home tasks bubble up (@home).
Out and about → errand and shopping reminders fire (@out, nearby-shop nudges).
Time-of-day shaping (morning routine items in the morning, etc.).
Build note: real geofencing needs device location permissions and is genuinely harder than the rest of the app. Recommend treating it as a phase 2 capability — ship time-of-day + manual context tags first, add true location triggers once the core works. Flagged here so the data model (location tags on tasks) is ready for it from day one.



11. Tone & pun guidelines (heavy)
Puns go on chrome, not content. Label the furniture, never rewrite what the user typed.

App/section names: Two-Do (the app), The Brain Drain (info-dump box), Choreography (recurring chores), Owe Snap (who-owes-who balance), Fund & Games (savings goals), Aisle Be There (shopping), Sleeps (countdowns).
Empty states: e.g. an empty Today column → “Nothing due. Suspiciously calm. Enjoy it or fill it.”
Nudges carry the light tone but stay genuinely useful and never guilt-laden.
Hard rule: humor never obscures function. If a pun makes a button’s purpose unclear, the pun loses.

12. Tech direction (for the build-later decision)
You said spec-only for now, so this is orientation, not commitment.

Shared cloud, live-synced (both see the same data in real time) is required. That points to a hosted backend with a realtime database (e.g. a Postgres-backed service with realtime, or a Firebase-style store). Two users, so the backend load is trivial.
AI parsing is an API call from the backend (keeps the key off-device and lets you tune the prompt centrally).
Clients: a responsive web app covers both of you on phone + laptop. Native wrappers only matter if/when you want real geofencing and lock-screen reminders (phase 2).
Auth: minimal — two accounts, one shared space. No org/permission complexity.

13. Suggested build phases

Phase 1 (core loop): the three lanes, the four item types, the three views, manual entry, shared sync. The skeleton that’s useful even without AI.
Phase 2 (the magic): chat info-dump with AI parsing + confirm tray; soft/persistent nudges; recurrence polish.
Phase 3 (the ambition): context-aware location surfacing; focus/body-doubling mode; finance niceties (auto-bills from recurring, goal linking).

Shipping Phase 1 first means you have something real in hand before the hard parts.
14. Open questions for you
These are the decisions still genuinely open — worth settling before prototyping:

Calendar integration — should this stand alone, or read/write your existing Google/Apple calendars? (Big architectural fork; affects whether the calendar is the source of truth or a mirror.)
Voice input for the info-dump — nice-to-have day one, or later?
Money granularity — do you want full category budgeting, or just the three jobs in §8 kept simple? (Easy to over-build here.)
Default card columns — happy with Today / Soon / Someday / Done, or do you two think differently about your time?
Nudge channels — in-app only, or push notifications / email too? (Push pulls toward native or PWA work.)

Appendix A — name candidates
Two-Do · Pear (as in pair) · WeDo · Ours-To-Do · Dual Carriageway · The Joint Account (if money-forward) · Tandem
Appendix B — parking lot (“and more?”)

Meal planning that auto-generates the shopping list
“Spin the wheel” for indecision (pick a someday task / a date-night idea at random)
Shared notes / brain-dump archive you can search later
Mood or energy check-in that adjusts how much the app surfaces (“low spoons today” → show less)
Recurring-bill reminders that pre-fill the expense
Reward/streak mechanic — if it can be done without becoming a guilt engin