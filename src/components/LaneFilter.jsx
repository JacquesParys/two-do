import { COLORS } from "../theme";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor, SLOTS } from "../lib/lanes.js";

// Shared All / Me / You / Us filter row. Viewer-aware labels + lane-coloured dots.
export default function LaneFilter({ value, onChange, ctx, style }) {
  const viewer = ctx?.viewerSlot || SLOTS.A;
  const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
  const chips = [
    { key: "all", label: "All", color: COLORS.accent },
    { key: viewer, label: resolveLaneLabel(viewer, viewer, ctx?.space), color: ctx ? resolveLaneColor(viewer, ctx.people, COLORS) : COLORS.laneMe },
    { key: other, label: resolveLaneLabel(other, viewer, ctx?.space), color: ctx ? resolveLaneColor(other, ctx.people, COLORS) : COLORS.laneYou },
    { key: SLOTS.SHARED, label: "Us", color: COLORS.laneUs },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12, justifyContent: "center", flexWrap: "wrap", ...style }}>
      {chips.map((c) => {
        const sel = value === c.key;
        return (
          <button key={c.key} onClick={() => onChange(c.key)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 16, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, border: sel ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}`, background: sel ? COLORS.accentMuted : "transparent", color: sel ? COLORS.accent : COLORS.textSecondary }}>
            {c.key !== "all" && <span style={{ width: 7, height: 7, borderRadius: 4, background: c.color }} />}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
