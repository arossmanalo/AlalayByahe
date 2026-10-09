import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TransitPack } from "../src/contracts/index";
import { normalizeAlias } from "../src/data/normalize";

/**
 * Builds assets/demo/demo-pack.json, the pack loaded by a DEMO BUILD only
 * (EXPO_PUBLIC_DEMO_BUILD=1; see docs/evidence/demo-build.md).
 *
 * It combines three things, and the pack says so on every screen (kind "test_fixture"):
 *   1. the reviewed LRT-1 stations and fares (real, verified),
 *   2. the unverified road-route drafts (teammate-reported),
 *   3. the SYNTHETIC Luzon demo network (invented).
 * To avoid confusing searches, synthetic places drop any alias that a real or drafted place
 * already uses. Run after scripts/build-road-draft.ts and scripts/build-luzon-demo.ts.
 */

const roads = JSON.parse(readFileSync("data/candidates/roads-draft.json", "utf8")) as TransitPack;
const luzon = JSON.parse(readFileSync("tests/fixtures/luzon-demo-pack.json", "utf8")) as TransitPack;

const taken = new Set<string>();
for (const p of roads.places) for (const text of [p.name, ...p.aliases]) taken.add(normalizeAlias(text));

const luzonPlaces = luzon.places.map((p) => {
  const aliases = p.aliases.filter((a) => !taken.has(normalizeAlias(a)));
  return { ...p, aliases };
});

const ids = (rows: { id: string }[]): Set<string> => new Set(rows.map((r) => r.id));
for (const key of ["places", "stops", "services", "directions", "walkLinks", "fares", "sources"] as const) {
  const clash = [...ids(roads[key] as { id: string }[])].filter((id) => ids(luzon[key] as { id: string }[]).has(id));
  if (clash.length) throw new Error(`ID clash in ${key}: ${clash.join(", ")}`);
}

const pack: TransitPack = {
  schemaVersion: "1.0",
  packId: "pack_test_demo_luzon_roads",
  version: "test_fixture_demo_2026_10_10_1",
  kind: "test_fixture",
  createdAt: luzon.createdAt,
  coverageLabels: [
    "DEMO BUILD: this pack contains INVENTED routes across Luzon and UNVERIFIED road-route drafts. It is not real coverage. Do not rely on it to travel.",
    "Real and verified inside this demo: LRT-1 stations (25) and the official LRMC stored value fares.",
  ],
  places: [...roads.places, ...luzonPlaces],
  stops: [...roads.stops, ...luzon.stops],
  services: [...roads.services, ...luzon.services],
  directions: [...roads.directions, ...luzon.directions],
  routeStops: [...roads.routeStops, ...luzon.routeStops],
  walkLinks: [...roads.walkLinks, ...luzon.walkLinks],
  fares: [...roads.fares, ...luzon.fares],
  sources: [...roads.sources, ...luzon.sources],
};

mkdirSync(dirname("assets/demo/demo-pack.json"), { recursive: true });
writeFileSync("assets/demo/demo-pack.json", JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote assets/demo/demo-pack.json: ${pack.places.length} places, ${pack.services.length} services, ${pack.walkLinks.length} walks.`);
