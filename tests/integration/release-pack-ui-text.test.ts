import assert from "node:assert/strict";
import { test } from "node:test";
import type { JourneyOption, Place } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { createApplicationServices } from "../../src/application/services";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { strings } from "../../src/ui/i18n";
import { coverageSummary, fareText, journeySteps, optionIssues, partitionOptions } from "../../src/ui/journey-presenter";
import { ai, database, value } from "./helpers";

/**
 * ROUTE-006, software stage: the real bundled pack through the real controller, then through the
 * UI's own pure presentation code (Member 3's journey-presenter and i18n). This shows what the
 * screens WOULD print for these journeys. It does not render a screen and says nothing about
 * what a person sees on a phone; that still needs the device walk.
 */

const endpoint = (p: Place) => ({ placeId: p.id, label: p.name, point: { ...p.point }, provenance: "stored" as const });

async function setup() {
  const db = database();
  const repository = new SqlTransitRepository(async () => db.driver);
  const services = createApplicationServices({ repository, ai: ai(), routes: createRoutePort(), bundledPack: BUNDLED_TRANSIT_PACK });
  await services.initialize();
  const pack = value(await repository.getPack());
  const place = (id: string): Place => pack.places.find((p) => p.id === id)!;
  return { services, pack, place };
}

async function plan(from: string, to: string, over = {}) {
  const { services, pack, place } = await setup();
  const request = { queryId: `ui_text_${from}_${to}`, origin: endpoint(place(`place_lrt1_${from}`)), destination: endpoint(place(`place_lrt1_${to}`)), preferences: { ...defaultPreferences(), ...over } };
  const result = value(await services.controller.submitManual(request));
  await services.close();
  return { result, request, pack };
}

const lines = (o: JourneyOption, lang: "en" | "fil" = "en"): string[] => {
  const t = strings[lang];
  const f = fareText(o, t);
  return f.kind === "complete" ? [f.label, f.value] : [f.title, ...f.lines];
};

test("Vito Cruz to Baclaran prints one ride at P21 as a total, with no walk and no issues", async () => {
  const { result, request } = await plan("vito_cruz", "baclaran");
  const option = result.options[0]!;
  assert.deepEqual(optionIssues(option), []);
  assert.deepEqual(lines(option), ["Fare", "₱21.00 total (verified)"]);
  assert.equal(lines(option, "fil")[0], "Pamasahe");
  assert.match(lines(option, "fil")[1]!, /^₱21\.00 kabuuan \(/);
  const steps = journeySteps(option, request);
  assert.deepEqual(steps.map((s) => s.kind), ["ride"]);
  const ride = steps[0]!.kind === "ride" ? steps[0]!.leg : null;
  assert.equal(ride?.headsign, "Dr. Santos");
  assert.equal(ride?.boardLabel, "Vito Cruz (LRT-1 platform)");
  assert.equal(ride?.alightLabel, "Baclaran (LRT-1 platform)");
  assert.equal(partitionOptions(result.options).hiddenIncomplete, 0);
});

test("the Taft alias plans both directions at P20 with the opposite headsigns", async () => {
  const there = (await plan("edsa", "vito_cruz")).result.options[0]!;
  const back = (await plan("vito_cruz", "edsa")).result.options[0]!;
  assert.deepEqual(lines(there), ["Fare", "₱20.00 total (verified)"]);
  assert.deepEqual(lines(back), ["Fare", "₱20.00 total (verified)"]);
  const head = (o: JourneyOption) => (o.legs[0]!.kind === "ride" ? o.legs[0]!.headsign : "");
  assert.equal(head(there), "Fernando Poe Jr.");
  assert.equal(head(back), "Dr. Santos");
});

test("the whole line is P52 and a single ride, both ways", async () => {
  for (const [a, b] of [["dr_santos", "fernando_poe_jr"], ["fernando_poe_jr", "dr_santos"]] as const) {
    const option = (await plan(a, b)).result.options[0]!;
    assert.deepEqual(lines(option), ["Fare", "₱52.00 total (verified)"]);
    assert.equal(option.legs.length, 1);
    assert.equal(option.transfers, 0);
  }
});

test("a student sees the regular P19 fare with the estimate caveat in the ride basis and the warnings", async () => {
  const { result } = await plan("pedro_gil", "vito_cruz", { passenger: "student" });
  const option = result.options[0]!;
  const ride = option.legs[0]!;
  assert.equal(ride.kind, "ride");
  if (ride.kind === "ride") {
    assert.equal(ride.fare.status, "estimated");
    assert.match(ride.fare.basis, /No student discount is documented/);
  }
  assert.ok(option.warnings.some((w) => /estimates/.test(w)), "the option warnings say some fares are estimates");
  // Member 3's UI-006 fix: the headline now says the total is an estimate, not just the ride basis.
  assert.deepEqual(lines(option), ["Fare", "₱19.00 total (estimated)"]);
});

test("every result carries the pack coverage label, and the summary states it once", async () => {
  const { result, pack } = await plan("vito_cruz", "baclaran");
  const summary = coverageSummary(pack.coverageLabels, result.coverageWarnings);
  assert.equal(summary.labels.length, 1);
  assert.match(summary.labels[0]!, /LRT-1 only/);
  assert.ok(summary.notes.every((n) => !/^Coverage:/i.test(n)), "the engine's repeat of the pack label is dropped");
  assert.ok(summary.notes.some((n) => /not live availability/.test(n)));
});

test("no printed text claims live, fastest or guaranteed service", async () => {
  const { result } = await plan("vito_cruz", "baclaran");
  const option = result.options[0]!;
  const all = [option.rankReason, ...option.warnings, ...result.coverageWarnings, ...lines(option), ...lines(option, "fil")].join(" ").toLowerCase();
  assert.doesNotMatch(all, /fastest|real-time|live arrival|guarantee/);
  // "live" appears only as a negation.
  for (const m of all.matchAll(/.{0,25}\blive\b.{0,25}/g)) assert.match(m[0], /not live|hindi live/);
});
