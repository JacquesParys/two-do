# Two-Do — UI Spec (v0.2)

*Companion to the product spec (v0.2). This document covers how the app looks, feels, and flows — translating product decisions into design decisions.*

> **What changed in v0.2:** all ten open design questions from v0.1 are now resolved. The app has a dark slate-green base, coral accent, serif+sans type pairing, and a complete interaction model.

---

## 1. Visual direction

**Soft and warm meets clean and calm.** Rounded corners, muted palette, generous whitespace, minimal chrome. The app should feel like a well-loved notebook that happens to be digital — cosy without clutter, breathing room without emptiness.

- **Dark mode is the default.** The muted palette glows rather than recedes. Light mode is available but dark is home.
- **No red.** Anywhere. Ever. Nothing in the app screams urgency or guilt. Overdue items don't change colour. The palette stays warm and steady regardless of what's late.
- **Density is low on purpose.** ADHD brains scan better with space. Cards, list items, and calendar entries all have generous padding. The app should never feel like a spreadsheet.

### Colour palette

| Role | Dark mode | Light mode | Notes |
|------|-----------|------------|-------|
| **Background** | Dark slate-green (moody, earthy, distinctive) | Soft warm grey (modern, easy on eyes) | Never pure black or pure white |
| **Surface** (cards, sheets) | Slightly lighter slate-green | Off-white with warmth | Enough contrast to lift off the background |
| **Accent** | Soft coral/peach | Same coral, slightly deepened for contrast | Interactive elements: buttons, active chips, links |
| **Exciting glow** | Brighter/lighter coral as a halo | Same, adjusted for light bg | Used on exciting item borders only |
| **Lane: Me** | User-chosen at setup | Same | Partner A's colour |
| **Lane: You** | User-chosen at setup | Same | Partner B's colour |
| **Lane: Us** | Neutral muted tone (from app palette) | Same | Not user-chosen — just a calm shared colour |
| **Text: primary** | Warm off-white | Dark warm grey | High readability |
| **Text: secondary** | Muted grey-green | Medium grey | Labels, hints, metadata |
| **Routine items** | Lane colour at low opacity | Same | Understated, background rhythm |

Specific hex values to be finalised during prototyping — the above locks the *relationships* between the colours.

### Typography

Two-face pairing: **soft serif for display + clean sans for body.**

- **Display (serif):** personality-forward, used for page titles (the punny names), empty state text, The Grown-Up's chat bubbles. Something warm with character — not stiff or academic. Candidates to explore: Fraunces, Lora, Newsreader, or similar.
- **Body (sans):** clean, highly legible, comfortable at small sizes. Used for item titles, labels, badges, and all functional text. Candidates: Inter, Plus Jakarta Sans, DM Sans.

**Rules:**
- Sentence case everywhere.
- No ALL CAPS.
- The serif is used with restraint — headers, empty states, and The Grown-Up's voice. Everything else is the sans.

---

## 2. App structure & navigation

The app has two persistent elements on screen at all times:

### 2a. Top: chip tab bar

Four tappable chips, **auto-width based on text length, centred as a group.** These are the primary navigation:

| Chip | View | Punny page titles (shown on-page, not in tabs) |
|------|------|------------------------------------------------|
| **Dates** | Calendar | *Choreography* (recurring items), etc. |
| **Cards** | Kanban card board | — |
| **Lists** | Lists (shopping, tasks-as-lists) | *Aisle Be There* (shopping), etc. |
| **Two Cents** | Finance dashboard | *Owe Snap* (balance), *Fund & Games* (goals) |

**Chip design:** rounded pill shape. Muted text/outline when inactive; filled with accent colour (coral) when active. Auto-sized to their text, centred as a row. No icons — the short labels do the work.

**Key principle:** Dates, Cards, and Lists are three views of the *same* underlying data. Switching between them is switching lenses, not switching rooms. An item created in Cards with a due date appears in Dates. A task that lives in a list also shows up as a card on the board. Editing in one updates all.

Two Cents is genuinely separate — it's the finance data, not another lens on tasks/events.

### 2b. Bottom: The Grown-Up input bar

A persistent text input anchored to the bottom of the screen, styled like an iMessage input bar. This is the AI-powered brain-dump entry point — always available, from any view.

**At rest:**
- A text field with a mic icon (for voice) and a send button
- Placeholder text **rotates** through pun-based prompts. These are never generic — always on-brand and punny. Examples:
  - *"The Grown-Up is ready for your chaos…"*
  - *"Spill. I'll sort it."*
  - *"Say it, dump it, done."*
  - *"What have you two forgotten now?"*
  - *"Type it before you forget. Again."*
  - *"Go on, give me the whole mess."*
  - *"I'm the organised one, remember?"*
  - *"Your brain called. It wants a refund."*
- Tapping the mic activates voice capture (Web Speech API). The transcript fills the same text field.

**On submit:** triggers the full-screen review tray (see §6).

### 2c. Naming notes

**The Grown-Up** is the primary name for the AI input feature. Alternatives kept in the back pocket: **The Sensible One** (good for personality/voice contexts) and **The Third Wheel** (good for marketing/onboarding — subverts the negative connotation).

---

## 3. Lane system (visual)

Every item belongs to one of three lanes: **Me**, **You**, or **Us**. These are viewer-aware (see product spec §4 for the logic).

### Lane badges

Each item displays a small badge showing its lane assignment:

- **Shape:** rounded pill/chip, compact
- **Colour:** the badge background uses the lane's colour
  - Me → the current viewer's chosen colour
  - You → the other partner's chosen colour
  - Us → a neutral shared colour (part of the app palette, not user-chosen)
- **Text:** the badge reads **Me**, **You**, or **Us** in a contrasting text colour

### Colour setup

During onboarding, each partner picks their lane colour. The app may offer curated suggestions ("these look great together") but doesn't restrict the choice.

---

## 4. Dates (calendar view)

### Default: week view

The landing state shows the current week. Events and dated tasks appear as blocks/chips on the timeline.

### Available views

- **Day** — single day, more room per item, good for busy days
- **Week** — the default, shows the shape of the week
- **Month** — overview, items shown as dots or compact indicators

Switching between views: a secondary toggle or segmented control within the Dates page (not in the top chip bar — that's for Dates/Cards/Lists/Two Cents switching).

### Navigation

- **Header arrows** move between adjacent periods (prev/next day in Day, prev/next week in Week, prev/next month in Month).
- **Day and Week share a 7-tile day strip** under the header (DOW label, date pill, an events dot). In **Day** it selects the focused day; in **Week** it selects the week's **start day** — tapping Wed re-anchors the week to run Wed→Tue and the list reflows. Week **defaults to a Monday** start on entry. Today always carries the coral pill, independent of which tile is selected.
- **Week header** shows the range (`15–21 Jun`, spanning months as `29 Jun – 5 Jul`); its arrows step by a whole week.

### Visual treatment

- **Routine items** are muted — the lane colour at low opacity, understated typography. They're the background rhythm.
- **Exciting items** pop — emoji badge, a coral glow border, and if applicable a **sleeps countdown chip** ("12 sleeps"). These are the things worth looking forward to.
- **Lane filtering** is available: show all, or filter to just Me / just You / just Us.
- **Day-timeline blocks** scale their inner padding with height — tight on a due-time sliver, airier (header drops, wider gutters) on a multi-hour block.
- **The now-line** is a quiet half-strength coral hairline layered *under* the entries — a block over the current time covers it; it shows only in the gaps.
- **Scroll is implicit app-wide** — no scrollbars; clipped content (and chip-row edge fades) is the only "more below" affordance.

---

## 5. Cards (kanban card board)

### Columns

Default columns: **Today / Soon / Someday / Done**

Columns are **user-editable** — rename, reorder, add, delete. Two columns carry **protected behavioural roles** regardless of what they're renamed to:

- The **Done** role: cards here count as complete. (Can be renamed to "Finished", "Nailed It", whatever — the behaviour sticks.)
- The **Someday** role: cards here are never nagged about. (The safe holding pen.)

### Mobile layout

**Horizontal scroll** — industry standard for mobile kanban. One column fills the screen width; swipe sideways to see the next column. On desktop, all columns are visible side by side.

### Cards

Each card shows (medium density):

- **Title** — the item name, user-typed, never modified
- **Lane badge** — Me / You / Us pill in lane colour
- **Due hint** — relative time if dated ("Tomorrow", "In 3 days"), absent if floating
- **Sub-task progress** — a small progress bar or fraction (2/5) if sub-tasks exist

### Exciting items on cards

When an item is tagged as exciting, the card gets additional treatment:

- **Emoji badge** — user-picked at creation, displayed prominently on the card
- **Glow border** — a brighter coral halo around the card (contrasts with the flat, quiet routine cards)
- **Sleeps countdown** — a small chip reading "X sleeps" for upcoming exciting events

### Interaction

- **Drag and drop** between columns
- **Tap** to open the full item detail view (slides in from the right — see §5a)
- **Long press** (or swipe) for quick actions (assign lane, park, delete)

### 5a. Item detail view

Tapping any item (in any view) opens a **full-screen detail page that slides in from the right**, following the iOS push-navigation pattern. Back gesture or back button returns to the previous view.

The detail view contains:
- Item title (editable)
- Item type indicator (task, event, shopping item, expense)
- Lane badge (tappable to change)
- Date/time (if applicable)
- Location context tag (if set)
- Notes field
- Sub-tasks (if any, with add/edit/reorder)
- Recurrence settings (if applicable)
- Exciting toggle + emoji picker
- Persistent-until-done toggle
- Delete option

All fields are editable inline. Changes save automatically.

---

## 6. The Grown-Up — review tray

When a brain-dump is submitted (typed or spoken), the review tray takes over.

### Flow

1. **Full-screen takeover** — the tray slides up from the bottom and covers the current view. This isn't a small popover; it's a focused space.

2. **Chat back-and-forth (optional step)** — before presenting parsed items, The Grown-Up may ask clarifying questions in a chat-like interface:
   - *"Which Thursday — this week or next?"*
   - *"Is the dentist for you or both of you?"*
   - *"£180 for council tax — one-off or monthly?"*
   
   This step only happens when the AI needs clarity. If the dump is unambiguous, it skips straight to the parsed items. The chat uses the display serif for The Grown-Up's messages, reinforcing its distinct personality.

3. **Parsed items appear as a stack of cards**, each showing:
   - What The Grown-Up thinks the item is (task, event, shopping item, expense)
   - Proposed title, lane, date, category, list — all editable inline
   - Item type icon so you can see the sort at a glance

4. **Swipe-based confirmation:**
   - **Swipe right** → accept (item files into the real data)
   - **Swipe left** → dismiss (item is discarded)
   - **Tap** → edit the item's details before accepting
   - An **"Accept all"** shortcut at the top for when the parse is spot-on

5. **Closing the tray** returns to whatever view you were on, now updated with any accepted items.

### The Grown-Up's personality

**Dry and deadpan with a cheeky edge.** Think tired-but-loving parent energy. Not a perky assistant; more like the one friend who actually has their life together and gently judges you for it.

- *"Yes, I've added the dentist. You're welcome."*
- *"That's four things for 'someday.' I believe in you. Mostly."*
- *"Council tax, filed. The glamorous life you two lead."*

**No avatar.** The Grown-Up speaks through chat bubbles only — no face, no character, no emoji identity. The voice *is* the identity.

---

## 7. Lists (shopping & task lists)

### Structure

Named lists appear as **tabs** within the Lists view. Default lists might include:

- **Groceries** (or *Aisle Be There*)
- **To-Do** (undated tasks as a flat list)
- **Custom lists** the user creates ("Hardware", "Things we keep forgetting")

Tapping a tab shows that list's items.

**Standalone, linked, and attached lists.** The tabs above are *standalone* lists (space-level containers; an item joins one via its `listId`). There are two ways something can be "tied to" a card or event:
- **Linked** (`linkedListId`) — a card/event *references* an existing standing list, shown inline on it. The list stays the one source of truth (check-offs sync everywhere), nothing is duplicated. Use this for "go do the groceries" against the standing Groceries list.
- **Attached** (`parentItemId` child items) — an *ad-hoc* checklist that only exists on that item (e.g. a packing list for one trip), the same mechanism as a task's subtasks.

Either way it's shown on the item, not as a tab here. So "Lists" the tab = standalone lists; a linked or attached list lives with its card/event.

### List items

Each item shows:
- Name
- Lane badge (Me / You / Us)
- Optional quantity (for shopping items)
- Checkbox for completion

### Check-off mode (shopping ergonomics)

Optimised for one-handed, walking-around-a-shop use:

- **Visible checkbox** on each row, but **tapping anywhere on the entire row** checks the item off. The full row is the hit target — no need to aim for the checkbox.
- The checkbox animates on check (satisfying micro-interaction).
- **Checked items fade and slide to the bottom** of the list (not hidden — you might uncheck if you put the wrong thing in the basket).
- Large touch targets, generous row height. This is a mode where the phone is in one hand and a basket is in the other.

---

## 8. Two Cents (finance view)

### Layout: dashboard

A single scrolling page with a clear hierarchy:

1. **Balance summary** at the top — a simple, understated readout of who-owes-who. Not a banner, not a scoreboard. Just a quiet number. Part of the dashboard, not elevated above it. If nobody owes anything, it says so warmly (e.g. *"All square. For once."*).

2. **Bills section** — recurring expenses as cards. Each shows the bill name, amount, frequency, and next due date. Section header: a punny name from the spec's existing set or a new one.

3. **Goals section** — savings pots as cards. Each shows the goal name, target, progress (a warm progress bar in the coral accent), and an optional linked exciting event. Section header: *Fund & Games*.

### Tone

Finance is kept deliberately low-key. No red/green profit-loss colouring, no guilt about spending. The who-owes-who balance has no special prominence — money between partners shouldn't feel like a scoreboard.

---

## 9. Nudges

### In-app

A **card that slides in from the top of the screen**, dismissible with a swipe. Styled warmly — muted surface colour, rounded corners, gentle. Never red, never urgent-looking.

Nudge text carries the app's light tone:
- *"Council tax is due soonish. Just saying."*
- *"You've had 'book dentist' on here for a while. No pressure. Some pressure."*
- *"The bins are a tomorrow problem. Heads up."*

### Push notifications (PWA)

Same copy, delivered as push notifications for items with reminders set. Push is the additional channel — in-app nudges also exist.

### Persistent-until-done

For items with this toggle enabled, the nudge resurfaces gently at intervals rather than firing once and vanishing. The tone stays light no matter how many times it appears.

---

## 10. Empty states

**Text-only with a pun.** No illustrations, no icons — the words do the work. Fits the minimal visual direction and lets the humour land without clutter. Empty state text uses the display serif for warmth.

Examples:

- **Empty Today column (Cards):** *"Nothing due. Suspiciously calm. Enjoy it or fill it."*
- **Empty shopping list (Lists):** *"The list is empty. The fridge probably isn't. Or is it."*
- **Empty Dates (calendar):** *"A totally free week. Sure, Jan."*
- **No goals (Two Cents):** *"No savings goals yet. The sofa fund won't start itself."*
- **Empty Someday column:** *"Nothing in someday. You're either very organised or in denial."*

---

## 11. Exciting items — full treatment

Exciting items (events or tasks tagged as exciting) receive a distinct visual treatment across all views:

| Element | Treatment |
|---------|-----------|
| **Emoji** | User-picked at creation. Displayed prominently — on the card, on the calendar entry, in the list row. |
| **Glow border** | A brighter coral halo. Should feel celebratory, not urgent. Contrasts with the flat, quiet cards used for routine items. |
| **Sleeps countdown** | A small chip: "12 sleeps". Only appears when the item has a future date. Counts down daily. |
| **Calendar (Dates)** | Exciting items are visually warmer/brighter than routine items, which stay muted. |

The point: the calendar shouldn't be a wall of grey obligation. The fun stuff *looks* fun.

---

## 12. Context tags

Context tags (`@home`, `@out`, `@work`, or custom places) are **functional, not decorative.**

- **They are not visible on items by default.** Tags don't clutter cards, list rows, or calendar entries during normal use.
- **They drive what surfaces.** Context tags power the ADHD context-aware surfacing system (product spec §10): when you're at home, `@home` items bubble up; when you're out, `@out` items surface. The tags are the engine, not the display.
- **Visible when filtering.** If you explicitly filter by context (e.g. "show me everything tagged @home"), the tag appears on matching items so you can see why they're showing.
- **Visible in the item detail view.** When you open an item's full detail page, the context tag is shown and editable.
- **Set via The Grown-Up or manual entry.** The AI parser can infer context ("pick up milk" → `@out`), and users can add/change tags in the detail view.

---

## 13. Transitions & animation

**Smooth slides throughout.** Motion is purposeful and consistent — it communicates spatial relationships, not decoration.

| Action | Animation |
|--------|-----------|
| **Switching chip tabs** (Dates ↔ Cards ↔ Lists ↔ Two Cents) | Content slides left/right based on tab position |
| **Opening item detail** | Full-screen page slides in from the right |
| **Closing item detail** | Slides back to the left (or swipe-back gesture) |
| **Review tray opening** | Slides up from the bottom, covering the current view |
| **Review tray closing** | Slides back down |
| **Swipe to accept/dismiss** (review tray) | Card slides off-screen in the swipe direction with a subtle fade |
| **Checking off a shopping item** | Checkbox animates, row fades and slides to the bottom of the list |
| **Nudge appearing** | Card slides down from the top |
| **Nudge dismissed** | Swipe up, card slides out |
| **Dates time navigation** | Swipe left/right, calendar content slides accordingly |
| **Cards column navigation** (mobile) | Horizontal swipe between columns |

All animations respect the `prefers-reduced-motion` system setting — reduced to instant cuts when enabled.

---

## 14. Onboarding

A quick **3-screen flow**, warm and punny. No corporate wizard energy.

### Screen 1: Welcome + name
- *"Welcome to Two-Do. The app where two disorganised people pretend to have it together."*
- Enter your name / display name
- Create account (minimal auth)

### Screen 2: Pick your colour
- *"Pick a colour. This is how your stuff looks. Choose wisely, or don't — you can change it later."*
- Colour picker for your lane
- If your partner has already joined, their colour is shown so you can complement it

### Screen 3: Invite your other half
- *"Now invite the other one. You know, the one who also forgets the bins."*
- Share a link or code to join the shared space
- If they've already joined, this screen shows a confirmation and skips ahead

### Post-onboarding (in settings)

Everything from onboarding is editable in app settings:
- Lane colour
- Label style (Me/You/Us, custom names, Player 1/Player 2/Co-op, etc.)
- Cards column names and order
- Display name

---

## 15. Responsive behaviour

The PWA serves phone (primary) and laptop/desktop.

### Phone
- Single-column layout throughout
- Bottom input bar (The Grown-Up) always visible
- Top chip tabs always visible
- Cards: horizontal scroll, one column at a time
- Dates: compact week view, swipeable
- Heavy use of swipe gestures (review tray, Cards columns, nudge dismissal, time navigation)

### Laptop / desktop
- More horizontal space for Cards (all columns visible side by side)
- Dates can show a fuller week or month grid
- The Grown-Up input bar may widen or sit in a sidebar
- Side-by-side panels possible (e.g. Cards + detail view)
- Drag-and-drop replaces some swipe gestures

The phone experience is designed first; desktop expands gracefully.

---

## 16. Resolved design questions

All ten open questions from v0.1 are now settled:

1. **Colour palette** → dark slate-green / soft warm grey / coral accent / brighter coral glow
2. **Typeface pairing** → soft serif display + clean sans body
3. **Chip tab sizing** → auto-width, centred as a group
4. **Cards on mobile** → horizontal scroll (industry standard)
5. **Item detail view** → full-screen slide-in from the right
6. **Onboarding** → quick 3-screen flow, all settings editable later
7. **Transitions** → smooth slides throughout, respecting reduced-motion
8. **The Grown-Up's personality** → dry and deadpan with a cheeky edge, no avatar
9. **Shopping check-off** → tap-anywhere rows with visible animated checkboxes
10. **Context tags** → hidden by default, drive surfacing, visible when filtering or in detail view

---

*This is a living document. As design decisions are made, they fold in here rather than living in chat.*
