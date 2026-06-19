import { useRef, useEffect, useState } from "react";
import { COLORS, TYPE, SPACE, RADIUS, SHADOW, withAlpha, glow, excitingStyle, excitingAnim } from "../theme";
import { LaneBadge, LaneFill, LinkedListChips, timeProximity, ExcitingFx } from "../components/primitives.jsx";
import { laneColor as resolveLaneColor, laneLabel as resolveLaneLabel } from "../lib/lanes.js";

// ---- Geometry & pure time helpers (exported for tests) --------------------
export const HOUR_PX = 56;
export const SNAP_MIN = 15;
export const DAY_MIN = 1440;
const GUTTER = 48;
const DEFAULT_DUR = 60;
const MIN_DUR = 15;
const pxPerMin = HOUR_PX / 60;

export const minutesOfDay = (date) => { const d = new Date(date); return d.getHours() * 60 + d.getMinutes(); };
export const snap = (mins, step = SNAP_MIN) => Math.round(mins / step) * step;
export const atMinutes = (day, mins) => { const d = new Date(day); d.setHours(0, 0, 0, 0); d.setMinutes(mins); return d; };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtMin = (mins) => { const h = Math.floor(mins / 60), m = ((mins % 60) + 60) % 60; return `${h}:${String(m).padStart(2, "0")}`; };
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Every item is a timeline block. Events (start_at) carry a duration; tasks
// (due_at only) anchor at their due time and sit at the minimum height.
function toBlocks(items) {
  const out = [];
  for (const it of items) {
    const anchor = it.start_at || it.due_at;
    if (!anchor) continue;
    const startMin = minutesOfDay(anchor);
    let durMin;
    if (it.end_at) durMin = Math.max(MIN_DUR, minutesOfDay(it.end_at) - startMin);
    else if (it.start_at) durMin = DEFAULT_DUR;
    else durMin = MIN_DUR;
    out.push({ it, startMin, durMin, endMin: startMin + durMin });
  }
  return out;
}

// Greedy column packing so overlapping blocks sit side-by-side.
function packColumns(blocks) {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const colEnds = [];
    cluster.forEach((ev) => {
      let c = colEnds.findIndex((end) => ev.startMin >= end);
      if (c === -1) { c = colEnds.length; colEnds.push(ev.endMin); } else { colEnds[c] = ev.endMin; }
      ev.col = c;
    });
    cluster.forEach((ev) => { ev.cols = colEnds.length; out.push(ev); });
    cluster = []; clusterEnd = -1;
  };
  sorted.forEach((ev) => {
    if (cluster.length && ev.startMin >= clusterEnd) flush();
    cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.endMin);
  });
  if (cluster.length) flush();
  return out;
}

export default function DayTimeline({ day, items, ctx, summaries = {}, onOpenItem, onChange, onCreate }) {
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const holdRef = useRef(null); // pending press-and-hold (touch) before a drag commits
  const propsRef = useRef({});
  propsRef.current = { day, onChange, onOpenItem, onCreate };

  const [drag, setDrag] = useState(null);
  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  const showNow = sameDay(new Date(day), new Date());

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_PX - 8; }, []);

  useEffect(() => {
    if (!showNow) return;
    const t = setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); }, 60000);
    return () => clearInterval(t);
  }, [showNow]);

  // Drag listeners registered once; live state read from refs (no stale closures,
  // commit happens outside any state updater).
  useEffect(() => {
    const onMove = (e) => {
      // Pending press-and-hold: if the finger travels before the timer fires,
      // it's a scroll/swipe — abandon the would-be drag and let the page scroll.
      const h = holdRef.current;
      if (h) {
        h.lastY = e.clientY;
        if (Math.abs(e.clientY - h.y) > 8 || Math.abs(e.clientX - h.x) > 8) {
          clearTimeout(h.timer);
          holdRef.current = null;
        }
        return;
      }
      const d = dragRef.current;
      if (!d) return;
      if (d.it?._recurring) return; // recurring occurrences are tap-only
      const dy = e.clientY - d.startY;
      const moved = d.moved || Math.abs(dy) > 4;
      let next;
      if (d.mode === "create") {
        const curMin = clamp(snap(d.startMin + dy / pxPerMin), 0, DAY_MIN);
        next = { ...d, curMin, moved };
      } else if (d.mode === "resizeBottom") {
        const durMin = clamp(snap(d.origDurMin + dy / pxPerMin), MIN_DUR, DAY_MIN - d.origTopMin);
        next = { ...d, durMin, moved };
      } else if (d.mode === "resizeTop") {
        const endMin = d.origTopMin + d.origDurMin;
        const topMin = clamp(snap(d.origTopMin + dy / pxPerMin), 0, endMin - MIN_DUR);
        next = { ...d, topMin, durMin: endMin - topMin, moved };
      } else {
        const topMin = clamp(snap(d.origTopMin + dy / pxPerMin), 0, DAY_MIN - d.durMin);
        next = { ...d, topMin, moved };
      }
      dragRef.current = next;
      setDrag(next);
    };
    const end = (e) => {
      // Hold released before the timer fired (and finger barely moved) → it's a tap.
      const h = holdRef.current;
      if (h) {
        clearTimeout(h.timer);
        holdRef.current = null;
        const y = e && typeof e.clientY === "number" ? e.clientY : h.lastY;
        if (Math.abs(y - h.y) <= 8) {
          if (h.create) propsRef.current.onCreate?.(h.startMin, h.startMin + DEFAULT_DUR);
          else propsRef.current.onOpenItem?.(h.it);
        }
        return;
      }
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDrag(null);
      const { day: cur, onChange: change, onOpenItem: open } = propsRef.current;
      if (d.mode === "create") {
        const lo = Math.min(d.startMin, d.curMin), hi = Math.max(d.startMin, d.curMin);
        if (!d.moved) propsRef.current.onCreate?.(lo, lo + DEFAULT_DUR);
        else propsRef.current.onCreate?.(lo, Math.max(hi, lo + MIN_DUR));
        return;
      }
      if (d.it._recurring) { open?.(d.it); return; } // open the master series, never persist an occurrence
      if (!d.moved) { open?.(d.it); return; }
      const isEvent = !!d.it.start_at;
      if (d.mode === "resizeBottom") {
        change?.(d.it.id, { start_at: atMinutes(cur, d.origTopMin).toISOString(), end_at: atMinutes(cur, d.origTopMin + d.durMin).toISOString() });
      } else if (d.mode === "resizeTop") {
        change?.(d.it.id, { start_at: atMinutes(cur, d.topMin).toISOString(), end_at: atMinutes(cur, d.origTopMin + d.origDurMin).toISOString() });
      } else if (isEvent) {
        const patch = { start_at: atMinutes(cur, d.topMin).toISOString() };
        if (d.it.end_at) patch.end_at = atMinutes(cur, d.topMin + d.origDurMin).toISOString();
        change?.(d.it.id, patch);
      } else {
        change?.(d.it.id, { due_at: atMinutes(cur, d.topMin).toISOString() });
      }
    };
    // pointercancel fires when the browser takes over the gesture (e.g. a scroll
    // wins): drop a pending hold silently; commit an in-flight drag like pointerup.
    const cancel = () => {
      const h = holdRef.current;
      if (h) { clearTimeout(h.timer); holdRef.current = null; return; }
      end();
    };
    // Non-passive: once a touch drag is actually active, stop the page from scrolling.
    const onTouchMove = (e) => {
      if (dragRef.current && !dragRef.current.it?._recurring && e.cancelable) e.preventDefault();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  function beginDrag(it, mode, startMin, durMin, startY) {
    const d = { it, mode, startY, origTopMin: startMin, origDurMin: durMin, topMin: startMin, durMin, moved: false };
    dragRef.current = d;
    setDrag(d);
  }

  // Mouse drags immediately; touch/pen requires a deliberate press-and-hold so a
  // quick swipe scrolls the timeline instead of grabbing an event.
  function onBlockPointerDown(e, it, mode, startMin, durMin) {
    if (it._recurring) return; // recurring occurrences are tap-only (handled via onClick)
    e.stopPropagation();
    if (e.pointerType === "mouse") {
      e.preventDefault();
      beginDrag(it, mode, startMin, durMin, e.clientY);
      return;
    }
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    const timer = setTimeout(() => {
      const h = holdRef.current;
      if (!h) return;
      holdRef.current = null;
      try { el.setPointerCapture(pointerId); } catch { /* capture is best-effort */ }
      if (navigator.vibrate) navigator.vibrate(8);
      beginDrag(it, mode, startMin, durMin, h.lastY);
    }, 220);
    holdRef.current = { it, x: e.clientX, y: e.clientY, lastY: e.clientY, timer };
  }

  function beginCreate(startMin, startY) {
    const d = { mode: "create", startMin, curMin: startMin, startY, moved: false };
    dragRef.current = d;
    setDrag(d);
  }

  // Press/tap-drag an empty slot to draw a new event (ghost follows the finger);
  // a plain tap makes a default-length one. Ignored when it lands on a block.
  function onEmptyPointerDown(e) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = clamp(snap((e.clientY - rect.top) / pxPerMin), 0, DAY_MIN);
    if (e.pointerType === "mouse") {
      e.preventDefault();
      beginCreate(startMin, e.clientY);
      return;
    }
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    const timer = setTimeout(() => {
      const h = holdRef.current;
      if (!h) return;
      holdRef.current = null;
      try { el.setPointerCapture(pointerId); } catch { /* capture is best-effort */ }
      if (navigator.vibrate) navigator.vibrate(8);
      beginCreate(h.startMin, h.y);
    }, 220);
    holdRef.current = { create: true, startMin, x: e.clientX, y: e.clientY, lastY: e.clientY, timer };
  }

  const packed = packColumns(toBlocks(items || []));
  const live = (id) => (drag && drag.it && drag.it.id === id ? drag : null);
  const lc = (it) => (ctx ? resolveLaneColor(it.lane, ctx.people, COLORS) : COLORS.laneUs);
  const ll = (it) => (ctx ? resolveLaneLabel(it.lane, ctx.viewerSlot, ctx.space) : it.lane);

  const entryLine = (it, exciting, time, laneCol, accentCol) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ ...TYPE.body, fontWeight: 600, color: COLORS.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {exciting && it.emoji ? it.emoji + " " : ""}{it.title}
      </span>
      {it._recurring && <span title="Repeats" style={{ color: COLORS.textMuted, fontSize: 12 }}>↻</span>}
      <span style={{ ...TYPE.caption, color: exciting ? accentCol : COLORS.textSecondary, whiteSpace: "nowrap" }}>{time}</span>
      <LaneBadge label={ll(it)} color={laneCol} />
    </div>
  );

  // Resize affordance: a lane-colored sheen, feathered to nothing at both ends
  // (horizontal mask) and faded vertically; brightens while that edge resizes.
  const sheen = (edge, laneCol, active) => {
    const feather = "linear-gradient(to right, transparent 0%, #000 50%, transparent 100%)";
    return (
      <div style={{ position: "absolute", [edge]: 0, left: "10%", right: "10%", height: active ? 5 : 4, background: `linear-gradient(to ${edge === "top" ? "bottom" : "top"}, ${withAlpha(laneCol, active ? 0.65 : 0.32)}, transparent)`, pointerEvents: "none", transition: "background 120ms ease, height 120ms ease", WebkitMaskImage: feather, maskImage: feather }} />
    );
  };

  return (
    <div ref={scrollRef} className="no-sb" style={{ position: "relative", overflowY: "auto", flex: 1, minHeight: 0 }}>
      <div style={{ position: "relative", height: 24 * HOUR_PX }}>
        {/* Hour grid */}
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ position: "absolute", top: h * HOUR_PX, left: 0, right: 0, height: HOUR_PX }}>
            <span style={{ position: "absolute", left: 0, top: -6, width: GUTTER - 8, textAlign: "right", ...TYPE.caption, color: COLORS.textMuted }}>{h === 0 ? "" : hourLabel(h)}</span>
            <div style={{ position: "absolute", left: GUTTER, right: 6, top: 0, borderTop: `1px solid ${withAlpha(COLORS.surfaceLight, 0.7)}` }} />
          </div>
        ))}

        {/* Now line (no dot) */}
        {showNow && (
          <div style={{ position: "absolute", left: GUTTER, right: 6, top: nowMin * pxPerMin, height: 0, borderTop: `1.5px solid ${COLORS.accent}`, zIndex: 6, pointerEvents: "none" }} />
        )}

        {/* Items (right of the hour gutter) — one treatment for events and tasks.
            Press/tap-drag the empty column (not a block) to draw a new event. */}
        <div onPointerDown={onEmptyPointerDown} style={{ position: "absolute", left: GUTTER, right: 6, top: 0, bottom: 0, touchAction: drag && drag.mode === "create" ? "none" : "pan-y" }}>
          {/* Ghost of the event being drawn */}
          {drag && drag.mode === "create" && (() => {
            const lo = Math.min(drag.startMin, drag.curMin), hi = Math.max(drag.startMin, drag.curMin);
            return (
              <div style={{ position: "absolute", top: lo * pxPerMin, height: Math.max((hi - lo) * pxPerMin, 22), left: 0, right: 0, borderRadius: RADIUS.lg, background: withAlpha(COLORS.accent, 0.16), border: `1px dashed ${withAlpha(COLORS.accent, 0.6)}`, pointerEvents: "none", zIndex: 8, display: "flex", alignItems: "center", justifyContent: "center", ...TYPE.caption, color: COLORS.accent }}>
                {fmtMin(lo)}–{fmtMin(hi > lo ? hi : lo + DEFAULT_DUR)}
              </div>
            );
          })()}
          {packed.map((b) => {
            const d = live(b.it.id);
            const topMin = d ? d.topMin : b.startMin;
            const durMin = d ? d.durMin : b.durMin;
            const exciting = b.it.kind === "exciting";
            const w = 100 / b.cols;
            const dragging = !!d && d.moved;
            const resizing = d && (d.mode === "resizeTop" || d.mode === "resizeBottom");
            const hPx = Math.max(durMin * pxPerMin, 24);
            const laneCol = lc(b.it);
            const nodeCol = b.it.color || laneCol;
            const variant = b.it.exciting_fx || "glow";
            const exStyle = exciting ? excitingStyle(variant, nodeCol) : { boxShadow: SHADOW.md, border: "1px solid transparent" };
            const completion = b.it.subtasks && b.it.subtasks.total ? b.it.subtasks.done / b.it.subtasks.total : 0;
            const linked = (b.it.linked_list_ids || []).map((id) => summaries[id]).filter(Boolean);
            const time = b.it.start_at || resizing ? `${fmtMin(topMin)}–${fmtMin(topMin + durMin)}` : fmtMin(topMin);
            return (
              <div key={b.it.id} style={{ position: "absolute", top: topMin * pxPerMin, height: hPx, left: `${b.col * w}%`, width: `${w}%`, padding: "0 2px", boxSizing: "border-box", zIndex: dragging ? 7 : 2 }}>
                <div
                  className="motion"
                  onPointerDown={(e) => onBlockPointerDown(e, b.it, "move", b.startMin, b.durMin)}
                  onClick={b.it._recurring ? () => propsRef.current.onOpenItem?.(b.it) : undefined}
                  style={{
                    position: "relative", height: "100%", width: "100%", boxSizing: "border-box",
                    borderRadius: RADIUS.lg,
                    background: `linear-gradient(160deg, ${COLORS.bgRaised}, ${COLORS.surface})`,
                    ...exStyle,
                    overflow: "hidden", padding: `4px ${SPACE[2]}px`,
                    cursor: dragging ? "grabbing" : "grab", touchAction: d ? "none" : "pan-y", opacity: dragging ? 0.94 : 1,
                  }}
                >
                  <LaneFill color={nodeCol} proximity={timeProximity(b.it)} completion={completion} />
                  {exciting && <ExcitingFx variant={variant} />}
                  <div className="motion" style={{ position: "relative", animation: exciting ? excitingAnim(variant) : undefined }}>{entryLine(b.it, exciting, time, laneCol, nodeCol)}</div>
                  {hPx >= 48 && linked.length > 0 && (
                    <div style={{ position: "relative" }}><LinkedListChips lists={linked} style={{ marginTop: 4 }} /></div>
                  )}

                  {!b.it._recurring && (
                    <>
                      {/* Resize from the top edge — integrated faded sheen */}
                      <div onPointerDown={(e) => onBlockPointerDown(e, b.it, "resizeTop", b.startMin, b.durMin)} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, cursor: "ns-resize", touchAction: "none" }}>{sheen("top", nodeCol, !!d && d.mode === "resizeTop")}</div>
                      {/* Resize from the bottom edge */}
                      <div onPointerDown={(e) => onBlockPointerDown(e, b.it, "resizeBottom", b.startMin, b.durMin)} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, cursor: "ns-resize", touchAction: "none" }}>{sheen("bottom", nodeCol, !!d && d.mode === "resizeBottom")}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
