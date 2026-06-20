# Two-Do — Buttons & lower screen redesign (metaball orbit)

*Build plan for the bottom of the shell. Replace the pinned Grown-Up input bar **and** the All/Me/You/Us lane-filter chips with a single playful control: **four metaball orbs orbiting a shared origin** in the bottom-right. Each orb is a lane (Me / You / Us) or the Grown-Up. **Tap to create in that lane; drag an orb out of the cluster to filter the view to it.** This frees the entire bottom strip.*

> Status: **proposed** (not yet built). Re-scoped 2026-06-19 around Jacques' metaball prototype. The behavioural source of truth for the *current* shell is `src/TwoDoShell.jsx`; this doc is the target.
>
> **Reference prototype (in repo):** [`plans/prototypes/metaball-orbit-buttons.html`](plans/prototypes/metaball-orbit-buttons.html) + [`…README.md`](plans/prototypes/metaball-orbit-buttons.README.md). Self-contained canvas demo of the orbit, merge, 3D tilt, breathing radii, and speed bursts. This doc maps that engine onto real app actions.
>
> **Companion doc:** [`two-do-nav-drawer.md`](two-do-nav-drawer.md) (built) covers the top-right menu + right drawer. Both touch `TwoDoShell.jsx` and **share one scrim + overlay coordination** (§7).

---

## 1. Why & decisions

Two bottom elements currently cost vertical space and chrome: the always-pinned Grown-Up input bar, and the lane-filter chip row. The orbit collapses **capture, lane-scoped creation, and lane filtering** into one floating cluster, freeing the bottom entirely.

| Question | Decision |
|---|---|
| What lives at the bottom? | A **canvas metaball orbit** of four orbs in the bottom-right. Nothing else — no input bar, **no lane chips**. |
| What are the four orbs? | **Me**, **You**, **Us** (the three lanes) + **The Grown-Up**. |
| What does a **tap** do? | Me/You/Us → **create a new item in that lane**. Grown-Up → **open the chat dialogue** (the existing capture/ReviewTray flow). |
| What does **dragging an orb out** do? | Me/You/Us → **filter the current view to that lane** (replaces the chips). Grown-Up → springs back, no effect *yet* (reserved for contextual introspection — see §12 future scope). |
| Do the orbs merge? | Yes — true implicit-field metaballs; they fuse and separate as orbits breathe in/out of phase. |
| Lane-filter chips? | **Removed.** The orbs are the filter now. |

---

## 2. The rendering engine (from the prototype)

Faithful to `metaball-orbit-buttons.html` — port it, don't reinvent it. Summary of what to carry over:

- **Implicit-field metaballs**, not gradient overlap. For each pixel in the balls' bounding box: `field = Σ rᵢ² / (dᵢ² + 1)`. Inside when `field > THR (1.0)`; colour is contribution-weighted per ball; edges anti-aliased with smoothstep over a narrow band (`EDGE = 0.15`).
- **Offscreen at `RES = 0.35`**, bilinear-upscaled to display — cheap, soft edges. (On the small bottom region a slightly higher `RES` may look better; tune.)
- **3D orbit**: a tilted plane (`TILT = π·0.38`). Each ball's `z` drives its **scale**, **label opacity**, **shadow**, and **draw order** (painter's algorithm, back-to-front).
- **Breathing**: each orbit radius is a sum of **three layered sines** (±15 ripple, ±30 slow breath, ±18 drift, unique phases), clamped to a minimum so the cluster occasionally contracts tight then opens out — a living, never-quite-repeating rhythm.
- **Inter-ball gravity** *(new in this R&D)*: every ball exerts a `GRAV/d²` pull on the others (`GRAV ≈ 2800`, softened by `MIN_DIST ≈ 30`), biasing their orbit targets so the four read as a **cohesive swarm**, not four independent dots. While one ball is dragged, the **nearest** other ball gets an extra gentle pull toward it — the swarm leans toward your finger.
- **Sparkle proximity-spin** *(new)*: the ✦ Grown-Up's label spins faster the closer it is to any other orb (ramps from 0 to ~6 rad/s as they merge). This is a free, on-brand bit of feedback — and the same proximity value is the adjacency signal the future contextual gesture needs (§12).
- **Speed bursts**: every 4–12s a random ball accelerates to `BURST_MULT = 2.8×` for 1.2–2.7s, sin-eased in/out.
- **Labels**: pre-rendered once as **blurred bitmaps** in **Fraunces** (the app display serif), then `drawImage`'d each frame (cheap). Depth drives their opacity.
- **Hit-testing**: front-to-back by `z`; `hypot(mx-bx, my-by) < r + 10`.
- **Tap vs drag** split by a 5px movement threshold (prototype's `hasMoved`).

The latest R&D already labels the orbs **Me / You / Us / ✦** and tints them toward the app palette (lighter coral for Us, near-white sparkle, blue Me, purple You) — so the demo is now most of the way onto app semantics. What still changes for the app (see §3–4):

- **Colours snap to the exact theme tokens** (the demo's are close but hand-picked) — §3.
- **Origin is fixed** to the bottom-right of the shell (the demo lets you drag the origin — we don't; drop `draggingOrigin`).
- **Drag-out latches a filter** instead of always springing back (the demo always releases back — we diverge, see §4.2). Note the new gravity means a dragged orb already tugs the others — pleasant, but make sure the *latch* still reads clearly against that motion.
- **Viewer-aware Me/You** — the blue/purple orbs swap meaning per logged-in partner (§3).
- Backed by **real DOM buttons** for accessibility (§6).

---

## 3. The four orbs — identity & colour

Map the demo's four balls straight onto app meaning (the demo already has three `+` and one `✦`, which fits):

The orbs are **labelled with the lane name** (the R&D moved from three `+` glyphs to text), set in Fraunces:

| Orb | Label | Colour (use the token, not the demo hex) | Tap | Drag-out |
|---|---|---|---|---|
| **Me** | `Me` | `COLORS.laneMe` `#6BB5E8` | New item in the **viewer's own** lane | Filter view → Me |
| **You** | `You` | `COLORS.laneYou` `#B98CE8` | New item in the **other** partner's lane | Filter view → You |
| **Us** | `Us` | `COLORS.laneUs` / `accent` `#E8896B` (the demo uses a *lighter* coral so the label reads — keep it light) | New item in the **shared** lane | Filter view → Us |
| **Grown-Up** | `✦` | near-white warm tint (demo `rgb(248,240,235)`); halo in `COLORS.accentGlow` `#F4A88E` | Open the chat dialogue (§5) | Reserved — future contextual introspection (§12) |

- **Viewer-aware.** "Me" = the logged-in viewer's slot, "You" = the other slot — resolve via `lib/lanes.js` (`laneColor`/`laneRole`), never hardcode partner_a/b. The blue/purple orbs swap meaning per viewer, exactly like the chips did. (The label can also honour `space.label_style` — Me/You/Us vs custom — via the same resolver.)
- Swap the prototype's `COL_*` constants for the theme tokens above; set `BG` to `COLORS.bg` `#1B2B2B` (the demo uses `#1a1c22`). Keep the demo's *lighter* coral for Us so the dark label stays legible on it.
- Labels are dark (`COLORS.bg`) drawn on the orb fills, blurred + Fraunces, depth-faded — keep that treatment.

---

## 4. Interaction model (replaces the chips)

Two gestures, mirroring the prototype's "click = activate / hold-drag = pull":

### 4.1 Tap (create / capture)

A press that doesn't move past the 5px threshold:

- **Me / You / Us →** `startNew(type, laneSlot)` — open `ItemDetail` for a new item pre-set to that lane. Default `type: "task"` (mirrors today's `+` FAB). *Optional:* a small type chooser (Event/Task/Shopping/Expense) scoped to the lane — decide at build; default to direct task.
- **Grown-Up →** open the **chat dialogue** — the existing capture / `ReviewTray` flow (§5). This is the Grown-Up's whole job: a wide-open chat to dump into.
- Reuse the prototype's tap feedback (colour pulse + brief screen flash in the orb's colour) so a tap feels acknowledged.

### 4.2 Drag-out (filter)

A press that **moves past threshold** pulls the orb out of orbit (prototype's pull physics). On release:

- If the orb was pulled **past a latch radius** → set `laneFilter` to that orb's lane. The orb **stays parked** out of the cluster (dimmed/spread cluster behind it) as the active-filter indicator; the view re-renders filtered.
- Only **one filter active at a time.** Pulling a different orb parks it and returns the previous. Pulling the **active** orb back toward the origin (or a quick tap on it) clears to `laneFilter = "all"`.
- **Grown-Up drag** does nothing in v1 — let it pull and spring straight back like the demo. The pull-toward-a-lane gesture is **reserved** for the contextual introspection in §12; build the spring-back now so the affordance already feels live.

> **Divergence from the prototype:** the demo always springs a pulled ball back. Here a lane orb that crosses the latch radius **stays out** to signify the active filter. Everything else (pull spring constant, smoothing) can stay as-is.

> This is the whole reason the chips can go: the orbs now *are* the lane filter (drag) and the lane-scoped add (tap).

### 4.3 What this removes

- The `LaneFilter` component is **no longer rendered** in `TwoDoShell` (the file can stay for now). `laneFilter` state remains and is still passed to the views — it's just driven by orb drag instead of chip taps.
- The single `+` FAB is **gone** (its job is now the three lane orbs).
- The pinned bottom input bar is **gone** (summoned via the Grown-Up orb).

---

## 5. The Grown-Up capture sheet (retained)

Unchanged from the prior plan, just summoned differently:

- Tapping the Grown-Up orb opens an **on-demand sheet** sliding up from the bottom (`transform: translateY(open ? 0 : 110%)`, `borderRadius: "18px 18px 0 0"`, `zIndex: 8`), holding the existing mic button, text input, send button, rotating `PLACEHOLDERS`, and the "The Grown-Up" serif caption.
- **Auto-focus** the input on open. `submitDump()` is unchanged → opens `ReviewTray`, then closes the sheet.
- The mic stays decorative (Web Speech still unbuilt, per the TOC).

---

## 6. Accessibility (canvas is not optional to solve)

A `<canvas>` is invisible to assistive tech and unreachable by keyboard. The orbit is the *presentation*; the *controls* must also exist as real DOM:

- Render **four real `<button>`s** (one per orb) layered over the canvas region, each with an `aria-label` ("Add to Me", "Add to You", "Add to Us", "Open The Grown-Up") and positioned near its orb's rest point (or simply stacked and visually-hidden — they don't need to track the animation).
- **Keyboard:** Enter/Space on a lane button = create-in-lane; the Grown-Up button = open capture. Drag-to-filter has no keyboard analogue, so provide a keyboard path to filtering — e.g. each lane button exposes a second control (a small "filter" affordance) or a `aria-pressed` toggle that sets `laneFilter`. **Do not let filtering be drag-only**, or keyboard/SR users lose it entirely (the chips it replaces were fully keyboard-accessible).
- Canvas gets `aria-hidden="true"`; the buttons carry the semantics.
- Maintain ≥44px hit areas for the DOM buttons regardless of the visual orb size.

---

## 7. Integration into `TwoDoShell.jsx`

- The orbit is a component (e.g. `<OrbitDock />`) mounted **inside the stage**, pinned bottom-right, sized to a fixed region (say 180–220px square) with the canvas at device-pixel-ratio. It owns its rAF loop and the four orbs' state.
- Props/callbacks up to the shell: `onCreate(laneSlot)` → `startNew("task", laneSlot)`; `onGrownUp()` → open the capture sheet; `onFilter(laneSlot|"all")` → `setLaneFilter`. Pass `ctx` (for viewer-aware Me/You) and current `laneFilter` (to show the parked/active orb).
- **Shared scrim / overlays.** Same `closeOverlays()` + single scrim as the nav drawer (`two-do-nav-drawer.md` §4.4). Z-order unchanged: scrim 5 < drawer 6 < **orbit 7** < sheets 8. While any overlay (drawer / capture sheet) is open, **pause the orbit loop** and let the scrim cover it.
- **Reclaimed height.** Views currently reserve space for the chips + bar in their `calc(100dvh - …)` constants (e.g. Dates uses `- 270px`). With the bottom freed, **re-check and reduce those offsets** so views actually gain the room — otherwise the win is invisible. (Cross-ref the Dates refinements plan, which also touches those heights.)

---

## 8. Performance & reduced motion (required)

- **Pause the rAF** when: an overlay/sheet is open, the document is hidden (`visibilitychange`), or the orbit is off-screen. A canvas running a continuous loop in the corner is a real battery cost on a phone PWA.
- **`prefers-reduced-motion`:** stop orbit + oscillation + bursts entirely and render the four orbs **static**, laid out as a simple labelled row/arc. This static layout doubles as a clean fallback and pairs naturally with the DOM buttons from §6.
- Consider capping the loop (e.g. 30fps) on low-power devices; validate on a mid-range Android.

---

## 9. Key tunables (carried from the prototype README)

`RES` (offscreen scale) · `THR` (merge threshold) · `EDGE` (AA band) · `TILT` (orbit tilt) · `GRAV` (inter-ball pull) · `DRAG_GRAV` / the nearest-ball drag pull · `MIN_DIST` (gravity softening) · `baseOrbitR` per orb · the three breathing amplitudes/speeds · `BURST_MULT` / burst cadence · `baseSpeed` per orb · `DEPTH_SCALE` (z→size). Start from the prototype's values; the four orbs are smaller in-app, so expect to nudge `baseOrbitR`, `RES`, the ball radii, and `GRAV`/`MIN_DIST` down to keep the swarm from collapsing in a tighter dock.

---

## 10. Interaction summary

| Gesture | Result |
|---|---|
| Tap Me / You / Us orb | New item in that lane (`startNew` pre-set). |
| Tap Grown-Up orb | Opens the chat dialogue (capture sheet rises + focuses; submit → ReviewTray). |
| Drag a lane orb out (past latch) | Filter the view to that lane; the orb parks as the active indicator. |
| Drag the active orb back / tap it | Clears filter → "all". |
| Drag Grown-Up orb | Springs back; no effect in v1 (reserved → §12). |
| Orbit at rest | Orbs circle, breathe, and occasionally burst; they merge as they pass. |
| Overlay open / tab hidden / reduced-motion | Orbit pauses; reduced-motion shows four static labelled orbs. |

---

## 11. Open decisions

1. **Lane tap** = direct new task (default) vs a lane-scoped type chooser (§4.1).
2. **Filter latch UX** — does the parked orb stay fully out, or just offset + glow? Exact latch radius and "clear" gesture (drag-back vs tap-active) to be felt out in build (§4.2).
3. **Keyboard filtering affordance** — the concrete control that gives non-drag users lane filtering (§6).

*(Resolved: tapping the Grown-Up opens the chat dialogue — §1.)*

---

## 12. Future scope — contextual Grown-Up

*Not v1. Captured here so the v1 gestures are built to leave room for it.*

The Grown-Up becomes **contextual by where you drag it**. A plain tap is still "open chat, dump anything." But dragging the Grown-Up orb onto a **lane orb** scopes the conversation to that person:

- **Grown-Up → Me** — introspect *your own* schedule: ask what you've got on, have it plan/propose events for you.
- **Grown-Up → You** — introspect your *partner's* schedule: ask what they have on, plan/propose events for them.
- **Grown-Up → Us** — the shared view: what's on for both of you, plan shared events.

So the metaball merge between the Grown-Up and a lane orb isn't just visual — it's the *gesture that sets the chat's subject*. This depends on the Grown-Up being a real conversational agent with read access to each lane's items (see the Grown-Up × Claude API plan), so it lands after that work, not before.

**The latest R&D already lays the groundwork:** the **inter-ball gravity** means dragging the Grown-Up naturally draws the nearest lane orb toward it (and vice versa) — the physical "they want to merge" pull this gesture relies on. And the **sparkle proximity-spin** already computes, every frame, how close the ✦ is to each other orb — that proximity value *is* the adjacency signal. So the future gesture mostly needs to: read which lane orb the ✦ has merged with, and open the chat scoped to that lane.

**v1 implication:** build the Grown-Up's drag as a clean spring-back now (§4.2), and keep that per-orb proximity/adjacency value exposed — it's what this gesture, and the merge feedback, both read.

---

## 13. Build checklist (for Claude Code)

1. Port `metaball-orbit-buttons.html` into an `<OrbitDock>` component (canvas + rAF), fixed origin bottom-right, four orbs — including the **gravity**, **sparkle proximity-spin**, layered breathing, and **blurred Fraunces labels** from the latest R&D. (Fraunces is already loaded by `ensureFonts()`; keep the prototype's `document.fonts.ready` gate before building label bitmaps.)
2. Swap demo colours → theme tokens; set `BG` to `COLORS.bg`; make Me/You/Us labels + colours viewer-aware (and `label_style`-aware) via `lib/lanes.js`.
3. Wire **tap** → `onCreate(laneSlot)` / `onGrownUp()`; **drag-out latch** → `onFilter(laneSlot)`, drag-active-back → `onFilter("all")`.
4. Mount `<OrbitDock>` in `TwoDoShell` stage; remove `<LaneFilter>` render, the `+` FAB, and the pinned input bar; keep `laneFilter` state (now fed by the dock) + the Grown-Up capture sheet.
5. Add the **DOM-button a11y layer** + keyboard create/filter paths; `aria-hidden` the canvas (§6).
6. **Pause the loop** on overlay/hidden/off-screen; add the **reduced-motion static** layout (§8).
7. Reduce the views' `calc(100dvh - …)` offsets to claim the freed bottom (§7); re-check Dates heights.
8. Verify mock mode; `npm test` green.
9. Manual pass: create into each lane, summon + submit a dump, drag-to-filter each lane + clear, reduced-motion fallback, battery/jank sanity on a phone.

---

## 14. Out of scope

- A Grown-Up drag action in v1 (the contextual introspection is §12 future scope).
- WebGL/shader version of the field (the README's upgrade path) — only if the 2D canvas can't hold framerate.
- Real voice capture / real AI parsing (unchanged).
- Any change to the four view components or the data layer (beyond the height-offset tweak).

---

*Living doc. When built, fold the orbit + lane-via-orb model into `two-do-ui-spec.md` §2b (capture) and §3 (lane system), note the chips' removal, and update `src/TwoDoShell.jsx` as the source of truth.*
