import { useEffect, useState, useRef } from "react";
import { COLORS, excitingStyle } from "./theme";
import { parseBrainDump, TYPE_LABEL } from "./lib/parser.js";
import { laneLabel, laneColor } from "./lib/lanes.js";
import { createItem, getParserContext, findOrCreateList } from "./lib/data.js";

// Full-screen confirm-before-file tray. Parses the dump, shows editable-ish
// draft cards, and only writes what you accept.
export default function ReviewTray({ text, ctx, onClose, onFiled }) {
  const [drafts, setDrafts] = useState(null); // null = parsing
  const [filedCount, setFiledCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Give the parser the space's lists/columns/stores so it routes into what
      // already exists. Best-effort — parse still runs if this fails.
      let parserContext;
      try { parserContext = await getParserContext(); } catch { /* no-context */ }
      const d = await parseBrainDump(text, { ...(ctx || {}), parserContext });
      if (alive) setDrafts(d.map((x, i) => ({ ...x, _id: `d${i}`, status: "pending" })));
    })();
    return () => {
      alive = false;
    };
  }, [text]);

  const pending = (drafts || []).filter((d) => d.status === "pending");

  async function accept(draft) {
    // A shopping draft that named a list files into it (creating it if new),
    // so it lands in Lists instead of vanishing — closes the old listName drop.
    let list_id = null;
    if (draft.type === "shopping" && draft.listName && ctx?.space?.id) {
      try { list_id = (await findOrCreateList(ctx.space.id, draft.listName))?.id ?? null; } catch { /* skip */ }
    }
    await createItem({
      space_id: ctx?.space?.id,
      type: draft.type,
      title: draft.title,
      lane: draft.lane,
      kind: draft.kind,
      emoji: draft.emoji || null,
      due_at: draft.due_at || null,
      amount: draft.amount ?? null,
      list_id,
      persistent_until_done: draft.persistent || false,
      created_by: ctx?.people?.[ctx.viewerSlot]?.id ?? null,
    });
    setFiledCount((n) => n + 1);
    setDrafts((ds) => ds.map((d) => (d._id === draft._id ? { ...d, status: "accepted" } : d)));
  }

  function dismiss(draft) {
    setDrafts((ds) => ds.map((d) => (d._id === draft._id ? { ...d, status: "dismissed" } : d)));
  }

  async function acceptAll() {
    for (const d of pending) await accept(d);
  }

  function finish() {
    if (filedCount > 0) onFiled?.();
    onClose();
  }

  const allResolved = drafts && pending.length === 0;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 10px", borderBottom: `1px solid ${COLORS.surfaceLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.textPrimary }}>The Grown-Up</span>
        <button onClick={finish} style={iconBtn}>✕</button>
      </div>

      {/* The Grown-Up's voice */}
      <div style={{ padding: "16px 20px 6px" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontStyle: "italic", color: COLORS.textSecondary, lineHeight: 1.4, margin: 0 }}>
          {drafts == null
            ? "Right, let me look at this…"
            : allResolved
            ? filedCount > 0
              ? `Filed ${filedCount}. You're welcome.`
              : "Nothing kept. Bold choice."
            : `I found ${pending.length}. Sort them out.`}
        </p>
      </div>

      {/* Drafts */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 20px" }}>
        {drafts == null ? null : pending.map((d) => (
          <DraftCard key={d._id} draft={d} ctx={ctx} onAccept={() => accept(d)} onDismiss={() => dismiss(d)} />
        ))}

        {allResolved && (
          <button onClick={finish} style={{ ...primaryBtn, width: "100%", marginTop: 8 }}>Done</button>
        )}
      </div>

      {/* Accept-all shortcut */}
      {pending.length > 1 && (
        <div style={{ padding: "12px 16px 18px", borderTop: `1px solid ${COLORS.surfaceLight}` }}>
          <button onClick={acceptAll} style={{ ...primaryBtn, width: "100%" }}>Accept all {pending.length}</button>
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft, ctx, onAccept, onDismiss }) {
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const exciting = draft.kind === "exciting";
  const label = ctx ? laneLabel(draft.lane, ctx.viewerSlot, ctx.space) : draft.lane;
  const color = ctx ? laneColor(draft.lane, ctx.people, COLORS) : COLORS.laneUs;
  const nodeColor = draft.color || color;
  // Match the live exciting treatment (node-coloured glow), not a fixed coral.
  const ex = exciting ? excitingStyle(undefined, nodeColor) : null;

  function onDown(e) { start.current = e.clientX; }
  function onMove(e) { if (start.current != null) setDx(e.clientX - start.current); }
  function onUp() {
    if (dx > 90) onAccept();
    else if (dx < -90) onDismiss();
    setDx(0);
    start.current = null;
  }

  const hint = dx > 40 ? "Accept →" : dx < -40 ? "← Dismiss" : null;

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      {hint && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: dx > 0 ? "flex-start" : "flex-end", padding: "0 18px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.accent }}>{hint}</div>
      )}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{
          position: "relative",
          background: COLORS.surface,
          borderRadius: 14,
          padding: "14px 16px",
          border: ex ? ex.border : `1px solid ${COLORS.surfaceLight}`,
          boxShadow: ex ? ex.boxShadow : "none",
          transform: `translateX(${dx}px)`,
          transition: start.current == null ? "transform 0.2s ease" : "none",
          touchAction: "pan-y",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {exciting && draft.emoji && <span style={{ fontSize: 16 }}>{draft.emoji}</span>}
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, flex: 1 }}>{draft.title}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{TYPE_LABEL[draft.type]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: COLORS.bg, background: color, letterSpacing: 0.3 }}>{label}</span>
          {draft.due_at && <span style={meta}>{fmtDue(draft.due_at)}</span>}
          {draft.amount != null && <span style={meta}>${draft.amount}</span>}
          {draft.listName && <span style={meta}>{draft.listName}</span>}
          <div style={{ flex: 1 }} />
          <button onClick={onDismiss} style={ghostBtn} title="Dismiss">✕</button>
          <button onClick={onAccept} style={acceptBtn} title="Accept">✓</button>
        </div>
      </div>
    </div>
  );
}

// The remote parser returns ISO-8601 due dates; the stub returns raw phrases
// ("saturday"). Render an ISO value as a friendly date, anything else verbatim.
function fmtDue(due) {
  const d = new Date(due);
  if (isNaN(d.getTime())) return due;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const t = d.getHours() || d.getMinutes() ? ` ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}` : "";
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}${t}`;
}

const meta = { fontSize: 11, color: COLORS.textSecondary, fontFamily: "'DM Sans', sans-serif" };
const iconBtn = { background: "none", border: "none", color: COLORS.textMuted, fontSize: 18, cursor: "pointer" };
const ghostBtn = { width: 28, height: 28, borderRadius: 14, border: `1px solid ${COLORS.surfaceLight}`, background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontSize: 12 };
const acceptBtn = { width: 28, height: 28, borderRadius: 14, border: "none", background: COLORS.accent, color: COLORS.bg, cursor: "pointer", fontSize: 13 };
const primaryBtn = { padding: "12px 16px", borderRadius: 14, border: "none", background: COLORS.accent, color: COLORS.bg, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" };
