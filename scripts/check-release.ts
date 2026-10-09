import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MODEL_MANIFEST } from "../src/application/config";
import { INTEGRATION_STATUS } from "../src/application/integration-status";
import { releaseBlockers } from "../src/application/release-gate";

function readJson(path: string): unknown {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null; }
  catch { return null; }
}
const blockers = releaseBlockers({
  pack: readJson("assets/data/release.json"),
  ai: INTEGRATION_STATUS.ai, commuteUi: INTEGRATION_STATUS.commuteUi,
  model: MODEL_MANIFEST, physicalProof: readJson("docs/evidence/physical-release.json"),
});
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/);
for (const path of tracked) {
  if (/\.(gguf|part|apk|aab|ipa|jks|keystore|p12|mobileprovision)$/i.test(path)
      || /(^|\/)\.env(\..*)?$/.test(path) && !path.endsWith(".example")) {
    blockers.push("Forbidden release material tracked in Git: " + path);
  }
}
if (blockers.length) {
  console.error("RELEASE BLOCKED");
  for (const blocker of blockers) console.error("- " + blocker);
  process.exitCode = 1;
} else {
  console.log("Release records pass. Review the matching artifacts and manual evidence before distribution.");
}
