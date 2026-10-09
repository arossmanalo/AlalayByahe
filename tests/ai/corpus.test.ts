import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { RawIntent } from "../../src/contracts";
import { type CorpusCase, percentile, runCorpus, scoreCase, summarize } from "../../src/ai/evaluation";
import { validateExtractInput } from "../../src/ai/extract";
import { normalizeText, checkIntentAgainstQuery, validateRawIntent } from "../../src/ai/validateIntent";
import { PROMPT_EXAMPLES } from "../../src/ai/prompt";
import { createAiManager } from "../../src/ai/manager";
import { createModelStore } from "../../src/ai/modelStore";
import { FakeRuntime, fakeManifest, fakeModelBytes, MemoryFiles, nodeSha256, outcome } from "./fakes";

const corpus = JSON.parse(readFileSync(join(__dirname, "corpus.json"), "utf8")) as { cases: CorpusCase[] };
const cases = corpus.cases;

function asIntent(c: CorpusCase): RawIntent {
  const first = (v: string | string[] | null) => (Array.isArray(v) ? (v[0] ?? null) : v);
  const { requiresClarification: _r, ...slots } = c.expected;
  return { ...slots, originText: first(slots.originText), destinationText: first(slots.destinationText), ambiguities: [] };
}

describe("held-out corpus integrity (AI-003)", () => {
  it("has at least 20 unique cases across all three locales", () => {
    assert.ok(cases.length >= 20);
    assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
    assert.equal(new Set(cases.map((c) => normalizeText(c.text))).size, cases.length);
    assert.deepEqual(new Set(cases.map((c) => c.locale)), new Set(["en", "fil", "taglish"]));
  });

  it("never reuses a prompt example (held-out means unseen)", () => {
    const promptTexts = new Set(PROMPT_EXAMPLES.map((e) => normalizeText(e.text)));
    for (const c of cases) assert.ok(!promptTexts.has(normalizeText(c.text)), c.id);
  });

  it("every case is a valid ExtractInput and every expected slot set is a valid RawIntent", () => {
    for (const c of cases) {
      assert.equal(validateExtractInput({ queryId: c.id, text: c.text, locale: c.locale, knownPlaceLabels: c.knownPlaceLabels }).ok, true, c.id);
      assert.equal(validateRawIntent(asIntent(c)).ok, true, c.id);
    }
  });

  it("deterministic checks stay quiet on correct extractions and fire where clarification is required", () => {
    for (const c of cases) {
      const notes = checkIntentAgainstQuery(asIntent(c), c.text).ambiguities;
      if (c.expected.requiresClarification) assert.ok(notes.length > 0, `${c.id} should require clarification`);
      else assert.deepEqual(notes, [], `${c.id} false-positive notes: ${notes.join(" | ")}`);
    }
  });
});

describe("scoring", () => {
  const c02 = cases.find((c) => c.id === "c02");
  assert.ok(c02);

  it("scores an exact match", () => {
    const s = scoreCase(c02, asIntent(c02));
    assert.equal(s.exact, true);
    assert.equal(s.silentWrongRole, false);
  });

  it("detects a silently swapped origin/destination", () => {
    const swapped = { ...asIntent(c02), originText: "Lipa", destinationText: "San Pablo" };
    const s = scoreCase(c02, swapped);
    assert.equal(s.exact, false);
    assert.equal(s.silentWrongRole, true);
    assert.equal(scoreCase(c02, { ...swapped, ambiguities: ["check roles"] }).silentWrongRole, false);
  });

  it("counts failed runs as misses and reports median/p95", () => {
    assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50), 5);
    assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95), 10);
    assert.equal(percentile([], 95), null);
    const summary = summarize([
      { id: "a", ok: true, errorCode: null, elapsedMs: 100, score: scoreCase(c02, asIntent(c02)), intent: null },
      { id: "b", ok: false, errorCode: "AI_TIMEOUT", elapsedMs: null, score: null, intent: null },
    ]);
    assert.equal(summary.exactRate, 0.5);
    assert.deepEqual(summary.errors, { AI_TIMEOUT: 1 });
    assert.deepEqual(summary.misses, ["b"]);
  });

  it("runCorpus drives the real AiPort manager (DEV FIXTURE runtime echoing labels)", async () => {
    const content = fakeModelBytes(2048);
    const files = new MemoryFiles({ remote: content });
    const store = createModelStore({ manifest: fakeManifest(content), files, createHasher: nodeSha256, chunkBytes: 512, storageMarginBytes: 0, yieldToEventLoop: async () => {} });
    await store.acquire(() => {}, new AbortController().signal);
    const runtime = new FakeRuntime();
    const subset = cases.slice(0, 3);
    for (const c of subset) runtime.replies.push({ delayMs: 1, result: outcome(JSON.stringify(asIntent(c))) });
    const ai = createAiManager({ store, runtime, expectedLlamaCppBuild: runtime.info.llamaCppBuild });
    await ai.initialize();
    const summary = summarize(await runCorpus(ai, subset, "test_run"));
    assert.equal(summary.cases, 3);
    assert.equal(summary.exact, 3);
    assert.equal(summary.elapsedMs.samples, 3);
  });
});
