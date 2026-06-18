# Two-Do → Cowork Handoff

## How to use this

This document captures **everything decided in our conversations that isn't in the spec files yet**. The specs (v0.1 and v0.2) cover the product logic. This covers the UI, naming, and visual direction layered on top.

**To set up in Cowork:**

1. Open Cowork in Claude Desktop
2. Drop in these three files: `two-do-spec.md`, `two-do-spec-v0_2.md`, and this handoff doc
3. Use the Cowork prompt below to get the session oriented

---

## Cowork kickoff prompt

Paste this (or something like it) to get Cowork up to speed:

> I'm designing **Two-Do**, a shared planning app for two people with ADHD. I've attached the product spec (v0.1 and v0.2) plus a handoff document with UI/design decisions made after v0.2. The handoff doc is the most current layer — treat it as the latest state of the project. I want to continue designing and building from here.

---

## UI & design decisions (post v0.2)

### Naming updates

| Spec name | Final name | Alternates to keep |
|---|---|---|
| "The Brain Drain" (AI input feature) | **The Grown-Up** | "The Sensible One" (alt), "The Third Wheel" (alt) |
| Financial section (§8) | **Two Cents** | — |
| "Sleeps" (countdowns) | **Sleeps** (unchanged) | — |

The AI input was originally "The Brain Drain" in the spec. It's now **"The Grown-Up"** — the idea being the AI parser is the responsible adult in the room sorting your chaos. "The Sensible One" and "The Third Wheel" are kept as alternates (could rotate, could be used contextually).

### Navigation architecture

**Top:** horizontal chip tabs — **Dates / Cards / Lists / Two Cents**

- Dates, Cards, and Lists are **view toggles of the same underlying data** (the "one thing, three views" principle from the spec). Switching between them doesn't change what you're looking at, just how you're looking at it.
- Two Cents is the finance section (bills, splits, savings goals).

**Bottom:** persistent input bar, iMessage-style

- Always visible. This is the front door to The Grown-Up (AI input).
- **Rotating pun placeholders** in the input field — e.g. "What's on your mind?", "Dump it here…", "Brain go brrr…" etc. Rotates on each visit/focus.
- Supports text and voice (voice is the mic icon, transcribes client-side then hits the same AI parser).

### The review tray (AI confirm-before-file)

When The Grown-Up parses a brain dump, the results appear as a **full-screen takeover** (not a modal, not a partial sheet — the whole screen).

- Interaction model: **chat-style back-and-forth**. The AI proposes items conversationally, you can reply to refine ("no, the dentist is Wednesday not Thursday"), and it adjusts.
- Individual items: **swipe right to accept, swipe left to dismiss**. Or accept-all / dismiss-all buttons.
- Once all items are resolved, the tray closes and items are filed into the real data.

### Visual direction

**Dark mode is the default.** Light mode should exist but dark is the primary design target.

**Aesthetic:** soft/warm + clean/calm. Not a neon-on-black developer aesthetic. Think warm darks (not pure #000), rounded but not bubbly, enough whitespace to breathe. The app should feel like a calm, slightly funny companion — not a productivity tool that's trying to impress you.

### Exciting items treatment

Items tagged as "exciting" (events like date nights, gigs, trips) get special visual treatment:

- **Emoji** — either user-chosen or AI-suggested during parsing
- **Glow border** — a subtle ambient glow around the card/event, distinct from routine items
- **Sleeps countdown** — "12 sleeps!" displayed on the item, counting down to the event date

This is the spec's "the fun stuff looks fun" principle made concrete.

### Lane badges

On cards, calendar entries, and list items, the lane indicator (Me / You / Us) appears as a **badge**.

- Badges say **Me**, **You**, or **Us** in text
- Each badge is colored in the **partner-chosen colour** (set during onboarding/setup)
- The colours are the primary visual lane differentiator — fast scanning without reading

### Things NOT yet decided (good Cowork topics)

- Exact colour palette and type choices
- Onboarding flow (how do two people set up a shared space?)
- What the card board columns look like in dark mode
- Empty state copy for each section (spec gives one example, needs full set)
- Nudge tone/copy (the "gentle, never guilty" voice needs examples)
- How "parked" items are visually distinct from open ones
- Shopping list check-off UX in-store
- The "break it down" / body-doubling mode interaction design
- How savings goals link to exciting events visually

---

## File inventory

| File | What it covers |
|---|---|
| `two-do-spec.md` | v0.1 — the original product spec with open questions |
| `two-do-spec-v0_2.md` | v0.2 — resolved the five open questions (standalone calendar, voice day-one, simple finance, editable columns, push via PWA) |
| `two-do-cowork-handoff.md` | This file — UI/design decisions made after v0.2 |
