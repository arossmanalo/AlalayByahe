import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { JourneyOption, RouteRequest } from "../../src/contracts";
import { DEFAULT_PREFERENCES } from "../../src/ui/form-logic";
import {
  collectSourceIds,
  fareDisplay,
  journeySteps,
  legSequence,
  optionIssues,
  partitionOptions,
} from "../../src/ui/journey-presenter";
import { createDevFixtureServices } from "./fixtures/dev-services";

const request: RouteRequest = {
  queryId: "test_query_002",
  origin: { placeId: "place_test_a", label: "TEST ONLY Origin A", point: { latitude: 0, longitude: 0 }, provenance: "stored" },
  destination: { placeId: "place_test_b", label: "TEST ONLY Destination B", point: { latitude: 0, longitude: 0.01 }, provenance: "stored" },
  preferences: DEFAULT_PREFERENCES,
};

async function fixtureOptions(req: RouteRequest = request): Promise<JourneyOption[]> {
  const result = await createDevFixtureServices().controller.submitManual(req);
  assert.ok(result.ok);
  return result.ok ? result.value.options : [];
}

describe("fareDisplay", () => {
  it("never turns unknown into zero", () => {
    const d = fareDisplay({ status: "unknown", knownMinCentavos: 0, knownMaxCentavos: 0, unknownRideLegs: 1, sourceIds: [] });
    assert.deepEqual(d, { kind: "unknown", unknownRideLegs: 1 });
  });
  it("keeps partial subtotal separate from unknown legs", () => {
    const d = fareDisplay({ status: "partial", knownMinCentavos: 1300, knownMaxCentavos: 1500, unknownRideLegs: 1, sourceIds: [] });
    assert.deepEqual(d, { kind: "partial", knownMinCentavos: 1300, knownMaxCentavos: 1500, unknownRideLegs: 1 });
  });
  it("downgrades a contradictory complete status to partial", () => {
    const d = fareDisplay({ status: "complete", knownMinCentavos: 1300, knownMaxCentavos: 1300, unknownRideLegs: 2, sourceIds: [] });
    assert.equal(d.kind, "partial");
  });
  it("shows a complete fare as a range when min differs from max", () => {
    const d = fareDisplay({ status: "complete", knownMinCentavos: 1300, knownMaxCentavos: 1500, unknownRideLegs: 0, sourceIds: [] });
    assert.deepEqual(d, { kind: "complete", minCentavos: 1300, maxCentavos: 1500 });
  });
});

describe("optionIssues / partitionOptions (EC-111)", () => {
  it("hides options with a missing alighting label and caps at three", async () => {
    const options = await fixtureOptions();
    assert.equal(options.length, 4);
    const { shown, hiddenIncomplete } = partitionOptions(options);
    assert.equal(shown.length, 3);
    assert.equal(hiddenIncomplete, 1);
    assert.deepEqual(optionIssues(options[3]), ["ride_missing_alight"]);
  });
  it("rejects a journey with no ride and invalid fare amounts", () => {
    const walkOnly: JourneyOption = {
      id: "journey_test_walk",
      legs: [],
      transfers: 0,
      walkMeters: 0,
      fare: { status: "complete", knownMinCentavos: 500, knownMaxCentavos: 100, unknownRideLegs: 0, sourceIds: [] },
      rankReason: "",
      warnings: [],
      datasetVersion: "test",
    };
    assert.deepEqual(optionIssues(walkOnly).sort(), ["invalid_fare_amount", "no_legs", "no_ride"]);
  });
});

describe("journeySteps (EC-104/EC-110)", () => {
  it("numbers steps in leg order and labels walks only from known data", async () => {
    const [option] = await fixtureOptions();
    const steps = journeySteps(option, request);
    assert.deepEqual(steps.map((s) => [s.number, s.kind]), [[1, "walk"], [2, "ride"], [3, "walk"]]);
    const [access, , egress] = steps;
    assert.ok(access.kind === "walk" && egress.kind === "walk");
    if (access.kind === "walk" && egress.kind === "walk") {
      assert.equal(access.fromLabel, "TEST ONLY Origin A");
      assert.equal(access.toLabel, "TEST ONLY Boarding Stop");
      assert.equal(egress.fromLabel, "TEST ONLY Alighting Stop");
      assert.equal(egress.toLabel, "TEST ONLY Destination B");
    }
  });
  it("labels a transfer walk from the previous dropoff to the next boarding", async () => {
    const options = await fixtureOptions();
    const steps = journeySteps(options[1], request);
    const transfer = steps[2];
    assert.equal(transfer.kind, "walk");
    if (transfer.kind === "walk") {
      assert.equal(transfer.fromLabel, "TEST ONLY Middle Stop");
      assert.equal(transfer.toLabel, "TEST ONLY Middle Stop");
    }
    assert.deepEqual(legSequence(options[1]), ["walk", "jeepney", "walk", "bus", "walk"]);
  });
  it("does not invent an origin label when the walk starts elsewhere", async () => {
    const [option] = await fixtureOptions();
    const steps = journeySteps(option, { ...request, origin: { ...request.origin, placeId: "place_other" } });
    assert.equal(steps[0].kind === "walk" ? steps[0].fromLabel : "x", null);
  });
  it("collects unique source IDs", async () => {
    const options = await fixtureOptions();
    assert.deepEqual(collectSourceIds(options[1]), ["source_test_fixture"]);
  });
});
