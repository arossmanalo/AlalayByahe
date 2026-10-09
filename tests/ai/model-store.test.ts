import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelState } from "../../src/contracts";
import { createModelStore } from "../../src/ai/modelStore";
import { fakeManifest, fakeModelBytes, MemoryFiles, nodeSha256 } from "./fakes";

const CHUNK = 1024;
const content = fakeModelBytes(10 * CHUNK + 123);
const manifest = fakeManifest(content);
const part = `${manifest.filename}.part`;
const marker = `${manifest.filename}.verified.json`;

function setup(files: MemoryFiles) {
  const states: ModelState[] = [];
  const store = createModelStore({
    manifest,
    files,
    createHasher: nodeSha256,
    chunkBytes: CHUNK,
    storageMarginBytes: 0,
    yieldToEventLoop: async () => {},
    nowIso: () => "2026-10-09T22:00:00+08:00",
  });
  return { store, states, onProgress: (s: ModelState) => states.push(s) };
}

function corrupted(): Uint8Array {
  const bad = content.slice();
  bad[500] = (bad[500] ?? 0) ^ 0xff;
  return bad;
}

describe("model store (AI-002, DEV FIXTURE file adapter)", () => {
  it("downloads to .part, hashes in bounded chunks, then promotes and marks verified", async () => {
    const files = new MemoryFiles({ remote: content, availableBytes: 10 ** 9 });
    const { store, states, onProgress } = setup(files);
    assert.deepEqual(await store.inspect(), { status: "absent" });

    const r = await store.acquire(onProgress, new AbortController().signal);
    assert.equal(r.ok, true);
    assert.equal(files.store.has(part), false);
    assert.deepEqual(files.store.get(manifest.filename), content);
    assert.ok(files.texts.has(marker));
    assert.ok(files.largestRead <= CHUNK, "never reads more than one chunk at a time");
    assert.equal(files.totalRead, content.length);
    assert.equal(files.openReaders, 0, "reader closed");

    const downloading = states.filter((s) => s.phase === "downloading").map((s) => (s as { progress: number }).progress);
    const checking = states.filter((s) => s.phase === "checking").map((s) => (s as { progress: number }).progress);
    for (const series of [downloading, checking]) {
      assert.ok(series.length > 2);
      assert.ok(series.every((p, i) => p >= 0 && p <= 1 && (i === 0 || p >= (series[i - 1] ?? 0))), "normalized 0-1, monotonic");
      assert.equal(series.at(-1), 1);
    }
  });

  it("reuses a verified model after restart without downloading (offline relaunch)", async () => {
    const files = new MemoryFiles({ remote: content });
    await setup(files).store.acquire(() => {}, new AbortController().signal);
    const relaunched = setup(files);
    const inspection = await relaunched.store.inspect();
    assert.equal(inspection.status, "verified");
    assert.equal(files.downloads, 1);
  });

  it("rejects a hash mismatch, deletes the partial file and never promotes it (EC-099)", async () => {
    const files = new MemoryFiles({ remote: corrupted() });
    const { store, onProgress } = setup(files);
    const r = await store.acquire(onProgress, new AbortController().signal);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.code, "AI_NOT_READY");
      assert.equal(r.error.retryable, true);
    }
    assert.equal(files.store.has(part), false);
    assert.equal(files.store.has(manifest.filename), false);
    assert.deepEqual(await store.inspect(), { status: "absent" });
  });

  it("rejects wrong byte count before hashing", async () => {
    const files = new MemoryFiles({ remote: content.slice(0, content.length - 1) });
    const r = await setup(files).store.acquire(() => {}, new AbortController().signal);
    assert.equal(r.ok, false);
    assert.equal(files.totalRead, 0, "size mismatch fails without reading");
    assert.equal(files.store.has(manifest.filename), false);
  });

  it("treats an interrupted download as retryable and keeps nothing (EC-098)", async () => {
    const files = new MemoryFiles({ remote: content, failAfterBytes: 4 * CHUNK });
    const r = await setup(files).store.acquire(() => {}, new AbortController().signal);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "NETWORK_UNAVAILABLE");
    assert.equal(files.store.has(part), false);
    assert.equal(files.store.has(manifest.filename), false);
  });

  it("stops on cancel mid-download", async () => {
    const files = new MemoryFiles({ remote: content });
    const controller = new AbortController();
    files.onDownloadChunk = (written) => {
      if (written >= 3 * CHUNK) controller.abort();
    };
    const r = await setup(files).store.acquire(() => {}, controller.signal);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "CANCELLED");
    assert.equal(files.store.has(part), false);
  });

  it("refuses to start when storage is insufficient (EC-088)", async () => {
    const files = new MemoryFiles({ remote: content, availableBytes: content.length - 1 });
    const r = await setup(files).store.acquire(() => {}, new AbortController().signal);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "STORAGE_FULL");
    assert.equal(files.downloads, 0);
  });

  it("verifies a manually preloaded file once, then trusts the marker", async () => {
    const files = new MemoryFiles();
    files.store.set(manifest.filename, content.slice());
    const { store } = setup(files);
    assert.equal((await store.inspect()).status, "unverified");
    const r = await store.verifyExisting(() => {}, new AbortController().signal);
    assert.equal(r.ok, true);
    assert.equal((await store.inspect()).status, "verified");
  });

  it("removes a corrupt preloaded file instead of initializing it", async () => {
    const files = new MemoryFiles();
    files.store.set(manifest.filename, corrupted());
    const { store } = setup(files);
    const r = await store.verifyExisting(() => {}, new AbortController().signal);
    assert.equal(r.ok, false);
    assert.equal(files.store.has(manifest.filename), false);
  });

  it("does not trust a marker for a different manifest", async () => {
    const files = new MemoryFiles();
    files.store.set(manifest.filename, content.slice());
    files.texts.set(marker, JSON.stringify({ ...manifest, sha256: "0".repeat(64), verifiedAt: "x" }));
    assert.equal((await setup(files).store.inspect()).status, "unverified");
  });

  it("re-verifies after a promotion interrupted before the marker was written", async () => {
    const files = new MemoryFiles({ remote: content });
    const { store } = setup(files);
    await store.acquire(() => {}, new AbortController().signal);
    files.texts.delete(marker); // app killed between move and marker write
    assert.equal((await store.inspect()).status, "unverified");
    assert.equal((await store.verifyExisting(() => {}, new AbortController().signal)).ok, true);
  });
});
