import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/**
 * Checks which transit data an Android build contains (INT-005 / INT-006).
 *
 *   tsx scripts/check-bundle-clean.ts <app.apk | bundle.hbc> --expect release|demo
 *
 * release: frozen pack present; demo pack, demo-only strings and the demo database name absent.
 * demo:    frozen pack present; demo pack, demo-only strings and the demo database name present.
 * It reads the JavaScript bundle (assets/index.android.bundle inside an APK) and searches the
 * Hermes bytecode as text. It cannot tell the benchmark build (EXPO_PUBLIC_AI_DIAGNOSTICS)
 * from a release build; that difference is a runtime flag, so keep the artifacts apart by name.
 */

const RELEASE_PACK_VERSION = "lrt1_2026_10_10_1";
const DEMO_ONLY = ["pack_test_demo_luzon_roads", "Baguio City terminal", "alalaybyahe-demo.db"];

function readZipEntry(zip: Buffer, name: string): Buffer {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a zip/APK file.");
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt zip directory.");
    const method = zip.readUInt16LE(p + 10);
    const compressed = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const entry = zip.subarray(p + 46, p + 46 + nameLength).toString("utf8");
    if (entry === name) {
      const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const raw = zip.subarray(dataStart, dataStart + compressed);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`Unsupported zip method ${method}.`);
    }
    p += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${name} not found in the APK.`);
}

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const expectIndex = args.indexOf("--expect");
const expectation = expectIndex >= 0 ? args[expectIndex + 1] : undefined;
if (!file || (expectation !== "release" && expectation !== "demo")) {
  console.error("Usage: tsx scripts/check-bundle-clean.ts <app.apk | bundle.hbc> --expect release|demo");
  process.exit(2);
}
const bytes = readFileSync(file);
const bundle = bytes.subarray(0, 4).toString("latin1") === "PK\u0003\u0004"
  ? readZipEntry(bytes, "assets/index.android.bundle") : bytes;
const text = bundle.toString("latin1");
const has = (needle: string): boolean => text.includes(needle);

const problems: string[] = [];
console.log(`${file}: ${bundle.length} bytes of bundle, expecting a ${expectation} build`);
const frozen = has(RELEASE_PACK_VERSION);
console.log(`  frozen pack ${RELEASE_PACK_VERSION}: ${frozen ? "present" : "ABSENT"}`);
if (!frozen) problems.push("The frozen release pack is missing from the bundle.");
for (const marker of DEMO_ONLY) {
  const present = has(marker);
  console.log(`  ${marker}: ${present ? "present" : "absent"}`);
  if (expectation === "release" && present) problems.push(`Release build contains demo-only data: ${marker}`);
  if (expectation === "demo" && !present) problems.push(`Demo build is missing expected demo data: ${marker}`);
}
if (problems.length) {
  console.error("FAIL");
  for (const p of problems) console.error("- " + p);
  process.exitCode = 1;
} else console.log("PASS");
