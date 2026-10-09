import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { hashChunks } from "../../src/storage/integrity";
import { resolveStoredPlaces } from "../../src/storage/place-search";
import { database, errorCode, pack, repository, testDirectory, value } from "./helpers";

test("empty storage is initialized but has no release data", async () => {
  const db = database();
  const repo = new SqlTransitRepository(async () => db.driver);
  assert.equal((await repo.initialize()).ok, true);
  assert.equal(errorCode(await repo.getPack()), "DATA_NOT_READY");
  assert.equal(errorCode(await repo.replacePack(pack())), "DATA_INVALID");
  await repo.close();
});
test("pack survives a real SQLite close and reopen", async () => {
  const temp = testDirectory(), file = join(temp.path, "transit.db"), data = pack();
  try {
    const make = () => new SqlTransitRepository(async () => database(file).driver, { allowTestFixtures: true });
    const first = make(); value(await first.initialize()); value(await first.replacePack(data)); await first.close();
    const second = make(); value(await second.initialize());
    assert.deepEqual(value(await second.getPack()), data); await second.close();
  } finally { temp.remove(); }
});
test("failed replacement rolls back deletion and retains the previous pack", async () => {
  const h = await repository(), changed = structuredClone(pack()); changed.version = "test_fixture_changed";
  h.failInsert();
  assert.equal(errorCode(await h.repo.replacePack(changed)), "STORAGE_FULL");
  assert.equal(value(await h.repo.getPack()).version, pack().version);
  await h.repo.close();
});
test("invalid import leaves data untouched", async () => {
  const h = await repository(), changed = structuredClone(pack()); changed.stops[0]!.placeId = "place_missing";
  assert.equal(errorCode(await h.repo.replacePack(changed)), "DATA_INVALID");
  assert.deepEqual(value(await h.repo.getPack()), pack()); await h.repo.close();
});
test("queued reads observe the replacement snapshot and callers cannot mutate it", async () => {
  const h = await repository(), changed = structuredClone(pack()); changed.version = "test_fixture_snapshot";
  const importResult = h.repo.replacePack(changed); changed.version = "test_fixture_mutated";
  const read = h.repo.getPack(); value(await importResult);
  assert.equal(value(await read).version, "test_fixture_snapshot"); await h.repo.close();
});
for (const [label, sql] of [
  ["indexed name", "UPDATE places SET name = 'Different' WHERE id = 'place_test_a'"],
  ["JSON payload", "UPDATE places SET payload_json = '{' WHERE id = 'place_test_a'"],
  ["metadata", "UPDATE metadata SET value = 'bad' WHERE key = 'version'"],
  ["aliases", "DELETE FROM aliases WHERE place_id = 'place_test_a'"],
] as const) test("storage rejects corrupt " + label, async () => {
  const h = await repository(); h.native.exec(sql);
  assert.equal(errorCode(await h.repo.getPack()), "DATA_INVALID"); await h.repo.close();
});
test("schema mismatch is rejected on initialization", async () => {
  const h = await repository(); h.native.exec("UPDATE metadata SET value = '2.0' WHERE key = 'schemaVersion'");
  assert.equal(errorCode(await h.repo.initialize()), "DATA_INVALID"); await h.repo.close();
});
test("exact and alias searches preserve place ambiguity", () => {
  const data = structuredClone(pack()); data.places[0]!.aliases = ["Shared"];
  data.places[1]!.aliases = ["Shared"];
  const found = resolveStoredPlaces("shared", data.places);
  assert.equal(found.candidates.length, 2); assert.equal(found.needsConfirmation, true);
});
test("fuzzy search always requires explicit confirmation", () => {
  const found = resolveStoredPlaces("test onli a", pack().places);
  assert.ok(found.candidates.some(c => c.place.id === "place_test_a"));
  assert.equal(found.needsConfirmation, true);
});
test("blank searches and unknown IDs have typed errors", async () => {
  const h = await repository();
  assert.equal(errorCode(await h.repo.resolvePlace(" ")), "INVALID_INPUT");
  assert.equal(errorCode(await h.repo.getPlace("place_missing")), "PLACE_NOT_FOUND"); await h.repo.close();
});
test("incremental hashing computes byte count and SHA-256 without concatenation", async () => {
  async function* chunks() { yield new TextEncoder().encode("a"); yield new TextEncoder().encode("bc"); }
  assert.deepEqual(await hashChunks(chunks()), { bytes: 3, sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" });
});
test("incremental hashing stops on cancellation and oversized input", async () => {
  async function* chunks() { yield new Uint8Array(4); }
  await assert.rejects(hashChunks(chunks(), { maxBytes: 3 }), /FILE_TOO_LARGE/);
  await assert.rejects(hashChunks(chunks(), { isCancelled: () => true }), /CANCELLED/);
});
