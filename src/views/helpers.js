import { COLORS } from "../theme";
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

export function adaptCard(item, ctx) {
  const exciting = item.kind === "exciting";
  const { due, sleeps } = formatDue(item.due_at);
  return {
    id: item.id,
    title: item.title,
    laneLabel: resolveLaneLabel(item.lane, ctx.viewerSlot, ctx.space),
    laneColor: resolveLaneColor(item.lane, ctx.people, COLORS),
    due,
    sleeps: item.countdown && sleeps && sleeps > 0 ? sleeps : null,
    exciting,
    emoji: item.emoji,
    subtasks: item.subtasks || null,
  };
}
