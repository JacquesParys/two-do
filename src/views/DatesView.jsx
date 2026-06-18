import { useState, useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable, closestCenter } from "@dnd-kit/core";
import { COLORS, TYPE, SPACE, RADIUS, withAlpha } from "../theme";
import { LaneBadge, SleepsChip, Card, EmptyState, IconButton, timeProximity, LinkedListChips } from "../components/primitives.jsx";
import { getBootstrap, listCalendar, updateItem, getListSummaries } from "../lib/data.js";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor, SLOTS } from "../lib/lanes.js";
import { itemsOnDay } from "../lib/recurrence.js";
import DayTimeline from "./DayTimeline.jsx";

// Move an ISO datetime onto a target day, keeping its time-of-day.
const moveToDay = (iso, day) => { const d = new Date(iso); const n = new Date(day); n.setHours(d.getHours(), d.getMinutes(), 0, 0); return n; };

// Week-view drag wrappers — drop an entry on another day to reschedule it.
function DroppableDay({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} style={{ borderRadius: 10, minHeight: 10, background: isOver ? withAlpha(COLORS.accent, 0.1) : "transparent", transition: "background 120ms ease" }}>{children}</div>;
}
function DraggableEvent({ id, children }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id });
  return <div ref={setNodeRef} {...listeners} {...attributes} className="focusable" style={{ opacity: isDragging ? 0.4 : 1, touchAction: "manipulation" }}>{children}</div>;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const startOfWeek = (d) => { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isToday = (d) => sameDay(d, new Date());
const fmtTime = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
const sleepsUntil = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0); return Math.round((x - t) / 86400000); };
const eventDate = (e) => new Date(e.start_at || e.due_at);
const monthId = (d) => `m-${d.getFullYear()}-${d.getMonth()}`;

const Chevron = ({ dir, color = COLORS.textPrimary }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === "left" ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
  </svg>
);

const dowStyle = { textAlign: "center", fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", padding: "4px 0" };

// A single month grid; dims itself based on how visible it is in the scroller.
function MonthBlock({ date, rootRef, eventsOn, onDayClick, onOpenItem, ctx, onVisible }) {
  const elRef = useRef(null);
  const [ratio, setRatio] = useState(isToday(date) ? 1 : 0);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { setRatio(e.intersectionRatio); if (e.intersectionRatio > 0.55) onVisible?.(date); },
      { root: rootRef.current, threshold: [0, 0.25, 0.5, 0.55, 0.75, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const opacity = 0.22 + 0.78 * Math.min(1, ratio * 1.6);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(startOfMonth(date)), i));
  return (
    <div ref={elRef} id={monthId(date)} style={{ opacity, transition: "opacity 0.25s ease", marginBottom: 22 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: COLORS.textPrimary, padding: "4px 2px 10px" }}>{MONTHS[date.getMonth()]} {date.getFullYear()}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DOW.map((d) => <div key={d} style={dowStyle}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === date.getMonth();
          const evs = eventsOn(day);
          return (
            <div key={i} onClick={() => onDayClick(day)} style={{ minHeight: 58, minWidth: 0, borderRadius: 8, cursor: "pointer", padding: "5px 2px", opacity: inMonth ? 1 : 0.35, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : "transparent" }}>{day.getDate()}</div>
              </div>
              <div style={{ marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                {evs.slice(0, 3).map((e) => {
                  const color = ctx ? resolveLaneColor(e.lane, ctx.people, COLORS) : COLORS.laneUs;
                  return (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpenItem?.(e); }} title={e.title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: e.kind === "exciting" ? COLORS.accent : COLORS.textSecondary, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.emoji ? e.emoji + " " : ""}{e.title}</span>
                    </div>
                  );
                })}
                {evs.length > 3 && <span style={{ fontSize: 9, color: COLORS.textMuted, paddingLeft: 9 }}>+{evs.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DatesView = ({ isDesktop, onOpenItem, laneFilter = "all", dataVersion = 0 }) => {
  const [ref, setRef] = useState(() => new Date());
  const [mode, setMode] = useState("week");
  const [ctx, setCtx] = useState(null);
  const [events, setEvents] = useState([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const monthScrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summaries, setSummaries] = useState({});

  function load() {
    setError(false);
    Promise.all([getBootstrap(), listCalendar(), getListSummaries()])
      .then(([b, ev, sums]) => { setCtx(b); setEvents(ev); setSummaries(sums); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }
  useEffect(() => { load(); }, []);
  // Reload in place when something elsewhere filed/edited (keeps scroll + view mounted).
  useEffect(() => { if (dataVersion) load(); }, [dataVersion]);

  // Persist a timeline drag (move/resize) then refresh.
  async function persist(id, patch) { await updateItem(id, patch); load(); }

  // Week view: drag an entry between days to reschedule (keeping time-of-day).
  const [weekActiveId, setWeekActiveId] = useState(null);
  const weekSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Deliberate press-and-hold on touch so a quick swipe scrolls instead of dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
  // While a week-view drag is active, stop the list scrolling under the finger.
  const weekActiveRef = useRef(null);
  weekActiveRef.current = weekActiveId;
  useEffect(() => {
    const onTouchMove = (e) => { if (weekActiveRef.current && e.cancelable) e.preventDefault(); };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => window.removeEventListener("touchmove", onTouchMove);
  }, []);
  function onWeekDragEnd({ active, over }) {
    setWeekActiveId(null);
    if (!over) return;
    const idx = Number(String(over.id).replace("day-", ""));
    const item = events.find((e) => e.id === active.id);
    if (!item || Number.isNaN(idx) || !weekDays[idx]) return;
    const anchor = item.start_at || item.due_at;
    if (!anchor || sameDay(new Date(anchor), weekDays[idx])) return;
    const ns = moveToDay(anchor, weekDays[idx]);
    if (item.start_at) {
      const patch = { start_at: ns.toISOString() };
      if (item.end_at) patch.end_at = new Date(ns.getTime() + (new Date(item.end_at) - new Date(item.start_at))).toISOString();
      persist(item.id, patch);
    } else {
      persist(item.id, { due_at: ns.toISOString() });
    }
  }

  // When entering Month mode, jump to the current month.
  useEffect(() => {
    if (mode !== "month") return;
    const t = setTimeout(() => {
      const el = document.getElementById(monthId(new Date()));
      el?.scrollIntoView({ block: "start" });
    }, 30);
    return () => clearTimeout(t);
  }, [mode]);

  const viewer = ctx?.viewerSlot || SLOTS.A;
  const step = (dir) => {
    if (mode === "day") setRef((r) => addDays(r, dir));
    else setRef((r) => addDays(r, dir * 7));
  };

  const passesFilter = (e) => laneFilter === "all" || e.lane === laneFilter;
  // Expand recurring items into per-day occurrences (virtual; not stored).
  const eventsOn = (day) => itemsOnDay(events.filter(passesFilter), day, (e, d) => sameDay(eventDate(e), d)).sort((a, b) => eventDate(a) - eventDate(b));
  // Recurring occurrences open their master series item.
  const openItem = (it) => onOpenItem?.(it._master || it);

  const Event = ({ e }) => {
    const exciting = e.kind === "exciting";
    const d = eventDate(e);
    const label = ctx ? resolveLaneLabel(e.lane, viewer, ctx.space) : e.lane;
    const color = ctx ? resolveLaneColor(e.lane, ctx.people, COLORS) : COLORS.laneUs;
    const nodeColor = e.color || color;
    const s = sleepsUntil(d);
    return (
      <Card laneColor={nodeColor} exciting={exciting} proximity={timeProximity(e)} onClick={() => openItem(e)} style={{ padding: `${SPACE[3]}px ${SPACE[3]}px`, marginBottom: SPACE[2] }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE[2] }}>
          <span style={{ minWidth: 42, ...TYPE.meta, color: exciting ? nodeColor : COLORS.textMuted, paddingTop: 1 }}>{fmtTime(d)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {exciting && e.emoji && <span style={{ fontSize: 14 }}>{e.emoji}</span>}
              <span style={{ ...TYPE.body, fontWeight: exciting ? 500 : 400, color: COLORS.textPrimary }}>{e.title}</span>
              {e._recurring && <span title="Repeats" style={{ color: COLORS.textMuted, fontSize: 13 }}>↻</span>}
            </div>
            {e.countdown && s > 0 && <div style={{ marginTop: 4 }}><SleepsChip days={s} /></div>}
          </div>
          <LaneBadge label={label} color={color} />
        </div>
        <LinkedListChips lists={(e.linked_list_ids || []).map((id) => summaries[id]).filter(Boolean)} />
      </Card>
    );
  };

  const weekStart = startOfWeek(ref);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const headerLabel =
    mode === "week" ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`
    : mode === "day" ? `${ref.getDate()} ${MONTHS[ref.getMonth()].slice(0, 3)} ${ref.getFullYear()}`
    : `${MONTHS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

  // The big serif date heading, flanked by nav arrows — shared by Day and Week.
  // Day mode advances by a day, Week mode by a week (handled in `step`).
  const fullHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE[3], marginBottom: 14 }}>
      <IconButton onClick={() => step(-1)} label="Previous" size={32} icon={<Chevron dir="left" />} />
      <span style={{ flex: 1, textAlign: "center", fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.textPrimary }}>
        {DOW[(ref.getDay() + 6) % 7]} {ref.getDate()} {MONTHS[ref.getMonth()].slice(0, 3)}{isToday(ref) ? " · Today" : ""}
      </span>
      <IconButton onClick={() => step(1)} label="Next" size={32} icon={<Chevron dir="right" />} />
    </div>
  );

  const header = (
    <div style={{ display: "flex", justifyContent: mode === "month" ? "space-between" : "flex-end", alignItems: "center", marginBottom: 10 }}>
      {mode === "month" && <span style={{ ...TYPE.body, fontWeight: 500, color: COLORS.textPrimary }}>{headerLabel}</span>}
      <div style={{ display: "flex", background: COLORS.surface, borderRadius: RADIUS.md, padding: 2 }}>
        {["Day", "Week", "Month"].map((m) => {
          const on = mode === m.toLowerCase();
          return (
            <button key={m} onClick={() => setMode(m.toLowerCase())} aria-pressed={on} className="focusable"
              style={{ ...TYPE.caption, padding: "5px 12px", borderRadius: RADIUS.sm, border: "none", cursor: "pointer", background: on ? COLORS.surfaceLight : "transparent", color: on ? COLORS.textPrimary : COLORS.textMuted }}>{m}</button>
          );
        })}
      </div>
    </div>
  );

  if (loading || error) {
    return (
      <div style={{ padding: "0 8px" }}>
        {error ? (
          <EmptyState style={{ fontStyle: "normal" }}>
            Couldn’t load the calendar.{" "}
            <button onClick={load} className="focusable" style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Try again</button>
          </EmptyState>
        ) : (
          <EmptyState>Loading the calendar…</EmptyState>
        )}
      </div>
    );
  }

  // ----- Month: infinite vertical scroll -----
  if (mode === "month") {
    const months = Array.from({ length: 37 }, (_, i) => addMonths(startOfMonth(new Date()), i - 18));
    return (
      <div style={{ padding: "0 8px" }}>
        {header}
        <div ref={monthScrollRef} className="no-sb" style={{ height: "calc(100dvh - 270px)", overflowY: "auto" }}>
          {months.map((m) => (
            <MonthBlock
              key={monthId(m)}
              date={m}
              rootRef={monthScrollRef}
              ctx={ctx}
              eventsOn={eventsOn}
              onOpenItem={openItem}
              onDayClick={(day) => { setRef(day); setMode("day"); }}
              onVisible={(d) => setVisibleMonth((v) => (v.getMonth() === d.getMonth() && v.getFullYear() === d.getFullYear() ? v : d))}
            />
          ))}
        </div>
      </div>
    );
  }

  // ----- Day / Week -----
  let body;
  if (mode === "week") {
    body = (
      <>
        {fullHeader}
        <DndContext sensors={weekSensors} collisionDetection={closestCenter} onDragStart={(e) => setWeekActiveId(e.active.id)} onDragEnd={onWeekDragEnd} onDragCancel={() => setWeekActiveId(null)}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {weekDays.map((day, i) => {
              const evs = eventsOn(day);
              return (
                <div key={i} style={{ borderTop: i > 0 ? `1px solid ${COLORS.surfaceLight}` : "none", padding: i > 0 ? "12px 0 4px" : "0 0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : COLORS.surfaceLight }}>{day.getDate()}</div>
                    <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: isToday(day) ? COLORS.accent : COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>{DOW[i]}{isToday(day) ? " · Today" : ""}</span>
                  </div>
                  <DroppableDay id={`day-${i}`}>
                    {evs.length ? evs.map((e) => (
                      e._recurring
                        ? <Event key={e.id} e={e} />
                        : <DraggableEvent key={e.id} id={e.id}><Event e={e} /></DraggableEvent>
                    )) : <div style={{ padding: "2px 0 4px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted, fontStyle: "italic" }}>—</div>}
                  </DroppableDay>
                </div>
              );
            })}
          </div>
          <DragOverlay>{weekActiveId && events.find((e) => e.id === weekActiveId) ? <Event e={events.find((e) => e.id === weekActiveId)} /> : null}</DragOverlay>
        </DndContext>
      </>
    );
  }

  // ----- Day: a 24h timeline with drag-to-move / resize -----
  if (mode === "day") {
    return (
      <div style={{ padding: "0 8px" }}>
        {header}
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 270px)" }}>
          {fullHeader}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 12, flexShrink: 0 }}>
            {weekDays.map((day, i) => (
              <button key={i} onClick={() => setRef(day)} className="focusable" style={{ textAlign: "center", padding: "6px 0", borderRadius: 12, border: "none", cursor: "pointer", background: sameDay(day, ref) ? COLORS.surfaceLight : "transparent" }}>
                <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase" }}>{DOW[i]}</div>
                <div style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : "transparent" }}>{day.getDate()}</div>
                <div style={{ minHeight: 6, marginTop: 3 }}>{eventsOn(day).length > 0 && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: COLORS.textMuted }} />}</div>
              </button>
            ))}
          </div>
          <DayTimeline day={ref} items={eventsOn(ref)} ctx={ctx} summaries={summaries} onOpenItem={openItem} onChange={persist} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 8px" }}>
      {header}
      <div className="no-sb" style={{ height: "calc(100dvh - 270px)", overflowY: "auto", overflowX: "hidden", padding: "0 6px" }}>{body}</div>
    </div>
  );
};

export default DatesView;
