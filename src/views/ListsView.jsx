import { useState, useEffect } from "react";
import { COLORS } from "../theme";
import { LaneBadge } from "../components/primitives.jsx";
import { getBootstrap, listLists, listListItems, listStores, updateItem, createList, createStore, subscribe } from "../lib/data.js";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor } from "../lib/lanes.js";

const STORE_COLORS = { "No Frills": "#FFB300", "Grace Meat": "#E57373", Metro: "#1E88E5", "Home Depot": "#F57C00" };
function StoreBadge({ store }) {
  if (!store) return null;
  const c = STORE_COLORS[store] || COLORS.textSecondary;
  return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 8, fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: c, background: `${c}20`, letterSpacing: 0.2 }}>{store}</span>;
}

function InlineAdd({ placeholder, label, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const submit = async () => { const n = name.trim(); if (!n) return; await onAdd(n); setName(""); setAdding(false); };
  // alignSelf:"stretch" makes these match the height of the chips beside them.
  if (!adding) return (
    <button onClick={() => setAdding(true)} title={placeholder}
      style={{ alignSelf: "stretch", padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", borderRadius: 20, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", lineHeight: 1, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 15 }}>+</span> {label}</button>
  );
  return (
    <span style={{ display: "flex", gap: 4, flexShrink: 0, alignSelf: "stretch" }}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} onBlur={() => !name.trim() && setAdding(false)} placeholder={placeholder}
        style={{ alignSelf: "stretch", width: 120, padding: "0 10px", borderRadius: 16, border: `1px solid ${COLORS.surfaceLight}`, background: COLORS.surface, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: 12, outline: "none", caretColor: COLORS.accent }} />
      <button onClick={submit} style={{ alignSelf: "stretch", padding: "0 12px", borderRadius: 16, border: "none", background: COLORS.accent, color: COLORS.bg, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
    </span>
  );
}

const empty = { fontFamily: "'Fraunces', serif", fontSize: 14, fontStyle: "italic", color: COLORS.textMuted, textAlign: "center", padding: "40px 20px" };

const fadeX = { WebkitMaskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)", maskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)" };

const ListsView = ({ isDesktop, onOpenItem, onChanged, laneFilter = "all" }) => {
  const [ctx, setCtx] = useState(null);
  const [lists, setLists] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [activeList, setActiveList] = useState(0);
  const [storeFilter, setStoreFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [boot, ls, st, its] = await Promise.all([getBootstrap(), listLists(), listStores(), listListItems()]);
    setCtx(boot); setLists(ls); setStores(st); setItems(its); setLoading(false);
  }
  useEffect(() => { load(); const u = subscribe("item", load); return () => u(); }, []);

  async function toggle(it) {
    await updateItem(it.id, { checked: !it.checked, checked_at: !it.checked ? new Date().toISOString() : null });
    await load(); onChanged?.();
  }
  async function addList(name) { const l = await createList({ name, space_id: ctx?.space?.id }); await load(); setActiveList(lists.length); setStoreFilter("All"); onChanged?.(); }
  async function addStore(name) { await createStore({ name, space_id: ctx?.space?.id }); await load(); onChanged?.(); }

  if (loading) return (<div style={{ padding: "0 16px" }}><p style={empty}>Loading the list…</p></div>);

  const list = lists[activeList];
  const listItems = items.filter((i) => i.list_id === (list && list.id));
  const storeChips = list && list.has_stores ? ["All", ...stores.map((s) => s.name)] : null;
  const filtered = listItems.filter((i) => (storeFilter === "All" || i.store === storeFilter) && (laneFilter === "all" || i.lane === laneFilter));
  const unchecked = filtered.filter((i) => !i.checked);
  const checked = filtered.filter((i) => i.checked);

  const grouped = {};
  const useGrouped = list && list.has_stores && storeFilter === "All";
  if (useGrouped) unchecked.forEach((i) => { const s = i.store || "Other"; (grouped[s] = grouped[s] || []).push(i); });

  const Row = ({ it }) => {
    const label = ctx ? resolveLaneLabel(it.lane, ctx.viewerSlot, ctx.space) : it.lane;
    const color = ctx ? resolveLaneColor(it.lane, ctx.people, COLORS) : COLORS.laneUs;
    return (
      <div onClick={() => onOpenItem?.(it)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: COLORS.surface, cursor: "pointer", marginBottom: 2 }}>
        <button onClick={(e) => { e.stopPropagation(); toggle(it); }} style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, cursor: "pointer", border: it.checked ? "none" : `2px solid ${COLORS.textMuted}`, background: it.checked ? COLORS.accent : "transparent", color: COLORS.bg, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.checked ? "✓" : ""}</button>
        <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: it.checked ? COLORS.textMuted : COLORS.textPrimary, textDecoration: it.checked ? "line-through" : "none" }}>
          {it.title}{it.qty && <span style={{ color: COLORS.textMuted, marginLeft: 6, fontSize: 12 }}>{it.qty}</span>}
        </span>
        {it.store && storeFilter !== it.store && <StoreBadge store={it.store} />}
        <LaneBadge label={label} color={color} />
      </div>
    );
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <div className="no-sb" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", flex: 1, ...fadeX }}>
        {lists.map((l, i) => (
          <button key={l.id} onClick={() => { setActiveList(i); setStoreFilter("All"); }} style={{ padding: "6px 14px", borderRadius: 20, border: i === activeList ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}`, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", background: i === activeList ? COLORS.accentMuted : "transparent", color: i === activeList ? COLORS.accent : COLORS.textSecondary }}>
            {l.emoji} {l.name}
          </button>
        ))}
        </div>
        <InlineAdd placeholder="New list" label="List" onAdd={addList} />
      </div>

      {storeChips && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
          <div className="no-sb" style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", flex: 1, ...fadeX }}>
          {storeChips.map((s) => (
            <button key={s} onClick={() => setStoreFilter(s)} style={{ padding: "4px 10px", borderRadius: 14, border: storeFilter === s ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}`, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", background: storeFilter === s ? COLORS.accentMuted : "transparent", color: storeFilter === s ? COLORS.accent : COLORS.textMuted }}>
              {s === "All" ? "All stores" : s}
            </button>
          ))}
          </div>
          <InlineAdd placeholder="New store" label="Store" onAdd={addStore} />
        </div>
      )}

      <div>
        {useGrouped
          ? Object.entries(grouped).map(([store, its]) => (
              <div key={store}>
                <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, padding: "10px 4px 6px" }}>{store}</div>
                {its.map((it) => <Row key={it.id} it={it} />)}
              </div>
            ))
          : unchecked.map((it) => <Row key={it.id} it={it} />)}

        {checked.length > 0 && (
          <div style={{ marginTop: 14, opacity: 0.5 }}>
            <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, padding: "0 4px 6px" }}>Done</div>
            {checked.map((it) => <Row key={it.id} it={it} />)}
          </div>
        )}

        {unchecked.length === 0 && checked.length === 0 && <p style={empty}>The list is empty. The fridge probably isn't. Or is it.</p>}
      </div>
    </div>
  );
};

export default ListsView;
