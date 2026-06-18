import { COLORS, TYPE, SPACE, RADIUS, SHADOW } from "../theme";

// ---------------------------------------------------------------------------
// Card — the "layered & tactile" surface: gradient lift off the bg, a
// lane-colored edge-stripe, layered shadow for depth, and the coral glow
// reserved for exciting items. The one surface reused across every view.
// ---------------------------------------------------------------------------
export const Card = ({ stripeColor, exciting, onClick, className = "", style, children, ...rest }) => {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } }
          : undefined
      }
      className={`motion ${interactive ? "pressable focusable " : ""}${className}`}
      style={{
        position: "relative",
        borderRadius: RADIUS.lg,
        background: `linear-gradient(160deg, ${COLORS.bgRaised}, ${COLORS.surface})`,
        boxShadow: exciting ? SHADOW.glow : SHADOW.md,
        border: exciting ? `1px solid ${COLORS.accentGlow}55` : "1px solid transparent",
        padding: `${SPACE[3]}px ${SPACE[4]}px ${SPACE[3]}px ${SPACE[4] + SPACE[2]}px`,
        overflow: "hidden",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {stripeColor && (
        <span
          aria-hidden
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
            background: stripeColor,
          }}
        />
      )}
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chip / SegmentedTab — one pill, two active looks: `solid` (accent fill) and
// `soft` (tinted). Replaces the four hand-rolled chip implementations.
// ---------------------------------------------------------------------------
export const Chip = ({ active, onClick, children, variant = "solid", color, title, style }) => {
  const activeStyle =
    variant === "soft"
      ? { background: COLORS.accentMuted, color: COLORS.accent, border: `1px solid ${color || COLORS.accent}` }
      : { background: color || COLORS.accent, color: COLORS.bg, border: "1px solid transparent" };
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={!!active}
      className="pressable focusable tap"
      style={{
        ...TYPE.meta,
        padding: `${SPACE[1] + 2}px ${SPACE[3]}px`,
        borderRadius: RADIUS.pill,
        whiteSpace: "nowrap",
        cursor: "pointer",
        ...(active
          ? activeStyle
          : { background: "transparent", color: COLORS.textSecondary, border: `1px solid ${COLORS.surfaceLight}` }),
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// A row of chips bound to a value. options: [{ value, label }].
export const SegmentedTabs = ({ options, value, onChange, variant = "solid", style }) => (
  <div style={{ display: "flex", gap: SPACE[1] + 2, flexWrap: "wrap", ...style }}>
    {options.map((o) => (
      <Chip key={o.value} active={value === o.value} variant={variant} onClick={() => onChange(o.value)}>
        {o.label}
      </Chip>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// SectionLabel — the uppercase muted group header (was copied 3-4x).
// ---------------------------------------------------------------------------
export const SectionLabel = ({ children, style }) => (
  <div style={{ ...TYPE.label, color: COLORS.textSecondary, ...style }}>{children}</div>
);

// ---------------------------------------------------------------------------
// Buttons — consistent pill + icon variants with hover/active/focus + tap area.
// ---------------------------------------------------------------------------
const PILL_VARIANTS = {
  solid: { background: COLORS.accent, color: COLORS.bg, border: "1px solid transparent" },
  outline: { background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accent}` },
  ghost: { background: COLORS.surface, color: COLORS.textSecondary, border: "1px solid transparent" },
};
export const PillButton = ({ children, onClick, variant = "outline", style, ...rest }) => (
  <button
    onClick={onClick}
    className="pressable focusable tap"
    style={{
      ...TYPE.meta, fontWeight: 600,
      padding: `${SPACE[2]}px ${SPACE[3]}px`,
      borderRadius: RADIUS.pill, cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: SPACE[1] + 1,
      ...PILL_VARIANTS[variant], ...style,
    }}
    {...rest}
  >
    {children}
  </button>
);

export const IconButton = ({ icon, label, onClick, size = 36, style, ...rest }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className="pressable focusable tap"
    style={{
      width: size, height: size, borderRadius: RADIUS.pill, border: "none",
      background: "transparent", color: COLORS.textSecondary, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      ...style,
    }}
    {...rest}
  >
    {icon}
  </button>
);

// ---------------------------------------------------------------------------
// Badges + progress (kept API-compatible; now token-driven).
// ---------------------------------------------------------------------------
export const LaneBadge = ({ lane, label, color }) => {
  const colors = { Me: COLORS.laneMe, You: COLORS.laneYou, Us: COLORS.laneUs };
  const text = label ?? lane;
  const bg = color ?? colors[lane] ?? COLORS.laneUs;
  return (
    <span
      style={{
        ...TYPE.caption, fontWeight: 600, letterSpacing: 0.3,
        display: "inline-block", padding: "2px 8px",
        borderRadius: RADIUS.sm, color: COLORS.bg, background: bg,
      }}
    >
      {text}
    </span>
  );
};

export const SleepsChip = ({ days }) => (
  <span
    style={{
      ...TYPE.caption,
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: RADIUS.sm,
      color: COLORS.accent, background: COLORS.accentMuted,
    }}
  >
    ◷ {days} sleeps
  </span>
);

export const ProgressBar = ({ done, total }) => {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      style={{ display: "flex", alignItems: "center", gap: SPACE[2], marginTop: SPACE[2] }}
    >
      <div style={{ flex: 1, height: 5, borderRadius: RADIUS.pill, background: COLORS.surfaceLight, overflow: "hidden" }}>
        <div
          className="motion"
          style={{ width: `${pct}%`, height: "100%", borderRadius: RADIUS.pill, background: COLORS.accent, transition: "width 320ms cubic-bezier(0.22,0.61,0.36,1)" }}
        />
      </div>
      <span style={{ ...TYPE.caption, color: COLORS.textMuted }}>{done}/{total}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state — serif, punny, centered. Pass the line as children.
// ---------------------------------------------------------------------------
export const emptyTextStyle = {
  fontFamily: TYPE.display.fontFamily,
  fontSize: 14,
  fontStyle: "italic",
  color: COLORS.textMuted,
  textAlign: "center",
  padding: "40px 20px",
};
export const EmptyState = ({ children, style }) => <p style={{ ...emptyTextStyle, ...style }}>{children}</p>;
