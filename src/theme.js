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
  laneUs: "#7A8E88",
  green: "#8FBFA3",
  greenMuted: "rgba(143,191,163,0.16)",
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
      @keyframes twodoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

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
      }
    `;
    document.head.appendChild(s);
  }
}
