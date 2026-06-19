import { COLORS, fxSeed } from "../theme";
import { timeProximity } from "../components/primitives.jsx";
import {
  laneLabel as resolveLaneLabel,
  laneColor as resolveLaneColor,
} from "../lib/lanes.js";

export function formatDue(dueAt) {
  if (!dueAt) return { due: null, sleeps: null };
  if (dueAt === "today") return { due: "Today", sleeps: 0 };
  const rel = /^\+(\d+)d$/.exec(dueAt);
  if (rel) return { due: `In ${rel[1]} days`, sleeps: Number(rel[1]) };
  const d = new Date(dueAt);
  if (!isNaN(d.getTime())) {
    const days = Math.round((d - new Date()) / 86400000);
    if (days <= 0) return { due: "Today", sleeps: 0 };
    if (days === 1) return { due: "Tomorrow", sleeps: 1 };
    return { due: `In ${days} days`, sleeps: days };
  }
  return { due: String(dueAt), sleeps: null };
}

// Adapt a data-layer item into the props the kanban card expects.

export function adaptCard(item, ctx, summaries = {}, opts = {}) {
  // An overdue "keep reminding me" task overrides the card's normal look with a
  // warning glow: amber (1–2 days late, slow breathe) or red (3+, urgent pulse).
  const overdueGlow = opts.overdueGlow; // 'amber' | 'red' | undefined
  const exciting = overdueGlow ? true : item.kind === "exciting";
  const { due, sleeps } = formatDue(item.due_at || item.start_at);
  const laneColor = resolveLaneColor(item.lane, ctx.people, COLORS);
  return {
    id: item.id,
    title: item.title,
    laneLabel: resolveLaneLabel(item.lane, ctx.viewerSlot, ctx.space),
    laneColor,
    nodeColor: overdueGlow ? COLORS[overdueGlow] : item.color || laneColor,
    due,
    sleeps: item.countdown && sleeps && sleeps > 0 ? sleeps : null,
    exciting,
    variant: overdueGlow ? (overdueGlow === "red" ? "pulse" : "glow") : item.exciting_fx || "glow",
    seed: fxSeed(item.id),
    emoji: item.emoji,
    subtasks: item.subtasks || null,
    proximity: timeProximity(item),
    completion: item.subtasks && item.subtasks.total ? item.subtasks.done / item.subtasks.total : 0,
    linkedLists: (item.linked_list_ids || []).map((id) => summaries[id]).filter(Boolean),
  };
}
