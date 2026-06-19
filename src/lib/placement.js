// Date-driven board placement — DERIVED, never stored (like lanes / recurrence).
// CardsView calls these to decide, at render time, where a dated item shows on
// the board and whether an overdue "keep reminding me" task should glow.
//
// Two behaviours:
//  - Events surface as cards near their date: in the `today` column on the day,
//    the `soon` column the day before, then drop off the board afterwards.
//  - Tasks with `persistent_until_done` that go overdue escalate: 1–2 days late →
//    `soon` + amber glow; 3+ days late → `someday` + red glow. (Deliberately moves
//    OUT of Today once ignored, but flags it — a louder nudge, not a quieter one.)
//
// Nothing here writes data; dragging a card is what persists a real column_id.

import { occursOn } from "./recurrence.js";

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Whole-day signed delta from `now` to `at` (midnight-aligned): 0 = same day,
 *  +1 = tomorrow, -1 = yesterday. Mirrors DatesView's `sleepsUntil`. */
export function dayDelta(at, now = new Date()) {
  return Math.round((startOfDay(at) - startOfDay(now)) / 86400000);
}

/** Find the column carrying a protected `role`. Falls back to a label match for
 *  'soon'/'today' so spaces that haven't run the role migration still work. */
export function findRoleColumn(columns, role) {
  if (!Array.isArray(columns)) return null;
  const byRole = columns.find((c) => c.role === role);
  if (byRole) return byRole;
  if (role === "soon" || role === "today") {
    return columns.find((c) => (c.label || "").toLowerCase() === role) || null;
  }
  return null;
}

/** Overdue escalation for a "keep reminding me" task. Returns the target column
 *  role + glow colour, or null when it doesn't apply (not persistent, already
 *  done, no due date, or not yet overdue). */
export function overdueReminder(item, now = new Date()) {
  if (!item || !item.persistent_until_done || item.state === "done" || !item.due_at) return null;
  const overdue = -dayDelta(item.due_at, now); // days past due (>0 = late)
  if (overdue <= 0) return null;
  if (overdue >= 3) return { role: "someday", glow: "red" };
  return { role: "soon", glow: "amber" }; // 1–2 days late
}

/** Which board column an un-carded event surfaces in by proximity, or null when
 *  it shouldn't appear (already carded, not an event, or not within a day). */
export function eventBoardRole(item, now = new Date()) {
  if (!item || item.type !== "event" || item.column_id) return null;
  if (item.recur_freq) {
    const tomorrow = new Date(startOfDay(now).getTime() + 86400000);
    if (occursOn(item, now)) return "today";
    if (occursOn(item, tomorrow)) return "soon";
    return null;
  }
  if (!item.start_at) return null;
  const delta = dayDelta(item.start_at, now);
  if (delta === 0) return "today";
  if (delta === 1) return "soon";
  return null;
}
