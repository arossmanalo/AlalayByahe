import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { JourneyOption, RouteRequest, TransitPack } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { createAiManager } from "../../src/ai/manager";
import { createModelStore } from "../../src/ai/modelStore";
import { buildSummaryRequest, checkSummary, templateSummary, tripFacts } from "../../src/ai/summary";
import { FakeRuntime, fakeManifest, fakeModelBytes, MemoryFiles, nodeSha256, outcome } from "./fakes";

// Real verified option from the frozen release pack: Vito Cruz to Baclaran, one LRT-1 ride, PHP 21.00.
const released = validatePack(JSON.parse(readFileSync("assets/data/release.json", "utf8")), { target: "release" });
if (!released.ok) throw new Error("release pack must validate");
const pack: TransitPack = released.value;
const ep = (id: string) => { const p = pack.places.find((x) => x.id === id)!; return { placeId: id, label: p.name, point: p.point, provenance: "stored" as const }; };
const request: RouteRequest = { queryId: "q", origin: ep("place_lrt1_vito_cruz"), destination: ep("place_lrt1_baclaran"), preferences: defaultPreferences() };
const planned = planRoute(request, pack, { now: () => Date.parse("2026-10-10T12:00:00+08:00") });
if (!planned.ok) throw new Error("plan must succeed");
const option: JourneyOption = planned.value.options[0]!;
const facts = tripFacts(option, request);
const reply = (summary: string) => outcome(JSON.stringify({ summary }));
const GOOD = "Board the LRT at Vito Cruz going to Dr. Santos, and get off at Baclaran. There are no transfers and no walking. The fare is PHP 21.00 in total.";

describe("trip summary facts and checks", () => {
  it("builds facts only from the verified option", () => {
    assert.equal(facts.firstBoard, "Vito Cruz");
    assert.equal(facts.finalStop, "Baclaran");
    assert.ok(facts.lines.some((l) => l.includes("PHP 21.00")));
    assert.ok(facts.allowedNumbers.has("21.00") && facts.allowedNumbers.has("21"));
  });

  it("accepts a faithful summary", () => assert.equal(checkSummary(reply(GOOD), facts), GOOD));

  for (const [why, text] of [
    ["an invented fare", GOOD.replace("21.00", "25.00")],
    ["an invented travel time", GOOD + " It takes about 15 minutes."],
    ["a 'fastest' claim", "This is the fastest way: board at Vito Cruz and get off at Baclaran."],
    ["the stops in the wrong order", "Board at Baclaran and get off at Vito Cruz. The fare is PHP 21.00."],
    ["a missing final stop", "Board the LRT at Vito Cruz going to Dr. Santos. The fare is PHP 21.00."],
  ] as const) {
    it(`rejects ${why}`, () => assert.equal(checkSummary(reply(text), facts), null));
  }

  it("rejects truncated, non-JSON or extra-key output", () => {
    assert.equal(checkSummary(outcome(JSON.stringify({ summary: GOOD }), { truncated: true }), facts), null);
    assert.equal(checkSummary(outcome(GOOD), facts), null);
    assert.equal(checkSummary(outcome(JSON.stringify({ summary: GOOD, route: "x" })), facts), null);
  });

  it("gives the same model request for the same option, whichever way the trip was entered", () => {
    const manualRequest = { ...request, queryId: "query_manual" };
    const chatRequest = { ...request, queryId: "query_chat" };
    assert.deepEqual(buildSummaryRequest(tripFacts(option, manualRequest), "en"), buildSummaryRequest(tripFacts(option, chatRequest), "en"));
    assert.equal(buildSummaryRequest(facts, "en").temperature, 0);
  });

  it("has a deterministic template that states only the facts", () => {
    const text = templateSummary(facts, "en");
    assert.match(text, /^From Vito Cruz Station to Baclaran Station\./);
    assert.ok(text.includes("PHP 21.00"));
    assert.equal(templateSummary(facts, "en"), text);
  });
});

describe("AiManager.summarize (DEV FIXTURE runtime)", () => {
  async function ready() {
    const content = fakeModelBytes(2048);
    const store = createModelStore({ manifest: fakeManifest(content), files: new MemoryFiles({ remote: content }), createHasher: nodeSha256, chunkBytes: 512, storageMarginBytes: 0, yieldToEventLoop: async () => {} });
    await store.acquire(() => {}, new AbortController().signal);
    const runtime = new FakeRuntime();
    const ai = createAiManager({ store, runtime, expectedLlamaCppBuild: runtime.info.llamaCppBuild });
    return { ai, runtime };
  }
  const input = { queryId: "summary_q", option, request, language: "en" as const };

  it("uses the model's text when it passes the check", async () => {
    const { ai, runtime } = await ready();
    await ai.initialize();
    runtime.replies.push({ delayMs: 1, result: reply(GOOD) });
    const r = await ai.summarize(input);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.value.source, "phone_ai"); assert.equal(r.value.text, GOOD); assert.ok(r.value.engine); }
  });

  it("falls back to the template when the model invents a number", async () => {
    const { ai, runtime } = await ready();
    await ai.initialize();
    runtime.replies.push({ delayMs: 1, result: reply(GOOD.replace("21.00", "30.00")) });
    const r = await ai.summarize(input);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.value.source, "template"); assert.equal(r.value.fallbackReason, "check_failed"); assert.ok(!r.value.text.includes("30.00")); }
  });

  it("gives the template, not an error, when the AI is not ready", async () => {
    const { ai, runtime } = await ready();
    const r = await ai.summarize(input);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.value.source, "template"); assert.equal(r.value.fallbackReason, "ai_not_ready"); }
    assert.equal(runtime.requests.length, 0);
  });

  it("can be cancelled by queryId and leaves the model usable", async () => {
    const { ai, runtime } = await ready();
    await ai.initialize();
    runtime.replies.push({ delayMs: 200, result: reply(GOOD) });
    const pending = ai.summarize(input);
    await new Promise((r) => setTimeout(r, 10));
    await ai.cancel("summary_q");
    const r = await pending;
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "CANCELLED");
    runtime.replies.push({ delayMs: 1, result: reply(GOOD) });
    assert.equal((await ai.summarize({ ...input, queryId: "summary_q2" })).ok, true);
    assert.equal(runtime.maxConcurrent, 1);
  });
});
