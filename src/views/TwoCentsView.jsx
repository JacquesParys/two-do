import { useState, useEffect } from "react";
import { COLORS, TYPE, SPACE } from "../theme";
import { Card, SectionLabel, ProgressBar, EmptyState } from "../components/primitives.jsx";
import { getBootstrap, getFinance } from "../lib/data.js";
import { SLOTS } from "../lib/lanes.js";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n) => {
  const v = Number(n) || 0;
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const dueLabel = (raw) => {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? String(raw) : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

const pad = { padding: "0 16px" };
const linkBtn = { background: "none", border: "none", color: COLORS.accent, cursor: "pointer", font: "inherit", textDecoration: "underline" };

const TwoCentsView = ({ isDesktop, dataVersion = 0 }) => {
  const [ctx, setCtx] = useState(null);
  const [fin, setFin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    Promise.all([getBootstrap(), getFinance()])
      .then(([b, f]) => { setCtx(b); setFin(f); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }
  useEffect(() => { load(); }, []);
  // Reload in place when an expense/settlement was filed/edited (no remount, no flash).
  useEffect(() => { if (dataVersion) load(); }, [dataVersion]);

  if (loading) return <div style={pad}><EmptyState>Counting the pennies…</EmptyState></div>;
  if (error) return (
    <div style={pad}>
      <EmptyState style={{ fontStyle: "normal" }}>
        Couldn’t load your finances.{" "}
        <button onClick={load} className="focusable" style={linkBtn}>Try again</button>
      </EmptyState>
    </div>
  );

  // Owe Snap — derive the who-owes-who line from the viewer's perspective.
  const people = ctx?.people;
  const viewerSlot = ctx?.viewerSlot || SLOTS.A;
  const net = fin?.balance?.net || 0; // net > 0 ⇒ partner_b owes partner_a
  const amt = Math.abs(net);
  const name = (slot) => people?.[slot]?.display_name || (slot === SLOTS.A ? "Partner A" : "Partner B");
  let oweTitle, oweSub;
  if (amt < 0.005) {
    oweTitle = "All square";
    oweSub = "Nobody owes anybody. Rare.";
  } else {
    const creditor = net > 0 ? SLOTS.A : SLOTS.B;
    const debtor = net > 0 ? SLOTS.B : SLOTS.A;
    if (viewerSlot === debtor) { oweTitle = `You owe ${money(amt)}`; oweSub = `to ${name(creditor)}`; }
    else { oweTitle = `You’re owed ${money(amt)}`; oweSub = `from ${name(debtor)}`; }
  }

  const bills = fin?.bills || [];
  const goals = fin?.goals || [];

  const billsSection = (
    <section style={{ flex: 1, minWidth: 0, width: "100%" }}>
      <SectionLabel style={{ marginBottom: SPACE[3] }}>Monthly outgoings</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE[2] }}>
        {bills.length ? bills.map((b) => (
          <Card key={b.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SPACE[3] }}>
              <div>
                <div style={{ ...TYPE.title, color: COLORS.textPrimary }}>{b.name}</div>
                <div style={{ ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 }}>{cap(b.frequency)} · due {dueLabel(b.next_due_at)}</div>
              </div>
              <div style={{ ...TYPE.title, color: COLORS.textPrimary }}>{money(b.amount)}</div>
            </div>
          </Card>
        )) : <EmptyState style={{ padding: "20px 12px" }}>No bills yet. Blissful.</EmptyState>}
      </div>
    </section>
  );

  const goalsSection = (
    <section style={{ flex: 1, minWidth: 0, width: "100%" }}>
      <SectionLabel style={{ marginBottom: SPACE[3] }}>{"Fund & Games"}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE[2] }}>
        {goals.length ? goals.map((g) => (
          <Card key={g.id}>
            <span style={{ ...TYPE.title, color: COLORS.textPrimary }}>{g.emoji ? g.emoji + " " : ""}{g.name}</span>
            <ProgressBar done={Number(g.saved) || 0} total={Number(g.target) || 0} label={`${money(g.saved)} / ${money(g.target)}`} />
          </Card>
        )) : <EmptyState style={{ padding: "20px 12px" }}>No savings goals yet. The sofa fund won’t start itself.</EmptyState>}
      </div>
    </section>
  );

  return (
    <div style={pad}>
      <Card style={{ marginBottom: SPACE[6], textAlign: "center", padding: `${SPACE[4]}px` }}>
        <SectionLabel style={{ marginBottom: SPACE[2] }}>Owe Snap</SectionLabel>
        <div style={{ ...TYPE.display, fontSize: 22, color: COLORS.textPrimary, marginBottom: 4 }}>{oweTitle}</div>
        <div style={{ ...TYPE.caption, color: COLORS.textMuted }}>{oweSub}</div>
      </Card>
      <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", gap: SPACE[6], alignItems: "flex-start" }}>
        {billsSection}
        {goalsSection}
      </div>
    </div>
  );
};

export default TwoCentsView;
