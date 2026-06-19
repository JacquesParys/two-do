// Two-Do design tokens — the visual source of truth. Shared by the shell,
// the primitives, and every view. Inline styles read from here; the only
// things that can't be expressed inline (hover/active/focus-visible,
// reduced-motion) live in the injected stylesheet at the bottom.

export const COLORS = {
  bg: "#1B2B2B",
  bgRaised: "#1F3030", // top of the card gradient (subtle lift off bg)
  surface: "#233535",
  surfaceLight: "#2C4040",
  accent: "#E8896B",
  accentGlow: "#F4A88E",
  accentMuted: "rgba(232,137,107,0.15)",
  textPrimary: "#EDE9E3",
  textSecondary: "#8A9B95",
  textMuted: "#7C8E88", // nudged lighter than the old #5F706A for AA on bg
  laneMe: "#6BB5E8",
  laneYou: "#B98CE8",
  laneUs: "#E8896B", // coral — the shared "Us" lane
  green: "#8FBFA3",
  greenMuted: "rgba(143,191,163,0.16)",
  amber: "#E8C16B", // 1–2 days overdue (keep-reminding) — a warm nudge
  red: "#E86B6B", // 3+ days overdue (keep-reminding) — an urgent flag
};

// Lane slot → stripe/accent color (the layered card's edge-stripe).
export const LANE_COLOR = {
  partner_a: COLORS.laneMe,
  partner_b: COLORS.laneYou,
  shared: COLORS.laneUs,
};

export const FONTS = {
  body: "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
};

// Type scale — { size, weight, lineHeight, font }. Spread into a style.
export const TYPE = {
  display: { fontFamily: FONTS.display, fontSize: 18, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.3 },
  title:   { fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, lineHeight: 1.3 },
  body:    { fontFamily: FONTS.body, fontSize: 14, fontWeight: 400, lineHeight: 1.4 },
  meta:    { fontFamily: FONTS.body, fontSize: 12, fontWeight: 500, lineHeight: 1.3 },
  label:   { fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" },
  caption: { fontFamily: FONTS.body, fontSize: 10, fontWeight: 500 },
};

// Spacing scale (px). Use SPACE[n] not raw numbers.
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 };

// Border-radius language.
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

// Layered shadows for depth + the coral glow used only on exciting items.
export const SHADOW = {
  sm: "0 1px 2px rgba(0,0,0,0.25)",
  md: "0 2px 6px rgba(0,0,0,0.30)",
  lg: "0 10px 26px rgba(0,0,0,0.45)",
  glow: `0 0 0 1px ${COLORS.accentGlow}55, 0 4px 18px rgba(232,137,107,0.22)`,
};

// Build a layered glow shadow from any color (exciting items glow in their node color).
export const glow = (color) => `0 0 0 1px ${withAlpha(color, 0.4)}, 0 4px 18px ${withAlpha(color, 0.26)}`;

// Exciting "feel" variants. All share the static glow surface (excitingStyle);
// pulse/sparkle add animated overlay layers (<ExcitingFx/>); float bobs the
// content (excitingAnim). null/undefined ⇒ "glow" (the original look).
export const EXCITING_FX = ["glow", "pulse", "float", "sparkle"];
// Element-level surface style for an exciting item: the static glow + border,
// plus (for "pulse") an animation that breathes the element's OWN box-shadow
// via CSS vars — its own shadow isn't clipped by the card's overflow:hidden.
export function excitingStyle(variant, color, seed = 0) {
  const s = { boxShadow: glow(color), border: `1px solid ${withAlpha(color, 0.45)}` };
  // Both glow and pulse breathe the element's OWN box-shadow via CSS vars (not
  // clipped by overflow:hidden). Glow ebbs slowly + bright; pulse is quicker + stronger.
  if (variant === "pulse") {
    s.animation = "twodoPulse 1.8s ease-in-out infinite";
    s["--fxLo"] = withAlpha(color, 0.18);
    s["--fxHi"] = withAlpha(color, 0.9);
  } else if (variant === "glow" || variant == null) {
    s.animation = "twodoPulse 5s ease-in-out infinite";
    s["--fxLo"] = withAlpha(color, 0.3);
    s["--fxHi"] = withAlpha(color, 0.78);
  }
  // A per-item phase offset (negative delay) so two exciting items never breathe
  // in lockstep. Negative delays just advance the loop — no initial pause.
  if (s.animation && seed) s.animationDelay = `${seed}s`;
  return s;
}

// Stable per-item phase offset (seconds, negative) derived from any key (an item
// id). Same item → same drift every render; different items → desynced loops.
// Wraps cleanly for any animation period since negative delays are taken modulo.
export function fxSeed(key = "") {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return -(((h >>> 0) % 1000) / 1000) * 6; // spread across a 6s window
}
// Float bobs the content (applied to an inner wrapper, never a drag-transformed element).
export const excitingAnim = (variant) => (variant === "float" ? "twodoFloat 3.4s ease-in-out infinite" : undefined);

// Motion tokens. Durations in ms; pair with EASE. Honour reduced-motion via
// the `.motion` className (see injected stylesheet).
export const MOTION = { fast: 120, base: 200, slow: 320, ease: "cubic-bezier(0.22, 0.61, 0.36, 1)" };
export const tx = (props, dur = MOTION.base) =>
  props.split(",").map((p) => `${p.trim()} ${dur}ms ${MOTION.ease}`).join(", ");

// Add an alpha channel to a hex color (e.g. withAlpha("#E8896B", 0.15)).
export function withAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Inject the Fraunces + DM Sans pairing and the global state/motion rules once.
export function ensureFonts() {
  if (typeof document === "undefined") return;
  if (!document.querySelector('link[href*="Fraunces"]')) {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  if (!document.getElementById("twodo-anim")) {
    const s = document.createElement("style");
    s.id = "twodo-anim";
    s.textContent = `
      /* Float: dwell at the resting position, ease gently up to the peak and back
         down. The holds at 0/14% and 86/100% remove the cusp/stutter at the loop. */
      @keyframes twodoFloat {
        0%, 14%   { transform: translateY(0); }
        50%       { transform: translateY(-7px); }
        86%, 100% { transform: translateY(0); }
      }
      @keyframes twodoPulse {
        0%,100% { box-shadow: 0 0 0 1px var(--fxLo, transparent), 0 4px 14px var(--fxLo, transparent); }
        50%     { box-shadow: 0 0 0 1.5px var(--fxHi, transparent), 0 8px 30px var(--fxHi, transparent); }
      }
      /* Sparkle: a soft item-coloured sheen that fades in, sweeps, fades out, then
         snaps back to the start (while invisible) and rests — a seamless loop. */
      @keyframes twodoSparkle {
        0%   { transform: translateX(-140%) skewX(-14deg); opacity: 0; }
        8%   { opacity: 1; }
        40%  { opacity: 1; }
        50%  { transform: translateX(240%) skewX(-14deg); opacity: 0; }
        51%  { transform: translateX(-140%) skewX(-14deg); opacity: 0; }
        100% { transform: translateX(-140%) skewX(-14deg); opacity: 0; }
      }
      /* Float bobs each line/chip with a staggered offset for an organic drift,
         all shifted by the host's per-item --fxSeed so items don't sync up. */
      .fx-float > * { animation: twodoFloat 3.6s ease-in-out infinite; animation-delay: var(--fxSeed, 0s); }
      .fx-float > *:nth-child(2) { animation-delay: calc(var(--fxSeed, 0s) + 0.18s); }
      .fx-float > *:nth-child(3) { animation-delay: calc(var(--fxSeed, 0s) + 0.36s); }
      .fx-float > *:nth-child(4) { animation-delay: calc(var(--fxSeed, 0s) + 0.54s); }
      .fx-float > *:nth-child(5) { animation-delay: calc(var(--fxSeed, 0s) + 0.72s); }

      /* No stray text selection on tap/drag; inputs stay selectable. */
      #root { -webkit-user-select: none; -moz-user-select: none; user-select: none; -webkit-touch-callout: none; }
      input, textarea, [contenteditable] { -webkit-user-select: text; user-select: text; }

      /* Guaranteed min tap target without changing visual size. */
      .tap { position: relative; }
      .tap::after { content: ""; position: absolute; top: 50%; left: 50%;
        width: max(100%, 44px); height: max(100%, 44px); transform: translate(-50%, -50%); }

      /* Hover/active/focus feedback for inline-styled buttons. */
      .pressable { transition: filter ${MOTION.fast}ms ${MOTION.ease}, transform ${MOTION.fast}ms ${MOTION.ease}; }
      .pressable:hover { filter: brightness(1.08); }
      .pressable:active { transform: translateY(1px); }
      .focusable:focus-visible { outline: 2px solid ${COLORS.accent}; outline-offset: 2px; }
      :focus:not(:focus-visible) { outline: none; }

      @media (prefers-reduced-motion: reduce) {
        .twodo-fab { animation: none !important; }
        .motion, .pressable { transition: none !important; }
        .motion { animation: none !important; }
        .fx-float > * { animation: none !important; }
      }
    `;
    document.head.appendChild(s);
  }
}
