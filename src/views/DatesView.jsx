import { useState, useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable, closestCenter } from "@dnd-kit/core";
import { COLORS, TYPE, SPACE, RADIUS, withAlpha, fxSeed } from "../theme";
import { LaneBadge, SleepsChip, Card, EmptyState, IconButton, Chevron, timeProximity, LinkedListChips } from "../components/primitives.jsx";
import { getBootstrap, listCalendar, updateItem, getListSummaries } from "../lib/data.js";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor, SLOTS } from "../lib/lanes.js";
import { itemsOnDay } from "../lib/recurrence.js";
import DayTimeline, { atMinutes } from "./DayTimeline.jsx";

// Move an ISO datetime onto a target day, keeping its time-of-day.
const moveToDay = (iso, day) => { const d = new Date(iso); const n = new Date(day); n.setHours(d.getHours(), d.getMinutes(), 0, 0); return n; };

// Week-view drag wrappers — drop an entry on another day to reschedule it.
function DroppableDay({ id, children, style }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} style={{ borderRadius: 10, minHeight: 10, background: isOver ? withAlpha(COLORS.bgDeep, 0.55) : "transparent", transition: "background 120ms ease", ...style }}>{children}</div>;
}
function DraggableEvent({ id, children }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id });
  // preventDefault on mousedown stops the browser starting a text selection in
  // the pre-activation window before dnd-kit takes over (desktop drag).
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="focusable" onMouseDown={(e) => e.preventDefault()}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", cursor: isDragging ? "grabbing" : "grab" }}>
      {children}
    </div>
  );
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0, marginBottom: 4 }}>
        {DOW.map((d) => <div key={d} style={dowStyle}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0 }}>
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === date.getMonth();
          const evs = eventsOn(day);
          // Interior dividing lines only — no border on the outer right column / bottom row.
          const divider = `1px solid ${withAlpha(COLORS.surfaceLight, 0.55)}`;
          return (
            <div key={i} onClick={() => onDayClick(day)} style={{ minHeight: 74, minWidth: 0, cursor: "pointer", padding: "4px 3px", opacity: inMonth ? 1 : 0.35, overflow: "hidden", borderRight: i % 7 !== 6 ? divider : "none", borderBottom: i < 35 ? divider : "none" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : "transparent" }}>{day.getDate()}</div>
              </div>
              <div style={{ marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                {evs.slice(0, 4).map((e) => {
                  const laneCol = ctx ? resolveLaneColor(e.lane, ctx.people, COLORS) : COLORS.laneUs;
                  const nodeCol = e.color || laneCol;
                  const exciting = e.kind === "exciting";
                  const recurring = e._recurring; // repeats clutter — fade them down
                  const open = (ev) => { ev.stopPropagation(); onOpenItem?.(e); };
                  // Exciting → a colored chip that pops; everything else → a dot + label,
                  // with recurring items in faded white so they read as background.
                  if (exciting) {
                    return (
                      <div key={e.id} onClick={open} title={e.title} style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: COLORS.textPrimary, background: withAlpha(nodeCol, 0.22), borderRadius: 5, padding: "1px 5px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer", opacity: recurring ? 0.6 : 1 }}>
                        {e.emoji ? e.emoji + " " : ""}{e.title}
                      </div>
                    );
                  }
                  return (
                    <div key={e.id} onClick={open} title={e.title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: recurring ? COLORS.textPrimary : COLORS.textSecondary, opacity: recurring ? 0.55 : 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: nodeCol, flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.emoji ? e.emoji + " " : ""}{e.title}</span>
                    </div>
                  );
                })}
                {evs.length > 4 && <span style={{ fontSize: 9, color: COLORS.textMuted, paddingLeft: 9 }}>+{evs.length - 4}</span>}
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

  const Event = ({ e, dragging }) => {
    const exciting = e.kind === "exciting";
    const d = eventDate(e);
    const label = ctx ? resolveLaneLabel(e.lane, viewer, ctx.space) : e.lane;
    const color = ctx ? resolveLaneColor(e.lane, ctx.people, COLORS) : COLORS.laneUs;
    const nodeColor = e.color || color;
    const s = sleepsUntil(d);
    return (
      <Card laneColor={nodeColor} exciting={exciting} variant={e.exciting_fx || "glow"} seed={fxSeed(e.id)} dragging={dragging} proximity={timeProximity(e)} onClick={() => openItem(e)} style={{ padding: `${SPACE[3]}px ${SPACE[3]}px`, marginBottom: SPACE[2] }}>
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

  // Month view scrolls an infinite month list; the arrows jump to the prev/next
  // month (the visible month is tracked by an IntersectionObserver per block).
  const goMonth = (dir) => {
    const el = document.getElementById(monthId(addMonths(visibleMonth, dir)));
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const monthFullHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE[3], marginBottom: 14 }}>
      <IconButton onClick={() => goMonth(-1)} label="Previous month" size={32} icon={<Chevron dir="left" />} />
      <span style={{ flex: 1, textAlign: "center", fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.textPrimary }}>
        {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
      </span>
      <IconButton onClick={() => goMonth(1)} label="Next month" size={32} icon={<Chevron dir="right" />} />
    </div>
  );

  const header = (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 10 }}>
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
        {monthFullHeader}
        <div ref={monthScrollRef} className="no-sb" style={{ height: "calc(100dvh - 316px)", overflowY: "auto" }}>
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
        <DndContext sensors={weekSensors} autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 12 }} collisionDetection={closestCenter} onDragStart={(e) => { window.getSelection?.()?.removeAllRanges?.(); setWeekActiveId(e.active.id); }} onDragEnd={onWeekDragEnd} onDragCancel={() => setWeekActiveId(null)}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {weekDays.map((day, i) => {
              const evs = eventsOn(day);
              return (
                // The whole day block (heading + events) is the drop target, so an
                // event can land anywhere over the day, not just its events line.
                <DroppableDay key={i} id={`day-${i}`} style={{ borderTop: i > 0 ? `1px solid ${COLORS.surfaceLight}` : "none", padding: i > 0 ? "10px 4px 6px" : "0 4px 6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : COLORS.surfaceLight }}>{day.getDate()}</div>
                    <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: isToday(day) ? COLORS.accent : COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>{DOW[i]}{isToday(day) ? " · Today" : ""}</span>
                  </div>
                  {evs.length ? evs.map((e) => (
                    e._recurring
                      ? <Event key={e.id} e={e} />
                      : <DraggableEvent key={e.id} id={e.id}><Event e={e} /></DraggableEvent>
                  )) : <div style={{ padding: "2px 0 4px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted, fontStyle: "italic" }}>—</div>}
                </DroppableDay>
              );
            })}
          </div>
          <DragOverlay>{weekActiveId && events.find((e) => e.id === weekActiveId) ? <Event e={events.find((e) => e.id === weekActiveId)} dragging /> : null}</DragOverlay>
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
          <DayTimeline day={ref} items={eventsOn(ref)} ctx={ctx} summaries={summaries} onOpenItem={openItem} onChange={persist}
            onCreate={(startMin, endMin) => onOpenItem?.({ type: "event", kind: "routine", lane: laneFilter !== "all" ? laneFilter : SLOTS.SHARED, start_at: atMinutes(ref, startMin).toISOString(), end_at: atMinutes(ref, endMin).toISOString() })} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 8px" }}>
      {header}
      {/* Padding is the only lever here: a vertical scroll container always clips
          at its padding box (overflow-x can't be 'visible' alongside overflow-y
          'auto'), so the gutter must be ~as wide as the glow bleed (~28px) or the
          exciting fx get cut off left/right. */}
      <div className="no-sb" style={{ height: "calc(100dvh - 270px)", overflowY: "auto", overflowX: "hidden", padding: "16px 28px" }}>{body}</div>
    </div>
  );
};

export default DatesView;
