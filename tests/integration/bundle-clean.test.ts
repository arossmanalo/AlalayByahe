import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

// Builds a minimal APK-shaped zip so the script's real zip reader is exercised, not just plain files.
function zipWith(entries: Record<string, Buffer>, method: 0 | 8): Buffer {
  const parts: Buffer[] = [], directory: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(entries)) {
    const body = method === 8 ? deflateRawSync(data) : data;
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10); central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
    parts.push(local, nameBytes, body); directory.push(central, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const dir = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dir, end]);
}

function run(file: string, expectation: string) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/check-bundle-clean.ts", file, "--expect", expectation],
    { encoding: "utf8" });
  return { code: result.status, out: result.stdout + result.stderr };
}

test("bundle check reads an APK and separates release from demo content", () => {
  const root = resolve(".test-tmp"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "bundle-"));
  try {
    const release = Buffer.from("xx pack_lrt1 lrt1_2026_10_10_1 yy");
    const demo = Buffer.from("xx lrt1_2026_10_10_1 pack_test_demo_luzon_roads Baguio City terminal alalaybyahe-demo.db");
    for (const method of [0, 8] as const) {
      const releaseApk = resolve(dir, `release-${method}.apk`), demoApk = resolve(dir, `demo-${method}.apk`);
      writeFileSync(releaseApk, zipWith({ "AndroidManifest.xml": Buffer.from("m"), "assets/index.android.bundle": release }, method));
      writeFileSync(demoApk, zipWith({ "assets/index.android.bundle": demo }, method));
      assert.equal(run(releaseApk, "release").code, 0);
      assert.equal(run(demoApk, "demo").code, 0);
      assert.equal(run(demoApk, "release").code, 1, "demo data in a release APK must fail");
      assert.equal(run(releaseApk, "demo").code, 1);
    }
    const noPack = resolve(dir, "empty.apk");
    writeFileSync(noPack, zipWith({ "assets/index.android.bundle": Buffer.from("nothing") }, 0));
    assert.equal(run(noPack, "release").code, 1, "a bundle without the frozen pack must fail");
    assert.equal(run(resolve(dir, "missing.apk"), "release").code !== 0, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
