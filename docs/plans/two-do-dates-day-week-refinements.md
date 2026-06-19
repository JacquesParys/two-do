# Two-Do — Dates day/week refinements

*Three changes to the Dates view, from Jacques' annotated Day/Week mockups (2026-06-19). All live in `src/views/DatesView.jsx` and `src/views/DayTimeline.jsx`; no data-layer or schema work.*

> Status: **built** 2026-06-19 (`DatesView.jsx`, `DayTimeline.jsx`, `index.html`). Outcome folded into `two-do-ui-spec.md` §4. Two refinements vs. this plan:
> 1. Day and Week derive their day-tile strips from *separate* week windows — Week from the re-anchorable `weekStart` state, Day from `startOfWeek(ref)` — so the Day strip keeps tracking day navigation.
> 2. Week got its own early return (mirroring Day) rather than the generic scroller: the toggle, range header, and day strip are **pinned**, and only the day-card list scrolls. (The §1 "generic scroller eats the strip" height note is therefore moot.)
>
> `src/views/*` are the behavioural source of truth.

The three asks, in the mockups' numbering:

1. **Header parity** — give Week view the same header + day-strip Day view has, with a week-range title and a *selectable week-start day*.
2. **Block padding** — in the Day timeline, grow a block's title left-padding and its top padding (and the right-aligned time + badge) as the block gets taller.
3. **Now-line** — make the current-time indicator quieter and layer it *under* the entries.

---

## 1. Week view header parity + selectable week-start

### Current state

- **Day view** (`mode === "day"`, `DatesView.jsx` ~339–359) renders, top to bottom: the `header` (Day/Week/Month segmented toggle), then `fullHeader` (`‹  Fri 19 Jun · Today  ›`), then a **7-tile day strip** (~345–353: DOW label + a date pill + an events dot), then `DayTimeline`.
- **Week view** (`mode === "week"`, ~307–336) renders only `fullHeader` then the day list — **no day strip**.
- `weekStart = startOfWeek(ref)` (~219) is hard-Monday (`off = (getDay()+6)%7`); `weekDays` is the 7 days from it. The week list labels days by **fixed index** `DOW[i]` (~321), which assumes a Monday start.

### Target (from the mockup)

Week view should look like Day view at the top: the same toggle, the same `‹ title ›` row, and the **same big day-tile strip**. Two behavioural differences in Week:

- **Title shows the week range**, not a single day — e.g. `15–21 Jun`, spanning months when needed (`29 Jun – 5 Jul`).
- **The day-strip selects the week's *start* day.** Tapping Wed re-anchors the week to run **Wed → Tue**; tapping Tue → **Tue → Mon**. The list below reflows to start on the chosen day. **Defaults to Monday** whenever you enter Week view.

### Implementation

**New state for the week window.** Today the Monday-locked `weekStart` is derived from `ref`. Add an explicit, re-anchorable start:

```js
const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date())); // Monday default
```

- Replace the derived `const weekStart = startOfWeek(ref)` (~219) with this state; keep `weekDays = Array.from({length:7}, (_,i)=>addDays(weekStart,i))`.
- **Default to Monday on entry.** In the existing `mode` effect (or a new one), when `mode` becomes `"week"`, `setWeekStart(startOfWeek(ref))`. This satisfies "defaults to a Monday when we go to it." (Use `startOfWeek(new Date())` if you want it to always land on *this* week regardless of where Day view was pointed — decide at build; `startOfWeek(ref)` is the less surprising choice.)

**Week navigation arrows** step the window by a week:

```js
const stepWeek = (dir) => setWeekStart((w) => addDays(w, dir * 7));
```

Point the Week-mode `fullHeader` arrows at `stepWeek` instead of the shared `step` (which mutates `ref`). Simplest: build a `weekHeader` variant of `fullHeader` whose arrows call `stepWeek` and whose title is the range (below). Keep Day mode on the existing `fullHeader`.

**Week-range title** helper:

```js
const fmtRange = (a, b) => {
  const sameMonth = a.getMonth() === b.getMonth();
  const mA = MONTHS[a.getMonth()].slice(0,3), mB = MONTHS[b.getMonth()].slice(0,3);
  return sameMonth ? `${a.getDate()}–${b.getDate()} ${mB}`
                   : `${a.getDate()} ${mA} – ${b.getDate()} ${mB}`;
};
// title: fmtRange(weekDays[0], weekDays[6])
```

(If you want a "· This week" suffix when `weekDays[0]` is the current Monday, mirror the Day header's `· Today`.)

**Shared day-strip.** Extract the Day-view strip (~345–353) into a small helper so both modes use it, parameterised by what a tile does and what "selected" means:

```jsx
const dayStrip = ({ onPick, selected }) => (
  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:12, flexShrink:0 }}>
    {weekDays.map((day, i) => (
      <button key={i} onClick={() => onPick(day)} className="focusable"
        style={{ /* same tile styles; highlight when selected(day) */
                 background: selected(day) ? COLORS.surfaceLight : "transparent" }}>
        <div>{DOW[(day.getDay()+6)%7]}</div>                 {/* label from the DATE, not i */}
        <div /* date pill; coral when isToday(day) */>{day.getDate()}</div>
        <div /* events dot when eventsOn(day).length */ />
      </button>
    ))}
  </div>
);
```

- **Day mode:** `onPick={(day)=>setRef(day)}`, `selected={(day)=>sameDay(day,ref)}` (unchanged behaviour).
- **Week mode:** `onPick={(day)=>setWeekStart(day)}`, `selected={(day)=>sameDay(day,weekDays[0])}`. Tapping a tile re-anchors the window to start on that day; the strip and list both reflow.
- **Today** always gets the coral pill (`isToday(day)`), independent of selection.

> Note the label fix: because the window can now start on any weekday, the DOW label **must** come from `DOW[(day.getDay()+6)%7]`, not the loop index. Apply the same fix to the week **list** headings (`DatesView.jsx` ~321 currently uses `DOW[i]`).

**Wire Week view's body** to render, in order: `header` (toggle) → `weekHeader` (range title + `stepWeek` arrows) → `dayStrip({...week})` → the existing day list. The day list, drop targets (`day-${i}`), and `onWeekDragEnd` already key off `weekDays`, so they keep working once `weekDays` derives from `weekStart`.

### Edge cases

- **Drag-to-reschedule** still maps `over.id` → `weekDays[idx]`; unaffected by the start-day change.
- **`step` vs `stepWeek`.** Day mode keeps using `ref`/`step`. Don't let Week arrows mutate `ref`, or returning to Day view will jump unexpectedly. Keep the two anchors independent (`ref` for Day, `weekStart` for Week).
- **Today highlight in the list** keeps using `isToday(day)` (already correct).
- **Height math.** Day view sizes its scroller with `calc(100dvh - 270px)`; adding the strip to Week (which uses the generic scroller at ~368, `calc(100dvh - 270px)`) means the strip eats vertical space — verify the Week list still fills nicely and bump the offset if the strip pushes content (the Day path already accounts for the strip in its `- 270px`; match it).

---

## 2. Day timeline block padding scales with height

### Current state — `DayTimeline.jsx`

- The block's inner content div has a flat `padding: "4px ${SPACE[2]}px"` (~356) → 4px top/bottom, 8px (`SPACE[2]`) left/right, regardless of block height.
- `entryLine` (~276–285) is one flex row: title (`flex:1`), optional `↻`, time, `LaneBadge`. So the title and the right-aligned time+badge share the same top line and the same block padding.
- Block height `hPx = Math.max(durMin * pxPerMin, 24)` (~332). A 4-hour event ≈ 224px; a due-time task ≈ 24px.

### Target (mockup #2, arrow on "Teaching at Seneca")

- **Title left-padding increases** — a touch more inset on the title text at all sizes.
- **As the block grows taller, the top padding grows** — the header row sits a little lower, with breathing room, on big blocks; tight on small ones.
- **The right-aligned elements (time + lane badge) get the same treatment** — they ride the same row, so growing the block's top/right padding moves them together.

### Implementation

One height-driven padding function, applied to the block's inner padding (which already governs both the title and, via flex, the right elements):

```js
// 0 for a minimum block, ramping to 1 around a ~3h block.
const t = clamp((hPx - 48) / 180, 0, 1);
const padTop   = 4 + 10 * t;          // 4 → 14
const padSide  = SPACE[2] + 4 * t;    // 8 → 12 (applies right side / badge)
const padLeft  = SPACE[2] + 2 + 6 * t;// base +2 bump, then 8+2 → 16 (title inset)
```

```jsx
style={{ /* …existing… */ padding: `${padTop}px ${padSide}px ${padTop}px ${padLeft}px` }}
```

- The **base +2** on `padLeft` is the "increase the title's left padding" ask, present even at minimum height.
- `padTop` growing with `t` gives the "more top padding as the card gets bigger" behaviour. Because `entryLine` is the first child, this pushes the whole header (title + time + badge) down together.
- `padSide` widens the right gutter so the time/badge don't kiss the edge on big blocks.

Keep the existing `overflow: hidden`. The top **resize handle** is an 8px strip at `top:0` (~370) that sits above the padding — with a larger `padTop`, the title clears that handle, which is a bonus (fewer mis-grabs). The bottom handle is unaffected.

> Keep small blocks legible: at `hPx = 24`, `t = 0`, so padding is `4 / 8 / 10` — essentially today's look with a hair more title inset. Only tall blocks gain the airier spacing. Tune the `48`/`180` knees and the `10`/`6`/`4` ranges to taste; these are starting values.

> Optional: clamp `padTop` so a *very* tall block doesn't float the title too far down — the `clamp(...,0,1)` already caps `t` at 1, so `padTop` maxes at 14px. Fine as-is.

---

## 3. Now-line: quieter, and under the entries

### Current state — `DayTimeline.jsx` ~307–310

```jsx
{showNow && (
  <div style={{ position:"absolute", left:GUTTER, right:6, top: nowMin*pxPerMin,
    height:0, borderTop:`1.5px solid ${COLORS.accent}`, zIndex:6, pointerEvents:"none" }} />
)}
```

`1.5px` solid full-strength `accent` at **`zIndex: 6`**. Event blocks render at `zIndex: 2` (normal) / `7` (dragging) and live in a sibling wrapper with `z-index:auto`, so they share this stacking context — meaning the now-line (6) currently draws **over** resting blocks (2). That's the "too noticeable" in mockup #3.

### Target

- **Push it back** — thinner and lower-contrast so it reads as a quiet reference, not a coral bar.
- **Layer under the entries** — blocks should cover it where they overlap the current time.

### Implementation

```jsx
{showNow && (
  <div style={{ position:"absolute", left:GUTTER, right:6, top: nowMin*pxPerMin,
    height:0, borderTop:`1px solid ${withAlpha(COLORS.accent, 0.45)}`,
    zIndex:1, pointerEvents:"none" }} />
)}
```

- `1px` + `withAlpha(COLORS.accent, 0.45)` (≈ half-strength) recedes it. (If still too loud, drop to `0.35`, or switch the colour to `COLORS.textMuted` for a fully neutral tick — but a faint coral keeps the "now" meaning; pick at build.)
- **`zIndex: 1`** puts it **above** the hour grid lines (which are `z-auto`/0, drawn earlier in DOM) but **below** the event blocks (`zIndex: 2`), so an entry that spans the current minute now sits on top of the line. In the gaps between entries the line still shows, just softly.

### Edge cases

- **Dragging** blocks go to `zIndex: 7` — already well above the line; no change.
- **Create-ghost** is `zIndex: 8` — also above; fine.
- Keep `pointerEvents:"none"` so the line never intercepts a drag/tap on the column beneath it.

---

## 4. Global decision — implicit scroll, no scrollbars

*App-wide, not Dates-specific — folded in here because it touches the same surfaces and was decided alongside (Jacques, 2026-06-19).*

**Decision:** scroll is **implicit**. No scrollbars anywhere; a clipped edge of content (and, where present, the existing feather/edge-fade scrims) is the only affordance that more lies beyond. This matches the spec's "minimal chrome / low density on purpose" direction.

### Current state

`index.html` (~11–20) does the opposite — it paints a **themed scrollbar on `*`** (thin, `#2C4040` thumb on transparent) and offers a `.no-sb` opt-out used on a handful of containers (chip rows + the main scroll areas in `CardsView`, `DatesView`, `DayTimeline`, `ListsView`). So scrollbars show everywhere *except* the few `.no-sb` containers — inconsistent, and the reverse of what we now want.

### Change

Replace the themed-scrollbar block in `index.html` with a global hide:

```css
/* Scroll is implicit — no scrollbars anywhere; clipped content implies more. */
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { width: 0; height: 0; display: none; }
```

- This removes the need for `.no-sb`. Leave the existing `className="no-sb"` usages in place (they become harmless no-ops) and either keep a `.no-sb {}` empty rule or delete it — **optional cleanup**, not required for correctness.
- Scrolling itself is unchanged: wheel, touch, trackpad, keyboard, and programmatic scroll all still work — only the visible bar is gone.

### Watch-outs

- **Don't lose the "there's more" cue where it matters.** Horizontal chip rows already carry edge fades (`fadeX` / feather scrims in `CardsView` / `ListsView` / `LaneFilter`); keep those. For the long vertical scrollers (Dates list, Day timeline, ReviewTray, ItemDetail), the cut-off content is the cue — acceptable per the minimal-chrome direction. If any view ends up looking like a dead-end, add a bottom feather rather than bringing the bar back.
- **Desktop tradeoff.** Some desktop users lean on a visible bar to gauge position/length. This is a deliberate aesthetic call for a phone-first PWA; noting it so it's a choice, not an oversight.
- **Accessibility.** Hidden bars don't affect keyboard scroll or focus order; nothing to mitigate. Reduced-motion is unrelated.

---

## Build checklist (for Claude Code)

0. `index.html`: swap the themed-scrollbar rules (~11–20) for the global no-scrollbar rules above (§4). Quick visual sweep of every scroller after.
1. `DatesView.jsx`: add `weekStart` state (Monday default) + reset-to-Monday on entering Week mode; `stepWeek`; `fmtRange` title helper.
2. Extract the Day-view day-strip into a `dayStrip({onPick, selected})` helper; fix DOW labels to derive from the date. Render it in **both** Day and Week.
3. Wire Week body: toggle → range header (with `stepWeek` arrows) → `dayStrip` (picks `weekStart`, selected = `weekDays[0]`) → existing day list; fix the list headings' `DOW[i]` → date-derived.
4. `DayTimeline.jsx`: add the height-driven `padTop`/`padLeft`/`padSide` and apply to the block's inner `padding`.
5. `DayTimeline.jsx`: now-line → `1px`, `withAlpha(accent,0.45)`, `zIndex:1`.
6. Verify: Week start re-anchors on tile tap and reflows the list; arrows move by a week; today pill correct on any start day; tall blocks breathe, small blocks stay tight; now-line hides behind entries. Run `npm test` (logic untouched, but confirm green).

---

## Out of scope

- Changing month view.
- Any new data, recurrence, or drag semantics — purely layout/visual.
- Per-user "week starts on" preference persisted to the backend (this is an in-session re-anchor; persisting it is a later, separate change if wanted).

---

*Living doc. When built, fold the Week-view header + start-day behaviour into `two-do-ui-spec.md` §4 (Dates) and update the TOC.*
