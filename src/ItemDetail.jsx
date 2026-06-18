import { useEffect, useState } from "react";
import { COLORS } from "./theme";
import { laneLabel, SLOTS } from "./lib/lanes.js";
import { createItem, updateItem, deleteItem, listColumns, listStores, createStore, listLists, listItemsForList } from "./lib/data.js";

const EMOJI = ["💕", "🎉", "🎸", "✈️", "🎂", "🍷", "🏖️", "🎬", "⚽", "🎄", "🎁", "🌟", "🍕", "🐱", "🏡", "💸"];
const SWATCHES = ["#6BB5E8", "#7AA0E8", "#8FBFA3", "#E8C16B", "#E8896B", "#E86B9B", "#B98CE8", "#9B8CE8", "#C98B6B"];
const swatch = { width: 30, height: 30, borderRadius: 15, cursor: "pointer", flexShrink: 0, padding: 0 };

// Read/write the time-of-day on an ISO datetime (keeps the date).
const timeOf = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const withTime = (iso, t) => { const d = iso ? new Date(iso) : new Date(); const [h, m] = (t || "0:0").split(":").map(Number); d.setHours(h || 0, m || 0, 0, 0); return d.toISOString(); };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const startOfWeek = (d) => { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Coral calendar glyph.
const CalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);

// Themed (green/coral) date picker — replaces the native input so the popup
// matches the app instead of the browser's white calendar.
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const [view, setView] = useState(() => selected || new Date());
  const today = new Date();

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ ...input, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ color: selected ? COLORS.textPrimary : COLORS.textMuted }}>
          {selected ? `${selected.getDate()} ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()}` : "Pick a date"}
        </span>
        <CalIcon />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 5, width: 280, background: COLORS.surface, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 14, padding: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={pickerNav}>‹</button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={pickerNav}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DOW.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 10, color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              const inMonth = day.getMonth() === view.getMonth();
              const isSel = sameDay(day, selected);
              const isTd = sameDay(day, today);
              return (
                <button key={i} onClick={() => { onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).toISOString()); setOpen(false); }}
                  style={{ height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                    background: isSel ? COLORS.accent : "transparent",
                    color: isSel ? COLORS.bg : (inMonth ? COLORS.textPrimary : COLORS.textMuted),
                    fontWeight: isTd || isSel ? 600 : 400,
                    outline: isTd && !isSel ? `1px solid ${COLORS.accent}` : "none" }}>
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button onClick={() => { onChange(null); setOpen(false); }} style={pickerLink}>Clear</button>
            <button onClick={() => { onChange(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString()); setView(today); setOpen(false); }} style={pickerLink}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Overlay modal editor for any item (new or existing).
export default function ItemDetail({ item, ctx, onClose, onSaved }) {
  const isNew = !item?.id;
  const [form, setForm] = useState(() => ({ ...item }));
  const [columns, setColumns] = useState([]);
  const [stores, setStores] = useState([]);
  const [lists, setLists] = useState([]);
  const [linkedGroups, setLinkedGroups] = useState([]);
  const [shown, setShown] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setShown(true)); }, []);
  useEffect(() => { if (form.type === "task") listColumns().then(setColumns); }, [form.type]);
  useEffect(() => { if (form.type === "shopping") listStores().then(setStores); }, [form.type]);
  useEffect(() => { if (form.type === "task" || form.type === "event") listLists().then(setLists); }, [form.type]);

  const linkedKey = (form.linked_list_ids || []).join(",");
  async function loadLinked() {
    const ids = form.linked_list_ids || [];
    const arrs = await Promise.all(ids.map((id) => listItemsForList(id)));
    setLinkedGroups(ids.map((id, i) => ({ id, items: arrs[i] })));
  }
  useEffect(() => { loadLinked(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [linkedKey]);

  function toggleListLink(id) {
    const cur = form.linked_list_ids || [];
    set("linked_list_ids", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }
  async function toggleLinked(it) {
    await updateItem(it.id, { checked: !it.checked, checked_at: !it.checked ? new Date().toISOString() : null });
    loadLinked();
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const viewer = ctx?.viewerSlot || SLOTS.A;
  const other = viewer === SLOTS.A ? SLOTS.B : SLOTS.A;
  const laneOpts = [viewer, other, SLOTS.SHARED].map((slot) => ({ slot, label: laneLabel(slot, viewer, ctx?.space) }));
  const exciting = form.kind === "exciting";
  const dateField = form.type === "event" ? "start_at" : "due_at";
  const hasDate = !!form[dateField];

  function close() { setShown(false); setTimeout(onClose, 200); }

  async function save() {
    const patch = { ...form };
    if (patch.type === "task" && !patch.column_id && columns[0]) patch.column_id = columns[0].id;
    if (isNew) {
      patch.space_id = ctx?.space?.id;
      patch.created_by = ctx?.people?.[viewer]?.id ?? null;
      await createItem(patch);
    } else {
      await updateItem(item.id, patch);
    }
    onSaved?.();
    close();
  }
  async function remove() { await deleteItem(item.id); onSaved?.(); close(); }

  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, opacity: shown ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "90%", display: "flex", flexDirection: "column", background: COLORS.bg, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.55)", transform: shown ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)", transition: "transform 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.surfaceLight}` }}>
          <button onClick={close} style={iconBtn}>Close</button>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.textMuted }}>{isNew ? "New" : "Edit"} {form.type}</span>
          <button onClick={save} style={{ ...iconBtn, color: COLORS.accent, fontWeight: 600 }}>Save</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 22px" }}>
          <input value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="What is it?" style={{ ...input, fontSize: 16, fontWeight: 600 }} />

          <Label>Type</Label>
          <Segmented
            options={[{ value: "task", label: "Task" }, { value: "event", label: "Event" }, { value: "shopping", label: "Shopping" }, { value: "expense", label: "Expense" }]}
            value={form.type}
            onChange={(v) => set("type", v)}
          />

          {form.type === "shopping" && (
            <>
              <Label>Shop</Label>
              <StorePicker stores={stores} value={form.store ?? null} onChange={(v) => set("store", v)} onAdd={async (name) => { const st = await createStore({ name, space_id: ctx?.space?.id }); setStores(await listStores()); set("store", st.name); }} />
              <Label>Quantity</Label>
              <input value={form.qty || ""} onChange={(e) => set("qty", e.target.value)} placeholder="e.g. x2, 500g" style={input} />
            </>
          )}

          {(form.type === "task" || form.type === "event") && (
            <>
              <Label>{form.type === "event" ? "When" : "Due"}</Label>
              <DatePicker value={form[dateField]} onChange={(v) => set(dateField, v)} />
              {hasDate && (
                <>
                  <Label>{form.type === "event" ? "Start time" : "Time"}</Label>
                  <input type="time" value={timeOf(form[dateField])} onChange={(e) => set(dateField, withTime(form[dateField], e.target.value))} style={input} />
                  {form.type === "event" && (
                    <>
                      <Label>End time</Label>
                      <input type="time" value={timeOf(form.end_at)} onChange={(e) => set("end_at", withTime(form.end_at || form.start_at, e.target.value))} style={input} />
                    </>
                  )}
                  <Label>Repeats</Label>
                  <Segmented
                    options={[{ value: "", label: "None" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                    value={form.recur_freq ?? ""}
                    onChange={(v) => set("recur_freq", v || null)}
                  />
                  {form.recur_freq && (
                    <>
                      <Label>Until (optional)</Label>
                      <DatePicker value={form.recur_until} onChange={(v) => set("recur_until", v)} />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {form.type === "task" && columns.length > 0 && (
            <>
              <Label>Column</Label>
              <Segmented options={columns.map((c) => ({ value: c.id, label: c.label }))} value={form.column_id} onChange={(v) => set("column_id", v)} />
            </>
          )}

          <Label>Lane</Label>
          <Segmented options={laneOpts.map((o) => ({ value: o.slot, label: o.label }))} value={form.lane} onChange={(v) => set("lane", v)} />

          {(form.type === "task" || form.type === "event") && (
            <>
              <Label>Linked lists</Label>
              {lists.length === 0 ? (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.textMuted }}>No lists yet.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {lists.map((l) => {
                    const on = (form.linked_list_ids || []).includes(l.id);
                    return <button key={l.id} onClick={() => toggleListLink(l.id)} style={chip(on)}>{l.emoji ? l.emoji + " " : ""}{l.name}</button>;
                  })}
                </div>
              )}
              {linkedGroups.map((g) => {
                const meta = lists.find((l) => l.id === g.id);
                return (
                  <div key={g.id} style={{ marginTop: 12 }}>
                    <Label>{meta ? `${meta.emoji ? meta.emoji + " " : ""}${meta.name}` : "List"}</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {g.items.length === 0 ? (
                        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 13, color: COLORS.textMuted, padding: "4px 2px" }}>This list is empty.</div>
                      ) : g.items.map((it) => (
                        <button key={it.id} onClick={() => toggleLinked(it)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: COLORS.surface, border: "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: it.checked ? "none" : `2px solid ${COLORS.textMuted}`, background: it.checked ? COLORS.accent : "transparent", color: COLORS.bg }}>{it.checked ? "✓" : ""}</span>
                          <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: it.checked ? COLORS.textMuted : COLORS.textPrimary, textDecoration: it.checked ? "line-through" : "none" }}>
                            {it.title}{it.qty && <span style={{ color: COLORS.textMuted, marginLeft: 6, fontSize: 12 }}>{it.qty}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                    <LinkedAdd listId={g.id} lane={form.lane} spaceId={ctx?.space?.id} createdBy={ctx?.people?.[viewer]?.id ?? null} onAdded={loadLinked} />
                  </div>
                );
              })}
            </>
          )}

          {form.type === "expense" && (
            <>
              <Label>Amount ($)</Label>
              <input type="number" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value === "" ? null : Number(e.target.value))} style={input} />
            </>
          )}

          <Label>Notes</Label>
          <textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else…" rows={3} style={{ ...input, resize: "vertical" }} />

          <Row><Toggle label="Exciting" on={exciting} onClick={() => set("kind", exciting ? "routine" : "exciting")} /></Row>
          {exciting && (
            <>
              <Label>Emoji</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMOJI.map((em) => (
                  <button key={em} onClick={() => set("emoji", em)} style={{ width: 40, height: 40, borderRadius: 10, fontSize: 18, cursor: "pointer", border: form.emoji === em ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}`, background: form.emoji === em ? COLORS.accentMuted : COLORS.surface }}>{em}</button>
                ))}
              </div>
            </>
          )}

          {hasDate && (form.type === "task" || form.type === "event") && (
            <Row><Toggle label="Show countdown (sleeps)" on={!!form.countdown} onClick={() => set("countdown", !form.countdown)} /></Row>
          )}
          {form.type === "task" && (
            <Row><Toggle label="Keep reminding me" on={!!form.persistent_until_done} onClick={() => set("persistent_until_done", !form.persistent_until_done)} /></Row>
          )}

          <Label>Color</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <button onClick={() => set("color", null)} className="focusable" title="Auto (lane color)" style={{ height: 22, padding: "0 10px", borderRadius: 11, background: COLORS.surface, color: COLORS.textSecondary, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, cursor: "pointer", border: !form.color ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.surfaceLight}` }}>Auto</button>
            {SWATCHES.map((c) => (
              <button key={c} onClick={() => set("color", c)} className="focusable" title={c} style={{ width: 22, height: 22, borderRadius: 11, padding: 0, background: c, border: "none", cursor: "pointer", outline: form.color === c ? `2px solid ${COLORS.textPrimary}` : "none", outlineOffset: 2 }} />
            ))}
          </div>

          {!isNew && <button onClick={remove} style={deleteBtn}>Delete</button>}
        </div>
      </div>
    </div>
  );
}

function LinkedAdd({ listId, lane, spaceId, createdBy, onAdded }) {
  const [val, setVal] = useState("");
  const submit = async () => {
    const t = val.trim();
    if (!t) return;
    await createItem({ type: "shopping", title: t, list_id: listId, lane: lane || "shared", kind: "routine", checked: false, space_id: spaceId, created_by: createdBy });
    setVal("");
    onAdded?.();
  };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add an item…" style={{ ...input, marginBottom: 0, flex: 1, padding: "8px 12px" }} />
      <button onClick={submit} className="focusable" style={{ ...iconBtn, color: COLORS.accent, fontWeight: 600 }}>Add</button>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.textSecondary, margin: "12px 0 6px" }}>{children}</div>;
}
function Row({ children }) { return <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>{children}</div>; }
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: "8px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: value === o.value ? COLORS.accent : COLORS.surface, color: value === o.value ? COLORS.bg : COLORS.textSecondary }}>{o.label}</button>
      ))}
    </div>
  );
}
function Toggle({ label, on, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer", background: COLORS.surface, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: 14, textAlign: "left" }}>
      <span style={{ width: 38, height: 22, borderRadius: 11, background: on ? COLORS.accent : COLORS.surfaceLight, position: "relative", flexShrink: 0, transition: "background 0.15s ease" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 9, background: COLORS.bg, transition: "left 0.15s ease" }} />
      </span>
      {label}
    </button>
  );
}

function StorePicker({ stores, value, onChange, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const submit = async () => { const n = name.trim(); if (!n) return; await onAdd(n); setName(""); setAdding(false); };
  const opts = [{ value: null, label: "Any" }, ...stores.map((s) => ({ value: s.name, label: s.name }))];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {opts.map((o) => (
        <button key={o.value ?? "any"} onClick={() => onChange(o.value)} style={chip(value === o.value)}>{o.label}</button>
      ))}
      {adding ? (
        <span style={{ display: "flex", gap: 4 }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Shop name" style={{ ...input, width: 130, marginBottom: 0, padding: "8px 10px" }} />
          <button onClick={submit} style={chip(true)}>Add</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...chip(false), color: COLORS.accent, border: `1px dashed ${COLORS.accent}` }}>+ New shop</button>
      )}
    </div>
  );
}
const chip = (on) => ({ padding: "8px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, background: on ? COLORS.accent : COLORS.surface, color: on ? COLORS.bg : COLORS.textSecondary });

const input = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 12, border: `1px solid ${COLORS.surfaceLight}`, background: COLORS.surface, fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: COLORS.textPrimary, outline: "none", caretColor: COLORS.accent, marginBottom: 4 };
const iconBtn = { background: "none", border: "none", color: COLORS.textPrimary, fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" };
const deleteBtn = { marginTop: 18, width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${COLORS.surfaceLight}`, background: "transparent", color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" };
const pickerNav = { width: 26, height: 26, borderRadius: 13, border: "none", background: COLORS.surfaceLight, color: COLORS.textPrimary, cursor: "pointer", fontSize: 14 };
const pickerLink = { background: "none", border: "none", color: COLORS.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" };
