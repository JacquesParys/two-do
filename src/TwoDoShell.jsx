import { useState, useEffect, useRef } from "react";
import { COLORS, ensureFonts } from "./theme";
import { getBootstrap } from "./lib/data.js";
import { signOut } from "./lib/auth.js";
import { isMockMode } from "./lib/supabase.js";
import ReviewTray from "./ReviewTray.jsx";
import ItemDetail from "./ItemDetail.jsx";
import LaneFilter from "./components/LaneFilter.jsx";
import DatesView from "./views/DatesView.jsx";
import CardsView from "./views/CardsView.jsx";
import ListsView from "./views/ListsView.jsx";
import TwoCentsView from "./views/TwoCentsView.jsx";

ensureFonts();

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

ensureFonts();

// Backward-compatible: pass `lane` (display string "Me"/"You"/"Us") for the
// still-mock views, OR pass resolved `label` + `color` (from the lane resolver)
// for data-driven views.

function useIsDesktop() {
  const query = "(min-width: 760px)";
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export default function TwoDoShell() {
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState(0);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [trayText, setTrayText] = useState(null); // open review tray when set
  const [trayKey, setTrayKey] = useState(0);
  const [ctx, setCtx] = useState(null);
  const [dataVersion, setDataVersion] = useState(0); // bump to force a reload
  const [editing, setEditing] = useState(null); // open ItemDetail when set
  const [laneFilter, setLaneFilter] = useState("all");
  const prevTab = useRef(0);

  const startNew = (type) => {
    const tmpl = { type, lane: "shared", kind: "routine" };
    if (type === "event") tmpl.start_at = new Date().toISOString();
    setEditing(tmpl);
  };

  useEffect(() => {
    getBootstrap().then(setCtx);
  }, []);

  const submitDump = () => {
    const text = inputValue.trim();
    if (!text) return;
    setTrayText(text);
    setTrayKey((k) => k + 1);
    setInputValue("");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleTabSwitch = (i) => {
    prevTab.current = i;
    setActiveTab(i);
  };

  const bump = () => setDataVersion((v) => v + 1);
  const views = [
    <DatesView key="dates" isDesktop={isDesktop} onOpenItem={setEditing} laneFilter={laneFilter} dataVersion={dataVersion} />,
    <CardsView key="cards" isDesktop={isDesktop} onOpenItem={setEditing} onChanged={bump} laneFilter={laneFilter} dataVersion={dataVersion} />,
    <ListsView key="lists" isDesktop={isDesktop} onOpenItem={setEditing} onChanged={bump} laneFilter={laneFilter} dataVersion={dataVersion} />,
    <TwoCentsView key="twocents" isDesktop={isDesktop} dataVersion={dataVersion} />,
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isDesktop ? 1100 : 430,
        margin: "0 auto",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
        borderLeft: isDesktop ? `1px solid ${COLORS.surfaceLight}` : "none",
        borderRight: isDesktop ? `1px solid ${COLORS.surfaceLight}` : "none",
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
              transition: "none",
              letterSpacing: 0.2,
            }}
          >
            {tab}
          </button>
        ))}
        </div>
        {!isMockMode && (
          <button onClick={() => signOut()} title="Sign out" aria-label="Sign out" className="focusable" style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 15, padding: "6px 2px", flexShrink: 0, lineHeight: 1 }}>⎋</button>
        )}
      </div>

      {/* Content area. On desktop, single-column views stay readable (capped
          + centered); Cards (tab 1) spreads its columns full width. */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 20,
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            maxWidth: isDesktop && activeTab !== 1 ? 880 : "100%",
            margin: "0 auto",
          }}
        >
          {views[activeTab]}
        </div>
      </div>

      {/* The Grown-Up review tray */}
      {trayText != null && (
        <ReviewTray
          key={trayKey}
          text={trayText}
          ctx={ctx}
          onClose={() => setTrayText(null)}
          onFiled={() => setDataVersion((v) => v + 1)}
        />
      )}

      {/* Item detail editor */}
      {editing && (
        <ItemDetail
          item={editing}
          ctx={ctx}
          onClose={() => setEditing(null)}
          onSaved={() => setDataVersion((v) => v + 1)}
        />
      )}

      {/* FAB - Add button */}
      <div className="twodo-fab" style={{ position: "absolute", right: 20, bottom: 82, zIndex: 5, animation: "twodoFloat 3.6s ease-in-out infinite" }}>
        <button
          onClick={() => startNew("task")}
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

      {/* Lane filter — applies to Dates / Cards / Lists. The feather scrim above
          fades the scrolling content into the bar's background (no hard edge). */}
      <div style={{ position: "relative", padding: "8px 16px 12px", flexShrink: 0, background: COLORS.bg }}>
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: -20, height: 20, background: `linear-gradient(to top, ${COLORS.bg}, transparent)`, pointerEvents: "none" }} />
        <LaneFilter value={laneFilter} onChange={setLaneFilter} ctx={ctx} style={{ marginBottom: 0 }} />
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
            onKeyDown={(e) => e.key === "Enter" && submitDump()}
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
            onClick={submitDump}
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
