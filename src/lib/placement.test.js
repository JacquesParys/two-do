import { describe, it, expect } from "vitest";
import { dayDelta, findRoleColumn, overdueReminder, eventBoardRole } from "./placement.js";

// A fixed "now" so the tests don't depend on the clock.
const NOW = new Date("2026-06-19T12:00:00");
// Build an ISO string `days` away from NOW at a given hour (default 10:00).
const at = (days, h = 10) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

describe("dayDelta", () => {
  it("is midnight-aligned and ignores time-of-day", () => {
    expect(dayDelta(at(0, 23), NOW)).toBe(0);
    expect(dayDelta(at(1, 1), NOW)).toBe(1);
    expect(dayDelta(at(-1, 23), NOW)).toBe(-1);
    expect(dayDelta(at(3), NOW)).toBe(3);
  });
});

describe("findRoleColumn", () => {
  const cols = [
    { id: "a", label: "Someday", role: "someday" },
    { id: "b", label: "Up Next", role: "soon" }, // renamed but role-tagged
    { id: "c", label: "Today", role: "none" }, // un-migrated: role still none
    { id: "d", label: "Done", role: "done" },
  ];
  it("matches by role first", () => {
    expect(findRoleColumn(cols, "soon").id).toBe("b");
    expect(findRoleColumn(cols, "someday").id).toBe("a");
  });
  it("falls back to label for un-migrated soon/today", () => {
    expect(findRoleColumn(cols, "today").id).toBe("c"); // by label, role was none
  });
  it("returns null when absent", () => {
    expect(findRoleColumn([{ id: "x", label: "Backlog", role: "none" }], "soon")).toBeNull();
    expect(findRoleColumn(null, "soon")).toBeNull();
  });
});

describe("overdueReminder", () => {
  const persist = (dueDays) => ({ persistent_until_done: true, state: "open", due_at: at(dueDays) });

  it("is null until actually overdue", () => {
    expect(overdueReminder(persist(2), NOW)).toBeNull(); // future
    expect(overdueReminder(persist(0), NOW)).toBeNull(); // due today, not yet late
  });
  it("1–2 days overdue → soon + amber", () => {
    expect(overdueReminder(persist(-1), NOW)).toEqual({ role: "soon", glow: "amber" });
    expect(overdueReminder(persist(-2), NOW)).toEqual({ role: "soon", glow: "amber" });
  });
  it("3+ days overdue → someday + red", () => {
    expect(overdueReminder(persist(-3), NOW)).toEqual({ role: "someday", glow: "red" });
    expect(overdueReminder(persist(-10), NOW)).toEqual({ role: "someday", glow: "red" });
  });
  it("only applies when persistent, undone, and dated", () => {
    expect(overdueReminder({ state: "open", due_at: at(-5) }, NOW)).toBeNull(); // not persistent
    expect(overdueReminder({ persistent_until_done: true, state: "done", due_at: at(-5) }, NOW)).toBeNull(); // done
    expect(overdueReminder({ persistent_until_done: true, state: "open" }, NOW)).toBeNull(); // no due_at
  });
});

describe("eventBoardRole", () => {
  const ev = (days) => ({ type: "event", start_at: at(days, 9) });

  it("today → 'today', tomorrow → 'soon'", () => {
    expect(eventBoardRole(ev(0), NOW)).toBe("today");
    expect(eventBoardRole(ev(1), NOW)).toBe("soon");
  });
  it("further out or in the past → null", () => {
    expect(eventBoardRole(ev(2), NOW)).toBeNull();
    expect(eventBoardRole(ev(-1), NOW)).toBeNull();
  });
  it("ignores non-events and already-carded events", () => {
    expect(eventBoardRole({ type: "task", due_at: at(0) }, NOW)).toBeNull();
    expect(eventBoardRole({ type: "event", start_at: at(0), column_id: "c1" }, NOW)).toBeNull();
  });
  it("uses recurrence for recurring events", () => {
    // A weekly event anchored 7 days ago recurs today → 'today'.
    const weekly = { type: "event", start_at: at(-7, 9), recur_freq: "weekly" };
    expect(eventBoardRole(weekly, NOW)).toBe("today");
    // A daily event anchored in the past recurs tomorrow too, but 'today' wins.
    const daily = { type: "event", start_at: at(-3, 9), recur_freq: "daily" };
    expect(eventBoardRole(daily, NOW)).toBe("today");
  });
});
