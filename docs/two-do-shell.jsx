import { useState, useEffect, useRef } from "react";

const TABS = ["Dates", "Cards", "Lists", "Two Cents"];

const PLACEHOLDERS = [
  "The Grown-Up is ready for your chaos…",
  "Spill. I'll sort it.",
  "Say it, dump it, done.",
  "What have you two forgotten now?",
  "Type it before you forget. Again.",
  "Go on, give me the whole mess.",
  "I'm the organised one, remember?",
  "Your brain called. It wants a refund.",
  "Two heads, one braincell. Go.",
  "Adulting is hard. I'll help.",
];

const COLORS = {
  bg: "#1B2B2B",
  surface: "#233535",
  surfaceLight: "#2C4040",
  accent: "#E8896B",
  accentGlow: "#F4A88E",
  accentMuted: "rgba(232,137,107,0.15)",
  textPrimary: "#EDE9E3",
  textSecondary: "#8A9B95",
  textMuted: "#5F706A",
  laneMe: "#6BB5E8",
  laneYou: "#B98CE8",
  laneUs: "#7A8E88",
};

const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
if (!document.querySelector('link[href*="Fraunces"]')) {
  document.head.appendChild(fontLink);
}

const LaneBadge = ({ lane }) => {
  const colors = { Me: COLORS.laneMe, You: COLORS.laneYou, Us: COLORS.laneUs };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        color: COLORS.bg,
        background: colors[lane] || COLORS.laneUs,
        letterSpacing: 0.3,
      }}
    >
      {lane}
    </span>
  );
};

const SleepsChip = ({ days }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: 8,
      fontSize: 10,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 500,
      color: COLORS.accent,
      background: COLORS.accentMuted,
      marginLeft: 6,
    }}
  >
    {days} sleeps
  </span>
);

const ProgressBar = ({ done, total }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    }}
  >
    <div
      style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        background: COLORS.surfaceLight,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${(done / total) * 100}%`,
          height: "100%",
          borderRadius: 2,
          background: COLORS.accent,
          transition: "width 0.3s ease",
        }}
      />
    </div>
    <span
      style={{
        fontSize: 10,
        color: COLORS.textMuted,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {done}/{total}
    </span>
  </div>
);

const CardBody = ({ title, lane, due, subtasks, exciting, emoji, sleeps }) => (
  <div
    style={{
      background: COLORS.surface,
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 10,
      border: exciting
        ? `1.5px solid ${COLORS.accentGlow}`
        : `1px solid ${COLORS.surfaceLight}`,
      boxShadow: exciting ? `0 0 16px ${COLORS.accentMuted}` : "none",
      transition: "transform 0.15s ease",
      cursor: "pointer",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {exciting && emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: COLORS.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LaneBadge lane={lane} />
          {due && (
            <span
              style={{
                fontSize: 11,
                color: COLORS.textSecondary,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {due}
            </span>
          )}
          {sleeps && <SleepsChip days={sleeps} />}
        </div>
      </div>
    </div>
    {subtasks && <ProgressBar done={subtasks.done} total={subtasks.total} />}
  </div>
);

const EventRow = ({ e, showDay, days }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      background: e.exciting ? COLORS.accentMuted : COLORS.surface,
      border: e.exciting ? `1px solid ${COLORS.accentGlow}40` : `1px solid transparent`,
      cursor: "pointer",
    }}
  >
    <div style={{ minWidth: 44, fontFamily: "'DM Sans', sans-serif" }}>
      {showDay && <div style={{ fontSize: 10, color: COLORS.textMuted }}>{days[e.day]}</div>}
      <div style={{ fontSize: 13, fontWeight: 500, color: e.exciting ? COLORS.accent : COLORS.textSecondary }}>
        {e.time}
      </div>
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: e.exciting ? 500 : 400,
          color: COLORS.textPrimary,
          marginBottom: 4,
        }}
      >
        {e.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <LaneBadge lane={e.lane} />
        {e.sleeps && <SleepsChip days={e.sleeps} />}
      </div>
    </div>
  </div>
);

const DatesView = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = [16, 17, 18, 19, 20, 21, 22];
  const [selectedDay, setSelectedDay] = useState(0);
  const [viewMode, setViewMode] = useState("week");
  const [quickAdd, setQuickAdd] = useState(null); // { dayIdx } when long-press triggered
  const [quickAddText, setQuickAddText] = useState("");
  const longPressTimer = useRef(null);
  const viewModes = ["Day", "Week", "Month"];

  const handleLongPressStart = (dayIdx) => {
    longPressTimer.current = setTimeout(() => {
      setQuickAdd({ dayIdx });
      setQuickAddText("");
    }, 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const events = [
    { day: 0, title: "Standup", lane: "Us", time: "9:00", routine: true },
    { day: 0, title: "Dentist", lane: "Me", time: "14:30", routine: true },
    { day: 1, title: "Post office", lane: "You", time: "AM", routine: true },
    { day: 2, title: "Date night 🍷", lane: "Us", time: "19:00", exciting: true },
    { day: 3, title: "Bins out", lane: "You", time: "AM", routine: true },
    { day: 4, title: "Pay council tax", lane: "Us", time: "All day", routine: true },
    { day: 5, title: "The gig 🎸", lane: "Us", time: "20:00", exciting: true, sleeps: 5 },
    { day: 6, title: "Meal prep", lane: "Us", time: "11:00", routine: true },
  ];

  const dayEvents = events.filter((e) => e.day === selectedDay);

  // Month grid data
  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const startOffset = 0; // June 2026 starts on Monday

  return (
    <div style={{ padding: "0 16px" }}>
      {/* View mode toggle + month label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.textSecondary }}>
          June 2026
        </span>
        <div
          style={{
            display: "flex",
            background: COLORS.surface,
            borderRadius: 10,
            padding: 2,
          }}
        >
          {viewModes.map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m.toLowerCase())}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                background: viewMode === m.toLowerCase() ? COLORS.surfaceLight : "transparent",
                color: viewMode === m.toLowerCase() ? COLORS.textPrimary : COLORS.textMuted,
                transition: "all 0.2s ease",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ===== DAY VIEW ===== */}
      {viewMode === "day" && (
        <>
          {/* Week strip for day selection */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {days.map((d, i) => {
              const isToday = i === 0;
              const isSelected = i === selectedDay;
              const hasExciting = events.some((e) => e.day === i && e.exciting);
              const hasEvents = events.some((e) => e.day === i);
              return (
                <div
                  key={d}
                  onClick={() => setSelectedDay(i)}
                  style={{
                    textAlign: "center",
                    padding: "8px 0 6px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: isSelected ? COLORS.surfaceLight : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ fontSize: 9, color: isSelected ? COLORS.textPrimary : COLORS.textMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
                  <div style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isToday ? 600 : 400, color: isToday ? COLORS.bg : COLORS.textPrimary, background: isToday ? COLORS.accent : "transparent" }}>{dates[i]}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 4, minHeight: 5 }}>
                    {hasExciting && <div style={{ width: 5, height: 5, borderRadius: 3, background: COLORS.accent }} />}
                    {hasEvents && !hasExciting && <div style={{ width: 5, height: 5, borderRadius: 3, background: COLORS.textMuted }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: COLORS.surfaceLight, margin: "8px 0 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 400, color: COLORS.textPrimary }}>
              {days[selectedDay]} {dates[selectedDay]} June
            </span>
            {selectedDay === 0 && <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>Today</span>}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
            onTouchStart={() => handleLongPressStart(selectedDay)}
            onTouchEnd={handleLongPressEnd}
            onMouseDown={() => handleLongPressStart(selectedDay)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
          >
            {dayEvents.map((e, i) => <EventRow key={i} e={e} days={days} />)}
            {dayEvents.length === 0 && (
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontStyle: "italic", color: COLORS.textMuted, textAlign: "center", padding: "40px 20px" }}>
                Nothing on {days[selectedDay]}. Bliss or denial — you decide.
              </p>
            )}
          </div>
        </>
      )}

      {/* ===== WEEK VIEW (default) ===== */}
      {viewMode === "week" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {days.map((d, i) => {
            const isToday = i === 0;
            const dayEvts = events.filter((e) => e.day === i);
            return (
              <div
                key={d}
                onTouchStart={() => handleLongPressStart(i)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(i)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, marginTop: i > 0 ? 10 : 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? COLORS.bg : COLORS.textPrimary,
                      background: isToday ? COLORS.accent : COLORS.surfaceLight,
                    }}
                  >
                    {dates[i]}
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: isToday ? COLORS.accent : COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {d}{isToday ? " · Today" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 40 }}>
                  {dayEvts.length > 0 ? dayEvts.map((e, j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: e.exciting ? COLORS.accentMuted : COLORS.surface,
                        border: e.exciting ? `1px solid ${COLORS.accentGlow}40` : `1px solid transparent`,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: e.exciting ? COLORS.accent : COLORS.textMuted, minWidth: 38 }}>
                        {e.time}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: e.exciting ? 500 : 400, color: COLORS.textPrimary }}>
                        {e.title}
                      </span>
                      <LaneBadge lane={e.lane} />
                      {e.sleeps && <SleepsChip days={e.sleeps} />}
                    </div>
                  )) : (
                    <div style={{ padding: "4px 0", fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted, fontStyle: "italic" }}>
                      Nothing yet — hold to add
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MONTH VIEW ===== */}
      {viewMode === "month" && (
        <>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {days.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>
          {/* Month grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {monthDays.map((date) => {
              const isToday = date === 16;
              const dayOfWeek = (date - 1) % 7; // 0=Mon for June 2026
              const isThisWeek = date >= 16 && date <= 22;
              const dayIdx = date - 16;
              const hasExciting = isThisWeek && events.some((e) => e.day === dayIdx);
              const hasEvents = isThisWeek && events.some((e) => e.day === dayIdx);
              const isSelected = selectedDay === date;
              return (
                <div
                  key={date}
                  onClick={() => {
                    setSelectedDay(date);
                    setViewMode("day");
                  }}
                  style={{
                    textAlign: "center",
                    padding: "8px 0",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isSelected ? COLORS.surfaceLight : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontSize: 12,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? COLORS.bg : COLORS.textPrimary,
                      background: isToday ? COLORS.accent : "transparent",
                    }}
                  >
                    {date}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3, minHeight: 5 }}>
                    {hasExciting && <div style={{ width: 4, height: 4, borderRadius: 2, background: COLORS.accent }} />}
                    {hasEvents && !hasExciting && <div style={{ width: 4, height: 4, borderRadius: 2, background: COLORS.textMuted }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Quick-add overlay (triggered by long press) */}
      {quickAdd && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 14,
            background: COLORS.surface,
            border: `1.5px solid ${COLORS.accent}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, color: COLORS.textPrimary }}>
              Quick add to {days[quickAdd.dayIdx]} {dates[quickAdd.dayIdx]} June
            </span>
            <button
              onClick={() => setQuickAdd(null)}
              style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 16, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="Event name…"
              autoFocus
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${COLORS.surfaceLight}`,
                background: COLORS.bg,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: COLORS.textPrimary,
                outline: "none",
                caretColor: COLORS.accent,
              }}
            />
            <button
              onClick={() => setQuickAdd(null)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: quickAddText ? COLORS.accent : COLORS.surfaceLight,
                color: quickAddText ? COLORS.bg : COLORS.textMuted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                cursor: quickAddText ? "pointer" : "default",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CardsView = () => {
  const [activeCol, setActiveCol] = useState(0);
  const columns = [
    {
      name: "Today",
      cards: [
        { title: "Book dentist appointment", lane: "Me", due: "Today", subtasks: null },
        { title: "Pick up cat food", lane: "Us", due: "Today", subtasks: null },
        {
          title: "File tax return",
          lane: "Us",
          due: "Tomorrow",
          subtasks: { done: 2, total: 5 },
        },
      ],
    },
    {
      name: "Soon",
      cards: [
        { title: "Anniversary dinner 💕", lane: "Us", due: "In 12 days", exciting: true, emoji: "💕", sleeps: 12 },
        { title: "Fix bathroom tap", lane: "You", due: "This week", subtasks: null },
        { title: "Council tax $180", lane: "Us", due: "Fri", subtasks: null },
      ],
    },
    {
      name: "Someday",
      cards: [
        { title: "Learn to make sourdough", lane: "Me" },
        { title: "Sort out the garage", lane: "Us" },
        { title: "Japan trip research 🇯🇵", lane: "Us", exciting: true, emoji: "🇯🇵" },
      ],
    },
    {
      name: "Done ✓",
      cards: [
        { title: "Renew car insurance", lane: "Me" },
        { title: "Buy bin bags", lane: "Us" },
      ],
    },
  ];

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Column selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {columns.map((col, i) => (
          <button
            key={col.name}
            onClick={() => setActiveCol(i)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: i === activeCol ? COLORS.surfaceLight : "transparent",
              color: i === activeCol ? COLORS.textPrimary : COLORS.textSecondary,
              transition: "all 0.2s ease",
            }}
          >
            {col.name}{" "}
            <span style={{ opacity: 0.5 }}>{col.cards.length}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div>
        {columns[activeCol].cards.map((card, i) => (
          <CardBody key={i} {...card} />
        ))}
        {columns[activeCol].cards.length === 0 && (
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 14,
              fontStyle: "italic",
              color: COLORS.textMuted,
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            Nothing here. Suspicious.
          </p>
        )}
      </div>
    </div>
  );
};

const StoreBadge = ({ store }) => {
  if (!store) return null;
  const storeColors = {
    "No Frills": "#FFB300",
    "Grace Meat": "#E57373",
    "Metro": "#1E88E5",
    "Home Depot": "#F57C00",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 8,
        fontSize: 10,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        color: storeColors[store] || COLORS.textSecondary,
        background: `${storeColors[store] || COLORS.textMuted}20`,
        letterSpacing: 0.2,
      }}
    >
      {store}
    </span>
  );
};

const ListsView = () => {
  const [activeList, setActiveList] = useState(0);
  const [checked, setChecked] = useState({});
  const [storeFilter, setStoreFilter] = useState("All");

  const lists = [
    {
      name: "🛒 Groceries",
      hasStores: true,
      items: [
        { name: "Cat food", lane: "Us", qty: "x2", store: "No Frills" },
        { name: "Bin bags", lane: "Us", store: "No Frills" },
        { name: "Oat milk", lane: "Me", store: "No Frills" },
        { name: "Sourdough bread", lane: "Us", store: "No Frills" },
        { name: "Chicken thighs", lane: "Us", qty: "500g", store: "Grace Meat" },
        { name: "Lamb mince", lane: "Us", qty: "400g", store: "Grace Meat" },
        { name: "That nice cheese", lane: "You", store: "Metro" },
        { name: "Honey", lane: "Us", store: "Metro" },
        { name: "Eggs", lane: "Us", qty: "x12", store: "Metro" },
      ],
    },
    {
      name: "🏠 House",
      hasStores: true,
      items: [
        { name: "Bathroom sealant", lane: "You", store: "Home Depot" },
        { name: "Light bulbs (bayonet)", lane: "Us", qty: "x4", store: "Home Depot" },
        { name: "Picture hooks", lane: "Me", store: "Home Depot" },
      ],
    },
    {
      name: "🤔 Keep forgetting",
      hasStores: false,
      items: [
        { name: "Return library books", lane: "Me" },
        { name: "Cancel old gym membership", lane: "You" },
      ],
    },
  ];

  const toggleCheck = (listIdx, itemIdx) => {
    const key = `${listIdx}-${itemIdx}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentList = lists[activeList];
  const stores = currentList.hasStores
    ? ["All", ...Array.from(new Set(currentList.items.map((i) => i.store).filter(Boolean)))]
    : null;

  const filteredItems = currentList.items.filter(
    (item) => storeFilter === "All" || item.store === storeFilter
  );
  const unchecked = filteredItems.filter((item) => {
    const idx = currentList.items.indexOf(item);
    return !checked[`${activeList}-${idx}`];
  });
  const checkedItems = filteredItems.filter((item) => {
    const idx = currentList.items.indexOf(item);
    return checked[`${activeList}-${idx}`];
  });

  // Group unchecked by store
  const grouped = {};
  if (currentList.hasStores && storeFilter === "All") {
    unchecked.forEach((item) => {
      const s = item.store || "Other";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    });
  }
  const useGrouped = currentList.hasStores && storeFilter === "All" && Object.keys(grouped).length > 0;

  const renderItem = (item) => {
    const originalIdx = currentList.items.indexOf(item);
    return (
      <div
        key={originalIdx}
        onClick={() => toggleCheck(activeList, originalIdx)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: COLORS.surface,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${COLORS.textMuted}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: COLORS.textPrimary,
          }}
        >
          {item.name}
          {item.qty && (
            <span style={{ color: COLORS.textMuted, marginLeft: 6, fontSize: 12 }}>
              {item.qty}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {item.store && storeFilter !== item.store && <StoreBadge store={item.store} />}
          <LaneBadge lane={item.lane} />
        </div>
      </div>
    );
  };

  const [newItemText, setNewItemText] = useState("");

  return (
    <div style={{ padding: "0 16px" }}>
      {/* List tabs + new list button */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", alignItems: "center" }}>
        {lists.map((list, i) => (
          <button
            key={list.name}
            onClick={() => { setActiveList(i); setStoreFilter("All"); }}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: i === activeList ? COLORS.surfaceLight : "transparent",
              color: i === activeList ? COLORS.textPrimary : COLORS.textSecondary,
              transition: "all 0.2s ease",
            }}
          >
            {list.name}
          </button>
        ))}
        <button
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            border: "none",
            background: COLORS.accent,
            color: COLORS.bg,
            fontSize: 16,
            fontWeight: 300,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          title="New list"
        >
          +
        </button>
      </div>

      {/* Store filter chips (only for lists with stores) */}
      {stores && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto" }}>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                border: storeFilter === s ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}`,
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: storeFilter === s ? COLORS.accentMuted : "transparent",
                color: storeFilter === s ? COLORS.accent : COLORS.textMuted,
                transition: "all 0.2s ease",
              }}
            >
              {s === "All" ? "All stores" : s}
            </button>
          ))}
        </div>
      )}

      {/* Quick add item */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          background: COLORS.surface,
          marginBottom: 8,
          border: `1px dashed ${COLORS.surfaceLight}`,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${COLORS.textMuted}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: COLORS.accent,
            fontSize: 14,
            fontWeight: 300,
          }}
        >
          +
        </div>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add item…"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: COLORS.textPrimary,
            caretColor: COLORS.accent,
          }}
        />
        {newItemText && (
          <button
            onClick={() => setNewItemText("")}
            style={{
              background: COLORS.accent,
              border: "none",
              borderRadius: 12,
              padding: "4px 12px",
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              color: COLORS.bg,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        )}
      </div>

      {/* Items — grouped or flat */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {useGrouped
          ? Object.entries(grouped).map(([store, items]) => (
              <div key={store}>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    padding: "10px 14px 4px",
                  }}
                >
                  {store}
                </div>
                {items.map(renderItem)}
              </div>
            ))
          : unchecked.map(renderItem)}

        {checkedItems.length > 0 && (
          <div style={{ marginTop: 12, opacity: 0.4 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'DM Sans', sans-serif",
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 6,
                paddingLeft: 14,
              }}
            >
              Done
            </div>
            {checkedItems.map((item) => {
              const originalIdx = currentList.items.indexOf(item);
              return (
                <div
                  key={originalIdx}
                  onClick={() => toggleCheck(activeList, originalIdx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: COLORS.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 13,
                      color: COLORS.bg,
                    }}
                  >
                    ✓
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: COLORS.textMuted,
                      textDecoration: "line-through",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {unchecked.length === 0 && checkedItems.length === 0 && (
        <p
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 14,
            fontStyle: "italic",
            color: COLORS.textMuted,
            textAlign: "center",
            padding: "40px 20px",
          }}
        >
          The list is empty. The fridge probably isn't. Or is it.
        </p>
      )}
    </div>
  );
};

const TwoCentsView = () => {
  const bills = [
    { name: "Rent", amount: "$1,200", freq: "Monthly", due: "1st Jul" },
    { name: "Council tax", amount: "$180", freq: "Monthly", due: "28th Jun" },
    { name: "Netflix", amount: "$10.99", freq: "Monthly", due: "3rd Jul" },
    { name: "Electricity", amount: "~$85", freq: "Monthly", due: "15th Jul" },
  ];

  const goals = [
    { name: "Japan 2027 🇯🇵", target: 4000, saved: 1240, emoji: "🇯🇵" },
    { name: "New sofa", target: 800, saved: 350, emoji: "🛋️" },
  ];

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Balance */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: COLORS.surface,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Owe Snap
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 400,
            color: COLORS.textPrimary,
            marginBottom: 4,
          }}
        >
          You owe $12.50
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textMuted,
          }}
        >
          from last week's groceries
        </div>
      </div>

      {/* Bills */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Monthly outgoings
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bills.map((bill, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: COLORS.surface,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}
                >
                  {bill.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 2,
                  }}
                >
                  {bill.freq} · due {bill.due}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.textPrimary,
                }}
              >
                {bill.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Fund & Games
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {goals.map((goal, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: COLORS.surface,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}
                >
                  {goal.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ${goal.saved} / ${goal.target.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: COLORS.surfaceLight,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(goal.saved / goal.target) * 100}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentGlow})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function TwoDoShell() {
  const [activeTab, setActiveTab] = useState(0);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [slideDir, setSlideDir] = useState(0);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const prevTab = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleTabSwitch = (i) => {
    setSlideDir(i > prevTab.current ? 1 : -1);
    prevTab.current = i;
    setActiveTab(i);
  };

  const views = [
    <DatesView key="dates" />,
    <CardsView key="cards" />,
    <ListsView key="lists" />,
    <TwoCentsView key="twocents" />,
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top chip tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px 10px",
          borderBottom: `1px solid ${COLORS.surfaceLight}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 18,
            fontWeight: 500,
            color: COLORS.textPrimary,
            letterSpacing: -0.3,
            flexShrink: 0,
          }}
        >
          Two-Do
        </span>
        <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-end" }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(i)}
            style={{
              padding: "7px 12px",
              borderRadius: 20,
              border: i === activeTab ? "none" : `1px solid ${COLORS.surfaceLight}`,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              background: i === activeTab ? COLORS.accent : "transparent",
              color: i === activeTab ? COLORS.bg : COLORS.textSecondary,
              transition: "all 0.25s ease",
              letterSpacing: 0.2,
            }}
          >
            {tab}
          </button>
        ))}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        {views[activeTab]}
      </div>

      {/* Add sheet overlay */}
      {showAddSheet && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={() => setShowAddSheet(false)}
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.4)",
            }}
          />
          <div
            style={{
              background: COLORS.bg,
              borderTop: `1px solid ${COLORS.surfaceLight}`,
              borderRadius: "20px 20px 0 0",
              padding: "20px 20px 28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.textPrimary }}>
                Add new…
              </span>
              <button
                onClick={() => setShowAddSheet(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.textMuted,
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { icon: "📅", label: "Event", desc: "Add to Dates" },
                { icon: "🃏", label: "Task", desc: "Add to Cards" },
                { icon: "🛒", label: "Shopping item", desc: "Add to a list" },
                { icon: "💰", label: "Expense", desc: "Add to Two Cents" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setShowAddSheet(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: COLORS.surface,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB - Add button */}
      <div style={{ position: "absolute", right: 20, bottom: 82, zIndex: 5 }}>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: COLORS.accent,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 300,
            color: COLORS.bg,
            boxShadow: `0 4px 16px rgba(232,137,107,0.35)`,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          +
        </button>
      </div>

      {/* Bottom input bar */}
      <div
        style={{
          padding: "10px 16px 14px",
          borderTop: `1px solid ${COLORS.surfaceLight}`,
          background: COLORS.bg,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: COLORS.surface,
            borderRadius: 24,
            padding: "10px 14px",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: COLORS.textMuted,
              padding: 0,
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Voice input"
          >
            🎙️
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: COLORS.textPrimary,
              caretColor: COLORS.accent,
            }}
          />
          <button
            style={{
              background: inputValue ? COLORS.accent : COLORS.surfaceLight,
              border: "none",
              width: 30,
              height: 30,
              borderRadius: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputValue ? "pointer" : "default",
              transition: "background 0.2s ease",
              flexShrink: 0,
              fontSize: 14,
              color: inputValue ? COLORS.bg : COLORS.textMuted,
            }}
          >
            ↑
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 6,
            fontSize: 10,
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            color: COLORS.textMuted,
            letterSpacing: 0.3,
          }}
        >
          The Grown-Up
        </div>
      </div>
    </div>
  );
}
