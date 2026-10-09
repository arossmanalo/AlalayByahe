import { test } from "node:test";
import assert from "node:assert/strict";
import { createApplicationServices } from "../../src/application/services";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { defaultPreferences } from "../../src/contracts/defaults";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { ai, database, errorCode, value } from "./helpers";

// Production path: no allowTestFixtures anywhere. This proves the bundled pack passes the
// release gate, installs into SQLite and plans with the real engine on a fresh database.
// It runs on Node SQLite and does not prove Expo SQLite or any device behavior.
async function installed() {
  const db = database();
  const repository = new SqlTransitRepository(async () => db.driver);
  const services = createApplicationServices({
    repository, ai: ai(), routes: createRoutePort(), bundledPack: BUNDLED_TRANSIT_PACK,
  });
  const readiness = await services.initialize();
  return { services, repository, readiness };
}
function endpoint(pack: { places: { id: string; name: string; point: { latitude: number; longitude: number } }[] }, id: string) {
  const place = pack.places.find(p => p.id === id)!;
  return { placeId: place.id, label: place.name, point: { ...place.point }, provenance: "stored" as const };
}

test("the bundled pack is a release pack with stated coverage and no fixture material", async () => {
  const { services, repository, readiness } = await installed();
  assert.equal(readiness.data.ok, true);
  const pack = value(await repository.getPack());
  assert.equal(pack.kind, "release");
  assert.ok(pack.coverageLabels.length > 0);
  assert.doesNotMatch(JSON.stringify(pack), /test_fixture|TEST ONLY|DEV FIXTURE/);
  await services.close();
});

test("a stored LRT-1 pair plans through the production controller with a known fare", async () => {
  const { services, repository } = await installed();
  const pack = value(await repository.getPack());
  const request = {
    queryId: "query_bundled_001",
    origin: endpoint(pack, "place_lrt1_vito_cruz"),
    destination: endpoint(pack, "place_lrt1_baclaran"),
    preferences: defaultPreferences(),
  };
  const result = value(await services.controller.submitManual(request));
  const option = result.options[0]!;
  assert.equal(option.transfers, 0);
  assert.equal(option.fare.status, "complete");
  assert.equal(option.fare.knownMinCentavos, 2100);
  assert.ok(option.legs.every(leg => leg.kind === "ride"), "the pack has no walking links, so none are invented");
  await services.close();
});

test("a place outside the bundled pack is refused, never routed", async () => {
  const { services, repository } = await installed();
  const pack = value(await repository.getPack());
  const request = {
    queryId: "query_bundled_002",
    origin: endpoint(pack, "place_lrt1_vito_cruz"),
    destination: { placeId: "place_lipa_terminal", label: "Lipa", point: { latitude: 13.94, longitude: 121.16 }, provenance: "stored" as const },
    preferences: defaultPreferences(),
  };
  assert.equal(errorCode(await services.controller.submitManual(request)), "OUTSIDE_COVERAGE");
  await services.close();
});
