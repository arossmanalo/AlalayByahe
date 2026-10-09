// Member 3 (UI-006): what the screens' presenters produce for the journeys the device walk uses, on the
// REAL bundled LRT-1 pack through the REAL install path, controller and RoutePort. Only the AI is a test
// double. This proves presentation logic in software; it does not prove anything a phone renders.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { JourneyOption, Place, RouteRequest, TransitPack } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { createApplicationServices } from "../../src/application/services";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { needsCoverageHint } from "../../src/ui/form-logic";
import { strings } from "../../src/ui/i18n";
import { coverageSummary, fareText, firstRideLine, journeySteps, partitionOptions } from "../../src/ui/journey-presenter";
import { nextStopChoices, onboardOrigin, selectableDirections } from "../../src/ui/onboard-logic";
import { ai, database, extraction, value } from "../integration/helpers";

const t = strings.en;
let services: ReturnType<typeof createApplicationServices>;
let repository: SqlTransitRepository;
let pack: TransitPack;

before(async () => {
  const db = database();
  repository = new SqlTransitRepository(async () => db.driver); // production mode: fixtures refused
  services = createApplicationServices({
    repository,
    routes: createRoutePort(),
    ai: ai({ extract: async () => ({ ok: true as const, value: extraction({ originText: "Lipa", destinationText: "Candelaria" }) }) }), // TEST DOUBLE
    bundledPack: BUNDLED_TRANSIT_PACK,
  });
  assert.equal((await services.initialize()).data.ok, true);
  pack = value(await repository.getPack());
});

after(async () => {
  await services.close();
});

async function stored(text: string): Promise<Place> {
  const found = value(await repository.resolvePlace(text));
  assert.equal(found.candidates.length, 1, `"${text}" should resolve to one stored place`);
  return found.candidates[0]!.place;
}

const endpoint = (place: Place) => ({ placeId: place.id, label: place.name, point: { ...place.point }, provenance: "stored" as const });

async function plan(from: string, to: string, prefs = {}): Promise<{ option: JourneyOption; warnings: string[] }> {
  const request: RouteRequest = {
    queryId: `ui_real_${from}_${to}`.replace(/\W/g, "_").toLowerCase(),
    origin: endpoint(await stored(from)),
    destination: endpoint(await stored(to)),
    preferences: { ...defaultPreferences(), ...prefs },
  };
  const result = value(await services.controller.submitManual(request));
  const { shown, hiddenIncomplete } = partitionOptions(result.options);
  assert.equal(hiddenIncomplete, 0, "a real-pack option must have complete instructions");
  assert.ok(shown[0]);
  return { option: shown[0], warnings: result.coverageWarnings };
}

function onlyRide(option: JourneyOption) {
  const steps = journeySteps(option, null);
  assert.equal(steps.length, 1, "station to station is one ride with no walking links");
  const step = steps[0]!;
  assert.equal(step.kind, "ride");
  return step.kind === "ride" ? step.leg : assert.fail("expected a ride");
}

describe("real LRT-1 pack through the UI presenters (UI-006)", () => {
  it("Vito Cruz to Baclaran: one southbound ride, a verified P21 total, no transfers or walking", async () => {
    const { option, warnings } = await plan("Vito Cruz", "Baclaran");
    const leg = onlyRide(option);
    assert.equal(leg.headsign, "Dr. Santos");
    assert.equal(firstRideLine(option, t), t.boardFirst(leg.boardLabel));
    assert.equal(option.transfers, 0);
    assert.equal(option.walkMeters, 0);
    assert.deepEqual(fareText(option, t), { kind: "complete", label: "Fare", value: "₱21.00 total (verified)", reliability: "verified" });
    const coverage = coverageSummary(pack.coverageLabels, warnings);
    assert.deepEqual(coverage.labels, pack.coverageLabels);
    assert.match(coverage.labels[0]!, /^LRT-1 only/);
    assert.ok(coverage.notes.every((note) => !/^Coverage:/.test(note)), "the pack label is stated once, not repeated as a note");
  });

  it("Taft (alias) to Vito Cruz and back: P20 each way, in opposite directions", async () => {
    const there = await plan("Taft", "Vito Cruz");
    const back = await plan("Vito Cruz", "Taft");
    assert.equal(onlyRide(there.option).headsign, "Fernando Poe Jr.");
    assert.equal(onlyRide(back.option).headsign, "Dr. Santos");
    for (const trip of [there, back]) {
      const text = fareText(trip.option, t);
      assert.equal(text.kind === "complete" ? text.value : text.title, "₱20.00 total (verified)");
    }
  });

  it("Pedro Gil to Vito Cruz as a student: P19 shown as an estimate with its basis, never as verified", async () => {
    const { option } = await plan("Pedro Gil", "Vito Cruz", { passenger: "student" });
    const leg = onlyRide(option);
    assert.equal(leg.fare.status, "estimated");
    assert.match(leg.fare.basis, /No student discount is documented/);
    const text = fareText(option, t);
    assert.deepEqual(text, { kind: "complete", label: "Fare", value: "₱19.00 total (estimated)", reliability: "estimated" });
  });

  it("Lipa to Candelaria: no stored place, so the picker states the coverage and nothing is routed", async () => {
    for (const outside of ["Lipa", "Candelaria"]) {
      const found = value(await repository.resolvePlace(outside));
      assert.deepEqual(found.candidates, []);
      assert.equal(needsCoverageHint(null, 0, found.candidates.length), true, "manual search shows the coverage");
    }
    const draft = value(await services.controller.interpret({ queryId: "ui_real_lipa", text: "Lipa to Candelaria", locale: "taglish", knownPlaceLabels: [] }));
    assert.deepEqual(draft.originCandidates, []);
    assert.deepEqual(draft.destinationCandidates, []);
    assert.equal(needsCoverageHint(draft.extraction.intent.originText, draft.originCandidates.length, null), true, "the AI draft shows the coverage");
  });

  it("onboard southbound with next stop Vito Cruz: stay on, unknown current fare, no tracking claim", async () => {
    const southbound = selectableDirections(pack, "service_lrt1").find((d) => d.headsign === "Dr. Santos");
    assert.ok(southbound);
    const choices = nextStopChoices(pack, southbound.id);
    assert.ok(choices.every((c, i) => i === 0 || c.routeStop.sequence > choices[i - 1]!.routeStop.sequence), "stops listed in direction order");
    const next = choices.find((c) => c.stop.placeId === "place_lrt1_vito_cruz");
    assert.ok(next);
    const { origin, onboard } = onboardOrigin(next, southbound.id, "2026-10-10T08:00:00+08:00");
    const result = value(await services.controller.submitManual({
      queryId: "ui_real_onboard", origin, destination: endpoint(await stored("Baclaran")), preferences: defaultPreferences(), onboard,
    }));
    const option = result.options[0]!;
    assert.equal(firstRideLine(option, t), t.stayOnboard, "an onboard ride is not shown as a boarding point");
    const text = fareText(option, t);
    assert.equal(text.kind, "unknown");
    assert.ok(text.kind === "unknown" && text.lines.includes(t.fareConfirmWithOperator));
    assert.ok(option.warnings.some((w) => /not tracked/.test(w)));
  });
});
