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

// Searchable names for the road-draft stops so typing "Lipa" or "Candelaria" reaches them. They are added
// after the Luzon alias de-duplication on purpose, so the same town name lists both the road stop and
// the sample terminal.
const ROAD_ALIASES: Record<string, string[]> = {
  place_lipa_mcdo_la_salle: ["McDonald's Lipa", "De La Salle Lipa", "Lipa"],
  place_lipa_town_proper: ["Lipa town proper", "Lipa town"],
  place_lipa_tiaong_terminal: ["Lipa Tiaong jeep terminal"],
  place_tiaong_intersection: ["Tiaong"],
  place_lipa_van_terminal: ["Lipa van terminal", "Lipa UV terminal"],
  place_san_pablo_puregold: ["Puregold", "San Pablo"],
  place_candelaria_town_proper: ["Mang Inasal", "Candelaria", "Candelaria town proper"],
  place_candelaria_hacienda_inn: ["Hacienda Inn"],
  place_pasay_mixue_gil_puyat: ["Mixue Gil Puyat", "Mixue"],
  place_manila_taft_dlsu: ["Taft DLSU", "DLSU"],
};
const roadPlaces = roads.places.map((p) => ({ ...p, aliases: [...p.aliases, ...(ROAD_ALIASES[p.id] ?? [])] }));

// The test fixture keeps two fares unknown on purpose, to test partial totals. The demo build fills them with
// sample amounts so every sample trip shows a complete fare. They stay "estimated", never "verified".
const SAMPLE_FARES: Record<string, number> = { fare_test_buendia_lucena: 42000, fare_test_lipa_tiaong_jeep: 2800 };
const luzonFares = luzon.fares.map((f) =>
  f.kind === "unknown" && SAMPLE_FARES[f.id] !== undefined
    ? {
        id: f.id, serviceId: f.serviceId, kind: "flat" as const, flatCentavos: SAMPLE_FARES[f.id]!,
        evidence: { ...f.evidence, sourceIds: [luzon.sources[0]!.id], reliability: "estimated" as const },
      }
    : f,
);

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
  version: "test_fixture_demo_2026_10_10_2",
  kind: "test_fixture",
  createdAt: luzon.createdAt,
  coverageLabels: [
    "Demonstration network: only the 25 LRT-1 stations and their official LRMC fares are verified. Other routes are samples, not real transport information.",
  ],
  places: [...roadPlaces, ...luzonPlaces],
  stops: [...roads.stops, ...luzon.stops],
  services: [...roads.services, ...luzon.services],
  directions: [...roads.directions, ...luzon.directions],
  routeStops: [...roads.routeStops, ...luzon.routeStops],
  walkLinks: [...roads.walkLinks, ...luzon.walkLinks],
  fares: [...roads.fares, ...luzonFares],
  sources: [...roads.sources, ...luzon.sources],
};

mkdirSync(dirname("assets/demo/demo-pack.json"), { recursive: true });
writeFileSync("assets/demo/demo-pack.json", JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote assets/demo/demo-pack.json: ${pack.places.length} places, ${pack.services.length} services, ${pack.walkLinks.length} walks.`);
