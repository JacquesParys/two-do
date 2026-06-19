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

// The nav drawer's width is ALSO the content push distance, so the content's
// right edge and the drawer's left edge translate in perfect lockstep — a true
// "push", not two panes sliding past each other at different speeds.
const DRAWER_W = 230;

// Drawer open/close motion. Symmetric ease-in-out (no overshoot / settle-bounce),
// deliberately unhurried. The stage push and the drawer slide share these exact
// values so they move as one locked unit.
const DRAWER_MS = 420;
const DRAWER_EASE = "ease-in-out";
const DRAWER_TX = `transform ${DRAWER_MS}ms ${DRAWER_EASE}`;

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
  const [navOpen, setNavOpen] = useState(false); // right nav drawer
  const prevTab = useRef(0);
  const menuBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const wasNavOpen = useRef(false);

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

  // Drawer a11y: Esc closes; focus moves into the drawer on open and returns to
  // the menu button on close. (Modal isn't reused here — see two-do-shell-audit.md §3.)
  useEffect(() => {
    if (navOpen) {
      const onKey = (e) => e.key === "Escape" && setNavOpen(false);
      document.addEventListener("keydown", onKey);
      drawerRef.current?.querySelector("button")?.focus();
      wasNavOpen.current = true;
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasNavOpen.current) {
      menuBtnRef.current?.focus();
      wasNavOpen.current = false;
    }
  }, [navOpen]);

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
      {/* Stage — header + content + lane filter + input bar. Pushes left by the
          drawer's full width when it opens, so the two move as one (see DRAWER_W).
          flex:1 + minHeight:0 + overflow:hidden keep ALL scrolling inside the
          content area below — otherwise a view's scrollIntoView (DatesView's
          month/day jump) scrolls the whole shell and the header vanishes.
          No "motion" class: the push is an explicit slide the user asked for. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: navOpen ? `translateX(-${DRAWER_W}px)` : "translateX(0)",
          transition: DRAWER_TX,
          willChange: "transform",
        }}
      >
      {/* Header — brand left, menu button right */}
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
            flex: 1,
          }}
        >
          Two-Do
        </span>
        <button
          ref={menuBtnRef}
          onClick={() => setNavOpen((o) => !o)}
          aria-label="Open menu"
          aria-expanded={navOpen}
          className="focusable tap"
          style={{
            background: "none",
            border: "none",
            color: COLORS.textSecondary,
            cursor: "pointer",
            fontSize: 20,
            padding: "6px 4px",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ☰
        </button>
      </div>

      {/* Content area. On desktop, single-column views stay readable (capped
          + centered); Cards (tab 1) spreads its columns full width.
          minHeight:0 lets this flex child shrink so it owns the scroll (and a
          view's scrollIntoView stays contained here, never the whole shell). */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
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

      {/* Lane filter — applies to Dates / Cards / Lists. The bar carries its own
          background + feather scrim (see LaneFilter), so the fade is global and
          consistent across every view. */}
      <LaneFilter value={laneFilter} onChange={setLaneFilter} ctx={ctx} />

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
      {/* end stage */}

      {/* Scrim over the pushed stage while the drawer is open. Shared contract
          with two-do-buttons-bottom.md: scrim z5 < drawer z6 < orbit z7 < sheets z8. */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 5 }}
        />
      )}

      {/* Right nav drawer */}
      <nav
        ref={drawerRef}
        aria-label="Views"
        style={{
          position: "absolute",
          // top + bottom anchor sizes the drawer to the shell's exact height
          // (no fragile percentage), so the pinned sign-out can't fall off-screen.
          top: 0,
          bottom: 0,
          right: 0,
          width: DRAWER_W,
          boxSizing: "border-box",
          overflowY: "auto", // safety net: sign-out stays reachable on short viewports
          background: COLORS.bgRaised,
          borderLeft: `1px solid ${COLORS.surfaceLight}`,
          transform: navOpen ? "translateX(0)" : "translateX(100%)",
          transition: DRAWER_TX,
          willChange: "transform",
          zIndex: 6,
          display: "flex",
          flexDirection: "column",
          padding: "18px 12px calc(18px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: COLORS.textMuted,
            padding: "0 8px 10px",
          }}
        >
          Views
        </div>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => { handleTabSwitch(i); setNavOpen(false); }}
            className="focusable"
            style={{
              textAlign: "left",
              padding: "11px 14px",
              marginBottom: 4,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 500,
              background: i === activeTab ? COLORS.accent : "transparent",
              color: i === activeTab ? COLORS.bg : COLORS.textSecondary,
            }}
          >
            {tab}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {!isMockMode && (
          <button
            onClick={() => signOut()}
            className="focusable"
            style={{
              textAlign: "left",
              padding: "11px 14px",
              borderRadius: 12,
              border: `1px solid ${COLORS.surfaceLight}`,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              color: COLORS.textMuted,
            }}
          >
            ⎋  Sign out
          </button>
        )}
      </nav>

      {/* The Grown-Up review tray (top-level overlay, above the drawer) */}
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
    </div>
  );
}
