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

  it("About and Supported coverage say first that the routes are invented and unverified", () => {
    const coverage = coverageSummary(pack.coverageLabels, []);
    assert.match(coverage.labels[0]!, /^DEMO BUILD: this pack contains INVENTED routes .* Do not rely on it to travel\.$/);
    assert.match(coverage.labels[1]!, /^Real and verified inside this demo: LRT-1 stations/);
  });

  it("search finds Baguio, Legazpi and Laoag, each as one stored demo place", async () => {
    assert.deepEqual(await search("Baguio"), ["Baguio City terminal (DEMO) [alias]"]);
    assert.deepEqual(await search("Legazpi"), ["Legazpi terminal (DEMO) [alias]"]);
    assert.deepEqual(await search("Laoag"), ["Laoag terminal (DEMO) [alias]"]);
  });

  it("Laoag to Legazpi: three buses at an estimated total, and a four-bus option that is not a full total", async () => {
    const { shown, warnings } = await plan("Laoag", "Legazpi");
    assert.equal(shown.length, 2);
    const [first, second] = shown as [JourneyOption, JourneyOption];
    assert.deepEqual(legSequence(first), ["bus", "bus", "bus"]);
    assert.equal(first.transfers, 2);
    assert.equal(firstRideLine(first, t), "First ride from Laoag terminal (DEMO)");
    assert.equal(fareLine(first), "₱1,662.00 total (estimated)");
    assert.deepEqual(legSequence(second), ["bus", "bus", "bus", "bus"]);
    assert.equal(fareLine(second), "Fare: This is not the full total. / Known subtotal ₱1,469.00 plus 1 ride with unknown fare / Confirm the fare with the driver or operator.");
    assert.ok(coverageSummary(pack.coverageLabels, warnings).labels[0]!.startsWith("DEMO BUILD"));
  });

  it("the three-jeepney Lipa to Candelaria road draft: reached by De La Salle and Mang Inasal, estimated total", async () => {
    const { shown } = await plan("De La Salle", "Mang Inasal");
    assert.equal(shown.length, 1);
    const option = shown[0]!;
    assert.deepEqual(legSequence(option), ["jeepney", "walk", "jeepney", "jeepney"]);
    assert.equal(option.transfers, 2);
    assert.equal(option.walkMeters, 150);
    assert.equal(firstRideLine(option, t), "First ride from McDonald's near De La Salle Lipa");
    assert.equal(fareLine(option), "₱104.00 total (estimated)");
    assert.ok(option.legs.every((leg) => leg.evidence.reliability === "estimated"), "road drafts are never shown as verified");
  });

  it("typing Lipa and Candelaria lists only the invented DEMO terminals, not the road-draft stops", async () => {
    // Recorded so the device tester searches the terms above. The draft stops have no aliases, and
    // stored-place search drops substring matches when an alias matches (src/storage/place-search.ts).
    assert.deepEqual(await search("Lipa"), ["Lipa City terminal (DEMO) [alias]"]);
    assert.deepEqual(await search("Candelaria"), ["Candelaria terminal (DEMO) [alias]"]);
  });

  it("the real LRT-1 inside the demo keeps its verified fare", async () => {
    const { shown } = await plan("Vito Cruz", "Baclaran");
    assert.equal(fareLine(shown[0]!), "₱21.00 total (verified)");
  });
});
