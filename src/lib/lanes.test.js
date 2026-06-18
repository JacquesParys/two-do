import { describe, it, expect } from "vitest";
import { laneLabel, laneColor, laneRole, SLOTS } from "./lanes.js";

describe("laneLabel — viewer-aware Me/You/Us", () => {
  const space = { label_style: "me_you_us" };

  it("shows the viewer's own slot as 'Me'", () => {
    expect(laneLabel(SLOTS.A, SLOTS.A, space)).toBe("Me");
    expect(laneLabel(SLOTS.B, SLOTS.B, space)).toBe("Me");
  });

  it("shows the other partner's slot as 'You'", () => {
    expect(laneLabel(SLOTS.B, SLOTS.A, space)).toBe("You");
    expect(laneLabel(SLOTS.A, SLOTS.B, space)).toBe("You");
  });

  it("shows shared as 'Us' regardless of viewer", () => {
    expect(laneLabel(SLOTS.SHARED, SLOTS.A, space)).toBe("Us");
    expect(laneLabel(SLOTS.SHARED, SLOTS.B, space)).toBe("Us");
  });

  it("the SAME record swaps label by viewer (the key detail)", () => {
    const stored = SLOTS.A;
    expect(laneLabel(stored, SLOTS.A, space)).toBe("Me"); // A looking
    expect(laneLabel(stored, SLOTS.B, space)).toBe("You"); // B looking
  });
});

describe("laneLabel — alternate styles", () => {
  it("this/that/both is fixed (no per-viewer swap)", () => {
    const space = { label_style: "this_that_both" };
    expect(laneLabel(SLOTS.A, SLOTS.A, space)).toBe("This one");
    expect(laneLabel(SLOTS.SHARED, SLOTS.B, space)).toBe("Both");
  });

  it("custom names show each person's name to everyone", () => {
    const space = {
      label_style: "custom",
      custom_labels: { partner_a: "Jac", partner_b: "Sam", shared: "Ours" },
    };
    expect(laneLabel(SLOTS.A, SLOTS.B, space)).toBe("Jac");
    expect(laneLabel(SLOTS.B, SLOTS.B, space)).toBe("Sam");
    expect(laneLabel(SLOTS.SHARED, SLOTS.A, space)).toBe("Ours");
  });
});

describe("laneColor", () => {
  const people = {
    partner_a: { lane_color: "#aaa" },
    partner_b: { lane_color: "#bbb" },
  };
  const colors = { laneUs: "#7A8E88" };

  it("uses each partner's chosen color", () => {
    expect(laneColor(SLOTS.A, people, colors)).toBe("#aaa");
    expect(laneColor(SLOTS.B, people, colors)).toBe("#bbb");
  });

  it("uses the neutral tone for shared", () => {
    expect(laneColor(SLOTS.SHARED, people, colors)).toBe("#7A8E88");
  });
});

describe("laneRole", () => {
  it("returns me/you/us keys", () => {
    expect(laneRole(SLOTS.A, SLOTS.A)).toBe("me");
    expect(laneRole(SLOTS.A, SLOTS.B)).toBe("you");
    expect(laneRole(SLOTS.SHARED, SLOTS.A)).toBe("us");
  });
});
