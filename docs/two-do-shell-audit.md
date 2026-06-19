# Two-Do — Shell redesign audit

*Audit of the two proposed shell-chrome docs ([`two-do-nav-drawer.md`](two-do-nav-drawer.md), [`two-do-buttons-bottom.md`](two-do-buttons-bottom.md)) against the current `src/TwoDoShell.jsx` and `src/theme.js`. Records what was verified, what drifted, and the implementation decisions taken when building the nav drawer.*

> Audited 2026-06-19, against shell as of commit `da7a2ef`.

---

## 1. Plan-vs-code accuracy

The nav-drawer doc's references to the live shell are accurate enough to build from:

| Doc claim | Reality | Verdict |
|---|---|---|
| Header at lines ~120–168 (brand + `TABS.map` chips + sign-out `⎋`) | Header is `TwoDoShell.jsx:119–168`; brand `130–141`, chip row `142–164`, sign-out `165–167` | ✅ accurate |
| Single FAB at ~212–235 | `twodo-fab` block at `212–235`, calls `startNew("task")` | ✅ accurate |
| Bottom input bar at ~242–327 | Grown-Up bar at `242–327` | ✅ accurate |
| Root `div` is `position: relative; overflow: hidden` | `TwoDoShell.jsx:113–114` | ✅ confirmed — drawer can be `position:absolute` inside it |
| Only real-mode dependency is `signOut` | Confirmed — header's sole `!isMockMode` gate is the sign-out button (`165`) | ✅ accurate |
| Tokens `COLORS.bgRaised`, `COLORS.surfaceLight`, `COLORS.accent`, `MOTION.slow`, `MOTION.ease` | All present in `theme.js` (`COLORS` 6–25, `MOTION` 107) | ✅ exist |
| `.tap` helper for 44px tap target | Present, `theme.js:170–172` | ✅ exists |
| Reuse accessible `Modal` primitive | `src/components/Modal.jsx` exists with role/Esc/focus-trap | ⚠️ see §3 |

---

## 2. Pre-existing issues found

- **Duplicate `ensureFonts()` call** — invoked at `TwoDoShell.jsx:14` *and* `:31`. Harmless (the body guards on `getElementById`/`querySelector`), but the second call is dead. Removed while editing the file for the drawer.

No other defects found in the shell chrome.

---

## 3. Implementation decisions (nav drawer)

Built per `two-do-nav-drawer.md`. Decisions where the doc left a choice:

- **Drawer is hand-rolled, not `Modal`.** `Modal` renders a full-screen dimmed backdrop with the panel floating above it (`zIndex 40`). The drawer spec is a *push* — the content stage slides left while the drawer slides in, sharing a `zIndex 5/6` scrim/drawer pair. The `Modal` "push" variant doesn't push the underlying content, so it's the wrong primitive here. Esc-to-close and focus-return-to-trigger were re-implemented inline (cheap; ~10 lines).
- **The FAB lives *inside* the stage.** So it translates left with the content and is covered by the scrim when the drawer is open — otherwise it would float over the pushed-away content. (The companion buttons-bottom doc later replaces this FAB with the orbit; that work is deferred — see §4.)
- **Stage + drawer carry `className="motion"`** so the existing reduced-motion rule (`theme.js:181–186`) turns the slide into an instant cut for motion-sensitive users.
- **Scrim z-order honored:** scrim `5` < drawer `6`, matching the shared contract in both docs so the companion bottom-sheet work can slot orbit `7` / sheets `8` on top without renumbering.
- **`closeOverlays()` not yet introduced.** With only `navOpen` in play it would wrap a single setter. The companion doc says to fold all three flags into it when the bottom work lands; left as a direct `setNavOpen(false)` until then to avoid a premature abstraction.

---

## 4. Deferred — companion `two-do-buttons-bottom.md`

Not built in this pass. It shares the scrim/overlay contract (§2 of that doc) and the same file, but is a larger, independent change (orbiting FAB pair, liquid-glass refraction, on-demand Grown-Up sheet) with two open product decisions still pending (§4.1 animated-vs-frozen turbulence, §4.2 flat-coral-vs-glass `+`). The nav drawer was built so its scrim/z-order leave clean seams for it.

---

*Living doc. Fold outcomes into `two-do-ui-spec.md` §2 (navigation) and the TOC build status once both shell-chrome changes ship.*
