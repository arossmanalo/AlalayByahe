import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterServices, nextStopChoices, onboardOrigin, selectableDirections } from "../../src/ui/onboard-logic";
import { devPack } from "./fixtures/dev-pack";

describe("onboard selection (UI-005)", () => {
  it("filters services by name or signboard alias", () => {
    assert.deepEqual(filterServices(devPack, "test jeep").map((s) => s.id), ["service_test_002"]);
    assert.equal(filterServices(devPack, "").length, 2);
  });
  it("excludes suspended directions", () => {
    assert.deepEqual(selectableDirections(devPack, "service_test_001").map((d) => d.id), ["dir_test_001"]);
  });
  it("offers only legal alighting stops, in sequence order", () => {
    const choices = nextStopChoices(devPack, "dir_test_001");
    assert.deepEqual(choices.map((c) => [c.routeStop.sequence, c.stop.id]), [
      [2, "stop_test_mid"],
      [3, "stop_test_alight"],
    ]);
  });
  it("builds the onboard context from the confirmed stop only", () => {
    const [choice] = nextStopChoices(devPack, "dir_test_001");
    assert.ok(choice);
    const { origin, onboard } = onboardOrigin(choice, "dir_test_001", "2026-10-09T22:00:00+08:00");
    assert.equal(origin.placeId, "place_test_mid");
    assert.equal(origin.provenance, "stored");
    assert.deepEqual(onboard, {
      directionId: "dir_test_001",
      confirmedNextStopId: "stop_test_mid",
      confirmedAt: "2026-10-09T22:00:00+08:00",
    });
  });
});
