import { useState, useEffect } from "react";
import { COLORS, TYPE, SPACE, RADIUS, withAlpha } from "../theme";
import { LaneBadge, Card, Chip, SectionLabel, EmptyState } from "../components/primitives.jsx";
import { getBootstrap, listLists, listListItems, listStores, updateItem, deleteItem, createList, createStore, subscribe } from "../lib/data.js";
import { laneLabel as resolveLaneLabel, laneColor as resolveLaneColor } from "../lib/lanes.js";

const STORE_COLORS = { "No Frills": "#FFB300", "Grace Meat": "#E57373", Metro: "#1E88E5", "Home Depot": "#F57C00" };
function StoreBadge({ store }) {
  if (!store) return null;
  const c = STORE_COLORS[store] || COLORS.textSecondary;
  return <span style={{ ...TYPE.caption, display: "inline-block", padding: "2px 7px", borderRadius: RADIUS.sm, color: c, background: withAlpha(c, 0.13), letterSpacing: 0.2 }}>{store}</span>;
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

const fadeX = { WebkitMaskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)", maskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)" };

const ListsView = ({ isDesktop, onOpenItem, onChanged, laneFilter = "all", dataVersion = 0 }) => {
  const [ctx, setCtx] = useState(null);
  const [lists, setLists] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [activeList, setActiveList] = useState(0);
  const [storeFilter, setStoreFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState({}); // id -> target checked, shown before the row re-buckets

  async function load() {
    try {
      setError(false);
      const [boot, ls, st, its] = await Promise.all([getBootstrap(), listLists(), listStores(), listListItems()]);
      setCtx(boot); setLists(ls); setStores(st); setItems(its);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); const u = subscribe("item", load); return () => u(); }, []);
  // Reload in place when something elsewhere filed/edited (no remount, no flash).
  useEffect(() => { if (dataVersion) load(); }, [dataVersion]);

  // Check the box first (in place), then let it move to/from Done — feels complete.
  async function toggle(it) {
    const target = !it.checked;
    setPending((p) => ({ ...p, [it.id]: target }));
    await updateItem(it.id, { checked: target, checked_at: target ? new Date().toISOString() : null });
    setTimeout(async () => {
      await load();
      setPending((p) => { const n = { ...p }; delete n[it.id]; return n; });
      onChanged?.();
    }, 380);
  }
  async function del(it) { await deleteItem(it.id); await load(); onChanged?.(); }
  async function addList(name) { const l = await createList({ name, space_id: ctx?.space?.id }); await load(); setActiveList(lists.length); setStoreFilter("All"); onChanged?.(); }
  async function addStore(name) { await createStore({ name, space_id: ctx?.space?.id }); await load(); onChanged?.(); }

  if (loading) return (<div style={{ padding: "0 16px" }}><EmptyState>Loading the list…</EmptyState></div>);
  if (error) return (
    <div style={{ padding: "0 16px" }}>
      <EmptyState style={{ fontStyle: "normal" }}>
        Couldn’t load your lists.{" "}
        <button onClick={load} className="focusable" style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Try again</button>
      </EmptyState>
    </div>
  );

  const list = lists[activeList];
  const listItems = items.filter((i) => i.list_id === (list && list.id));
  const storeChips = list && list.has_stores ? ["All", ...stores.map((s) => s.name)] : null;
  const filtered = listItems.filter((i) => (storeFilter === "All" || i.store === storeFilter) && (laneFilter === "all" || i.lane === laneFilter));
  // While an item is mid-toggle (pending), keep it in its ORIGINAL bucket so the
  // checkbox ticks in place before the row moves. (The mock mutates `checked` in
  // place, so we can't rely on it.checked for bucketing during the transition.)
  const bucketDone = (i) => (i.id in pending ? !pending[i.id] : i.checked);
  const unchecked = filtered.filter((i) => !bucketDone(i));
  const checked = filtered.filter((i) => bucketDone(i));

  const grouped = {};
  const useGrouped = list && list.has_stores && storeFilter === "All";
  if (useGrouped) unchecked.forEach((i) => { const s = i.store || "Other"; (grouped[s] = grouped[s] || []).push(i); });

  const Row = ({ it }) => {
    const label = ctx ? resolveLaneLabel(it.lane, ctx.viewerSlot, ctx.space) : it.lane;
    const color = ctx ? resolveLaneColor(it.lane, ctx.people, COLORS) : COLORS.laneUs;
    const nodeColor = it.color || color;
    const checked = it.id in pending ? pending[it.id] : it.checked;
    return (
      <Card laneColor={nodeColor} onClick={() => onOpenItem?.(it)} style={{ padding: `${SPACE[2]}px ${SPACE[3]}px`, marginBottom: SPACE[1] + 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE[2] }}>
          <button onClick={(e) => { e.stopPropagation(); toggle(it); }} aria-label={checked ? "Mark not done" : "Mark done"} aria-pressed={checked} className="focusable"
            style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, cursor: "pointer", border: checked ? "none" : `1.5px solid ${withAlpha(nodeColor, 0.55)}`, background: checked ? nodeColor : "transparent", color: COLORS.bg, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms ease, border-color 150ms ease" }}>{checked ? "✓" : ""}</button>
          <span style={{ flex: 1, ...TYPE.body, color: checked ? COLORS.textMuted : COLORS.textPrimary, textDecoration: checked ? "line-through" : "none" }}>
            {it.title}{it.qty && <span style={{ color: COLORS.textMuted, marginLeft: 6, fontSize: 12 }}>{it.qty}</span>}
          </span>
          {it.store && storeFilter !== it.store && <StoreBadge store={it.store} />}
          <LaneBadge label={label} color={color} />
          {bucketDone(it) && (
            <button onClick={(e) => { e.stopPropagation(); del(it); }} aria-label="Delete item" className="focusable" style={{ width: 22, height: 22, borderRadius: 11, border: "none", background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontSize: 17, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <div className="no-sb" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", flex: 1, ...fadeX }}>
        {lists.map((l, i) => (
          <Chip key={l.id} active={i === activeList} variant="soft" onClick={() => { setActiveList(i); setStoreFilter("All"); }}>
            {l.emoji} {l.name}
          </Chip>
        ))}
        </div>
        <InlineAdd placeholder="New list" label="List" onAdd={addList} />
      </div>

      {storeChips && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
          <div className="no-sb" style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", flex: 1, ...fadeX }}>
          {storeChips.map((s) => (
            <Chip key={s} active={storeFilter === s} variant="soft" onClick={() => setStoreFilter(s)} style={{ fontSize: 11, padding: "4px 10px" }}>
              {s === "All" ? "All stores" : s}
            </Chip>
          ))}
          </div>
          <InlineAdd placeholder="New store" label="Store" onAdd={addStore} />
        </div>
      )}

      <div>
        {useGrouped
          ? Object.entries(grouped).map(([store, its]) => (
              <div key={store}>
                <SectionLabel style={{ padding: "10px 4px 6px" }}>{store}</SectionLabel>
                {its.map((it) => <Row key={it.id} it={it} />)}
              </div>
            ))
          : unchecked.map((it) => <Row key={it.id} it={it} />)}

        {checked.length > 0 && (
          <div style={{ marginTop: 14, opacity: 0.5 }}>
            <SectionLabel style={{ padding: "0 4px 6px", color: COLORS.textMuted }}>Done</SectionLabel>
            {checked.map((it) => <Row key={it.id} it={it} />)}
          </div>
        )}

        {unchecked.length === 0 && checked.length === 0 && <EmptyState>The list is empty. The fridge probably isn't. Or is it.</EmptyState>}
      </div>
    </div>
  );
};

export default ListsView;
