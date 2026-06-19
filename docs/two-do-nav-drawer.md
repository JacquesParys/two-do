# Two-Do — Navigation drawer redesign

*Build plan for moving primary navigation out of the top chip bar into a **right-side drawer that pushes the content left**, opened from a top-right menu button. Sign-out moves into the drawer too.*

> Status: **built** 2026-06-19 (in `src/TwoDoShell.jsx`). Approved by Jacques 2026-06-19. Build notes + the codebase audit that preceded it are in [`two-do-shell-audit.md`](two-do-shell-audit.md). `src/TwoDoShell.jsx` remains the behavioural source of truth; this doc is the design intent it was built from.
>
> **Companion doc:** [`two-do-buttons-bottom.md`](two-do-buttons-bottom.md) covers the orbiting FAB pair, the liquid-glass Grown-Up button, the on-demand input sheet, and the freed bottom strip. The two changes touch the same file (`TwoDoShell.jsx`) and **share one scrim + overlay-coordination** (§4.4) — build either first, but keep the shared pieces consistent.

---

## 1. Why

The top chip bar (`Dates / Cards / Lists / Two Cents`) eats a full header row and competes with the brand wordmark and sign-out for the same strip. Moving navigation into a drawer reclaims that row and gives the views more vertical room.

---

## 2. Decisions (locked)

| Question | Decision |
|---|---|
| Where does primary nav live? | A **drawer on the right edge**. |
| How does it open? | A **menu button in the top-right** of the header. |
| How does it move? | Drawer slides in from the right; the **content pane slides left** to make room (push, not pure overlay). |
| What else is in the drawer? | **Sign out** moves here too (off the header). |

---

## 3. Target layout

```
┌──────────────────────────────┐        drawer open ──▶
│ Two-Do                    ☰   │  header: brand left, menu right
├──────────────────────────────┤        ┌───────────────┐
│  Choreography (view title)   │        │ VIEWS         │
│                              │  push   │ • Dates       │
│  content slides left  ──────▶│ ◀────── │ • Cards       │
│                              │  left   │ • Lists       │
│                              │        │ • Two Cents   │
│                              │        │               │
│                              │        │ ⎋ Sign out    │
└──────────────────────────────┘        └───────────────┘
```

Tapping the menu button: the whole content stage translates left (~150px), revealing the drawer that slid in from the right. A dim scrim covers the pushed content; tapping it (or the menu button again) closes.

---

## 4. Component-level changes — `src/TwoDoShell.jsx`

One file. No data-layer, Supabase, or view-component changes — pure shell chrome. Keep mock-mode parity (the only real-mode dependency is `signOut`, which simply moves).

### 4.1 New state

```js
const [navOpen, setNavOpen] = useState(false);   // right drawer
```

> The companion doc adds `guOpen` / `addOpen` for the bottom sheets. They share a single `closeOverlays()` helper and the one scrim (§4.4) — if you build the bottom changes too, fold all three flags into that helper.

### 4.2 Header — remove the chip row, add a menu button

Today the header (lines ~120–168) holds: brand, the `TABS.map(...)` chip row, and the sign-out `⎋` button. Target:

- Keep the **brand** wordmark on the left.
- **Delete** the `TABS.map(...)` chip row entirely from the header.
- Replace the right side with a single **menu button** (`☰`) that calls `setNavOpen(true)`; `aria-label="Open menu"` + `aria-expanded={navOpen}`. Use a hamburger glyph or inline SVG; min 44px tap target (`.tap` helper in `theme.js`).
- The sign-out button is **removed from the header** and re-homed in the drawer (§4.3).

The `TABS` array stays (it now feeds the drawer instead of the header). `activeTab` / `handleTabSwitch` are unchanged — only the thing that *renders* the tab buttons moves.

### 4.3 The right drawer

A new absolutely-positioned panel inside the shell's root `div` (already `position: relative; overflow: hidden`). Mirror the existing modal/transition language (`MOTION.ease`, `COLORS`).

```jsx
{/* Right nav drawer */}
<nav
  aria-label="Views"
  style={{
    position: "absolute", top: 0, right: 0, height: "100%",
    width: 230, background: COLORS.bgRaised,
    borderLeft: `1px solid ${COLORS.surfaceLight}`,
    transform: navOpen ? "translateX(0)" : "translateX(100%)",
    transition: `transform ${MOTION.slow}ms ${MOTION.ease}`,
    zIndex: 6, display: "flex", flexDirection: "column",
    padding: "18px 12px",
  }}
>
  <div style={{ /* "Views" label */ }}>Views</div>
  {TABS.map((tab, i) => (
    <button key={tab}
      onClick={() => { handleTabSwitch(i); setNavOpen(false); }}
      style={{ /* nav row; filled accent when i === activeTab */ }}>
      {tab}
    </button>
  ))}
  <div style={{ flex: 1 }} />
  {!isMockMode && (
    <button onClick={() => signOut()} style={{ /* sign-out row */ }}>
      Sign out
    </button>
  )}
</nav>
```

- Active view = the accent-filled row (reuse the chip's active styling: `background: COLORS.accent; color: COLORS.bg`).
- Selecting a view switches the tab **and** closes the drawer.
- Sign-out is pinned to the bottom of the drawer, only in real mode (matches the current `!isMockMode` gate).

### 4.4 The push + scrim (shared)

Wrap the existing header + content + lane filter in a single **stage** element and translate that:

```jsx
<div style={{
  height: "100%", display: "flex", flexDirection: "column",
  transform: navOpen ? "translateX(-150px)" : "translateX(0)",
  transition: `transform ${MOTION.slow}ms ${MOTION.ease}`,
}}>
  {/* header + content + lane filter */}
</div>
```

Add a scrim over the stage when the drawer is open:

```jsx
{navOpen && (
  <div onClick={() => setNavOpen(false)}
    style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", zIndex:5 }} />
)}
```

> **Shared with the bottom-sheet work.** If the companion doc's sheets are also built, this scrim's condition becomes `(navOpen || guOpen || addOpen)` and its click calls `closeOverlays()`. Only one overlay should ever be open at a time. Z-order: scrim 5 < drawer 6 < (orbit 7 < sheets 8 from the other doc).

The push distance (150) should be ≤ the drawer width so a sliver of pushed content is never lost off-screen on the narrowest phones (150 push / 230 drawer is a safe pair).

---

## 5. Interaction summary

| Gesture | Result |
|---|---|
| Tap menu (☰, top-right) | Drawer slides in from right; stage pushes left; scrim appears. |
| Tap a view in the drawer | Switches view + closes drawer (push reverses). |
| Tap Sign out (drawer, real mode only) | `signOut()`. |
| Tap scrim / menu again | Closes the drawer. |

---

## 6. Edge cases & gotchas

- **Desktop (`isDesktop`, ≥760px).** The shell caps at 1100px and centres. The right drawer + push still works, but a persistent right rail might suit desktop better. *Out of scope for v1 — ship the drawer for both, revisit later.* Don't gold-plate it.
- **Push distance vs. drawer width.** Keep `push ≤ drawerWidth`. 150 / 230 is safe.
- **Keyboard / screen reader:** drawer is `<nav aria-label="Views">`; menu button needs `aria-label` + `aria-expanded`. Consider Esc-to-close and returning focus to the menu button on close (reuse the accessible `Modal` primitive if it fits — see `src/components/`).
- **`TABS` ↔ `views` stay positionally matched** (CLAUDE.md). The drawer iterates `TABS` the same way the header did; don't reorder one without the other.

---

## 7. Build checklist (for Claude Code)

1. Add `navOpen` state to `TwoDoShell` (+ a `closeOverlays()` helper if building the bottom work too).
2. Wrap header + content + lane filter in a translating **stage** div.
3. Header: drop the `TABS.map` chip row; add the top-right menu button (`aria-label`, `aria-expanded`).
4. Build the right `<nav>` drawer from `TABS`; move sign-out into it (keep `!isMockMode`).
5. Add the scrim (closes on click).
6. Verify mock mode still works (no auth → sign-out hidden) and `npm test` is green.
7. Manual pass: open/close drawer, switch all four views, check focus + Esc, check desktop width doesn't break.

---

## 8. Out of scope

- A persistent desktop right-rail variant (ship the drawer everywhere for v1).
- Edge-swipe gestures to open the drawer (button-only for v1).
- Any change to the four view components or the data layer.

---

*Living doc. When this ships, fold the outcome into `two-do-ui-spec.md` §2 (navigation) and the TOC build status, and update `src/TwoDoShell.jsx` as the new source of truth.*
