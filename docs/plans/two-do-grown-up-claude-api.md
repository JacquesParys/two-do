# Two-Do — The Grown-Up × Claude API integration

*Build plan for taking "The Grown-Up" brain-dump parser from a crude one-shot Claude call to a hardened, context-aware, clarifying capture pipeline. Phased: harden → context-aware → clarifying chat. Default model Sonnet 4.6 now, Haiku 4.5 once tuned.*

> Status: **Phases 1–2 built** 2026-06-19; Phase 3 proposed. Approved direction (Jacques, 2026-06-19): "all of the above… small MCP server of functions perhaps?" + "start with Sonnet, pull back to Haiku when ready." The behavioural source of truth for the parser is `src/lib/parser.js` + `supabase/functions/parse/index.ts`.

---

## 1. Context — why

Capture-beats-organization is rail #1. The Grown-Up is the capture surface: you dump a mess, it returns clean draft items you confirm in the ReviewTray. Today that works but crudely.

**Current state (verified in code):**
- `supabase/functions/parse/index.ts` **already calls Claude** — raw `fetch` to `api.anthropic.com/v1/messages`, `claude-haiku-4-5-20251001`, a hand-written `SYSTEM` prompt, then `extractDrafts()` (lines 89–100) that strips ``` fences and slices `{`…`}` out of the reply. **If the model emits any prose, the regex can yield zero drafts silently.**
- `src/lib/parser.js` is the pluggable client: `parseBrainDump` → `remoteParse` POSTs `{ text, viewerSlot }`, expects `{ drafts }`, runs each through `normalizeDraft` (the clamp/gatekeeper), and **falls back to the local heuristic stub on any throw**. No request timeout — a hung function hangs capture indefinitely.
- The Draft shape is thin: `{ type, title, lane, kind, emoji, due_at, listName, amount, persistent }`. `normalizeDraft` (parser.js:57) enforces the enums; `title` is the only hard requirement.
- **Gaps found:** (a) `due_at` is free-form text, but `item.due_at` is `timestamptz` — relative phrases ("saturday") don't persist cleanly. (b) `ReviewTray.accept` (ReviewTray.jsx:25–40) maps draft→`createItem` but **drops `listName`** — shopping drafts never file into a standing list. (c) no timeout on the client fetch. (d) `VITE_PARSER_URL` isn't in `.env.example`.

**Outcome:** a parser that returns schema-valid drafts every time, routes them into the *user's actual* lists/columns/stores, asks a quick question when a dump is ambiguous, and degrades gracefully (stub) when offline.

---

## 2. Decisions (locked)

| Question | Decision |
|---|---|
| Model default | **`claude-sonnet-4-6`** now (stronger on ambiguity), via the existing `ANTHROPIC_MODEL` secret. Pull back to `claude-haiku-4-5` once the prompt + schema are tuned. Both support structured outputs. |
| JSON robustness | **Structured outputs** (`output_config.format` + `json_schema`) — delete `extractDrafts`'s regex salvage. Guarantees schema-valid JSON; the client's `normalizeDraft` stays as defense-in-depth. |
| Dates | Model emits **ISO-8601** `due_at` (`format: "date-time"`), resolved against a **server-supplied "now" + timezone** injected into the prompt. |
| Context source | **Client-supplied**, not server-fetched. The client already has lists/columns/stores; passing them in the request body keeps the edge function stateless and avoids giving it service-role DB access. Extends the contract additively. |
| Clarifying chat | **Stateless multi-turn** over the same HTTP contract: response is a discriminated union (`status: "drafts"` \| `"needs_clarification"`); the client replays prior turns. No session store. |
| **MCP / tool server?** | **Not for the parse path.** "Confirm-before-file" means Claude *proposes*, never *mutates* — so no action-tools at parse time; and the read-context is tiny, so injection beats tool round-trips. **Reserve** a typed capability module (`find_or_create_list`, `list_columns`, …) that *could* become an MCP server later — when the Grown-Up takes actions across surfaces (home-lab service, Claude Desktop). See §6. |

---

## 3. Architecture (target)

```
ReviewTray ──parseBrainDump(text, ctx)──▶ src/lib/parser.js
                                              │  remoteParse: POST { text, viewerSlot,
                                              │     context:{ now, tz, lists, columns, stores }, history? }
                                              ▼
                              supabase/functions/parse  (Deno, stateless)
                                              │  Messages API + output_config.format (json_schema)
                                              ▼
                                       Claude (Sonnet→Haiku)
                                              │  { status, drafts[] | question }
                                              ▼
        ReviewTray ◀──normalizeDraft (clamp)──┘   accept → createItem (+ resolve listName→list_id)
```

The HTTP contract stays the front door (the home-lab service can implement it unchanged). Everything new is **additive** to the request body, so old clients keep working.

---

## 4. Phase 1 — Harden (the load-bearing fix) — ✅ BUILT 2026-06-19

> Shipped: structured outputs + ISO dates + Sonnet default in `supabase/functions/parse/index.ts` (the brittle `extractDrafts` salvage is gone); 12s `AbortController` timeout + `now`/`tz` in `src/lib/parser.js`; `fmtDue()` ISO formatting in `ReviewTray.jsx`; `VITE_PARSER_URL` in `.env.example`; README refreshed; parser tests cover the contract + timeout→stub (52/52 green). Phases 2–3 below remain proposed.

**`supabase/functions/parse/index.ts`:**
- Add `output_config: { format: { type: "json_schema", schema: DRAFTS_SCHEMA } }` to the request body (§7 schema). **Delete `extractDrafts`**; parse `content[0].text` directly with one `JSON.parse` guarded → 502 on failure.
- Inject **current date + timezone** into the user message (e.g. `now=2026-06-19T14:00:00+10:00`) so the model resolves "saturday" → an ISO datetime.
- Tighten the prompt: emit ISO-8601 for `due_at`; keep the existing splitting/lane/currency rules.
- Keep `max_tokens` ~2000; keep `anthropic-version: 2023-06-01`, `x-api-key`. Default `MODEL` → `claude-sonnet-4-6`.
- Harden errors: non-2xx upstream → 502 with status; empty text → `{ drafts: [] }` (already there).

**`src/lib/parser.js`:**
- Add an **`AbortController` timeout** (~12s) to `remoteParse`'s fetch — on timeout it throws, which already triggers the stub fallback. This is the one client change Phase 1 needs.
- `normalizeDraft` unchanged (still clamps; ISO `due_at` passes through fine).

**`src/ReviewTray.jsx`:** format `due_at` for display when it's an ISO string (it currently renders raw text); a small `fmtDue()` helper.

**Docs:** add `VITE_PARSER_URL` to `.env.example`; refresh the README "Enable real AI parsing" block (model default note, structured-outputs mention).

**Tests:** extend `src/lib/parser.test.js` — assert the request still sends `{ text, viewerSlot, … }`, and that the normalize path still clamps; assert timeout → stub fallback. Mock-mode parity unaffected (`parseBrainDump` is pure client logic).

**Outcome:** every parse returns valid drafts or cleanly falls back; dates persist.

---

## 5. Phase 2 — Context-aware routing — ✅ BUILT 2026-06-19

> Shipped: `getParserContext()` + `findOrCreateList()` in `src/lib/data.js`; the client sends `context:{ lists, columns, stores }` (`parser.js`); the edge function renders a `CONTEXT:` block and is told to reuse existing list/store names; `ReviewTray` loads the context before parsing and resolves a shopping draft's `listName`→`list_id` on accept (closing the drop). Tests: `findOrCreateList` match/create-idempotent + `getParserContext` shape (55/55 green).

Extend the contract additively: request gains `context: { now, tz, lists:[{name}], columns:[{name, role}], stores:[name] }`.

- **`src/lib/parser.js` / caller:** build `context` from data already loaded (lists via `getListSummaries`/`listLists`, columns via the board config, stores from list items). Pass it in `remoteParse`'s body. Falls back to no-context if unavailable.
- **`supabase/functions/parse/index.ts`:** fold `context` into the system/user prompt ("Existing lists: Groceries, Hardware. Columns: Today, Soon, Someday(someday), Done(done). Known stores: …"). Instruct the model to reuse an existing `listName`/store when it matches, and to set a sensible column only via fields the Draft already supports (don't expand the Draft shape yet).
- **Fix the `listName` filing gap (end-to-end):** add `findOrCreateList(space_id, name)` to `src/lib/data.js` (mock + real branches), and in `ReviewTray.accept`, when `draft.type === "shopping"` and `draft.listName`, resolve it to `list_id` before `createItem`. This closes the only real data-loss gap in the draft→item pipeline.

**Outcome:** "grab cat food" files into the *existing* Groceries list, not a stray new one; lanes/types land where the user already organizes.

---

## 6. Phase 3 — Clarifying chat + the capability module

**Discriminated-union response.** Schema gains `status: "drafts" | "needs_clarification"` and an optional `question` (§7). When the dump is genuinely ambiguous ("sort the thing for mum"), the model returns `needs_clarification` + one short question instead of guessing.

- **Contract:** request gains optional `history: [{ role, text }]`. Stateless — the client replays prior turns; no server session.
- **`src/lib/parser.js`:** `parseBrainDump` returns either drafts or `{ question }`. Add a `continueParse(history, answer, ctx)` for the follow-up call.
- **`src/ReviewTray.jsx`:** when a question comes back, render it with a single inline answer input; on submit, re-call with history appended; then render drafts as today. Keep it to **one** clarification round by default (no interrogation — respects "no guilt").

**The capability module (the answer to "MCP server of functions?").** Factor the app-side capabilities the Grown-Up needs into one typed module — `src/lib/grownup/capabilities.js`: `findOrCreateList`, `listColumns`, `listStores`, `summarizeContext`. Phase 2/3 consume it directly. It is written so it **could** later back an MCP server (the home-lab service) when the Grown-Up moves from *proposing* drafts to *taking* actions — but we do **not** build the MCP server now (no mutation-at-parse, tiny context → injection wins). This captures the instinct without over-building; promoting to MCP is a later, separate doc.

**Outcome:** the Grown-Up asks before it assumes, and the capability surface is named + reusable for the home-lab handoff.

---

## 7. The structured-output schema

Phase 1 (drafts only). Phase 3 adds `status` + `question`. JSON-schema rules: `additionalProperties: false`, every property in `required`, nullable via `anyOf`.

```jsonc
{
  "type": "object", "additionalProperties": false,
  "required": ["status", "question", "drafts"],
  "properties": {
    "status":   { "type": "string", "enum": ["drafts", "needs_clarification"] }, // Phase 3
    "question": { "anyOf": [{ "type": "string" }, { "type": "null" }] },         // Phase 3
    "drafts": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["type","title","lane","kind","emoji","due_at","listName","amount","persistent"],
        "properties": {
          "type":   { "type": "string", "enum": ["task","event","shopping","expense"] },
          "title":  { "type": "string" },
          "lane":   { "type": "string", "enum": ["partner_a","partner_b","shared"] },
          "kind":   { "type": "string", "enum": ["routine","exciting"] },
          "emoji":      { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "due_at":     { "anyOf": [{ "type": "string", "format": "date-time" }, { "type": "null" }] },
          "listName":   { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "amount":     { "anyOf": [{ "type": "number" }, { "type": "null" }] },
          "persistent": { "type": "boolean" }
        }
      }
    }
  }
}
```

Notes: structured outputs has a one-time schema-compile cost (24h cache); incompatible with citations/prefill (neither used). First-party API → GA on Sonnet 4.6 / Haiku 4.5. The enums mirror the Postgres enums (`schema.sql:26–33`) and `normalizeDraft` exactly.

---

## 8. Files to touch

| File | Phase | Change |
|---|---|---|
| `supabase/functions/parse/index.ts` | 1,2,3 | structured outputs; drop `extractDrafts`; inject now/tz + context; discriminated union; Sonnet default |
| `src/lib/parser.js` | 1,2,3 | fetch timeout; send `context`; `continueParse`; return drafts-or-question |
| `src/ReviewTray.jsx` | 1,2,3 | format ISO `due_at`; resolve `listName`→`list_id` on accept; clarifying-question UI |
| `src/lib/data.js` | 2 | `findOrCreateList(space_id, name)` (mock + real) |
| `src/lib/grownup/capabilities.js` (new) | 3 | typed capability module (future-MCP-shaped) |
| `src/lib/parser.test.js` | 1,3 | contract + timeout + clarify-shape tests |
| `README.md`, `.env.example` | 1 | parser setup + `VITE_PARSER_URL` |

---

## 9. Verification

- **Unit:** `npm test` green (mock-mode forced; parser logic + new clamps/timeout/clarify-shape).
- **Edge function locally:** `supabase functions serve parse`, `curl` a dump → assert `{ drafts: [...] }` with ISO `due_at` and enum-valid fields; malformed/empty input → `{ drafts: [] }`; missing `ANTHROPIC_API_KEY` → 500.
- **End-to-end (real):** deploy (`supabase functions deploy parse --no-verify-jwt`), set `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL=claude-sonnet-4-6`, point `VITE_PARSER_URL`; in the app, dump a multi-item mess → drafts appear in the tray, a shopping item files into the existing Groceries list on accept, an ambiguous dump asks one question.
- **Fallback:** unset/point `VITE_PARSER_URL` at a dead URL → app still produces stub drafts (no hang, thanks to the timeout).
- **Model pull-back:** flip `ANTHROPIC_MODEL` to `claude-haiku-4-5`, re-run the dump suite, compare misclassification rate before committing the default.

---

## 10. Out of scope

- An actual MCP server / agentic tool-calling loop (reserved — see §6).
- Auto-filing without human confirmation (violates confirm-before-file).
- Voice capture (mic still decorative), nudges/push, recurrence-from-dump (`recur_*` stays an `ItemDetail` concern).
- Expanding the Draft shape beyond the 9 fields (columns/notes/color stay post-confirm in `ItemDetail`).

---

*Living doc. As phases ship, update status here, fold the parser contract into `two-do-ui-spec.md` §2b (The Grown-Up), and update the TOC build status ("Real AI parsing").*
