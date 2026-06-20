import { describe, it, expect, vi, afterEach } from "vitest";
import { stubParse, normalizeDraft, remoteParse, parseBrainDump } from "./parser.js";
import { SLOTS } from "./lanes.js";

const DUMP =
  "ok so the cat needs more wet food not the pâté kind she hates that, the chunky one in gravy, and we're almost out of bin bags. budget like 40 quid max. date night this saturday. put that at home so I see it when I'm there";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("stubParse — segmentation", () => {
  const drafts = stubParse(DUMP, { viewerSlot: SLOTS.A });

  it("keeps qualifying detail with its item (no comma fragments)", () => {
    // "the chunky one in gravy" must NOT become its own card
    expect(drafts.some((d) => /chunky one in gravy/i.test(d.title))).toBe(true);
    expect(drafts.some((d) => d.title.toLowerCase() === "the chunky one in gravy")).toBe(false);
  });

  it("detects an expense with a numeric amount from 'quid'", () => {
    const exp = drafts.find((d) => d.type === "expense");
    expect(exp).toBeTruthy();
    expect(exp.amount).toBe(40);
  });

  it("marks fun stuff as exciting with an emoji", () => {
    const dn = drafts.find((d) => /date night/i.test(d.title));
    expect(dn.kind).toBe("exciting");
    expect(dn.emoji).toBeTruthy();
  });

  it("routes 'I/my' clauses to the author's lane", () => {
    const mine = drafts.find((d) => /see it when i'm there/i.test(d.title));
    expect(mine.lane).toBe(SLOTS.A);
  });
});

describe("normalizeDraft", () => {
  it("clamps unknown type to task and missing lane to shared", () => {
    const d = normalizeDraft({ title: "x", type: "nonsense" });
    expect(d.type).toBe("task");
    expect(d.lane).toBe(SLOTS.SHARED);
  });
  it("coerces amount to a number", () => {
    expect(normalizeDraft({ title: "x", type: "expense", amount: "12.5" }).amount).toBe(12.5);
  });
  it("drops a draft with no title", () => {
    expect(normalizeDraft({ type: "task" })).toBeNull();
  });
});

describe("remoteParse — contract", () => {
  it("POSTs the dump and normalizes the returned drafts", async () => {
    vi.stubEnv("VITE_PARSER_URL", "http://test.local/parse");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        drafts: [{ type: "event", title: "Date night", lane: "shared", kind: "exciting", emoji: "💕" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await remoteParse("date night saturday", { viewerSlot: SLOTS.A });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/parse");
    const sent = JSON.parse(opts.body);
    expect(sent).toMatchObject({ text: "date night saturday", viewerSlot: SLOTS.A });
    expect(sent).toHaveProperty("now"); // current time for relative-date resolution
    expect(sent).toHaveProperty("tz");
    expect(out).toEqual([
      { type: "event", title: "Date night", lane: "shared", kind: "exciting", emoji: "💕", due_at: null, listName: null, amount: null, persistent: false },
    ]);
  });

  it("throws on a non-ok response (so parseBrainDump can fall back)", async () => {
    vi.stubEnv("VITE_PARSER_URL", "http://test.local/parse");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(remoteParse("x", {})).rejects.toThrow(/500/);
  });
});

describe("parseBrainDump — backend selection", () => {
  it("uses the stub when no parser URL is configured", async () => {
    const out = await parseBrainDump(DUMP, { viewerSlot: SLOTS.A });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(1);
  });

  it("falls back to the stub if the remote throws", async () => {
    vi.stubEnv("VITE_PARSER_URL", "http://test.local/parse");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const out = await parseBrainDump("buy milk. date night saturday", { viewerSlot: SLOTS.A });
    expect(out.length).toBeGreaterThan(0); // came from the stub
  });

  it("times out a hung backend and falls back to the stub", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_PARSER_URL", "http://test.local/parse");
    // A fetch that never resolves on its own — only rejects when aborted.
    vi.stubGlobal("fetch", vi.fn((_url, opts) => new Promise((_resolve, reject) => {
      opts?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const p = parseBrainDump("buy milk. date night saturday", { viewerSlot: SLOTS.A });
    await vi.advanceTimersByTimeAsync(13000); // past the 12s timeout
    const out = await p;
    expect(out.length).toBeGreaterThan(0); // stub kicked in after the abort
  });
});
