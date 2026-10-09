import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MODEL_MANIFEST } from "../../src/application/config";
import { matchesPhysicalProof } from "../../src/application/release-gate";

// The committed skeleton must stay an honest "nothing was run" form until a person fills it in
// from a witnessed session. This test fails if someone marks results without evidence fields.
const FLAGS = ["standaloneColdLaunch", "nativeSqliteRestart", "phoneLocalInference", "airplaneModeFreshQuery", "cancellationAndRecovery"];

test("the example and skeleton are Android-only forms with no results", () => {
  for (const file of ["docs/evidence/physical-release.example.json", "docs/evidence/physical-release.json"]) {
    const records = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>[];
    assert.deepEqual(records.map(r => r.platform), ["android"], file + " must not carry an iOS entry");
    assert.equal(records[0]!.modelRevision, MODEL_MANIFEST.revision);
  }
});

test("the skeleton cannot satisfy the release gate and reports every step Not Run", () => {
  const [record] = JSON.parse(readFileSync("docs/evidence/physical-release.json", "utf8")) as Record<string, unknown>[];
  for (const flag of FLAGS) assert.equal(record![flag], false, flag);
  for (const field of ["artifactSha256", "sourceCommit", "packVersion", "checkedAt"]) assert.equal(record![field], "", field);
  const steps = Object.values(record!.stepResults as Record<string, string>);
  assert.equal(steps.length, 25);
  assert.ok(steps.every(result => result === "Not Run"));
  const artifact = { platform: "android", artifactSha256: "a".repeat(64), sourceCommit: "b".repeat(40) };
  assert.equal(matchesPhysicalProof(record, artifact, "lrt1_2026_10_10_1", MODEL_MANIFEST), false);
});
