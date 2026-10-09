import assert from "node:assert/strict";
import { test } from "node:test";
import type { Place, RouteRequest } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { createApplicationServices } from "../../src/application/services";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { ai, database, errorCode, extraction, value } from "./helpers";

/**
 * ROUTE-006 software end-to-end: the REAL bundled release pack, REAL SQLite import (Node's
 * sqlite, production mode, no test fixtures allowed), REAL controller and REAL RoutePort.
 * Only the AI is a labelled test double (it returns a fixed extraction), so this proves the
 * data-to-journey path in software. It proves nothing about phones, Expo SQLite, native
 * inference, or what a person sees on screen.
 */

function endpoint(place: Place) {
  return { placeId: place.id, label: place.name, point: { ...place.point }, provenance: "stored" as const };
}

async function boot(extractionOverrides = {}) {
  const db = database();
  const repository = new SqlTransitRepository(async () => db.driver); // production mode: fixtures refused
  const services = createApplicationServices({
    repository,
    routes: createRoutePort(), // real clock
    ai: ai({ extract: async () => ({ ok: true as const, value: extraction(extractionOverrides) }) }), // TEST DOUBLE
    bundledPack: BUNDLED_TRANSIT_PACK,
  });
  const status = await services.initialize();
  return { services, status, repository };
}

async function place(repository: SqlTransitRepository, text: string): Promise<Place> {
  const found = value(await repository.resolvePlace(text));
  assert.equal(found.candidates.length, 1, `"${text}" should resolve to exactly one place`);
  return found.candidates[0]!.place;
}

test("the bundled release pack is the reviewed file and installs into an empty production database", async () => {
  assert.notEqual(BUNDLED_TRANSIT_PACK, null, "bundled-pack.ts must export the reviewed pack");
  const { services, status, repository } = await boot();
  assert.equal(status.data.ok, true);
  const installed = value(await repository.getPack());
  assert.equal(installed.kind, "release");
  assert.equal(installed.version, "lrt1_2026_10_10_1");
  assert.equal(installed.places.length, 25);
  await services.close();
});

test("stored place lookup finds stations by name and by documented alias, and does not invent others", async () => {
  const { services, repository } = await boot();
  assert.equal((await place(repository, "Vito Cruz")).id, "place_lrt1_vito_cruz");
  assert.equal((await place(repository, "Taft")).id, "place_lrt1_edsa");
  assert.equal((await place(repository, "Buendia")).id, "place_lrt1_gil_puyat");
  for (const outside of ["Lipa", "Candelaria", "San Pablo", "Tiaong"]) {
    const found = value(await repository.resolvePlace(outside));
    assert.deepEqual(found.candidates, [], `${outside} is not covered by the bundled pack`);
    assert.equal(found.needsConfirmation, true);
  }
  await services.close();
});

test("confirmed journey: AI draft, explicit confirmation, real planning at the documented fare", async () => {
  const { services, repository } = await boot({ originText: "Vito Cruz", destinationText: "Baclaran" });
  const draft = value(await services.controller.interpret({ queryId: "route_006_a", text: "Vito Cruz to Baclaran", locale: "en", knownPlaceLabels: [] }));
  assert.equal(draft.requiresConfirmation, true);
  assert.deepEqual(draft.missingFields, []);
  const origin = draft.originCandidates[0]!.place;
  const destination = draft.destinationCandidates[0]!.place;
  assert.equal(origin.id, "place_lrt1_vito_cruz");
  assert.equal(destination.id, "place_lrt1_baclaran");
  const request: RouteRequest = { queryId: "route_006_a", origin: endpoint(origin), destination: endpoint(destination), preferences: draft.preferences };
  const result = value(await services.controller.submitConfirmed(request));
  const option = result.options[0]!;
  assert.equal(option.transfers, 0);
  assert.equal(option.walkMeters, 0);
  assert.equal(option.fare.status, "complete");
  assert.equal(option.fare.knownMinCentavos, 2100);
  assert.equal(option.legs.length, 1);
  assert.equal(option.datasetVersion, "lrt1_2026_10_10_1");
  assert.ok(result.coverageWarnings.some((w) => /LRT-1 only/.test(w)));
  void repository;
  await services.close();
});

test("manual planning works with no AI and plans Taft to Vito Cruz northbound, then the reverse southbound", async () => {
  const { services, repository } = await boot();
  const taft = await place(repository, "Taft");
  const vito = await place(repository, "Vito Cruz");
  const there = value(await services.controller.submitManual({ queryId: "route_006_b", origin: endpoint(taft), destination: endpoint(vito), preferences: defaultPreferences() }));
  const back = value(await services.controller.submitManual({ queryId: "route_006_c", origin: endpoint(vito), destination: endpoint(taft), preferences: defaultPreferences() }));
  for (const r of [there, back]) assert.equal(r.options[0]!.fare.knownMaxCentavos, 2000);
  const legThere = there.options[0]!.legs[0]!;
  const legBack = back.options[0]!.legs[0]!;
  assert.equal(legThere.kind === "ride" && legThere.directionId, "dir_lrt1_northbound");
  assert.equal(legBack.kind === "ride" && legBack.directionId, "dir_lrt1_southbound");
  await services.close();
});

test("a student gets the regular fare marked as an estimate, because no discount is documented", async () => {
  const { services, repository } = await boot();
  const from = await place(repository, "Pedro Gil");
  const to = await place(repository, "Vito Cruz");
  const result = value(await services.controller.submitManual({
    queryId: "route_006_d", origin: endpoint(from), destination: endpoint(to),
    preferences: { ...defaultPreferences(), passenger: "student" },
  }));
  const leg = result.options[0]!.legs[0]!;
  assert.equal(leg.kind, "ride");
  if (leg.kind === "ride") {
    assert.equal(leg.fare.status, "estimated");
    assert.equal(leg.fare.minCentavos, 1900, "LRMC stored value Pedro Gil to Vito Cruz, not the reported P25");
    assert.match(leg.fare.basis, /No student discount is documented/);
  }
  await services.close();
});

test("a place outside the pack is never routed", async () => {
  const { services, repository } = await boot({ originText: "Lipa", destinationText: "Candelaria" });
  const draft = value(await services.controller.interpret({ queryId: "route_006_e", text: "Lipa to Candelaria", locale: "en", knownPlaceLabels: [] }));
  assert.deepEqual(draft.missingFields, ["origin", "destination"]);
  assert.deepEqual(draft.originCandidates, []);
  const vito = await place(repository, "Vito Cruz");
  const outside = { placeId: "place_lipa_terminal", label: "Lipa", point: { latitude: 13.94, longitude: 121.16 }, provenance: "stored" as const };
  const result = await services.controller.submitManual({ queryId: "route_006_f", origin: outside, destination: endpoint(vito), preferences: defaultPreferences() });
  assert.equal(result.ok, false);
  assert.ok(["OUTSIDE_COVERAGE", "PLACE_NOT_FOUND", "INVALID_INPUT"].includes(errorCode(result)));
  await services.close();
});
