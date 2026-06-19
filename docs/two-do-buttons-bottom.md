# Two-Do — Buttons & lower screen redesign

*Build plan for the bottom third of the shell: un-pin The Grown-Up from a permanent bottom bar, summon it (and Add) from an **orbiting pair of FAB buttons** — a flat-coral `+` and a **liquid-glass** Grown-Up orb — and give the reclaimed space back to the views. Only the All/Me/You/Us lane filter stays anchored.*

> Status: **proposed** (not yet built). Approved by Jacques 2026-06-19. Hand off to Claude Code. The behavioural source of truth for the *current* shell remains `src/TwoDoShell.jsx`; this doc describes the target state.
>
> **Companion doc:** [`two-do-nav-drawer.md`](two-do-nav-drawer.md) covers the top-right menu + right nav drawer. Both touch `TwoDoShell.jsx` and **share one scrim + overlay coordination** (§2). Build either first; keep the shared pieces consistent.

---

## 1. Why & decisions (locked)

The Grown-Up input bar is always pinned to the bottom, permanently occupying ~70px even when you're not dumping anything — costly on a phone-first 430px layout. Make capture a deliberate, playful gesture instead of an ever-present rail.

| Question | Decision |
|---|---|
| How is The Grown-Up summoned? | An **orbiting pair of buttons** — `+` (Add) and the Grown-Up circle each other near the bottom-right; tap either. |
| What do the buttons look like? | `+` is **flat coral**. The Grown-Up is a **liquid-glass orb** (real refraction). |
| Do they pause? | **No** — the orbit never stops; the buttons swell slightly at the top of the arc for a 3D feel. |
| What stays at the bottom at rest? | **Only the lane filter chips** (All / Me / You / Us). The input bar is gone until summoned; that vertical space goes back to the view. |

---

## 2. Shared state & scrim

```js
const [guOpen,  setGuOpen]  = useState(false);   // Grown-Up input sheet
const [addOpen, setAddOpen] = useState(false);   // "+" add-sheet (§5)
```

A single `closeOverlays()` clears these (and `navOpen` from the companion doc) so only one overlay is ever open. One scrim serves all overlays:

```jsx
{(navOpen || guOpen || addOpen) && (
  <div onClick={closeOverlays}
    style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", zIndex:5 }} />
)}
```

**Z-order:** scrim 5 < drawer 6 < orbit 7 < sheets 8. Simplest rule: **don't render the orbit while any overlay is open**, so it never floats over a sheet.

---

## 3. The orbiting FAB pair

Replace the single floating `+` FAB (current lines ~212–235) with a two-button orbit system circling a shared centre near the bottom-right.

The two buttons are deliberately **different materials**:

- **`+` (Add)** — the main action. **Flat coral, solid shaded.** Plain `background: COLORS.accent` (`#E8896B`), dark glyph (`COLORS.bg`), one grounding drop shadow. No gradient, no glass. Opens the add-sheet (§5).
- **The Grown-Up** — a spark/✦ icon. **Liquid glass** (§4). Opens the Grown-Up input sheet (§6).

Both are **perfect circles** (`border-radius: 50%`).

### 3.1 Orbit mechanism (CSS, honours reduced-motion)

```css
@keyframes twodoOrbit   { from{transform:rotate(0)}    to{transform:rotate(360deg)} }
@keyframes twodoCounter { from{transform:rotate(0)}    to{transform:rotate(-360deg)} }
@keyframes twodoScale   { 0%,100%{ transform:scale(1.16) } 50%{ transform:scale(0.82) } }
```

DOM is three nested layers per button so each animation can have its own timing function (the counter-rotation **must** stay linear to cancel the orbit; the scale is eased):

```
.ring     → twodoOrbit   9s linear       (orbits the button around the centre)
.upright  → twodoCounter 9s linear       (counter-rotates → button stays upright)
.fab      → twodoScale   9s ease-in-out  (swells at apex, shrinks at nadir)
```

- A pivot box (e.g. `60×60`, `position:absolute; right:28px; bottom:84px; zIndex:7`).
- Two **rings** (`position:absolute; inset:0`), each `animation: twodoOrbit 9s linear infinite`; ring B gets `animation-delay:-4.5s` so the buttons sit **180° apart**.
- Each ring holds an `.upright` wrapper at the top of the ring (`top:-16px; left:50%`) with the counter-rotation; the button nests inside.
- Ring B carries the `-4.5s` delay on **all three** of its animated elements, so one button swells while the other shrinks.
- **The orbit never stops** — by design. No hover/focus pause. Tap targets stay live while moving (each `.fab` is ≥44px, and the apex-scale makes the nearer button the bigger one, which helps targeting). An occasional missed tap is an acceptable trade for the always-alive feel.

### 3.2 Depth at the apex (pseudo-3D)

`twodoScale` lifts each button at the top of its arc (1.16) and shrinks it at the bottom (0.82), so the pair reads like two bodies on a tilted ring rather than a flat circle. Eased timing (not linear) makes the swell feel like perspective rather than a mechanical pulse.

### 3.3 Reduced motion (required)

Under `@media (prefers-reduced-motion: reduce)`: **stop all three animations** (orbit, counter, scale) and lay the two buttons out statically (e.g. stacked or side-by-side). A moving tap target is an accessibility problem for motion-sensitive users — this fallback is **not optional**. Add it to the reduced-motion block already in `theme.js`.

These keyframes + the reduced-motion rule belong in `ensureFonts()`'s injected stylesheet in `src/theme.js` (alongside `twodoFloat` / `twodoPulse`), not inline.

---

## 4. The liquid glass (the Grown-Up button)

Target: Apple "Liquid Glass", not flat frost. A convincing orb is **five layers stacked**, in priority order of how much each sells the effect:

1. **Edge lensing + chromatic aberration** — an SVG filter applied as `backdrop-filter`, splitting the backdrop into R/G/B and displacing each channel by a *different* amount, then recombining with `screen`. The per-channel offset produces the rainbow fringe at the rim. `feTurbulence` drives the displacement; animating its `baseFrequency` makes the surface look *liquid* (alive), not static frost.
2. **Specular rim** — a bright top crescent highlight (`g-spec`), the single strongest "this is glass" cue.
3. **Inner reflection** — a soft secondary blob lower-inside (`g-refl`), the faint second window-reflection real glass shows.
4. **Rim ring + base glow** — inset highlights top, a coral glow pooling at the base (brand tie-in), and a thin bright border.
5. **Glyph in the glass** — the spark sits above the layers with a faint `text-shadow` so it reads as suspended *inside* the material.

```html
<svg width="0" height="0" aria-hidden="true">
  <filter id="td-liquid" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.011 0.02" numOctaves="2" seed="11" result="n">
      <animate attributeName="baseFrequency" dur="16s"
               values="0.011 0.02;0.016 0.013;0.011 0.02" repeatCount="indefinite"/>
    </feTurbulence>
    <feGaussianBlur in="n" stdDeviation="1.1" result="ns"/>
    <feDisplacementMap in="SourceGraphic" in2="ns" scale="30" xChannelSelector="R" yChannelSelector="G" result="dR"/>
    <feDisplacementMap in="SourceGraphic" in2="ns" scale="22" xChannelSelector="R" yChannelSelector="G" result="dG"/>
    <feDisplacementMap in="SourceGraphic" in2="ns" scale="15" xChannelSelector="R" yChannelSelector="G" result="dB"/>
    <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="cR"/>
    <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="cG"/>
    <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="cB"/>
    <feBlend in="cR" in2="cG" mode="screen" result="cRG"/>
    <feBlend in="cRG" in2="cB" mode="screen"/>
  </filter>
</svg>
```

```css
.fab.grown {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.5);            /* bright glass rim */
  overflow: hidden;                                    /* clip layers to the circle */
  backdrop-filter: url(#td-liquid) blur(1px) brightness(1.08) saturate(1.3);
  -webkit-backdrop-filter: blur(1px) brightness(1.08) saturate(1.3);  /* fallback: no url() on Safari */
  box-shadow:
    inset 0 1.5px 1px rgba(255,255,255,0.95),         /* top inner highlight */
    inset 0 -11px 16px rgba(232,137,107,0.22),        /* coral glow at the base (brand) */
    inset 7px 0 14px rgba(255,255,255,0.10),
    inset -7px 0 14px rgba(255,255,255,0.10),
    0 10px 24px rgba(0,0,0,0.40);
}
```

The `g-spec`, `g-refl`, and a `g-chroma` ring (a masked conic-gradient at `mix-blend-mode: screen`, only visible on the outer ~20% of the radius) are absolutely-positioned child spans — see the approved mockup source for exact values. The glyph is `color:#fff` with a coral `text-shadow`. The SVG filter lives in `index.html` next to the other PWA chrome.

### 4.1 Production caveats — read before building (these are real)

- `backdrop-filter: url(#filter)` is **Chromium-only**. iOS Safari ignores the `url()` part, so on iPhone the orb degrades to **highlights-only glass** (rim + specular + reflection, no refraction/chromatic). Still a respectable glass look — treat refraction as progressive enhancement, not a baseline.
- An **animated** SVG filter re-running on a **moving, scaling** element repaints the backdrop every frame — a potential jank/battery cost on a real phone. For ship, either (a) **freeze the turbulence** (drop the `<animate>` → static refraction, much cheaper) or (b) keep it animated **only when not reduced-motion / on-screen**, ideally rate-capped. Validate on a mid-range Android before committing to the animated version.
- Under `prefers-reduced-motion`, the turbulence animation must stop along with the orbit.

### 4.2 Open decision — the liquid *merge*

Apple's two-blobs-fusing effect (a gooey neck when the shapes touch) needs *both* buttons to be the same glass so they can metaball-merge (an SVG goo filter: blur + alpha-threshold `feColorMatrix` on a shared container). That's **incompatible with a flat-coral `+`** — to get the merge when the buttons pass, the `+` would also become glass (coral-tinted).

**Decision pending (Jacques):** keep `+` flat coral and skip the merge, *or* make both glass and gain the merge. Default in this plan = **flat coral `+`, no merge**.

---

## 5. The add-sheet (`+`)

Today the `+` calls `startNew("task")` directly. Two options — pick one at build time:

- **Keep current behaviour** — `+` immediately opens `ItemDetail` for a new task (simplest). *Recommended for v1.*
- **Type chooser** — `+` opens a small bottom sheet with Event / Task / Shopping item / Expense, each calling `startNew(type)`. (This is the `add-sheet` in the TOC's "Built" list; reuse if it already exists.) The mockup shows this version.

Either way the existing `startNew(type)` helper and `ItemDetail` flow are unchanged.

---

## 6. The Grown-Up input sheet

The bottom input bar (current lines ~242–327) becomes an **on-demand sheet** that slides up when the Grown-Up orb is tapped, instead of being permanently mounted.

- Move the existing input markup (mic button, text `input`, send button, rotating `PLACEHOLDERS`, the "The Grown-Up" serif caption) into a sheet that's only visible when `guOpen`.
- Slide-up transition: `transform: translateY(guOpen ? 0 : 110%)`, `borderRadius: "18px 18px 0 0"`, `zIndex: 8`.
- **Auto-focus** the input on open (a summoned input that needs a second tap defeats the point).
- `submitDump()` is unchanged — on Enter/submit it opens the `ReviewTray` as today, then closes the sheet.
- Keep the `PLACEHOLDERS` rotation; it may pause while the sheet is closed (no visible cost).
- The mic button keeps its current decorative state (Web Speech still unbuilt, per the TOC).

---

## 7. The lane filter stays put

`<LaneFilter value={laneFilter} onChange={setLaneFilter} ctx={ctx} />` (current line ~240) **remains anchored at the bottom**, inside the stage, below the content and above where the input bar used to be. It already carries its own background + feather scrim, so it reads cleanly as the new bottom edge. **No change to `LaneFilter.jsx`.**

---

## 8. Interaction summary

| Gesture | Result |
|---|---|
| Tap `+` (orbit) | Opens add (new task, or type chooser). |
| Tap Grown-Up (orbit) | Grown-Up input sheet rises + focuses; submit → ReviewTray. |
| Orbit at rest | Never stops — both buttons circle continuously, swelling at the top of the arc. |
| Tap scrim | Closes whatever's open. |
| `prefers-reduced-motion` | Orbit + turbulence static; transitions become instant cuts (existing `.motion` rule). |

---

## 9. Build checklist (for Claude Code)

1. Add `guOpen` / `addOpen` state (+ shared `closeOverlays()` and the shared scrim — see companion doc §4.4).
2. Replace the single FAB with the orbiting pair (flat-coral `+`, liquid-glass Grown-Up).
3. Add `twodoOrbit` / `twodoCounter` / `twodoScale` keyframes + the reduced-motion static fallback to `ensureFonts()` in `theme.js`; add the `#td-liquid` SVG filter to `index.html`.
4. Decide **animated vs. frozen** turbulence (perf) and **flat-coral vs. glass `+`** (merge) — §4.1–4.2.
5. Convert the bottom input bar into the on-demand Grown-Up sheet (auto-focus on open); leave `submitDump` / `ReviewTray` untouched.
6. Decide `+` behaviour (new-task direct vs. type chooser) — default to direct.
7. Confirm `LaneFilter` still sits at the bottom and looks right with no bar beneath it.
8. Verify mock mode works; `npm test` green.
9. Manual pass: summon + submit a dump, tap `+`, check reduced-motion (static orbit), check the orbit hides under open overlays.

---

## 10. Out of scope

- The liquid *merge* unless §4.2 is decided in its favour.
- Real voice capture, real AI parsing (unchanged; still stub/decorative).
- Any change to the four view components or the data layer.

---

*Living doc. When this ships, fold the outcome into `two-do-ui-spec.md` §2b (The Grown-Up) + §11 (exciting/glass treatment) and the TOC build status, and update `src/TwoDoShell.jsx` as the new source of truth.*
