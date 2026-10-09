import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RawIntent } from "../../src/contracts";
import { HELD_OUT_CORPUS } from "../../src/ai/corpus";
import { runBenchmark, runLifecycleChecks, runProbeStep, type DiagnosticsDeps } from "../../src/ai/diagnostics";
import type { CorpusCase } from "../../src/ai/evaluation";
import { createAiManager } from "../../src/ai/manager";
import { createModelStore } from "../../src/ai/modelStore";
import { forbiddenReleaseImports } from "../../scripts/release-source-guard";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeRuntime, fakeManifest, fakeModelBytes, MemoryFiles, nodeSha256, outcome, VALID_INTENT } from "./fakes";

// DEV FIXTURE runtime: these tests check the diagnostics plumbing, not real inference.

function asIntent(c: CorpusCase): RawIntent {
  const first = (v: string | string[] | null) => (Array.isArray(v) ? (v[0] ?? null) : v);
  const { requiresClarification: _r, ...slots } = c.expected;
  return { ...slots, originText: first(slots.originText), destinationText: first(slots.destinationText), ambiguities: [] };
}

async function setup() {
  const content = fakeModelBytes(2048);
  const files = new MemoryFiles({ remote: content });
  const store = createModelStore({
    manifest: fakeManifest(content),
    files,
    createHasher: nodeSha256,
    chunkBytes: 512,
    storageMarginBytes: 0,
    yieldToEventLoop: async () => {},
  });
  await store.acquire(() => {}, new AbortController().signal);
  const runtime = new FakeRuntime();
  const ai = createAiManager({ store, runtime, expectedLlamaCppBuild: runtime.info.llamaCppBuild });
  const deps: DiagnosticsDeps = {
    ai,
    createProbeTarget: () => ({ runtime, store }),
    platformLabel: "TEST FIXTURE device",
  };
  return { ai, runtime, deps };
}

describe("device diagnostics runner (DEV FIXTURE runtime)", () => {
  it("probe keeps one native context at a time and reloads the app model afterwards", async () => {
    const { ai, runtime, deps } = await setup();
    await ai.initialize();
    const report = await runProbeStep(deps, "Galing Lipa papuntang San Pablo, ayoko ng bus");
    assert.equal(report.probe.error, null);
    assert.equal(report.probe.parsed?.ok, true);
    assert.equal(report.appAiReinitialized, "ok");
    assert.equal(runtime.loads, 3, "app load, probe load, app reload");
    assert.equal(runtime.releases, 2, "app context and probe context released before the next load");
    assert.equal(ai.getState().phase, "ready");
  });

  it("benchmark cold-loads, separates cold/warm and attaches raw output only to misses", async () => {
    const { runtime, deps } = await setup();
    const cases = HELD_OUT_CORPUS.cases.slice(0, 4);
    runtime.replies.push(
      { delayMs: 1, result: outcome(JSON.stringify(asIntent(cases[0]!))) },
      { delayMs: 1, result: outcome(JSON.stringify({ ...asIntent(cases[1]!), excludedModes: ["lrt"] })) },
      { delayMs: 1, result: outcome("not json") },
      { delayMs: 1, result: outcome(JSON.stringify(asIntent(cases[3]!))) },
    );
    const progress: string[] = [];
    const report = await runBenchmark(deps, { version: "test", cases }, (d, t) => progress.push(`${d}/${t}`));
    assert.equal(report.initError, null);
    assert.ok(report.initMs !== null);
    assert.equal(report.summary?.cases, 4);
    assert.equal(report.summary?.exact, 2);
    assert.equal(report.summary?.coldElapsedMs.length, 1);
    assert.equal(report.summary?.elapsedMs.samples, 2, "3 warm calls minus the invalid-output error");
    assert.deepEqual(progress, ["1/4", "2/4", "3/4", "4/4"]);
    assert.deepEqual(report.misses.map((m) => m.id), [cases[1]!.id, cases[2]!.id]);
    assert.ok(report.misses[0]?.failedSlots.includes("excludedModes"));
    assert.equal(report.misses[1]?.errorCode, "AI_INVALID_OUTPUT");
    assert.equal(report.misses[1]?.rawText, "not json", "raw output kept for publishing the miss");
  });

  it("benchmark reports a failed model load instead of scoring", async () => {
    const { runtime, deps } = await setup();
    runtime.failLoad = new Error("simulated OOM");
    const report = await runBenchmark(deps, HELD_OUT_CORPUS);
    assert.match(report.initError ?? "", /AI_INIT_FAILED/);
    assert.equal(report.summary, null);
    assert.equal(runtime.requests.length, 0);
  });

  it("lifecycle checks pass when cancel and supersede behave", async () => {
    const { runtime, deps } = await setup();
    runtime.defaultReply = { delayMs: 400, result: outcome(JSON.stringify(VALID_INTENT)) };
    const report = await runLifecycleChecks({ ...deps, wait: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 30))) });
    const byName = Object.fromEntries(report.checks.map((c) => [c.name, c]));
    assert.equal(byName.cancel_mid_completion?.pass, true);
    assert.equal(byName.next_query_after_cancel?.pass, true);
    assert.equal(byName.rapid_repeat_latest_wins?.pass, true, byName.rapid_repeat_latest_wins?.detail);
    assert.equal(byName.state_ready_after_checks?.pass, true);
    assert.equal(runtime.maxConcurrent, 1);
    assert.equal(report.manualChecks.length, 2);
  });

  it("the diagnostics screen passes the release source guard", () => {
    const path = join(__dirname, "..", "..", "app", "dev-ai.tsx");
    assert.deepEqual(forbiddenReleaseImports(path, readFileSync(path, "utf8")), []);
  });
});
