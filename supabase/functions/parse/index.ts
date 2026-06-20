// Two-Do — "The Grown-Up" parser, Supabase Edge Function (reference backend).
//
// Implements the parser contract:
//   POST { text, viewerSlot, now?, tz? } -> { drafts: Draft[] }
// by calling Anthropic's Messages API with STRUCTURED OUTPUTS (the model is
// constrained to the Draft schema, so the reply is always valid JSON — no prose
// salvage). Your home-lab service can later expose the SAME contract and the
// client won't change (just point VITE_PARSER_URL at it).
//
// Deploy:
//   supabase functions deploy parse --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6   (optional; default below)
// Then set the client env: VITE_PARSER_URL=https://<project>.functions.supabase.co/parse

const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Structured-output schema — the model is forced to produce exactly this shape.
// Mirrors normalizeDraft() and the Postgres enums (schema.sql). All properties
// are required and additionalProperties is false (structured-outputs rules);
// nullable fields use anyOf.
const DRAFTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["drafts"],
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "lane", "kind", "emoji", "due_at", "listName", "amount", "persistent"],
        properties: {
          type: { type: "string", enum: ["task", "event", "shopping", "expense"] },
          title: { type: "string" },
          lane: { type: "string", enum: ["partner_a", "partner_b", "shared"] },
          kind: { type: "string", enum: ["routine", "exciting"] },
          emoji: { anyOf: [{ type: "string" }, { type: "null" }] },
          due_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
          listName: { anyOf: [{ type: "string" }, { type: "null" }] },
          amount: { anyOf: [{ type: "number" }, { type: "null" }] },
          persistent: { type: "boolean" },
        },
      },
    },
  },
};

const SYSTEM = `You are "The Grown-Up", the parser inside a shared planning app for two partners with ADHD. You convert a messy spoken/typed brain-dump into discrete, structured draft items.

You return ONLY the structured object {"drafts": Draft[]} (the response format is enforced). Each Draft:
- type: "task" | "event" | "shopping" | "expense"
- title: string. Short, clean, imperative where natural. NEVER editorialise or add puns. Preserve the user's specifics (e.g. "wet food, chunky in gravy — not pâté").
- lane: "partner_a" | "partner_b" | "shared"
- kind: "routine" | "exciting"
- emoji: a single emoji for exciting items, else null
- due_at: an ISO-8601 datetime string when a date/time is present, else null
- listName: the destination list for shopping items (e.g. "Groceries"), else null
- amount: numeric only, for expenses, else null
- persistent: true if they asked to be nagged ("persistent", "don't let me forget")

Rules:
- Split run-on dumps into SEPARATE coherent items, but keep qualifying detail WITH its item (don't make "the chunky one in gravy" its own card — fold it into the cat-food item).
- type: shopping for things to buy; expense for money spent or owed (e.g. "I owe you 35 for the takeaway"); event for things at a time/date that are plans; task otherwise.
- lane: "viewerSlot" is the author. "my/I/me/my list" -> the author's slot. "our/we/us" or unspecified shared chores -> "shared". "your mum/you should" -> the OTHER partner's slot.
- kind "exciting" + an emoji for fun stuff (date night 💕, trips/markets ✈️, birthdays 🎂, gigs 🎸).
- Currency is dollars in this app; convert "40 quid" -> amount 40.
- Dates: resolve relative phrases ("saturday", "tomorrow", "the 14th", "before thursday") against the provided now + tz, and output an absolute ISO-8601 datetime in that timezone. If a clock time is given, use it; otherwise default to 09:00 local that day. If no date is mentioned, due_at is null.
- Capture reminders to cancel/booking deadlines as tasks with due_at and persistent where implied.
- Drop pure filler ("ok so", "oh").`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let body: { text?: string; viewerSlot?: string; now?: string; tz?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const text = (body.text || "").trim();
  if (!text) return json({ drafts: [] });

  const viewerSlot = body.viewerSlot === "partner_b" ? "partner_b" : "partner_a";
  const now = body.now || new Date().toISOString();
  const tz = body.tz || "UTC";

  const userContent = `now=${now} tz=${tz}\nviewerSlot=${viewerSlot}\n\nDUMP:\n${text}`;

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: DRAFTS_SCHEMA } },
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (e) {
    return json({ error: "anthropic unreachable", detail: String(e) }, 502);
  }

  if (!res.ok) return json({ error: `anthropic ${res.status}`, detail: await res.text() }, 502);

  const data = await res.json();
  const raw = data?.content?.[0]?.text ?? "";
  // Structured outputs guarantees schema-valid JSON; parse directly (no salvage).
  try {
    const obj = JSON.parse(raw);
    const drafts = Array.isArray(obj?.drafts) ? obj.drafts : [];
    return json({ drafts });
  } catch {
    return json({ error: "model returned non-JSON", detail: String(raw).slice(0, 500) }, 502);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}
