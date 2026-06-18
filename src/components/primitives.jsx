import { COLORS, TYPE, SPACE, RADIUS, SHADOW, withAlpha, glow } from "../theme";

// How imminent an item is (0–1): fills as its start/due time approaches, full
// at or past it. Used to grow the lane-fill backdrop. Pure-ish (reads now).
export function timeProximity(item) {
  const anchor = item?.start_at || item?.due_at;
  if (!anchor) return 0;
  const ms = new Date(anchor).getTime() - Date.now();
  if (ms <= 0) return 1;
  const WINDOW = 3 * 24 * 3600 * 1000; // build gradually over ~3 days
  const raw = Math.max(0, Math.min(1, 1 - ms / WINDOW));
  return raw * raw; // ease-in: stays subtle until the time is close
}

// Two additive lane-colored layers that fill a card left→right: one from
// time-proximity, one from completion. Overlap deepens the color. Render inside
// a position:relative + overflow:hidden parent, behind the content.
export const LaneFill = ({ color, proximity = 0, completion = 0 }) => (
  <>
    <span aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(8, proximity * 100)}%`, background: `linear-gradient(to right, ${withAlpha(color, 0.3)}, ${withAlpha(color, 0.05)} 78%, transparent)`, pointerEvents: "none", transition: "width 500ms ease" }} />
    {completion > 0 && (
      <span aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${completion * 100}%`, background: `linear-gradient(to right, ${withAlpha(color, 0.24)}, ${withAlpha(color, 0.04)} 80%, transparent)`, pointerEvents: "none", transition: "width 500ms ease" }} />
    )}
  </>
);

// ---------------------------------------------------------------------------
// Card — the "layered & tactile" surface: gradient lift off the bg, a soft
// lane-colored wash fading in from the left edge, layered shadow for depth,
// and the coral glow reserved for exciting items. One surface, every view.
// `laneColor` (alias: `stripeColor`) tints the wash. Pass `proximity`/`completion`
// (0–1) to turn the static wash into the growing two-layer LaneFill.
// ---------------------------------------------------------------------------
export const Card = ({ laneColor, stripeColor, exciting, proximity, completion, onClick, className = "", style, children, ...rest }) => {
  const interactive = !!onClick;
  const lane = laneColor ?? stripeColor;
  const hasFill = proximity != null || completion != null;
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
        boxShadow: exciting ? glow(lane || COLORS.accentGlow) : SHADOW.md,
        border: exciting ? `1px solid ${withAlpha(lane || COLORS.accentGlow, 0.45)}` : "1px solid transparent",
        padding: `${SPACE[3]}px ${SPACE[4]}px`,
        boxSizing: "border-box",
        overflow: "hidden",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {lane && (hasFill
        ? <LaneFill color={lane} proximity={proximity || 0} completion={completion || 0} />
        : (
          <span
            aria-hidden
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "30%",
              background: `linear-gradient(to right, ${withAlpha(lane, 0.26)}, transparent)`,
              pointerEvents: "none",
            }}
          />
        ))}
      <div style={{ position: "relative" }}>{children}</div>
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

// Linked-list indicator chips — "🛒 Groceries 3/8" — for a card/event that
// references standing lists. `lists` = [{ id, name, emoji, done, total }].
export const LinkedListChips = ({ lists, style }) => {
  if (!lists || !lists.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: SPACE[2], ...style }}>
      {lists.map((l) => (
        <span key={l.id} style={{ ...TYPE.caption, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: RADIUS.sm, background: COLORS.surfaceLight, color: COLORS.textSecondary }}>
          <span>{l.emoji || "🛒"}</span>{l.name}
          {l.total > 0 && <span style={{ color: COLORS.textMuted }}>{l.done}/{l.total}</span>}
        </span>
      ))}
    </div>
  );
};

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

// Inline SVG icons (currentColor, size-matched) — never emoji, which render as
// tofu boxes on some systems. Used for structural UI chrome across views.
export const CalendarIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);
export const MoonIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const SleepsChip = ({ days }) => (
  <span
    style={{
      ...TYPE.caption,
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: RADIUS.sm,
      color: COLORS.accent, background: COLORS.accentMuted,
    }}
  >
    <MoonIcon /> {days} sleeps
  </span>
);

export const ProgressBar = ({ done, total, label }) => {
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
      <span style={{ ...TYPE.caption, color: COLORS.textMuted, whiteSpace: "nowrap" }}>{label ?? `${done}/${total}`}</span>
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
