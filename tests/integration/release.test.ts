import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesPhysicalProof, releaseBlockers } from "../../src/application/release-gate";
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

const artifact = { platform: "android", artifactSha256: "a".repeat(64), sourceCommit: "b".repeat(40) };
const proof = {
  ...artifact, checkedAt: "2026-10-09T21:00:00+08:00", packVersion: "release_v1",
  modelId: MODEL_MANIFEST.id, modelRevision: MODEL_MANIFEST.revision,
  standaloneColdLaunch: true, nativeSqliteRestart: true, phoneLocalInference: true,
  airplaneModeFreshQuery: true, cancellationAndRecovery: true,
};
test("physical acceptance is tied to the recorded native artifact", () => {
  assert.equal(matchesPhysicalProof(proof, artifact, "release_v1", MODEL_MANIFEST), true);
  assert.equal(matchesPhysicalProof(proof, null, "release_v1", MODEL_MANIFEST), false);
  assert.equal(matchesPhysicalProof(proof, { ...artifact, platform: "ios" }, "release_v1", MODEL_MANIFEST), false);
});
test("a report for a different artifact or source commit cannot approve release", () => {
  for (const changed of [{ artifactSha256: "c".repeat(64) }, { sourceCommit: "c".repeat(40) }]) {
    assert.equal(matchesPhysicalProof({ ...proof, ...changed }, artifact, "release_v1", MODEL_MANIFEST), false);
  }
});
test("physical evidence must cover this pack, model revision and all acceptance cases", () => {
  assert.equal(matchesPhysicalProof(proof, artifact, "release_v2", MODEL_MANIFEST), false);
  assert.equal(matchesPhysicalProof({ ...proof, modelRevision: "old" }, artifact, "release_v1", MODEL_MANIFEST), false);
  assert.equal(matchesPhysicalProof({ ...proof, airplaneModeFreshQuery: false }, artifact, "release_v1", MODEL_MANIFEST), false);
});
