import { useState, useEffect } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "./theme";
import { createColumn, updateColumn, deleteColumn, setColumnOrder } from "./lib/data.js";

function ColumnRow({ col, onRename, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  const [label, setLabel] = useState(col.label);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span {...attributes} {...listeners} style={{ cursor: "grab", color: COLORS.textMuted, fontSize: 18, padding: "0 2px", touchAction: "none" }}>⠿</span>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => { const t = label.trim(); if (t && t !== col.label) onRename(col.id, t); else setLabel(col.label); }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.surfaceLight}`, background: COLORS.surface, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", caretColor: COLORS.accent }}
      />
      {col.role !== "none" && <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.textMuted, padding: "3px 6px", borderRadius: 6, background: COLORS.surfaceLight }}>{col.role}</span>}
      <button onClick={() => canDelete && onDelete(col.id)} disabled={!canDelete} title={canDelete ? "Delete" : "Keep at least one column"} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: COLORS.textMuted, cursor: canDelete ? "pointer" : "default", opacity: canDelete ? 1 : 0.3, fontSize: 14 }}>🗑</button>
    </div>
  );
}

export default function ColumnsEditor({ columns, spaceId, onClose, onChanged }) {
  const [cols, setCols] = useState(columns);
  const [shown, setShown] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setShown(true)); }, []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function rename(id, label) { await updateColumn(id, { label }); setCols((cs) => cs.map((c) => (c.id === id ? { ...c, label } : c))); onChanged?.(); }
  async function del(id) { await deleteColumn(id); setCols((cs) => cs.filter((c) => c.id !== id)); onChanged?.(); }
  async function add() { const c = await createColumn({ label: "New column", space_id: spaceId }); setCols((cs) => [...cs, c]); onChanged?.(); }
  async function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(cols, cols.findIndex((c) => c.id === active.id), cols.findIndex((c) => c.id === over.id));
    setCols(next);
    await setColumnOrder(next.map((c) => c.id));
    onChanged?.();
  }
  function close() { setShown(false); setTimeout(onClose, 200); }

  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, opacity: shown ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "85%", display: "flex", flexDirection: "column", background: COLORS.bg, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.55)", transform: shown ? "scale(1)" : "scale(0.98)", transition: "transform 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.surfaceLight}` }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: COLORS.textPrimary }}>Columns</span>
          <button onClick={close} style={{ background: "none", border: "none", color: COLORS.accent, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: "pointer" }}>Done</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {cols.map((c) => <ColumnRow key={c.id} col={c} onRename={rename} onDelete={del} canDelete={cols.length > 1} />)}
            </SortableContext>
          </DndContext>
          <button onClick={add} style={{ width: "100%", marginTop: 6, padding: "12px", borderRadius: 12, border: `1px dashed ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>+ Add column</button>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.textMuted, marginTop: 14, lineHeight: 1.5 }}>Drag ⠿ to reorder. Deleting a column moves its cards to the first column. Tagged columns keep their special behaviour even when renamed.</p>
        </div>
      </div>
    </div>
  );
}
