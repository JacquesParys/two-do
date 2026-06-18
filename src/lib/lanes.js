// Viewer-aware lane rendering (product spec §4).
//
// Lane is STORED as a neutral slot: 'partner_a' | 'partner_b' | 'shared'.
// What the user SEES (Me / You / Us) is derived per viewer and never stored.
// Whoever is logged in sees their own slot as "Me", the other as "You",
// and the shared slot as "Us".

export const SLOTS = { A: "partner_a", B: "partner_b", SHARED: "shared" };

const STYLES = {
  me_you_us: { me: "Me", you: "You", us: "Us" },
  this_that_both: { me: "This one", you: "That one", us: "Both" },
  players: { me: "Player 1", you: "Player 2", us: "Co-op" },
};

/**
 * Resolve the display label for an item's lane, from a given viewer.
 * @param {string} laneSlot   item.lane — 'partner_a' | 'partner_b' | 'shared'
 * @param {string} viewerSlot the logged-in person's slot — 'partner_a' | 'partner_b'
 * @param {object} space      { label_style, custom_labels }
 * @returns {string}
 */
export function laneLabel(laneSlot, viewerSlot, space = {}) {
  const style = space.label_style || "me_you_us";

  if (style === "custom") {
    const c = space.custom_labels || {};
    if (laneSlot === SLOTS.SHARED) return c.shared || "Us";
    // For custom names, each slot shows its own name to everyone (no swap).
    return laneSlot === SLOTS.A ? c.partner_a || "A" : c.partner_b || "B";
  }

  const map = STYLES[style] || STYLES.me_you_us;
  if (laneSlot === SLOTS.SHARED) return map.us;
  return laneSlot === viewerSlot ? map.me : map.you;
}

/**
 * Resolve the color for a lane badge.
 * @param {string} laneSlot
 * @param {object} people  { partner_a: {lane_color}, partner_b: {lane_color} }
 * @param {object} colors  theme COLORS (for the neutral Us tone)
 */
export function laneColor(laneSlot, people = {}, colors = {}) {
  if (laneSlot === SLOTS.SHARED) return colors.laneUs;
  const p = laneSlot === SLOTS.A ? people.partner_a : people.partner_b;
  return (p && p.lane_color) || colors.laneUs;
}

/** Short three-state key ('me' | 'you' | 'us') for styling decisions. */
export function laneRole(laneSlot, viewerSlot) {
  if (laneSlot === SLOTS.SHARED) return "us";
  return laneSlot === viewerSlot ? "me" : "you";
}
