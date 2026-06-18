// Recurrence is embedded on the item: recur_freq ('daily'|'weekly'|'monthly'),
// recur_until (optional ISO end), recur_except (array of 'YYYY-MM-DD' keys to skip).
// Occurrences are EXPANDED on read for the visible window — never stored.

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const dateKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const anchorOf = (item) => new Date(item.start_at || item.due_at);

/** Does this recurring item have an occurrence on `day`? */
export function occursOn(item, day) {
  if (!item || !item.recur_freq) return false;
  const base = anchorOf(item);
  if (isNaN(base.getTime())) return false;
  const d0 = startOfDay(day);
  const b0 = startOfDay(base);
  if (d0 < b0) return false;
  if (item.recur_until && d0 > startOfDay(new Date(item.recur_until))) return false;
  if (Array.isArray(item.recur_except) && item.recur_except.includes(dateKey(d0))) return false;
  switch (item.recur_freq) {
    case "daily": return true;
    case "weekly": return d0.getDay() === b0.getDay();
    case "monthly": return d0.getDate() === b0.getDate();
    default: return false;
  }
}

/** A virtual occurrence of `item` on `day`: dates shifted to that day, keeping
 *  time-of-day (and duration). Carries `_master` + `_recurring`; not persisted. */
export function occurrenceFor(item, day) {
  const occ = { ...item, _recurring: true, _master: item, id: `${item.id}__${dateKey(day)}` };
  const onDay = (iso) => { const t = new Date(iso); const n = new Date(day); n.setHours(t.getHours(), t.getMinutes(), 0, 0); return n.toISOString(); };
  if (item.start_at) {
    occ.start_at = onDay(item.start_at);
    if (item.end_at) occ.end_at = new Date(new Date(occ.start_at).getTime() + (new Date(item.end_at) - new Date(item.start_at))).toISOString();
  } else if (item.due_at) {
    occ.due_at = onDay(item.due_at);
  }
  return occ;
}

/** Items occurring on `day`: recurring items expand to occurrences; non-recurring
 *  items included when `dateMatch(item, day)` is true. */
export function itemsOnDay(items, day, dateMatch) {
  const out = [];
  for (const it of items) {
    if (it.recur_freq) { if (occursOn(it, day)) out.push(occurrenceFor(it, day)); }
    else if (dateMatch(it, day)) out.push(it);
  }
  return out;
}
