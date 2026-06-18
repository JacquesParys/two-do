// Two-Do — "The Grown-Up" parser, Supabase Edge Function (reference backend).
//
// Implements the parser contract:
//   POST { text, viewerSlot } -> { drafts: Draft[] }
// by calling Anthropic's Messages API. Your home-lab service can later expose
// the SAME contract and the client won't change (just point VITE_PARSER_URL at it).
//
// Deploy:
//   supabase functions deploy parse --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Then set the client env: VITE_PARSER_URL=https://<project>.functions.supabase.co/parse
//
// Optional: ANTHROPIC_MODEL (defaults to a fast model good for parsing).

const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";
const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are "The Grown-Up", the parser inside a shared planning app for two partners with ADHD. You convert a messy spoken/typed brain-dump into discrete, structured draft items.

Output ONLY a JSON object: {"drafts": Draft[]}. No prose, no markdown.

Draft = {
  "type": "task" | "event" | "shopping" | "expense",
  "title": string,         // short, clean, imperative where natural. NEVER editorialise or add puns. Preserve the user's specifics (e.g. "wet food, chunky in gravy — not pâté").
  "lane": "partner_a" | "partner_b" | "shared",
  "kind": "routine" | "exciting",
  "emoji": string | null,  // only for exciting items
  "due_at": string | null, // natural date text if present ("friday", "the 14th", "saturday", "before thursday")
  "listName": string | null, // for shopping items, e.g. "Groceries"
  "amount": number | null,   // for expenses, numeric only
  "persistent": boolean      // true if they asked to be nagged ("persistent", "don't let me forget")
}

Rules:
- Split run-on dumps into SEPARATE coherent items, but keep qualifying detail WITH its item (don't make "the chunky one in gravy" its own card — fold it into the cat-food item).
- type: shopping for things to buy; expense for money spent or owed (e.g. "I owe you 35 for the takeaway"); event for things at a time/date that are plans; task otherwise.
- lane: "viewerSlot" is the author. "my/I/me/my list" -> the author's slot. "our/we/us" or unspecified shared chores -> "shared". "your mum/you should" -> the OTHER partner's slot.
- kind "exciting" + an emoji for fun stuff (date night 💕, trips/markets ✈️, birthdays 🎂, gigs 🎸).
- Currency is dollars in this app; convert "40 quid" -> amount 40.
- Capture reminders to cancel/booking deadlines as tasks with due_at and persistent where implied.
- Drop pure filler ("ok so", "oh").`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let body: { text?: string; viewerSlot?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const text = (body.text || "").trim();
  if (!text) return json({ drafts: [] });

  const viewerSlot = body.viewerSlot === "partner_b" ? "partner_b" : "partner_a";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `viewerSlot=${viewerSlot}\n\nDUMP:\n${text}` }],
    }),
  });

  if (!res.ok) return json({ error: `anthropic ${res.status}`, detail: await res.text() }, 502);

  const data = await res.json();
  const raw = data?.content?.[0]?.text ?? "{}";
  const drafts = extractDrafts(raw);
  return json({ drafts });
});

// Pull the JSON object out of the model's reply, tolerating stray fences/prose.
function extractDrafts(raw: string): unknown[] {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const obj = JSON.parse(s);
    return Array.isArray(obj?.drafts) ? obj.drafts : [];
  } catch {
    return [];
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}
