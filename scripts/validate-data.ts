import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { canonicalJson } from "../src/data/canonicalJson";
import { parsePackJson, type PackReport, type PackTarget } from "../src/data/validatePack";

/**
 * Pack validator CLI (ROUTE-002). Run through `npm run data:validate`.
 *
 *   data:validate                      validates the synthetic fixture (development) and,
 *                                      if present, assets/data/release.json (release).
 *   data:validate -- <file>            validates one file in development mode.
 *   data:validate -- <file> --release  validates one file against the release gate.
 *
 * Exit code is 1 when any validated pack has errors. A missing release pack is reported
 * plainly and is not an error here: that is the honest state until source-backed data exists.
 */

const FIXTURE_PATH = "tests/fixtures/transit-pack.json";
const RELEASE_PATH = "assets/data/release.json";

function fingerprint(text: string): string {
  const pack: unknown = JSON.parse(text);
  return createHash("sha256").update(canonicalJson(pack)).digest("hex");
}

function show(label: string, path: string, target: PackTarget): boolean {
  const text = readFileSync(path, "utf8");
  const report: PackReport = parsePackJson(text, { target });
  const verdict = report.ok ? "PASS" : "FAIL";
  console.log(`\n[${verdict}] ${label}: ${path} (target: ${target})`);
  if (report.summary) {
    const s = report.summary;
    console.log(`  pack ${s.packId} version ${s.version} kind ${s.kind}`);
    console.log(
      `  places ${s.places}, stops ${s.stops}, services ${s.services}, directions ${s.directions}, ` +
        `routeStops ${s.routeStops}, walkLinks ${s.walkLinks}, fares ${s.fares}, sources ${s.sources}`,
    );
  }
  if (report.ok) console.log(`  content sha256 (canonical JSON): ${fingerprint(text)}`);
  console.log(`  errors ${report.errorCount}, warnings ${report.warningCount}`);
  for (const issue of report.issues) {
    console.log(`  ${issue.severity.toUpperCase().padEnd(7)} ${issue.code.padEnd(12)} ${issue.path}: ${issue.message}`);
  }
  return report.ok;
}

function main(): number {
  const args = process.argv.slice(2);
  const release = args.includes("--release");
  const files = args.filter((a) => !a.startsWith("--"));

  if (files.length > 0) {
    return files.every((f) => show("custom", f, release ? "release" : "development")) ? 0 : 1;
  }

  let ok = true;
  ok = show("synthetic fixture", FIXTURE_PATH, "development") && ok;

  if (existsSync(RELEASE_PATH)) {
    ok = show("release pack", RELEASE_PATH, "release") && ok;
  } else {
    console.log(`\n[NONE] release pack: ${RELEASE_PATH} does not exist.`);
    console.log("  No source-backed data has been packaged; no corridor is verified or supported.");
  }

  // The fixture must never be reachable as release data.
  const fixtureAsRelease = parsePackJson(readFileSync(FIXTURE_PATH, "utf8"), { target: "release" });
  if (fixtureAsRelease.ok) {
    console.log("\n[FAIL] the synthetic fixture passed the release gate.");
    ok = false;
  } else {
    console.log("\n[PASS] synthetic fixture is rejected by the release gate, as required.");
  }
  return ok ? 0 : 1;
}

process.exitCode = main();
