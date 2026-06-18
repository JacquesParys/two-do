import { describe, it, expect } from "vitest";
import { minutesOfDay, snap, atMinutes } from "./DayTimeline.jsx";

describe("DayTimeline time helpers", () => {
  it("minutesOfDay returns minutes since midnight", () => {
    expect(minutesOfDay(new Date(2026, 5, 18, 9, 0))).toBe(540);
    expect(minutesOfDay(new Date(2026, 5, 18, 14, 30))).toBe(870);
    expect(minutesOfDay(new Date(2026, 5, 18, 0, 0))).toBe(0);
  });

  it("snap rounds to the nearest 15 minutes", () => {
    expect(snap(537)).toBe(540); // 8:57 → 9:00
    expect(snap(532)).toBe(525); // 8:52 → 8:45
    expect(snap(7, 5)).toBe(5);
  });

  it("atMinutes builds a Date at that offset on the given day", () => {
    const day = new Date(2026, 5, 18, 16, 20); // any time on the day
    const d = atMinutes(day, 570); // 9:30
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it("atMinutes handles offsets past 60", () => {
    const d = atMinutes(new Date(2026, 5, 18), 1335); // 22:15
    expect(d.getHours()).toBe(22);
    expect(d.getMinutes()).toBe(15);
  });
});
