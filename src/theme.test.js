import { describe, it, expect } from "vitest";
import { withAlpha, LANE_COLOR, COLORS } from "./theme.js";

describe("withAlpha", () => {
  it("expands 6-digit hex to rgba", () => {
    expect(withAlpha("#E8896B", 0.15)).toBe("rgba(232, 137, 107, 0.15)");
  });
  it("expands 3-digit shorthand hex", () => {
    expect(withAlpha("#abc", 1)).toBe("rgba(170, 187, 204, 1)");
  });
});

describe("LANE_COLOR", () => {
  it("maps each lane slot to its palette color", () => {
    expect(LANE_COLOR.partner_a).toBe(COLORS.laneMe);
    expect(LANE_COLOR.partner_b).toBe(COLORS.laneYou);
    expect(LANE_COLOR.shared).toBe(COLORS.laneUs);
  });
});
