// Member 3 (UI-006, round 3 step 3): what the screens' presenters produce for the DEMO BUILD checks, on
// assets/demo/demo-pack.json through the demo composition (real install path on Node SQLite, controller and
// RoutePort with allowTestFixtures). Only the AI is a test double. This is the software column of the
// "Demo build" section in tests/ui/manual.md. It is never release evidence and proves nothing a phone renders.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import type { JourneyOption, Place, TransitPack } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { createApplicationServices } from "../../src/application/services";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { testDataBanner } from "../../src/ui/banner-logic";
import { strings } from "../../src/ui/i18n";
import { coverageSummary, fareText, firstRideLine, legSequence, partitionOptions } from "../../src/ui/journey-presenter";
import { ai, database, value } from "../integration/helpers";

const t = strings.en;
const demoPack: unknown = JSON.parse(readFileSync(new URL("../../assets/demo/demo-pack.json", import.meta.url), "utf8"));
let services: ReturnType<typeof createApplicationServices>;
let repository: SqlTransitRepository;
let pack: TransitPack;

before(async () => {
  const db = database();
  repository = new SqlTransitRepository(async () => db.driver, { allowTestFixtures: true }); // the demo composition
  services = createApplicationServices({
    repository, routes: createRoutePort(), ai: ai(), bundledPack: demoPack, allowTestFixtures: true, // ai(): TEST DOUBLE
  });
  assert.equal((await services.initialize()).data.ok, true);
  pack = value(await repository.getPack());
});

after(async () => {
  await services.close();
});

/** What the place picker lists for a search, as "name [match]". */
async function search(text: string): Promise<string[]> {
  return value(await repository.resolvePlace(text)).candidates.map((c) => `${c.place.name} [${c.match}]`);
}

async function only(text: string): Promise<Place> {
  const found = value(await repository.resolvePlace(text));
  assert.equal(found.candidates.length, 1, `"${text}" should list one stored place`);
  return found.candidates[0]!.place;
}

const endpoint = (place: Place) => ({ placeId: place.id, label: place.name, point: { ...place.point }, provenance: "stored" as const });

async function plan(from: string, to: string): Promise<{ shown: JourneyOption[]; warnings: string[] }> {
  const result = value(await services.controller.submitManual({
    queryId: `ui_demo_${from}_${to}`.replace(/\W/g, "_").toLowerCase(),
    origin: endpoint(await only(from)),
    destination: endpoint(await only(to)),
    preferences: defaultPreferences(),
  }));
  const { shown, hiddenIncomplete } = partitionOptions(result.options);
  assert.equal(hiddenIncomplete, 0, "a demo option must still have complete instructions");
  assert.ok(shown.length > 0);
  return { shown, warnings: result.coverageWarnings };
}

const fareLine = (option: JourneyOption) => {
  const text = fareText(option, t);
  return text.kind === "complete" ? text.value : [text.title, ...text.lines].join(" / ");
};

describe("demo pack through the UI presenters (UI-006 demo build)", () => {
  it("every screen carries the test-pack banner with the exact warning, and a release pack carries none", () => {
    assert.equal(pack.kind, "test_fixture");
    assert.equal(testDataBanner("real", pack.kind), "test_pack");
    // The demo build wiring hides the per-screen banner; fixture services never can.
    assert.equal(testDataBanner("real", pack.kind, true), null);
    assert.equal(testDataBanner("dev_fixture", pack.kind, true), "dev_fixture");
    assert.equal(t.testPackWarning, "This transit data is a test fixture, not real transport information.");
    assert.equal(testDataBanner("real", (BUNDLED_TRANSIT_PACK as TransitPack).kind), null);
    assert.equal(testDataBanner("real", null), null, "nothing loaded yet is not called test data");
    // The banner is drawn by <Screen>, so every screen must render through it.
    const screens = readdirSync(new URL("../../app/", import.meta.url)).filter((f) => f.endsWith(".tsx") && f !== "_layout.tsx");
    assert.ok(screens.length >= 8);
    for (const file of screens) {
      const source = readFileSync(new URL(`../../app/${file}`, import.meta.url), "utf8");
      assert.match(source, /from "\.\.\/src\/ui\/components\/Screen"/, `${file} imports Screen`);
      assert.equal((source.match(/return \(/g) ?? []).length, (source.match(/<Screen /g) ?? []).length, `${file}: every rendered view is a <Screen>`);
    }
  });

  it("About and Supported coverage state that only LRT-1 is verified and the rest is a demonstration network", () => {
    const coverage = coverageSummary(pack.coverageLabels, []);
    assert.equal(coverage.labels.length, 2);
    assert.match(coverage.labels[0]!, /^Demonstration network: only the 25 LRT-1 stations and their official LRMC fares are verified\. Other routes are samples, not real transport information\.$/);
    assert.match(coverage.labels[1]!, /^Demo connectors \(invented\) join every demo place/);
  });

  it("search finds Baguio, Legazpi and Laoag, each as one stored demo place", async () => {
    assert.deepEqual(await search("Baguio"), ["Baguio City terminal [alias]"]);
    assert.deepEqual(await search("Legazpi"), ["Legazpi terminal [alias]"]);
    assert.deepEqual(await search("Laoag"), ["Laoag terminal [alias]"]);
  });

  it("Laoag to Legazpi: three buses at a complete estimated total (the sample fares are all filled in)", async () => {
    const { shown, warnings } = await plan("Laoag", "Legazpi");
    assert.equal(shown.length, 1);
    const [first] = shown as [JourneyOption];
    assert.deepEqual(legSequence(first), ["bus", "bus", "bus"]);
    assert.equal(first.transfers, 2);
    assert.equal(firstRideLine(first, t), "First ride from Laoag terminal");
    assert.equal(fareLine(first), "₱1,662.00 total (estimated)");
    assert.equal(first.fare.status, "complete");
    assert.ok(coverageSummary(pack.coverageLabels, warnings).labels[0]!.startsWith("Demonstration network"));
  });

  it("the three-jeepney Lipa to Candelaria road draft: reached by De La Salle and Mang Inasal, estimated total", async () => {
    const { shown } = await plan("De La Salle", "Mang Inasal");
    // The road draft is still the first option; invented demo connectors may add sample alternatives after it.
    assert.ok(shown.length >= 1);
    const option = shown[0]!;
    assert.deepEqual(legSequence(option), ["jeepney", "walk", "jeepney", "jeepney"]);
    assert.equal(option.transfers, 2);
    assert.equal(option.walkMeters, 150);
    assert.equal(firstRideLine(option, t), "First ride from McDonald's near De La Salle Lipa");
    assert.equal(fareLine(option), "₱104.00 total (estimated)");
    assert.ok(option.legs.every((leg) => leg.evidence.reliability === "estimated"), "road drafts are never shown as verified");
  });

  it("typing Lipa or Candelaria lists the road-draft stop and the sample terminal", async () => {
    // Recorded so the device tester searches the terms above. The draft stops have no aliases, and
    // stored-place search drops substring matches when an alias matches (src/storage/place-search.ts).
    assert.deepEqual(await search("Lipa"), ["McDonald's near De La Salle Lipa [alias]", "Lipa City terminal [alias]"]);
    assert.deepEqual((await search("Candelaria")).sort(), ["Candelaria terminal [alias]", "Candelaria town proper (Mang Inasal stop) [alias]"]);
  });

  it("the real LRT-1 inside the demo keeps its verified fare", async () => {
    const { shown } = await plan("Vito Cruz", "Baclaran");
    assert.equal(fareLine(shown[0]!), "₱21.00 total (verified)");
  });
});
