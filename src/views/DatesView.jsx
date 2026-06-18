import { useState, useEffect, useRef } from "react";
import { COLORS } from "../theme";
import { LaneBadge, SleepsChip } from "../components/primitives.jsx";
import { getBootstrap, listCalendar } from "../lib/data.js";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor, SLOTS } from "../lib/lanes.js";

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

const Chevron = ({ dir }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === "left" ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
  </svg>
);

const sideArrow = { flexShrink: 0, alignSelf: "center", width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.green}`, background: COLORS.greenMuted, cursor: "pointer", padding: 0 };
const emptyMsg = { fontFamily: "'Fraunces', serif", fontSize: 14, fontStyle: "italic", color: COLORS.textMuted, textAlign: "center", padding: "40px 20px" };
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

const DatesView = ({ isDesktop, onOpenItem, laneFilter = "all" }) => {
  const [ref, setRef] = useState(() => new Date());
  const [mode, setMode] = useState("week");
  const [ctx, setCtx] = useState(null);
  const [events, setEvents] = useState([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const monthScrollRef = useRef(null);

  useEffect(() => {
    Promise.all([getBootstrap(), listCalendar()]).then(([b, ev]) => { setCtx(b); setEvents(ev); });
  }, []);

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
  const eventsOn = (day) => events.filter((e) => passesFilter(e) && sameDay(eventDate(e), day)).sort((a, b) => eventDate(a) - eventDate(b));

  const Event = ({ e }) => {
    const exciting = e.kind === "exciting";
    const d = eventDate(e);
    const label = ctx ? resolveLaneLabel(e.lane, viewer, ctx.space) : e.lane;
    const color = ctx ? resolveLaneColor(e.lane, ctx.people, COLORS) : COLORS.laneUs;
    const s = sleepsUntil(d);
    return (
      <div onClick={() => onOpenItem?.(e)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 6, cursor: "pointer", background: exciting ? COLORS.accentMuted : COLORS.surface, border: exciting ? `1px solid ${COLORS.accentGlow}40` : "1px solid transparent" }}>
        <span style={{ minWidth: 42, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: exciting ? COLORS.accent : COLORS.textMuted }}>{fmtTime(d)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {exciting && e.emoji && <span style={{ fontSize: 14 }}>{e.emoji}</span>}
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: exciting ? 500 : 400, color: COLORS.textPrimary }}>{e.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LaneBadge label={label} color={color} />
            {e.countdown && s > 0 && <SleepsChip days={s} />}
          </div>
        </div>
      </div>
    );
  };

  const weekStart = startOfWeek(ref);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const headerLabel =
    mode === "week" ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`
    : mode === "day" ? `${ref.getDate()} ${MONTHS[ref.getMonth()].slice(0, 3)} ${ref.getFullYear()}`
    : `${MONTHS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: COLORS.textSecondary }}>{headerLabel}</span>
      <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 2 }}>
        {["Day", "Week", "Month"].map((m) => (
          <button key={m} onClick={() => setMode(m.toLowerCase())} style={{ padding: "4px 12px", borderRadius: 8, border: "none", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", background: mode === m.toLowerCase() ? COLORS.surfaceLight : "transparent", color: mode === m.toLowerCase() ? COLORS.textPrimary : COLORS.textMuted }}>{m}</button>
        ))}
      </div>
    </div>
  );

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
              onOpenItem={onOpenItem}
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        {weekDays.map((day, i) => {
          const evs = eventsOn(day);
          return (
            <div key={i} style={{ borderTop: i > 0 ? `1px solid ${COLORS.surfaceLight}` : "none", padding: i > 0 ? "12px 0 4px" : "0 0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : COLORS.surfaceLight }}>{day.getDate()}</div>
                <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: isToday(day) ? COLORS.accent : COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>{DOW[i]}{isToday(day) ? " · Today" : ""}</span>
              </div>
              <div style={{ marginLeft: 40 }}>
                {evs.length ? evs.map((e) => <Event key={e.id} e={e} />) : <div style={{ padding: "2px 0 4px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted, fontStyle: "italic" }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const evs = eventsOn(ref);
    body = (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 16 }}>
          {weekDays.map((day, i) => (
            <button key={i} onClick={() => setRef(day)} style={{ textAlign: "center", padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer", background: sameDay(day, ref) ? COLORS.surfaceLight : "transparent" }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase" }}>{DOW[i]}</div>
              <div style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday(day) ? 600 : 400, color: isToday(day) ? COLORS.bg : COLORS.textPrimary, background: isToday(day) ? COLORS.accent : "transparent" }}>{day.getDate()}</div>
              <div style={{ minHeight: 6, marginTop: 3 }}>{eventsOn(day).length > 0 && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: COLORS.textMuted }} />}</div>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: COLORS.textPrimary, marginBottom: 12 }}>{DOW[(ref.getDay() + 6) % 7]} {ref.getDate()} {MONTHS[ref.getMonth()].slice(0, 3)}{isToday(ref) ? " · Today" : ""}</div>
        {evs.length ? evs.map((e) => <Event key={e.id} e={e} />) : <p style={emptyMsg}>Nothing on this day. Bliss or denial — you decide.</p>}
      </>
    );
  }

  return (
    <div style={{ padding: "0 8px" }}>
      {header}
      <div style={{ display: "flex", alignItems: "center", gap: 6, height: "calc(100dvh - 270px)" }}>
        <button onClick={() => step(-1)} style={sideArrow} title="Previous"><Chevron dir="left" /></button>
        <div className="no-sb" style={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto", paddingRight: 2 }}>{body}</div>
        <button onClick={() => step(1)} style={sideArrow} title="Next"><Chevron dir="right" /></button>
      </div>
    </div>
  );
};

export default DatesView;
