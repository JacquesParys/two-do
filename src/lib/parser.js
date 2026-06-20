// The Grown-Up's parser — turns a free-form brain-dump into structured draft
// items. PLUGGABLE BY DESIGN: the UI calls `parseBrainDump` and never cares
// which backend answers.
//
// Backend selection is by env at call time:
//   - VITE_PARSER_URL set  → POST to that endpoint (the "remote" contract).
//                            Claude lives behind it now; your home-lab service
//                            can later implement the SAME contract, no UI change.
//   - unset                → local heuristic stub (no AI), so the app still works.
//
// Remote contract:
//   POST { text, viewerSlot }  →  { drafts: Draft[] }
//   Draft = { type, title, lane, kind, emoji?, due_at?, listName?, amount?, persistent? }
//   - type:  "task" | "event" | "shopping" | "expense"
//   - lane:  "partner_a" | "partner_b" | "shared"   (NOT Me/You/Us)
//   - kind:  "routine" | "exciting"
import { SLOTS } from "./lanes.js";

const TYPES = ["task", "event", "shopping", "expense"];

function parserUrl() {
  return import.meta.env?.VITE_PARSER_URL || null;
}

/**
 * @param {string} text  the raw dump (typed or transcribed)
 * @param {object} ctx   { viewerSlot } — so "remind me" resolves to the author
 * @returns {Promise<Draft[]>}
 */
export async function parseBrainDump(text, ctx = {}) {
  if (parserUrl()) {
    try {
      return await remoteParse(text, ctx);
    } catch (e) {
      if (typeof console !== "undefined") console.warn("[parser] remote failed, using stub:", e?.message || e);
      return stubParse(text, ctx);
    }
  }
  return stubParse(text, ctx);
}

// ---------------------------------------------------------------------------
// Remote backend — same contract for Claude (now) and the home-lab service.
// ---------------------------------------------------------------------------
const PARSE_TIMEOUT_MS = 12000;

export async function remoteParse(text, ctx = {}) {
  // Abort a hung backend so capture never freezes — the throw drops us to the
  // stub via parseBrainDump's catch.
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), PARSE_TIMEOUT_MS) : null;
  let res;
  try {
    res = await fetch(parserUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // now + tz let the backend resolve "saturday" -> a real ISO datetime.
      body: JSON.stringify({ text, viewerSlot: ctx.viewerSlot || SLOTS.A, now: nowIso(), tz: localTz() }),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`parser ${res.status}`);
  const data = await res.json();
  return (data.drafts || []).map(normalizeDraft).filter(Boolean);
}

function nowIso() {
  try { return new Date().toISOString(); } catch { return null; }
}
function localTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

// Guard against a backend returning slightly-off shapes.
export function normalizeDraft(d) {
  if (!d || !d.title) return null;
  return {
    type: TYPES.includes(d.type) ? d.type : "task",
    title: String(d.title).trim(),
    lane: [SLOTS.A, SLOTS.B, SLOTS.SHARED].includes(d.lane) ? d.lane : SLOTS.SHARED,
    kind: d.kind === "exciting" ? "exciting" : "routine",
    emoji: d.emoji || null,
    due_at: d.due_at || null,
    listName: d.listName || null,
    amount: d.amount != null ? Number(d.amount) : null,
    persistent: !!d.persistent,
  };
}

// ---------------------------------------------------------------------------
// Stub backend — heuristics only, no AI. Segments on sentence boundaries and
// connectors (not every comma) to cut down on fragment noise, then guesses a
// type per clause. Good enough to drive the tray; real quality is the model's.
// ---------------------------------------------------------------------------
const SHOPPING_HINTS = /\b(buy|get|grab|pick up|need|wet food|cat food|milk|bread|eggs|bin bags|batteries|lightbulb|bulb)\b/i;
const EXPENSE_HINTS = /(?:\$|£|€)\s?\d+(?:\.\d{1,2})?|\b\d+\s?(?:quid|bucks|dollars)\b/i;
const EXCITING_HINTS = /\b(anniversary|date night|gig|trip|holiday|birthday|concert|festival|markets?|weekend away)\b/i;
const DATE_HINTS = /\b(today|tomorrow|tonight|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|the \d{1,2}(?:st|nd|rd|th)?)\b/i;
const PERSIST_HINTS = /\b(persistent|don'?t let me forget|keep reminding|remind us both|remind me)\b/i;

export function stubParse(text, ctx = {}) {
  const viewer = ctx.viewerSlot || SLOTS.A;
  // Segment on sentence enders + a few connectors + newlines - NOT commas.
  const clauses = text
    .split(/[.!?]+|\n|;|\band\b|\balso\b|\bactually\b|\boh\b/i)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2); // drop tiny fragments

  return clauses.map((clause) => {
    const lower = clause.toLowerCase();
    const exciting = EXCITING_HINTS.test(lower);
    const lane = /\b(my|me|i)\b/.test(lower) ? viewer : SLOTS.SHARED;

    const base = {
      title: cleanTitle(clause),
      lane,
      kind: exciting ? "exciting" : "routine",
      emoji: exciting ? guessEmoji(lower) : null,
      persistent: PERSIST_HINTS.test(lower),
      due_at: DATE_HINTS.test(lower) ? lower.match(DATE_HINTS)[0] : null,
      listName: null,
      amount: null,
    };

    const money = clause.match(EXPENSE_HINTS);
    if (money) return { ...base, type: "expense", amount: parseAmount(money[0]) };
    if (SHOPPING_HINTS.test(lower)) return { ...base, type: "shopping", listName: "Groceries" };
    if (base.due_at && exciting) return { ...base, type: "event" };
    return { ...base, type: "task" };
  });
}

function cleanTitle(s) {
  const t = s.replace(/^\s*(ok|so|um|well|we need to|i need to|need to|remember to|can you|please)\b/i, "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : s;
}

function parseAmount(s) {
  const n = s.replace(/[^\d.]/g, "");
  return n ? Number(n) : null;
}

function guessEmoji(lower) {
  if (/anniversary|date night/.test(lower)) return "💕";
  if (/gig|concert|festival/.test(lower)) return "🎸";
  if (/trip|holiday|markets?|weekend away/.test(lower)) return "✈️";
  if (/birthday/.test(lower)) return "🎂";
  return "✨";
}

export const TYPE_LABEL = {
  task: "Task",
  event: "Event",
  shopping: "Shopping",
  expense: "Expense",
};
