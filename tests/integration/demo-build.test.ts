import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Place } from "../../src/contracts";
import { defaultPreferences } from "../../src/contracts/defaults";
import { DEMO_BUILD } from "../../src/application/demo-build";
import { BUNDLED_TRANSIT_PACK } from "../../src/application/bundled-pack";
import { createApplicationServices } from "../../src/application/services";
import { createRoutePort } from "../../src/routing/routePort";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import { ai, database, value } from "./helpers";

/**
 * The DEMO BUILD composition: the same services as the app, loaded with assets/demo/demo-pack.json
 * (a test_fixture pack: real LRT-1 + unverified road drafts + synthetic Luzon). The release
 * composition must keep refusing it. Real Node SQLite; AI is a labelled test double.
 */

const demoPack: unknown = JSON.parse(readFileSync(new URL("../../assets/demo/demo-pack.json", import.meta.url), "utf8"));
const endpoint = (p: Place) => ({ placeId: p.id, label: p.name, point: { ...p.point }, provenance: "stored" as const });

async function boot(allowTestFixtures: boolean) {
  const db = database();
  const repository = new SqlTransitRepository(async () => db.driver, { allowTestFixtures });
  const services = createApplicationServices({
    repository, ai: ai(), routes: createRoutePort(), bundledPack: demoPack, allowTestFixtures,
  });
  const status = await services.initialize();
  return { services, repository, status };
}

test("the release build flag is off by default, and the release bundle still points at the reviewed pack", () => {
  assert.equal(DEMO_BUILD, false);
  const release = JSON.parse(readFileSync(new URL("../../assets/data/release.json", import.meta.url), "utf8")) as { kind: string; version: string };
  assert.equal(release.kind, "release");
  assert.equal((BUNDLED_TRANSIT_PACK as { version: string }).version, release.version);
});

test("the release composition refuses the demo pack", async () => {
  const { status, services } = await boot(false);
  assert.equal(status.data.ok, false);
  await services.close();
});

test("the demo composition installs the demo pack, which is a test_fixture so the app shows its warning banner", async () => {
  const { status, services, repository } = await boot(true);
  assert.equal(status.data.ok, true);
  const pack = value(await repository.getPack());
  assert.equal(pack.kind, "test_fixture");
  assert.match(pack.coverageLabels[0]!, /Demonstration network/);
  assert.ok(pack.places.length > 80);
  await services.close();
});

test("stored place search finds Luzon places and keeps the real LRT-1 names unambiguous", async () => {
  const { services, repository } = await boot(true);
  for (const [text, expected] of [
    ["Baguio", "place_test_baguio"], ["Legazpi", "place_test_legazpi"], ["Laoag", "place_test_laoag"],
    ["Vito Cruz", "place_lrt1_vito_cruz"], ["Taft", "place_lrt1_edsa"],
  ] as const) {
    const found = value(await repository.resolvePlace(text));
    assert.deepEqual(found.candidates.map((c) => c.place.id), [expected], text);
  }
  await services.close();
});

test("all three layers plan through the same controller: real LRT-1, road drafts, synthetic Luzon", async () => {
  const { services, repository } = await boot(true);
  const place = async (text: string) => value(await repository.resolvePlace(text)).candidates[0]!.place;
  const prefs = { ...defaultPreferences(), maxTransferWalkMeters: 1000 };
  const plan = async (from: Place, to: Place) => value(await services.controller.submitManual({ queryId: `demo_${from.id}_${to.id}`, origin: endpoint(from), destination: endpoint(to), preferences: prefs }));

  const real = await plan(await place("Vito Cruz"), await place("Baclaran"));
  assert.equal(real.options[0]!.fare.knownMinCentavos, 2100);
  assert.equal(real.options[0]!.fare.status, "complete");

  const pack = value(await repository.getPack());
  const byId = (id: string) => pack.places.find((p) => p.id === id)!;
  const road = await plan(byId("place_lipa_mcdo_la_salle"), byId("place_candelaria_town_proper"));
  assert.equal(road.options[0]!.fare.knownMinCentavos, 10400);
  assert.equal(road.options[0]!.transfers, 2);

  const synthetic = await plan(await place("Laoag"), await place("Legazpi"));
  assert.equal(synthetic.options[0]!.transfers, 2);
  assert.ok(synthetic.coverageWarnings.some((w) => /Demonstration network/.test(w)), "every result still states that the network is a demonstration");
  await services.close();
});

test("the demo pack is reachable only through an inline build flag, never from the release path", () => {
  const nativeServices = readFileSync(new URL("../../src/application/native-services.ts", import.meta.url), "utf8");
  assert.match(nativeServices, /process\.env\.EXPO_PUBLIC_DEMO_BUILD === "1"/, "flag must be inline so the bundler can drop the branch");
  assert.equal((nativeServices.match(/require\("\.\/demo-pack"\)/g) ?? []).length, 1, "demo pack is required in exactly one place");
  assert.ok(!/import .*demo-pack/.test(nativeServices), "no static import of the demo pack");
  const bundled = readFileSync(new URL("../../src/application/bundled-pack.ts", import.meta.url), "utf8");
  assert.ok(!/demo/i.test(bundled.replace(/\/\/.*$/gm, "")), "the release pack module never mentions the demo pack");
  const demo = JSON.parse(readFileSync(new URL("../../assets/demo/demo-pack.json", import.meta.url), "utf8")) as { kind: string };
  assert.equal(demo.kind, "test_fixture");
});
