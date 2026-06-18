// Data-access layer. Views call THIS, never Supabase directly.
// Two backends behind one interface: real Supabase, or an in-memory mock
// (used automatically when no Supabase env is configured).
import { supabase, isMockMode } from "./supabase.js";
import { SLOTS } from "./lanes.js";

// Build an ISO datetime offset from today (keeps mock events near "now").
function isoOffset(days, h = 9, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Mock backend — slot-based seed data so the viewer-aware lane logic is real
// even offline. Mirrors the shapes the shell renders.
// ---------------------------------------------------------------------------
const mock = {
  space: { id: "mock", name: "Mock Space", label_style: "me_you_us", custom_labels: null },
  people: {
    partner_a: { id: "pa", slot: SLOTS.A, display_name: "You", lane_color: "#6BB5E8" },
    partner_b: { id: "pb", slot: SLOTS.B, display_name: "Them", lane_color: "#B98CE8" },
  },
  viewerSlot: SLOTS.A,
  columns: [
    { id: "c1", label: "Today", ord: 0, role: "none" },
    { id: "c2", label: "Soon", ord: 1, role: "none" },
    { id: "c3", label: "Someday", ord: 2, role: "someday" },
    { id: "c4", label: "Done", ord: 3, role: "done" },
  ],
  items: [
    // Dated tasks carry ISO due_at + a column_id, so they are field-driven onto
    // BOTH the board (Cards) and the calendar (Dates) — "one thing, three views".
    { id: "i1", type: "task", title: "Book dentist appointment", lane: SLOTS.A, kind: "routine", column_id: "c1", ord: 0, due_at: isoOffset(0, 10, 0) },
    { id: "i2", type: "task", title: "Pick up cat food", lane: SLOTS.SHARED, kind: "routine", column_id: "c1", ord: 1, due_at: isoOffset(0, 12, 0) },
    { id: "i3", type: "task", title: "Anniversary dinner", lane: SLOTS.SHARED, kind: "exciting", emoji: "💕", column_id: "c2", ord: 0, due_at: isoOffset(12, 19, 0), countdown: true },
    { id: "i4", type: "task", title: "Japan trip research", lane: SLOTS.SHARED, kind: "exciting", emoji: "🇯🇵", column_id: "c3", ord: 0 },
    // Subtasks of the card i4 — child items (parent_item_id), excluded from top-level views.
    { id: "i4a", type: "task", title: "Compare flight prices", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 0, state: "done" },
    { id: "i4b", type: "task", title: "Shortlist ryokan", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 1, state: "open" },
    { id: "i4c", type: "task", title: "Rough itinerary", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 2, state: "open" },
    // A list attached to the event ev4 ("The gig") — also child items of the parent.
    { id: "ev4a", type: "shopping", title: "Tickets", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 0, state: "open" },
    { id: "ev4b", type: "shopping", title: "Earplugs", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 1, state: "open" },
    { id: "ev4c", type: "shopping", title: "Cash for merch", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 2, state: "open" },
    { id: "ev1", type: "event", title: "Standup", lane: SLOTS.SHARED, kind: "routine", start_at: isoOffset(0, 9, 0) },
    { id: "ev2", type: "event", title: "Dentist", lane: SLOTS.A, kind: "routine", start_at: isoOffset(0, 14, 30) },
    { id: "ev3", type: "event", title: "Date night", lane: SLOTS.SHARED, kind: "exciting", emoji: "💕", start_at: isoOffset(3, 19, 0), countdown: true },
    { id: "ev4", type: "event", title: "The gig", lane: SLOTS.SHARED, kind: "exciting", emoji: "🎸", start_at: isoOffset(5, 20, 0), countdown: true },
    { id: "ev5", type: "event", title: "Bins out", lane: SLOTS.B, kind: "routine", start_at: isoOffset(1, 8, 0) },
    { id: "s1", type: "shopping", title: "Cat food", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "x2", store: "No Frills", checked: false },
    { id: "s2", type: "shopping", title: "Bin bags", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", store: "No Frills", checked: false },
    { id: "s3", type: "shopping", title: "Oat milk", lane: SLOTS.A, kind: "routine", list_id: "l1", store: "No Frills", checked: false },
    { id: "s4", type: "shopping", title: "Chicken thighs", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "500g", store: "Grace Meat", checked: false },
    { id: "s5", type: "shopping", title: "Eggs", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "x12", store: "Metro", checked: false },
    { id: "s6", type: "shopping", title: "Bathroom sealant", lane: SLOTS.B, kind: "routine", list_id: "l2", store: "Home Depot", checked: false },
    { id: "s7", type: "shopping", title: "Light bulbs (bayonet)", lane: SLOTS.SHARED, kind: "routine", list_id: "l2", qty: "x4", store: "Home Depot", checked: false },
    { id: "s8", type: "shopping", title: "Return library books", lane: SLOTS.A, kind: "routine", list_id: "l3", checked: false },
    { id: "s9", type: "shopping", title: "Cancel old gym membership", lane: SLOTS.B, kind: "routine", list_id: "l3", checked: false },
  ],
  lists: [
    { id: "l1", name: "Groceries", emoji: "🛒", has_stores: true, ord: 0 },
    { id: "l2", name: "House", emoji: "🏠", has_stores: true, ord: 1 },
    { id: "l3", name: "Keep forgetting", emoji: "🤔", has_stores: false, ord: 2 },
  ],
  stores: [
    { id: "st1", name: "No Frills" },
    { id: "st2", name: "Grace Meat" },
    { id: "st3", name: "Metro" },
    { id: "st4", name: "Home Depot" },
  ],
  bills: [
    { id: "b1", name: "Rent", amount: 1200, frequency: "monthly", next_due_at: "1st Jul" },
    { id: "b2", name: "Netflix", amount: 10.99, frequency: "monthly", next_due_at: "3rd Jul" },
  ],
  goals: [
    { id: "g1", name: "Japan 2027", emoji: "🇯🇵", target: 4000, linked_item_id: "i4" },
    { id: "g2", name: "New sofa", emoji: "🛋️", target: 800, linked_item_id: null },
  ],
  contributions: [
    { id: "gc1", goal_id: "g1", amount: 1240, by: "pa" },
    { id: "gc2", goal_id: "g2", amount: 350, by: "pb" },
  ],
  expenses: [
    { id: "e1", type: "expense", amount: 25, paid_by: "pa", cost_attribution: "split", spent_at: "last week" },
  ],
  settlements: [],
};

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Boot data every view needs: the space, both people, and the viewer's slot. */
export async function getBootstrap() {
  if (isMockMode) {
    return { space: mock.space, people: mock.people, viewerSlot: mock.viewerSlot };
  }
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const { data: people } = await supabase.from("person").select("*");
  const { data: space } = await supabase.from("space").select("*").single();
  const bySlot = Object.fromEntries((people || []).map((p) => [p.slot, p]));
  const viewer = (people || []).find((p) => p.auth_user_id === uid);
  return { space, people: bySlot, viewerSlot: viewer?.slot || SLOTS.A };
}

export async function listColumns() {
  if (isMockMode) return mock.columns;
  const { data } = await supabase.from("board_column").select("*").order("ord");
  return data || [];
}

// Views are FIELD-DRIVEN, not type-filtered: an item belongs to a view based on
// which placement fields are populated, so one item can appear in several views.
// All top-level queries exclude children (parent_item_id), which belong to a card
// or event (subtasks / attached lists) and surface via listChildren instead.

/** Board cards = anything placed in a column (any type). Grouped by column client-side. */
export async function listCards() {
  if (isMockMode)
    return mock.items.filter((i) => i.column_id && !i.parent_item_id && !i.deleted_at);
  const { data } = await supabase
    .from("item")
    .select("*")
    .not("column_id", "is", null)
    .is("parent_item_id", null)
    .is("deleted_at", null);
  return data || [];
}

/** Calendar items = anything with a date (events, and dated tasks). */
export async function listCalendar() {
  if (isMockMode)
    return mock.items.filter((i) => (i.start_at || i.due_at) && !i.parent_item_id && !i.deleted_at);
  const { data } = await supabase
    .from("item")
    .select("*")
    .or("start_at.not.is.null,due_at.not.is.null")
    .is("parent_item_id", null)
    .is("deleted_at", null);
  return data || [];
}

/** Children of a card/event = its subtasks / attached-list members, ordered. */
export async function listChildren(parentId) {
  if (isMockMode)
    return mock.items
      .filter((i) => i.parent_item_id === parentId && !i.deleted_at)
      .sort((a, b) => (a.ord || 0) - (b.ord || 0));
  const { data } = await supabase
    .from("item")
    .select("*")
    .eq("parent_item_id", parentId)
    .is("deleted_at", null)
    .order("ord");
  return data || [];
}

/** Subtask progress for many parents in one shot → { [parentId]: {done, total} }. */
export async function getSubtaskProgress(parentIds) {
  if (!parentIds || parentIds.length === 0) return {};
  const children = isMockMode
    ? mock.items.filter((i) => parentIds.includes(i.parent_item_id) && !i.deleted_at)
    : (
        await supabase
          .from("item")
          .select("parent_item_id,state")
          .in("parent_item_id", parentIds)
          .is("deleted_at", null)
      ).data || [];
  const out = {};
  for (const c of children) {
    const p = (out[c.parent_item_id] ||= { done: 0, total: 0 });
    p.total += 1;
    if (c.state === "done") p.done += 1;
  }
  return out;
}

export async function listLists() {
  if (isMockMode) return mock.lists;
  const { data } = await supabase.from("list").select("*").order("ord");
  return data || [];
}

/** List items = anything filed into a list (any type). Excludes attached children. */
export async function listListItems() {
  if (isMockMode)
    return mock.items.filter((i) => i.list_id && !i.parent_item_id && !i.deleted_at);
  const { data } = await supabase
    .from("item")
    .select("*")
    .not("list_id", "is", null)
    .is("parent_item_id", null)
    .is("deleted_at", null);
  return data || [];
}

export async function listStores() {
  if (isMockMode) return mock.stores;
  const { data } = await supabase.from("store").select("*").order("name");
  return data || [];
}

export async function createStore(store) {
  if (isMockMode) {
    const row = { id: `st-${Date.now()}`, ...store };
    mock.stores.push(row);
    return row;
  }
  const { data } = await supabase.from("store").insert(store).select().single();
  return data;
}

export async function createList(list) {
  if (isMockMode) {
    const row = { id: `l-${Date.now()}`, has_stores: true, ord: mock.lists.length, ...list };
    mock.lists.push(row);
    return row;
  }
  const { data } = await supabase.from("list").insert(list).select().single();
  return data;
}

// --- Kanban column management ------------------------------------------------
export async function createColumn(col) {
  if (isMockMode) {
    const row = { id: `c-${Date.now()}`, role: "none", ord: mock.columns.length, ...col };
    mock.columns.push(row);
    return row;
  }
  const { data } = await supabase.from("board_column").insert(col).select().single();
  return data;
}

export async function updateColumn(id, patch) {
  if (isMockMode) {
    const c = mock.columns.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    return c;
  }
  const { data } = await supabase.from("board_column").update(patch).eq("id", id).select().single();
  return data;
}

/** Delete a column; its cards move to the first remaining column. */
export async function deleteColumn(id) {
  if (isMockMode) {
    const remaining = mock.columns.filter((c) => c.id !== id);
    const target = remaining[0];
    if (target) mock.items.forEach((it) => { if (it.column_id === id) it.column_id = target.id; });
    mock.columns = remaining;
    return;
  }
  const { data: cols } = await supabase.from("board_column").select("id").neq("id", id).order("ord").limit(1);
  const target = cols && cols[0];
  if (target) await supabase.from("item").update({ column_id: target.id }).eq("column_id", id);
  await supabase.from("board_column").delete().eq("id", id);
}

export async function setColumnOrder(orderedIds) {
  if (isMockMode) {
    orderedIds.forEach((id, i) => { const c = mock.columns.find((x) => x.id === id); if (c) c.ord = i; });
    mock.columns.sort((a, b) => a.ord - b.ord);
    return;
  }
  await Promise.all(orderedIds.map((id, i) => supabase.from("board_column").update({ ord: i }).eq("id", id)));
}

export async function getFinance() {
  const goals = isMockMode ? mock.goals : (await supabase.from("savings_goal").select("*")).data || [];
  const contributions = isMockMode
    ? mock.contributions
    : (await supabase.from("goal_contribution").select("*")).data || [];
  const bills = isMockMode ? mock.bills : (await supabase.from("bill").select("*")).data || [];

  const savedByGoal = {};
  for (const c of contributions) savedByGoal[c.goal_id] = (savedByGoal[c.goal_id] || 0) + Number(c.amount);
  const goalsWithProgress = goals.map((g) => ({ ...g, saved: savedByGoal[g.id] || 0 }));

  return { bills, goals: goalsWithProgress, balance: await computeBalance() };
}

/**
 * Who-owes-who, derived (never stored). Split expenses divide 50/50;
 * each partner "owns" the half they didn't pay. Settlements net it down.
 * Returns { net } where net > 0 means partner_b owes partner_a.
 */
export async function computeBalance() {
  const expenses = isMockMode
    ? [...mock.expenses, ...mock.items.filter((i) => i.type === "expense" && !i.deleted_at)]
    : (await supabase.from("item").select("*").eq("type", "expense").is("deleted_at", null)).data || [];
  const settlements = isMockMode
    ? mock.settlements
    : (await supabase.from("settlement").select("*")).data || [];

  const people = isMockMode ? mock.people : null; // ids resolved by caller in real mode
  const aId = people ? people.partner_a.id : "pa";

  let net = 0; // positive => B owes A
  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    if (e.cost_attribution === "split") {
      net += e.paid_by === aId ? amt / 2 : -amt / 2;
    } else if (e.cost_attribution === "partner_a") {
      net += e.paid_by === aId ? 0 : amt; // A's cost paid by B => B is owed (net down)
    } else if (e.cost_attribution === "partner_b") {
      net += e.paid_by === aId ? -amt : 0;
    }
  }
  for (const s of settlements) net += s.to_person === aId ? Number(s.amount) : -Number(s.amount);
  return { net };
}

// --- Mutations (real-mode; no-ops in mock so the UI stays optimistic) ------

export async function createItem(item) {
  if (isMockMode) {
    const row = { id: `mock-${Date.now()}`, ord: Date.now(), ...item };
    mock.items.push(row);
    return row;
  }
  const { data } = await supabase.from("item").insert(item).select().single();
  return data;
}

export async function updateItem(id, patch) {
  if (isMockMode) {
    const row = mock.items.find((i) => i.id === id);
    if (row) Object.assign(row, patch);
    return row;
  }
  const { data } = await supabase.from("item").update(patch).eq("id", id).select().single();
  return data;
}

/** Soft-delete. */
export async function deleteItem(id) {
  return updateItem(id, { deleted_at: new Date().toISOString() });
}

/** Persist kanban positions after a drag: [{ id, column_id, ord }]. */
export async function moveCards(updates) {
  if (isMockMode) {
    for (const u of updates) {
      const row = mock.items.find((i) => i.id === u.id);
      if (row) { row.column_id = u.column_id; row.ord = u.ord; }
    }
    return;
  }
  await Promise.all(
    updates.map((u) =>
      supabase.from("item").update({ column_id: u.column_id, ord: u.ord }).eq("id", u.id)
    )
  );
}

/** Realtime subscription. Returns an unsubscribe fn. No-op in mock mode. */
export function subscribe(table, onChange) {
  if (isMockMode) return () => {};
  const channel = supabase
    .channel(`realtime:${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
