import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { MODEL_MANIFEST } from "../src/application/config";
import { INTEGRATION_STATUS } from "../src/application/integration-status";
import { releaseBlockers } from "../src/application/release-gate";
import { BUNDLED_TRANSIT_PACK } from "../src/application/bundled-pack";
import { validateTransitPack } from "../src/contracts/validators";
import { canonicalJson } from "../src/data/canonicalJson";
import { forbiddenReleaseImports } from "./release-source-guard";

function readJson(path: string): unknown {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null; }
  catch { return null; }
}
const artifacts = readJson("docs/evidence/native-artifacts.json");
const blockers = releaseBlockers({
  pack: readJson("assets/data/release.json"),
  ai: INTEGRATION_STATUS.ai, commuteUi: INTEGRATION_STATUS.commuteUi,
  model: MODEL_MANIFEST, physicalProof: readJson("docs/evidence/physical-release.json"),
  artifacts,
});
// A documentation-only commit may follow a build. Runtime changes require a
// newly built artifact and physical test, even when an old report still exists.
for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
  try {
    if (typeof artifact?.sourceCommit !== "string" || !/^[a-f0-9]{40}$/.test(artifact.sourceCommit)) throw new Error("Invalid source commit");
    const changed = execFileSync("git", ["diff", "--name-only", artifact.sourceCommit, "--",
      "app", "src", "assets", "package.json", "package-lock.json", "app.config.ts",
      "babel.config.js", "metro.config.js", "tsconfig.json", "scripts/build-android.ps1"], { encoding: "utf8" });
    if (changed.trim()) blockers.push("Native artifact is stale for current runtime sources: " + artifact.platform);
  } catch { blockers.push("Native artifact source commit could not be verified."); }
}
const bundled = validateTransitPack(BUNDLED_TRANSIT_PACK);
const releaseFile = readJson("assets/data/release.json");
if (!bundled.ok || canonicalJson(bundled.value) !== canonicalJson(releaseFile)) {
  blockers.push("The reviewed release pack is not connected to the native bundle.");
}
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/);
function inspectSources(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inspectSources(path);
    else if (/\.tsx?$/.test(entry.name)) {
      for (const problem of forbiddenReleaseImports(path, readFileSync(path, "utf8"))) {
        blockers.push("Forbidden native source in " + path + ": " + problem);
      }
    }
  }
}
inspectSources("app");
inspectSources("src");
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
