import { describe, it, expect } from "vitest";
import { occursOn, occurrenceFor, itemsOnDay, dateKey } from "./recurrence.js";

const at = (y, m, d, h = 9, min = 0) => new Date(y, m, d, h, min).toISOString();

describe("occursOn", () => {
  const daily = { recur_freq: "daily", start_at: at(2026, 5, 1, 9) };
  const weekly = { recur_freq: "weekly", start_at: at(2026, 5, 1, 9) }; // 2026-06-01 is a Monday
  const monthly = { recur_freq: "monthly", start_at: at(2026, 5, 15, 9) };

  it("daily occurs every day on/after the anchor, not before", () => {
    expect(occursOn(daily, new Date(2026, 5, 1))).toBe(true);
    expect(occursOn(daily, new Date(2026, 5, 9))).toBe(true);
    expect(occursOn(daily, new Date(2026, 4, 31))).toBe(false);
  });

  it("weekly occurs only on the same weekday", () => {
    expect(occursOn(weekly, new Date(2026, 5, 8))).toBe(true); // +7 days, same weekday
    expect(occursOn(weekly, new Date(2026, 5, 9))).toBe(false);
  });

  it("monthly occurs on the same day-of-month", () => {
    expect(occursOn(monthly, new Date(2026, 6, 15))).toBe(true);
    expect(occursOn(monthly, new Date(2026, 6, 16))).toBe(false);
  });

  it("respects recur_until and recur_except", () => {
    const bounded = { ...daily, recur_until: at(2026, 5, 3) };
    expect(occursOn(bounded, new Date(2026, 5, 3))).toBe(true);
    expect(occursOn(bounded, new Date(2026, 5, 4))).toBe(false);
    const skip = { ...daily, recur_except: [dateKey(new Date(2026, 5, 2))] };
    expect(occursOn(skip, new Date(2026, 5, 2))).toBe(false);
  });
});

describe("occurrenceFor", () => {
  it("shifts the date but keeps time-of-day and duration", () => {
    const ev = { id: "e1", recur_freq: "daily", start_at: at(2026, 5, 1, 9, 0), end_at: at(2026, 5, 1, 9, 30) };
    const occ = occurrenceFor(ev, new Date(2026, 5, 5));
    const s = new Date(occ.start_at), e = new Date(occ.end_at);
    expect(s.getDate()).toBe(5);
    expect(s.getHours()).toBe(9);
    expect((e - s) / 60000).toBe(30);
    expect(occ.id).toBe("e1__2026-06-05");
    expect(occ._master).toBe(ev);
  });
});

describe("itemsOnDay", () => {
  it("mixes non-recurring matches with recurring occurrences", () => {
    const items = [
      { id: "a", start_at: at(2026, 5, 5, 10) },
      { id: "b", recur_freq: "daily", start_at: at(2026, 5, 1, 8) },
    ];
    const sd = (it, day) => new Date(it.start_at).getDate() === day.getDate();
    const out = itemsOnDay(items, new Date(2026, 5, 5), sd);
    expect(out.map((o) => o.id).sort()).toEqual(["a", "b__2026-06-05"]);
  });
});
