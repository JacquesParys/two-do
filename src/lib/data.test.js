// Field-driven taxonomy contract (runs in mock mode — no Supabase env in tests).
import { describe, it, expect } from "vitest";
import { listCards, listCalendar, listListItems, getSubtaskProgress, listLists, findOrCreateList, getParserContext } from "./data.js";

describe("field-driven views", () => {
  it("board = items with a column_id, never children", async () => {
    const cards = await listCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.column_id && !c.parent_item_id)).toBe(true);
  });

  it("calendar includes dated tasks AND events (one thing, three views)", async () => {
    const cal = await listCalendar();
    expect(cal.every((i) => (i.start_at || i.due_at) && !i.parent_item_id)).toBe(true);
    // a dated task shows on the calendar...
    expect(cal.some((i) => i.type === "task" && i.due_at)).toBe(true);
    // ...alongside events.
    expect(cal.some((i) => i.type === "event")).toBe(true);
  });

  it("a dated task appears on BOTH the board and the calendar", async () => {
    const [cards, cal] = [await listCards(), await listCalendar()];
    const datedTask = cards.find((c) => c.type === "task" && c.due_at);
    expect(datedTask).toBeTruthy();
    expect(cal.some((i) => i.id === datedTask.id)).toBe(true);
  });

  it("lists = items with a list_id, never children", async () => {
    const items = await listListItems();
    expect(items.every((i) => i.list_id && !i.parent_item_id)).toBe(true);
  });
});

describe("getSubtaskProgress", () => {
  it("counts done/total over child items per parent", async () => {
    const p = await getSubtaskProgress(["i4", "ev4"]);
    expect(p.i4).toEqual({ done: 1, total: 3 }); // one step marked done
    expect(p.ev4).toEqual({ done: 0, total: 3 }); // attached list, none done
  });

  it("returns {} for no parents", async () => {
    expect(await getSubtaskProgress([])).toEqual({});
  });
});

describe("Grown-Up filing helpers", () => {
  it("findOrCreateList matches an existing list case-insensitively", async () => {
    const lists = await listLists();
    expect(lists.length).toBeGreaterThan(0);
    const existing = lists[0];
    const hit = await findOrCreateList("space1", existing.name.toUpperCase());
    expect(hit.id).toBe(existing.id); // same list, not a duplicate
  });

  it("findOrCreateList creates a new list then reuses it (idempotent)", async () => {
    const novel = "Zzz Parser Test List 9914";
    const a = await findOrCreateList("space1", novel);
    expect(a.id).toBeTruthy();
    expect(a.name).toBe(novel);
    const b = await findOrCreateList("space1", novel.toLowerCase());
    expect(b.id).toBe(a.id); // found, not re-created
  });

  it("getParserContext returns lists/columns/stores name snapshots", async () => {
    const ctx = await getParserContext();
    expect(Array.isArray(ctx.lists)).toBe(true);
    expect(Array.isArray(ctx.columns)).toBe(true);
    expect(Array.isArray(ctx.stores)).toBe(true);
    expect(ctx.lists.every((l) => typeof l.name === "string")).toBe(true);
    expect(ctx.columns.every((c) => typeof c.name === "string")).toBe(true);
  });
});
