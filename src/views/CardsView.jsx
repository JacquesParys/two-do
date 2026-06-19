import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS, TYPE, SPACE, RADIUS, SHADOW, withAlpha } from "../theme";
import {
  Card, LaneBadge, SleepsChip, ProgressBar, Chip, SectionLabel, PillButton, EmptyState, CalendarIcon, LinkedListChips,
} from "../components/primitives.jsx";
import { adaptCard } from "./helpers.js";
import { getBootstrap, listColumns, listCards, listCalendar, getSubtaskProgress, getListSummaries, moveCards, deleteItem, subscribe } from "../lib/data.js";
import { findRoleColumn, overdueReminder, eventBoardRole } from "../lib/placement.js";
import { SLOTS } from "../lib/lanes.js";
import ColumnsEditor from "../ColumnsEditor.jsx";

// Very faint per-column "add a card here" affordance; brightens on hover.
const AddCard = ({ onClick, style }) => (
  <button
    onClick={onClick}
    aria-label="Add a card to this column"
    className="pressable focusable tap"
    style={{
      ...TYPE.meta,
      width: "100%", marginTop: SPACE[2], padding: `${SPACE[2]}px`,
      borderRadius: RADIUS.md, border: `1px dashed ${COLORS.surfaceLight}`,
      background: "transparent", color: COLORS.textMuted, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      opacity: 0.55,
      ...style,
    }}
  >
    + Add
  </button>
);

const fadeX = {
  WebkitMaskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)",
};

// Column-specific punny empty line (spec §10), keyed on the protected role.
function emptyLine(role) {
  if (role === "someday") return "Nothing in someday. You're either very organised or in denial.";
  if (role === "done") return "Nothing done yet. Bold strategy.";
  return "Nothing due. Suspiciously calm — enjoy it or fill it.";
}

function CardBody({ display, dragging, canDelete, onDelete }) {
  const { title, laneLabel, laneColor, nodeColor, due, subtasks, exciting, variant, seed, emoji, sleeps, proximity, completion } = display;
  return (
    <Card stripeColor={nodeColor} exciting={exciting} variant={variant} seed={seed} proximity={proximity} completion={completion} style={dragging ? { boxShadow: SHADOW.lg } : undefined}>
      {canDelete && (
        // Quick delete for Done cards. stopPropagation so it neither starts a
        // drag (PointerSensor) nor opens the editor (the card's onClick).
        <button
          aria-label="Delete card"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="pressable focusable"
          style={{ position: "absolute", top: 5, right: 5, zIndex: 4, width: 24, height: 24, borderRadius: RADIUS.pill, border: "none", background: withAlpha(COLORS.bg, 0.4), color: COLORS.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE[2], paddingRight: canDelete ? 26 : 0 }}>
        {emoji && <span style={{ fontSize: 16, lineHeight: 1.2 }}>{emoji}</span>}
        <span style={{ ...TYPE.title, color: COLORS.textPrimary, flex: 1 }}>{title}</span>
        <LaneBadge label={laneLabel} color={laneColor} />
      </div>
      {(due || sleeps) && (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE[3], marginTop: SPACE[2] }}>
          {due && (
            <span style={{ ...TYPE.meta, color: COLORS.textSecondary, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <CalendarIcon /> {due}
            </span>
          )}
          {sleeps && <SleepsChip days={sleeps} />}
        </div>
      )}
      {subtasks && <ProgressBar done={subtasks.done} total={subtasks.total} />}
      <LinkedListChips lists={display.linkedLists} />
    </Card>
  );
}

function SortableCard({ id, display, onOpen, canDelete, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onMouseDown={(e) => e.preventDefault()}
      className="focusable pressable motion"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        marginBottom: SPACE[3],
        cursor: "grab",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        borderRadius: RADIUS.lg,
      }}
    >
      <CardBody display={display} canDelete={canDelete} onDelete={onDelete} />
    </div>
  );
}

function Column({ id, empty, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 48,
        borderRadius: RADIUS.md,
        // Faded fill marks the drop target (on hover) and empty columns — no dashed lines.
        background: isOver ? withAlpha(COLORS.accent, 0.1) : empty ? withAlpha(COLORS.surface, 0.35) : "transparent",
        transition: "background 120ms ease",
      }}
    >
      {children}
    </div>
  );
}

const CardsView = ({ isDesktop, onOpenItem, onChanged, laneFilter = "all", dataVersion = 0 }) => {
  const [ctx, setCtx] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [containers, setContainers] = useState({});
  // Derived per-load: amber/red glow per overdue card id, and the set of ids
  // shown by date-derivation (injected events + relocated overdue tasks) so a
  // drag elsewhere doesn't accidentally persist their derived column_id.
  const [glowMap, setGlowMap] = useState({});
  const [derivedIds, setDerivedIds] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  const [activeCol, setActiveCol] = useState(0);
  const [showCols, setShowCols] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cardById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const vis = (ids) => (laneFilter === "all" ? ids : ids.filter((id) => cardById[id]?.lane === laneFilter));

  async function load() {
    try {
      setError(false);
      const [boot, cols, items, cal, sums] = await Promise.all([getBootstrap(), listColumns(), listCards(), listCalendar(), getListSummaries()]);
      const now = new Date();
      const roleOf = (id) => cols.find((c) => c.id === id)?.role;

      // Events not already carded that should surface on the board by proximity.
      const injected = cal.filter((e) => eventBoardRole(e, now));
      const allCards = items.concat(injected);
      // Attach subtask progress (done/total over child items) for the card footer.
      const progress = await getSubtaskProgress(allCards.map((i) => i.id));
      allCards.forEach((it) => { it.subtasks = progress[it.id] || null; });
      setCtx(boot); setColumns(cols); setCards(allCards); setSummaries(sums);

      // Group real cards by their stored column_id.
      const grp = {};
      cols.forEach((c) => { grp[c.id] = []; });
      items.slice().sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0)).forEach((it) => { (grp[it.column_id] = grp[it.column_id] || []).push(it.id); });

      // Derived overrides (date-driven, never stored): escalate overdue
      // "keep reminding" tasks, then drop in the near-future event cards.
      const glows = {};
      const derived = new Set();
      items.forEach((it) => {
        const od = overdueReminder(it, now);
        if (!od || roleOf(it.column_id) === "done") return; // never nag Done cards
        glows[it.id] = od.glow;
        const target = findRoleColumn(cols, od.role);
        if (!target || target.id === it.column_id) return; // glow in place
        const src = grp[it.column_id];
        if (src) { const i = src.indexOf(it.id); if (i >= 0) src.splice(i, 1); }
        (grp[target.id] = grp[target.id] || []).push(it.id);
        derived.add(it.id);
      });
      injected.forEach((e) => {
        const target = findRoleColumn(cols, eventBoardRole(e, now));
        if (target) { (grp[target.id] = grp[target.id] || []).push(e.id); derived.add(e.id); }
      });

      setContainers(grp);
      setGlowMap(glows);
      setDerivedIds(derived);
      setActiveCol((i) => Math.min(i, Math.max(0, cols.length - 1)));
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const u1 = subscribe("item", load);
    const u2 = subscribe("board_column", load);
    return () => { u1(); u2(); };
  }, []);

  // Reload in place when something elsewhere filed/edited (mock mode has no
  // realtime, and even in real mode this keeps the view mounted — no flash).
  useEffect(() => { if (dataVersion) load(); }, [dataVersion]);

  // While a card drag is active, stop the page/columns scrolling under the finger.
  const activeRef = useRef(null);
  activeRef.current = activeId;
  useEffect(() => {
    const onTouchMove = (e) => { if (activeRef.current && e.cancelable) e.preventDefault(); };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => window.removeEventListener("touchmove", onTouchMove);
  }, []);

  const colRefs = useRef({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Deliberate press-and-hold on touch so a quick swipe scrolls instead of dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const findContainer = (id) => (id in containers ? id : Object.keys(containers).find((k) => containers[k].includes(id)));

  function onDragStart(e) { setActiveId(e.active.id); }
  function onDragOver({ active, over }) {
    if (!over) return;
    const from = findContainer(active.id); const to = findContainer(over.id);
    if (!from || !to || from === to) return;
    setContainers((prev) => {
      const fromIds = prev[from].filter((x) => x !== active.id);
      const toIds = [...prev[to]];
      const overIdx = toIds.indexOf(over.id);
      toIds.splice(overIdx >= 0 ? overIdx : toIds.length, 0, active.id);
      return { ...prev, [from]: fromIds, [to]: toIds };
    });
  }
  async function onDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const from = findContainer(active.id); const to = findContainer(over.id);
    if (!from || !to) return;
    let next = containers;
    if (from === to) {
      const ids = containers[to];
      const oldIdx = ids.indexOf(active.id); const newIdx = ids.indexOf(over.id);
      if (oldIdx !== newIdx && newIdx >= 0) { next = { ...containers, [to]: arrayMove(ids, oldIdx, newIdx) }; setContainers(next); }
    }
    const updates = [];
    Object.entries(next).forEach(([colId, ids]) => ids.forEach((id, i) => {
      // Keep date-derived cards derived: only persist one if it's the card the
      // user actually dragged (which pins it with a real column_id from now on).
      if (id !== active.id && derivedIds.has(id)) return;
      updates.push({ id, column_id: colId, ord: i });
    }));
    await moveCards(updates);
    onChanged?.();
  }

  // Soft-delete a card (the Done-column "×"). Optimistically drop it, then persist.
  async function removeCard(id) {
    setContainers((prev) => {
      const next = {};
      for (const k of Object.keys(prev)) next[k] = prev[k].filter((x) => x !== id);
      return next;
    });
    await deleteItem(id);
    onChanged?.();
  }

  const renderCard = (id, col) => (
    <SortableCard
      key={id}
      id={id}
      display={adaptCard(cardById[id], ctx, summaries, { overdueGlow: glowMap[id] })}
      onOpen={() => onOpenItem?.(cardById[id])}
      canDelete={col?.role === "done"}
      onDelete={() => removeCard(id)}
    />
  );

  // Open the editor for a new card pre-placed in this column; default its lane
  // to the active lane filter when one is set, else shared.
  const addCardTo = (colId) =>
    onOpenItem?.({
      type: "task",
      kind: "routine",
      lane: laneFilter !== "all" ? laneFilter : SLOTS.SHARED,
      column_id: colId,
    });

  const dnd = (children) => (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      {children}
      <DragOverlay>{activeId ? <CardBody display={adaptCard(cardById[activeId], ctx, summaries, { overdueGlow: glowMap[activeId] })} dragging /> : null}</DragOverlay>
    </DndContext>
  );

  let board = null;
  if (!loading && !error) {
    if (isDesktop) {
      board = dnd(
        <div style={{ display: "flex", gap: SPACE[4], alignItems: "stretch" }}>
          {columns.map((col, ci) => {
            const ids = vis(containers[col.id] || []);
            return (
              <Fragment key={col.id}>
                {ci > 0 && (
                  <div aria-hidden style={{ width: 1, alignSelf: "stretch", background: COLORS.surfaceLight, flexShrink: 0 }} />
                )}
                <div style={{ flex: "1 1 0", minWidth: 240 }}>
                  <SectionLabel style={{ padding: "4px 4px 12px" }}>
                    {col.label} <span style={{ opacity: 0.5 }}>{ids.length}</span>
                  </SectionLabel>
                  <Column id={col.id} empty={ids.length === 0}>
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      {ids.length
                        ? ids.map((id) => renderCard(id, col))
                        : <EmptyState style={{ padding: "20px 12px", fontSize: 13 }}>{emptyLine(col.role)}</EmptyState>}
                    </SortableContext>
                  </Column>
                  <AddCard onClick={() => addCardTo(col.id)} />
                </div>
              </Fragment>
            );
          })}
        </div>
      );
    } else {
      board = dnd(
        <>
          {/* Quick-jump chips scroll the matching column into view. */}
          <div className="no-sb" style={{ display: "flex", gap: SPACE[2], marginBottom: SPACE[3], overflowX: "auto", ...fadeX }}>
            {columns.map((c, i) => (
              <Chip key={c.id} active={i === activeCol} variant="soft" onClick={() => { setActiveCol(i); colRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }); }}>
                {c.label} <span style={{ opacity: 0.5 }}>{vis(containers[c.id] || []).length}</span>
              </Chip>
            ))}
          </div>
          {/* Horizontal kanban: ~1.5 columns visible, snap, all mounted for cross-column
              drag. Generous padding all round so the exciting glow/shadow (which bleeds
              ~20-30px outside a card) isn't clipped at the scroll container's edges. */}
          <div className="no-sb" style={{ display: "flex", gap: SPACE[4], overflowX: "auto", scrollSnapType: activeId ? "none" : "x mandatory", WebkitOverflowScrolling: "touch", padding: `${SPACE[4]}px ${SPACE[4]}px ${SPACE[5]}px` }}>
            {columns.map((col, ci) => {
              const ids = vis(containers[col.id] || []);
              return (
                <Fragment key={col.id}>
                  {ci > 0 && <div aria-hidden style={{ width: 1, alignSelf: "stretch", background: COLORS.surfaceLight, flexShrink: 0 }} />}
                  <div ref={(el) => (colRefs.current[col.id] = el)} style={{ flex: "0 0 min(74vw, 268px)", minWidth: 0, scrollSnapAlign: "start" }}>
                    <SectionLabel style={{ padding: "2px 4px 10px" }}>
                      {col.label} <span style={{ opacity: 0.5 }}>{ids.length}</span>
                    </SectionLabel>
                    <Column id={col.id} empty={ids.length === 0}>
                      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        {ids.length
                          ? ids.map((id) => renderCard(id, col))
                          : <EmptyState style={{ padding: "20px 12px", fontSize: 13 }}>{emptyLine(col.role)}</EmptyState>}
                      </SortableContext>
                    </Column>
                    <AddCard onClick={() => addCardTo(col.id)} />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </>
      );
    }
  }

  return (
    <div style={{ padding: isDesktop ? `0 ${SPACE[5]}px` : `0 ${SPACE[4]}px` }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: SPACE[3] }}>
        <PillButton variant="ghost" onClick={() => setShowCols(true)}>✎ Edit columns</PillButton>
      </div>
      {loading && <EmptyState>Rounding up your cards…</EmptyState>}
      {error && (
        <EmptyState style={{ fontStyle: "normal" }}>
          Couldn’t load your cards.{" "}
          <button onClick={load} className="focusable" style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Try again</button>
        </EmptyState>
      )}
      {!loading && !error && board}
      {showCols && (
        <ColumnsEditor columns={columns} spaceId={ctx?.space?.id} onClose={() => setShowCols(false)} onChanged={async () => { await load(); onChanged?.(); }} />
      )}
    </div>
  );
};

export default CardsView;
