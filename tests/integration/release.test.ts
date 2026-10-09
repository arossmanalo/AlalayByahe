import { test } from "node:test";
import assert from "node:assert/strict";
import { releaseBlockers } from "../../src/application/release-gate";
import { MODEL_MANIFEST } from "../../src/application/config";
import { pack } from "./helpers";

test("foundation cannot pass a release gate without real adapters, data, and physical proof", () => {
  const blockers = releaseBlockers({ pack: null, ai: "unavailable", commuteUi: "foundation", model: MODEL_MANIFEST, physicalProof: null });
  assert.equal(blockers.length, 5);
});
test("a fixture and claimed proof cannot establish release readiness", () => {
  const proof = ["android", "ios"].map(platform => ({
    platform, artifactSha256: "a".repeat(64), sourceCommit: "a".repeat(40),
    checkedAt: "2026-10-09T21:00:00+08:00", packVersion: pack().version,
    modelId: MODEL_MANIFEST.id, modelRevision: MODEL_MANIFEST.revision,
    standaloneColdLaunch: true, nativeSqliteRestart: true, phoneLocalInference: true,
    airplaneModeFreshQuery: true, cancellationAndRecovery: true,
  }));
  const blockers = releaseBlockers({ pack: pack(), ai: "integrated", commuteUi: "integrated", model: MODEL_MANIFEST, physicalProof: proof });
  assert.equal(blockers.length, 3);
});
