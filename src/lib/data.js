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
    { id: "c3", label: "Someday", ord: 0, role: "someday" },
    { id: "c2", label: "Soon", ord: 1, role: "none" },
    { id: "c1", label: "Today", ord: 2, role: "none" },
    { id: "c4", label: "Done", ord: 3, role: "done" },
  ],
  items: [
    // --- Board tasks (column_id) — some also dated, so they're field-driven onto
    // BOTH the board (Cards) and the calendar (Dates): "one thing, three views". ---
    { id: "i1", type: "task", title: "Book dentist appointment", lane: SLOTS.A, kind: "routine", column_id: "c1", ord: 0, due_at: isoOffset(0, 10, 0) },
    { id: "i2", type: "task", title: "Pick up cat food", lane: SLOTS.SHARED, kind: "routine", column_id: "c1", ord: 1, due_at: isoOffset(0, 12, 0) },
    { id: "i3", type: "task", title: "Anniversary dinner", lane: SLOTS.SHARED, kind: "exciting", emoji: "💕", column_id: "c2", ord: 0, due_at: isoOffset(12, 19, 0), countdown: true },
    { id: "i4", type: "task", title: "Japan trip research", lane: SLOTS.SHARED, kind: "exciting", emoji: "🇯🇵", column_id: "c3", ord: 0 },
    { id: "t5", type: "task", title: "Reply to landlord", lane: SLOTS.A, kind: "routine", column_id: "c1", ord: 2, due_at: isoOffset(0, 16, 0) },
    { id: "t6", type: "task", title: "Renew passport", lane: SLOTS.A, kind: "routine", column_id: "c2", ord: 1 },
    { id: "t7", type: "task", title: "Fix the leaky tap", lane: SLOTS.B, kind: "routine", column_id: "c2", ord: 2 },
    { id: "t8", type: "task", title: "Plan summer holiday", lane: SLOTS.SHARED, kind: "exciting", emoji: "✈️", column_id: "c3", ord: 1, color: "#E8C16B" },
    { id: "t9", type: "task", title: "Clear the loft", lane: SLOTS.B, kind: "routine", column_id: "c3", ord: 2 },
    { id: "t10", type: "task", title: "Pay car insurance", lane: SLOTS.A, kind: "routine", column_id: "c4", ord: 0, state: "done" },
    { id: "t11", type: "task", title: "Tidy the garage", lane: SLOTS.SHARED, kind: "routine", column_id: "c4", ord: 1, state: "done" },
    { id: "t12", type: "task", title: "Email the accountant", lane: SLOTS.A, kind: "routine", column_id: "c1", ord: 3 },
    { id: "t13", type: "task", title: "Defrost something for dinner", lane: SLOTS.SHARED, kind: "routine", column_id: "c1", ord: 4 },
    { id: "t14", type: "task", title: "Service the car", lane: SLOTS.B, kind: "routine", column_id: "c2", ord: 3, due_at: isoOffset(8, 9, 0) },
    { id: "t15", type: "task", title: "Write best man speech", lane: SLOTS.A, kind: "exciting", emoji: "🎤", column_id: "c2", ord: 4 },
    { id: "t16", type: "task", title: "Learn to surf", lane: SLOTS.SHARED, kind: "exciting", emoji: "🏄", column_id: "c3", ord: 3 },
    { id: "t17", type: "task", title: "Declutter the wardrobe", lane: SLOTS.A, kind: "routine", column_id: "c3", ord: 4 },
    { id: "t18", type: "task", title: "Send thank-you cards", lane: SLOTS.SHARED, kind: "routine", column_id: "c4", ord: 2, state: "done" },
    { id: "t19", type: "task", title: "Book the MOT", lane: SLOTS.B, kind: "routine", column_id: "c4", ord: 3, state: "done" },
    // A card that REFERENCES standing lists (linked_list_ids) — opening it shows them inline.
    { id: "t20", type: "task", title: "Weekend errands", lane: SLOTS.SHARED, kind: "routine", column_id: "c2", ord: 5, linked_list_ids: ["l1", "l5"] },
    // Subtasks: t14 Service the car (0/2), t15 Best man speech (1/2).
    { id: "t14a", type: "task", title: "Find a garage", lane: SLOTS.B, kind: "routine", parent_item_id: "t14", ord: 0, state: "open" },
    { id: "t14b", type: "task", title: "Book a slot", lane: SLOTS.B, kind: "routine", parent_item_id: "t14", ord: 1, state: "open" },
    { id: "t15a", type: "task", title: "Gather embarrassing stories", lane: SLOTS.A, kind: "routine", parent_item_id: "t15", ord: 0, state: "done" },
    { id: "t15b", type: "task", title: "Practice out loud", lane: SLOTS.A, kind: "routine", parent_item_id: "t15", ord: 1, state: "open" },

    // Subtasks of i4 (Japan research) — child items drive the progress bar + completion fill (1/3).
    { id: "i4a", type: "task", title: "Compare flight prices", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 0, state: "done" },
    { id: "i4b", type: "task", title: "Shortlist ryokan", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 1, state: "open" },
    { id: "i4c", type: "task", title: "Rough itinerary", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "i4", ord: 2, state: "open" },
    // Subtasks of t6 (Renew passport) — 2/3 done.
    { id: "t6a", type: "task", title: "Passport photos", lane: SLOTS.A, kind: "routine", parent_item_id: "t6", ord: 0, state: "done" },
    { id: "t6b", type: "task", title: "Fill in the form", lane: SLOTS.A, kind: "routine", parent_item_id: "t6", ord: 1, state: "done" },
    { id: "t6c", type: "task", title: "Post it off", lane: SLOTS.A, kind: "routine", parent_item_id: "t6", ord: 2, state: "open" },
    // A list attached to the event ev4 ("The gig") — child items of the parent.
    { id: "ev4a", type: "shopping", title: "Tickets", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 0, state: "open" },
    { id: "ev4b", type: "shopping", title: "Earplugs", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 1, state: "open" },
    { id: "ev4c", type: "shopping", title: "Cash for merch", lane: SLOTS.SHARED, kind: "routine", parent_item_id: "ev4", ord: 2, state: "open" },

    // --- Dated tasks (due_at, no start_at) — minimum-size blocks on the timeline. ---
    { id: "d1", type: "task", title: "Water the plants", lane: SLOTS.SHARED, kind: "routine", due_at: isoOffset(0, 8, 0) },
    { id: "d2", type: "task", title: "Call mum", lane: SLOTS.A, kind: "routine", due_at: isoOffset(1, 18, 0) },
    { id: "d3", type: "task", title: "Submit expenses", lane: SLOTS.B, kind: "routine", due_at: isoOffset(2, 17, 0) },

    // --- Events (start_at + end_at) — varied durations, lanes, and overlaps. ---
    { id: "ev1", type: "event", title: "Standup", lane: SLOTS.SHARED, kind: "routine", start_at: isoOffset(0, 9, 0), end_at: isoOffset(0, 9, 30), recur_freq: "daily" },
    { id: "ev6", type: "event", title: "Team sync", lane: SLOTS.SHARED, kind: "routine", start_at: isoOffset(0, 11, 0), end_at: isoOffset(0, 12, 0) },
    { id: "ev7", type: "event", title: "1:1 with Sam", lane: SLOTS.A, kind: "routine", start_at: isoOffset(0, 11, 30), end_at: isoOffset(0, 12, 15) }, // overlaps ev6 → packed columns
    { id: "ev2", type: "event", title: "Dentist", lane: SLOTS.A, kind: "routine", start_at: isoOffset(0, 14, 30), end_at: isoOffset(0, 15, 30) },
    { id: "ev8", type: "event", title: "Gym", lane: SLOTS.B, kind: "routine", start_at: isoOffset(0, 18, 0), end_at: isoOffset(0, 19, 0) },
    { id: "ev5", type: "event", title: "Bins out", lane: SLOTS.B, kind: "routine", start_at: isoOffset(1, 8, 0), end_at: isoOffset(1, 8, 15), recur_freq: "weekly" },
    { id: "ev9", type: "event", title: "Yoga", lane: SLOTS.SHARED, kind: "routine", start_at: isoOffset(1, 7, 0), end_at: isoOffset(1, 8, 0), recur_freq: "weekly" },
    // An event referencing the Groceries list — the "go shopping" trip shows the live list.
    { id: "ev12", type: "event", title: "Grocery run", lane: SLOTS.SHARED, kind: "routine", start_at: isoOffset(1, 10, 0), end_at: isoOffset(1, 11, 0), linked_list_ids: ["l1"] },
    { id: "ev11", type: "event", title: "Farmers market", lane: SLOTS.B, kind: "exciting", emoji: "🥕", start_at: isoOffset(2, 9, 0), end_at: isoOffset(2, 11, 0) },
    { id: "ev10", type: "event", title: "Parents visiting", lane: SLOTS.SHARED, kind: "exciting", emoji: "🏡", start_at: isoOffset(2, 12, 0), end_at: isoOffset(2, 18, 0), countdown: true, color: "#8FBFA3" },
    { id: "ev3", type: "event", title: "Date night", lane: SLOTS.SHARED, kind: "exciting", emoji: "💕", start_at: isoOffset(3, 19, 0), end_at: isoOffset(3, 22, 0), countdown: true },
    { id: "ev4", type: "event", title: "The gig", lane: SLOTS.SHARED, kind: "exciting", emoji: "🎸", start_at: isoOffset(5, 20, 0), end_at: isoOffset(5, 23, 0), countdown: true },

    // --- Shopping items (list_id) — across lists and stores; one checked for the Done section. ---
    { id: "s1", type: "shopping", title: "Cat food", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "x2", store: "No Frills", checked: false },
    { id: "s2", type: "shopping", title: "Bin bags", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", store: "No Frills", checked: false },
    { id: "s3", type: "shopping", title: "Oat milk", lane: SLOTS.A, kind: "routine", list_id: "l1", store: "No Frills", checked: false },
    { id: "s4", type: "shopping", title: "Chicken thighs", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "500g", store: "Grace Meat", checked: false },
    { id: "s5", type: "shopping", title: "Eggs", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "x12", store: "Metro", checked: false },
    { id: "s10", type: "shopping", title: "Coffee beans", lane: SLOTS.A, kind: "routine", list_id: "l1", store: "Metro", checked: false },
    { id: "s14", type: "shopping", title: "Sourdough", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", store: "No Frills", checked: true, checked_at: isoOffset(0, 8, 30) },
    { id: "s6", type: "shopping", title: "Bathroom sealant", lane: SLOTS.B, kind: "routine", list_id: "l2", store: "Home Depot", checked: false },
    { id: "s7", type: "shopping", title: "Light bulbs (bayonet)", lane: SLOTS.SHARED, kind: "routine", list_id: "l2", qty: "x4", store: "Home Depot", checked: false },
    { id: "s11", type: "shopping", title: "Sponges", lane: SLOTS.A, kind: "routine", list_id: "l2", store: "Metro", checked: false },
    { id: "s12", type: "shopping", title: "Wood screws", lane: SLOTS.B, kind: "routine", list_id: "l4", qty: "x40", store: "Home Depot", checked: false },
    { id: "s13", type: "shopping", title: "Matte white paint", lane: SLOTS.SHARED, kind: "routine", list_id: "l4", qty: "2.5L", store: "Paint Co", checked: false },
    { id: "s15", type: "shopping", title: "Bananas", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", store: "No Frills", checked: false },
    { id: "s16", type: "shopping", title: "Pasta", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", qty: "x3", store: "Metro", checked: false },
    { id: "s17", type: "shopping", title: "Olive oil", lane: SLOTS.A, kind: "routine", list_id: "l1", store: "Metro", checked: false },
    { id: "s18", type: "shopping", title: "Dishwasher tablets", lane: SLOTS.SHARED, kind: "routine", list_id: "l1", store: "Costco", checked: false },
    { id: "s19", type: "shopping", title: "Curtain hooks", lane: SLOTS.A, kind: "routine", list_id: "l2", store: "Home Depot", checked: false },
    { id: "s20", type: "shopping", title: "AA batteries", lane: SLOTS.SHARED, kind: "routine", list_id: "l2", qty: "x8", store: "Costco", checked: false },
    { id: "s21", type: "shopping", title: "Sandpaper", lane: SLOTS.B, kind: "routine", list_id: "l4", store: "Home Depot", checked: false },
    { id: "s22", type: "shopping", title: "Wall plugs", lane: SLOTS.B, kind: "routine", list_id: "l4", checked: false },
    { id: "s25", type: "shopping", title: "Hand soap refill", lane: SLOTS.SHARED, kind: "routine", list_id: "l5", checked: false },
    { id: "s26", type: "shopping", title: "Paracetamol", lane: SLOTS.A, kind: "routine", list_id: "l5", checked: false },
    { id: "s27", type: "shopping", title: "Plasters", lane: SLOTS.SHARED, kind: "routine", list_id: "l5", checked: true, checked_at: isoOffset(-1, 9, 0) },
    { id: "s8", type: "shopping", title: "Return library books", lane: SLOTS.A, kind: "routine", list_id: "l3", checked: false },
    { id: "s9", type: "shopping", title: "Cancel old gym membership", lane: SLOTS.B, kind: "routine", list_id: "l3", checked: false },
    { id: "s23", type: "shopping", title: "Renew library card", lane: SLOTS.A, kind: "routine", list_id: "l3", checked: false },
    { id: "s24", type: "shopping", title: "Set up water-bill direct debit", lane: SLOTS.SHARED, kind: "routine", list_id: "l3", checked: false },
  ],
  lists: [
    { id: "l1", name: "Groceries", emoji: "🛒", has_stores: true, ord: 0 },
    { id: "l2", name: "House", emoji: "🏠", has_stores: true, ord: 1 },
    { id: "l4", name: "Hardware", emoji: "🔧", has_stores: true, ord: 2 },
    { id: "l5", name: "Pharmacy", emoji: "💊", has_stores: false, ord: 3 },
    { id: "l3", name: "Keep forgetting", emoji: "🤔", has_stores: false, ord: 4 },
  ],
  stores: [
    { id: "st1", name: "No Frills" },
    { id: "st2", name: "Grace Meat" },
    { id: "st3", name: "Metro" },
    { id: "st4", name: "Home Depot" },
    { id: "st5", name: "Paint Co" },
    { id: "st6", name: "Costco" },
  ],
  bills: [
    { id: "b1", name: "Rent", amount: 1200, frequency: "monthly", next_due_at: isoOffset(13) },
    { id: "b2", name: "Netflix", amount: 10.99, frequency: "monthly", next_due_at: isoOffset(2) },
    { id: "b3", name: "Council tax", amount: 180, frequency: "monthly", next_due_at: isoOffset(10) },
    { id: "b4", name: "Electricity", amount: 85, frequency: "monthly", next_due_at: isoOffset(20) },
    { id: "b5", name: "Phone", amount: 35, frequency: "monthly", next_due_at: isoOffset(6) },
  ],
  goals: [
    { id: "g1", name: "Japan 2027", emoji: "🇯🇵", target: 4000, linked_item_id: "i4" },
    { id: "g2", name: "New sofa", emoji: "🛋️", target: 800, linked_item_id: null },
    { id: "g3", name: "Emergency fund", emoji: "🛟", target: 5000, linked_item_id: null },
    { id: "g4", name: "New bike", emoji: "🚲", target: 1200, linked_item_id: null },
  ],
  contributions: [
    { id: "gc1", goal_id: "g1", amount: 1240, by: "pa" },
    { id: "gc2", goal_id: "g1", amount: 800, by: "pb" },
    { id: "gc3", goal_id: "g2", amount: 350, by: "pb" },
    { id: "gc4", goal_id: "g2", amount: 150, by: "pa" },
    { id: "gc5", goal_id: "g3", amount: 2200, by: "pa" },
    { id: "gc6", goal_id: "g4", amount: 300, by: "pb" },
  ],
  expenses: [
    { id: "e1", type: "expense", amount: 25, paid_by: "pa", cost_attribution: "split", spent_at: isoOffset(-6) },
    { id: "e2", type: "expense", amount: 60, paid_by: "pb", cost_attribution: "split", spent_at: isoOffset(-4) },
    { id: "e3", type: "expense", amount: 42, paid_by: "pb", cost_attribution: "partner_a", spent_at: isoOffset(-3) },
    { id: "e4", type: "expense", amount: 18, paid_by: "pa", cost_attribution: "split", spent_at: isoOffset(-1) },
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
  // maybeSingle() → null (not a 406) when the user has no space yet.
  let { data: space } = await supabase.from("space").select("*").maybeSingle();
  if (!space) {
    // Self-heal: create the space + people for this user (idempotent), then refetch.
    await supabase.rpc("bootstrap_space", { p_display_name: auth?.user?.email?.split("@")[0] ?? null });
    ({ data: space } = await supabase.from("space").select("*").maybeSingle());
  }
  const { data: people } = await supabase.from("person").select("*");
  const bySlot = Object.fromEntries((people || []).map((p) => [p.slot, p]));
  const viewer = (people || []).find((p) => p.auth_user_id === uid);
  return { space: space || {}, people: bySlot, viewerSlot: viewer?.slot || SLOTS.A };
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

/** Per-list summary (name, emoji, checked/total counts) for the linked-list chips. */
export async function getListSummaries() {
  const [lists, items] = await Promise.all([listLists(), listListItems()]);
  const map = {};
  for (const l of lists) map[l.id] = { id: l.id, name: l.name, emoji: l.emoji, done: 0, total: 0 };
  for (const it of items) {
    const m = map[it.list_id];
    if (!m) continue;
    m.total += 1;
    if (it.checked) m.done += 1;
  }
  return map;
}

/** Items in one standing list — for showing a card/event's linked list inline. */
export async function listItemsForList(listId) {
  if (!listId) return [];
  if (isMockMode)
    return mock.items
      .filter((i) => i.list_id === listId && !i.parent_item_id && !i.deleted_at)
      .sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
  const { data } = await supabase
    .from("item")
    .select("*")
    .eq("list_id", listId)
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

// Real `item` columns — anything else (e.g. UI-only `subtasks`, `store`,
// `_recurring`, adapter fields) is dropped so Supabase doesn't 400 on it.
const ITEM_COLUMNS = new Set([
  "id", "space_id", "type", "title", "lane", "kind", "claimed_by", "notes", "emoji", "color",
  "created_by", "created_at", "updated_at", "deleted_at", "parent_item_id", "linked_list_ids",
  "due_at", "location_context", "column_id", "ord", "state", "persistent_until_done", "countdown",
  "start_at", "end_at", "list_id", "qty", "price_estimate", "store", "checked", "checked_at",
  "amount", "paid_by", "cost_attribution", "category", "spent_at", "from_shopping_item_id",
  "recur_freq", "recur_until", "recur_except",
]);
function cleanItem(o) {
  const out = {};
  for (const k of Object.keys(o || {})) {
    if (!ITEM_COLUMNS.has(k)) continue;
    out[k] = o[k] === "" ? null : o[k]; // "" → null (empty uuid/enum/date columns reject "")
  }
  return out;
}

export async function createItem(item) {
  if (isMockMode) {
    const row = { id: `mock-${Date.now()}`, ord: Date.now(), ...item };
    mock.items.push(row);
    return row;
  }
  const { data, error } = await supabase.from("item").insert(cleanItem(item)).select().single();
  if (error) console.error("[data] createItem failed:", error.message, error);
  return data;
}

export async function updateItem(id, patch) {
  if (isMockMode) {
    const row = mock.items.find((i) => i.id === id);
    if (row) Object.assign(row, patch);
    return row;
  }
  const { data, error } = await supabase.from("item").update(cleanItem(patch)).eq("id", id).select().single();
  if (error) console.error("[data] updateItem failed:", error.message, error);
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
