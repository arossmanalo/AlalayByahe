import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExtractInput, ModelState } from "../../src/contracts";
import { createAiManager, VERIFIED_NOT_LOADED } from "../../src/ai/manager";
import { createModelStore } from "../../src/ai/modelStore";
import { delay, FakeRuntime, fakeManifest, fakeModelBytes, MemoryFiles, nodeSha256, outcome, VALID_INTENT } from "./fakes";

const content = fakeModelBytes(4096);
const manifest = fakeManifest(content);

function query(queryId: string, text = "From Lipa to San Pablo, ayoko bus, konting lipat sana."): ExtractInput {
  return { queryId, text, locale: "taglish", knownPlaceLabels: ["Lipa", "San Pablo"] };
}

async function setup(options: { preload?: boolean; timeouts?: { warm: number; cold: number } } = {}) {
  const files = new MemoryFiles({ remote: content });
  const store = createModelStore({
    manifest,
    files,
    createHasher: nodeSha256,
    chunkBytes: 1024,
    storageMarginBytes: 0,
    yieldToEventLoop: async () => {},
  });
  if (options.preload !== false) await store.acquire(() => {}, new AbortController().signal);
  const runtime = new FakeRuntime();
  const ai = createAiManager({
    store,
    runtime,
    expectedLlamaCppBuild: runtime.info.llamaCppBuild,
    settings: {
      warmTimeoutMs: options.timeouts?.warm ?? 200,
      coldTimeoutMs: options.timeouts?.cold ?? 400,
      stopSettleTimeoutMs: 100,
    },
  });
  const states: ModelState[] = [];
  ai.subscribe((s) => states.push(s));
  return { ai, runtime, files, store, states };
}

describe("AiPort manager lifecycle (AI-004, DEV FIXTURE runtime)", () => {
  it("reports AI_NOT_READY before the model exists and never downloads during initialize", async () => {
    const { ai, files } = await setup({ preload: false });
    const init = await ai.initialize();
    assert.equal(init.ok, false);
    if (!init.ok) assert.equal(init.error.code, "AI_NOT_READY");
    assert.equal(files.downloads, 0);
    assert.deepEqual(ai.getState(), { phase: "absent", progress: null });
    const r = await ai.extract(query("q1"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "AI_NOT_READY");
  });

  it("downloads only through explicit ensureModel, then initializes once", async () => {
    const { ai, runtime, files } = await setup({ preload: false });
    const seen: ModelState[] = [];
    assert.equal((await ai.ensureModel((s) => seen.push(s))).ok, true);
    assert.equal(files.downloads, 1);
    assert.ok(seen.some((s) => s.phase === "downloading"));
    assert.ok(seen.some((s) => s.phase === "checking"));
    assert.deepEqual(ai.getState(), VERIFIED_NOT_LOADED);

    const [a, b] = await Promise.all([ai.initialize(), ai.initialize()]);
    assert.equal(a.ok && b.ok, true);
    assert.equal(runtime.loads, 1, "one native context");
    assert.deepEqual(ai.getState(), { phase: "ready", modelId: manifest.id });
  });

  it("returns a validated Extraction with truthful engine metadata", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    const r = await ai.extract(query("q1"));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.value.intent.excludedModes, ["bus"]);
      assert.deepEqual(r.value.engine, {
        kind: "phone_local",
        modelId: manifest.id,
        modelRevision: manifest.revision,
        runtime: runtime.info.label,
      });
      assert.ok(r.value.elapsedMs >= 0);
    }
  });

  it("rejects input over 600 characters before calling the model", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    const r = await ai.extract(query("q1", "x".repeat(601)));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "INVALID_INPUT");
    assert.equal(runtime.requests.length, 0);
  });

  it("times out, awaits the native stop, and the next request succeeds (EC-018)", async () => {
    const { ai, runtime } = await setup({ timeouts: { warm: 50, cold: 50 } });
    await ai.initialize();
    runtime.replies.push({ delayMs: 1_000, result: outcome(JSON.stringify(VALID_INTENT)) });
    const slow = await ai.extract(query("q1"));
    assert.equal(slow.ok, false);
    if (!slow.ok) assert.equal(slow.error.code, "AI_TIMEOUT");
    assert.equal(runtime.stops, 1);
    assert.equal(runtime.running, 0, "native completion settled before returning");

    const next = await ai.extract(query("q2"));
    assert.equal(next.ok, true);
    assert.equal(runtime.maxConcurrent, 1);
  });

  it("cancels by queryId and ignores the late native result (EC-102)", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 150, result: outcome(JSON.stringify(VALID_INTENT)) });
    const pending = ai.extract(query("q1"));
    await delay(10);
    await ai.cancel("other_query"); // stale cancel has no effect
    assert.equal(runtime.stops, 0);
    await ai.cancel("q1");
    const r = await pending;
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "CANCELLED");
    await ai.cancel("q1"); // double cancel is safe
    assert.equal(runtime.stops, 1);
  });

  it("a newer query supersedes the older one; never two completions at once", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 150, result: outcome(JSON.stringify(VALID_INTENT)) });
    const first = ai.extract(query("q1"));
    await delay(10);
    const second = ai.extract(query("q2", "Galing Lipa papuntang San Pablo, ayoko ng bus"));
    const [r1, r2] = await Promise.all([first, second]);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.error.code, "CANCELLED");
    assert.equal(r2.ok, true);
    assert.equal(runtime.maxConcurrent, 1);
  });

  it("background cancel stops the active job and later queries still work", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 150, result: outcome(JSON.stringify(VALID_INTENT)) });
    const pending = ai.extract(query("q1"));
    await delay(10);
    await ai.cancelActive();
    assert.equal((await pending).ok, false);
    assert.equal((await ai.extract(query("q2"))).ok, true);
  });

  it("release while running cancels safely; release is idempotent; reinit works", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 150, result: outcome(JSON.stringify(VALID_INTENT)) });
    const pending = ai.extract(query("q1"));
    await delay(10);
    await ai.release();
    await ai.release();
    const r = await pending;
    assert.equal(r.ok, false);
    assert.equal(runtime.releases, 1);
    assert.equal(runtime.running, 0);
    assert.deepEqual(ai.getState(), VERIFIED_NOT_LOADED);

    assert.equal((await ai.initialize()).ok, true);
    assert.equal(runtime.loads, 2);
    assert.equal((await ai.extract(query("q2"))).ok, true);
  });

  it("a query arriving while release is stopping the active job never reaches the released context", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 150, result: outcome(JSON.stringify(VALID_INTENT)) });
    const running = ai.extract(query("q1"));
    await delay(10);
    const releasing = ai.release();
    const late = await ai.extract(query("q2"));
    await releasing;
    await running;
    assert.equal(late.ok, false);
    if (!late.ok) assert.equal(late.error.code, "AI_NOT_READY");
    assert.equal(runtime.requests.length, 1);
    assert.equal(runtime.maxConcurrent, 1);
  });

  it("release during initialization does not leak the loading context", async () => {
    const { ai, runtime } = await setup();
    runtime.loadDelayMs = 50;
    const init = ai.initialize();
    await delay(5);
    await ai.release();
    const r = await init;
    assert.equal(r.ok, false);
    assert.equal(runtime.loads, 1);
    assert.equal(runtime.releases, 1);
    assert.notEqual(ai.getState().phase, "ready");
  });

  it("init failure reports AI_INIT_FAILED and a retry can succeed (EC-086)", async () => {
    const { ai, runtime } = await setup();
    runtime.failLoad = new Error("simulated native OOM");
    const failed = await ai.initialize();
    assert.equal(failed.ok, false);
    if (!failed.ok) assert.equal(failed.error.code, "AI_INIT_FAILED");
    assert.equal(ai.getState().phase, "failed");
    runtime.failLoad = null;
    assert.equal((await ai.initialize()).ok, true);
  });

  it("refuses an unpinned runtime build (EC-097)", async () => {
    const { ai, runtime } = await setup();
    runtime.info = { ...runtime.info, llamaCppBuild: "other_build" };
    const r = await ai.initialize();
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.code, "AI_INIT_FAILED");
      assert.equal(r.error.retryable, false);
    }
    assert.equal(runtime.loads, 0);
  });

  it("drops a context whose native completion ignores stop", async () => {
    const { ai, runtime } = await setup({ timeouts: { warm: 30, cold: 30 } });
    await ai.initialize();
    runtime.replies.push({ delayMs: 0, ignoreStop: true });
    const r = await ai.extract(query("q1"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "AI_TIMEOUT");
    assert.equal(ai.getState().phase, "failed");
    assert.equal(runtime.releases, 1);
    const blocked = await ai.extract(query("q2"));
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error.code, "AI_NOT_READY");
  });

  it("malformed model output becomes AI_INVALID_OUTPUT, not a route", async () => {
    const { ai, runtime } = await setup();
    await ai.initialize();
    runtime.replies.push({ delayMs: 1, result: outcome('{"kind":"journey","routeId":"service_x"}') });
    const r = await ai.extract(query("q1"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "AI_INVALID_OUTPUT");
  });
});
