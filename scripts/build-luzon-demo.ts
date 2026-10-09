import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Direction, Evidence, FarePolicy, Mode, Place, RouteStop, Service, Stop, TransitPack, WalkLink } from "../src/contracts/index";
import { aerialMeters } from "../src/data/geo";

/**
 * Builds tests/fixtures/luzon-demo-pack.json: a SYNTHETIC, Luzon-wide demo and test pack.
 *
 * Everything here is invented for testing and demos: the routes, stops, fares, walks and
 * the existence of every line. Town coordinates are approximate public geography only.
 * The pack is `kind: "test_fixture"` with `test_` IDs and "(DEMO)" in every place and service
 * name, so the release gate rejects it and it cannot be mistaken for real data.
 * It must never be imported by native/release code and never shipped as verified coverage.
 *
 * Run: tsx scripts/build-luzon-demo.ts
 */

const OUTPUT = "tests/fixtures/luzon-demo-pack.json";
const AT = "2026-10-10T03:00:00+08:00";
const SOURCE = "source_test_luzon_demo";

const ev = (reliability: Evidence["reliability"] = "estimated"): Evidence => ({
  sourceIds: reliability === "unknown" ? [] : [SOURCE], checkedAt: AT, reliability,
  note: "SYNTHETIC DEMO DATA. Invented for testing; not a real route, stop or fare.",
});

interface City { key: string; name: string; lat: number; lon: number; aliases?: string[] }
const C = (key: string, name: string, lat: number, lon: number, aliases: string[] = []): City => ({ key, name, lat, lon, aliases });

const cities: City[] = [
  // Metro Manila
  C("cubao", "Cubao terminal", 14.6197, 121.0526, ["Cubao", "Araneta Cubao"]),
  C("pitx", "PITX terminal", 14.5093, 120.9913, ["PITX", "Parañaque Integrated Terminal Exchange"]),
  C("buendia", "Buendia Gil Puyat hub", 14.5541, 120.9972, ["Buendia", "Gil Puyat"]),
  C("edsa_taft", "EDSA Taft hub", 14.5388, 121.0007, ["EDSA", "Taft"]),
  C("monumento", "Monumento terminal", 14.6541, 120.9839, ["Monumento"]),
  C("north_ave", "North Avenue hub", 14.6521, 121.0323, ["North Avenue", "North Ave"]),
  C("vito_cruz", "Vito Cruz hub", 14.5635, 120.9947, ["Vito Cruz"]),
  C("baclaran", "Baclaran hub", 14.5339, 120.9981, ["Baclaran"]),
  C("central_manila", "Central Manila hub", 14.5929, 120.9816, ["Central", "Carriedo"]),
  C("recto", "Recto hub", 14.6035, 120.9833, ["Recto"]),
  C("alabang", "Alabang terminal", 14.4188, 121.0398, ["Alabang"]),
  // Calabarzon
  C("calamba", "Calamba terminal", 14.2117, 121.1653, ["Calamba"]),
  C("santa_rosa", "Santa Rosa terminal", 14.3122, 121.1114, ["Santa Rosa", "Sta. Rosa"]),
  C("san_pablo", "San Pablo City terminal", 14.0683, 121.3258, ["San Pablo", "San Pablo City"]),
  C("san_pablo_market", "San Pablo public market", 14.0692, 121.3249, ["San Pablo market"]),
  C("sto_tomas", "Santo Tomas terminal", 14.1078, 121.1414, ["Santo Tomas", "Sto. Tomas"]),
  C("lipa_terminal", "Lipa City terminal", 13.9411, 121.1631, ["Lipa", "Lipa City"]),
  C("lipa_palengke", "Lipa public market", 13.9397, 121.1616, ["Lipa Palengke", "Lipa market"]),
  C("sm_lipa", "SM City Lipa", 13.9564, 121.1631, ["SM Lipa"]),
  C("batangas_city", "Batangas City terminal", 13.7565, 121.0583, ["Batangas City", "Batangas"]),
  C("tiaong", "Tiaong terminal", 13.9603, 121.3212, ["Tiaong"]),
  C("candelaria", "Candelaria terminal", 13.9287, 121.424, ["Candelaria"]),
  C("candelaria_market", "Candelaria public market", 13.9295, 121.4231, ["Candelaria market"]),
  C("lucena", "Lucena Grand Terminal", 13.9373, 121.6171, ["Lucena", "Lucena City"]),
  C("tagaytay", "Tagaytay terminal", 14.1153, 120.9621, ["Tagaytay"]),
  C("nasugbu", "Nasugbu terminal", 14.07, 120.633, ["Nasugbu"]),
  C("antipolo", "Antipolo terminal", 14.586, 121.176, ["Antipolo"]),
  // Central Luzon
  C("malolos", "Malolos terminal", 14.8433, 120.8114, ["Malolos"]),
  C("san_fernando", "San Fernando Pampanga terminal", 15.0286, 120.6898, ["San Fernando", "San Fernando Pampanga"]),
  C("angeles", "Angeles City terminal", 15.145, 120.5887, ["Angeles", "Angeles City"]),
  C("clark", "Clark terminal", 15.185, 120.546, ["Clark"]),
  C("tarlac", "Tarlac City terminal", 15.4755, 120.5963, ["Tarlac"]),
  C("cabanatuan", "Cabanatuan terminal", 15.4859, 120.97, ["Cabanatuan"]),
  C("olongapo", "Olongapo terminal", 14.8386, 120.2842, ["Olongapo"]),
  C("iba", "Iba Zambales terminal", 15.3276, 119.9783, ["Iba", "Iba Zambales"]),
  // Northern Luzon
  C("rosales", "Rosales terminal", 15.8938, 120.633, ["Rosales"]),
  C("dagupan", "Dagupan terminal", 16.0433, 120.3333, ["Dagupan"]),
  C("baguio", "Baguio City terminal", 16.4023, 120.596, ["Baguio", "Baguio City"]),
  C("vigan", "Vigan terminal", 17.5747, 120.3869, ["Vigan"]),
  C("laoag", "Laoag terminal", 18.1978, 120.5936, ["Laoag"]),
  C("santiago", "Santiago Isabela terminal", 16.6877, 121.5489, ["Santiago", "Santiago Isabela"]),
  C("tuguegarao", "Tuguegarao terminal", 17.6132, 121.727, ["Tuguegarao"]),
  // Bicol
  C("daet", "Daet terminal", 14.1122, 122.9553, ["Daet"]),
  C("naga", "Naga City terminal", 13.6218, 123.1948, ["Naga", "Naga City"]),
  C("legazpi", "Legazpi terminal", 13.1391, 123.7438, ["Legazpi"]),
];
const city = (key: string): City => {
  const c = cities.find((x) => x.key === key);
  if (!c) throw new Error(`unknown city ${key}`);
  return c;
};

const km = (a: string, b: string): number => aerialMeters(
  { latitude: city(a).lat, longitude: city(a).lon }, { latitude: city(b).lat, longitude: city(b).lon }) / 1000;

type FareKind = "bus" | "van" | "rail" | { flat: number } | { range: [number, number] } | "unknown";
interface Line { key: string; name: string; mode: Mode; stops: string[]; fare: FareKind }

const lines: Line[] = [
  // Intercity buses
  { key: "cubao_baguio", name: "Cubao to Baguio bus", mode: "bus", stops: ["cubao", "tarlac", "rosales", "baguio"], fare: "bus" },
  { key: "cubao_laoag", name: "Cubao to Laoag bus", mode: "bus", stops: ["cubao", "tarlac", "dagupan", "vigan", "laoag"], fare: "bus" },
  { key: "cubao_tuguegarao", name: "Cubao to Tuguegarao bus", mode: "bus", stops: ["cubao", "cabanatuan", "santiago", "tuguegarao"], fare: "bus" },
  { key: "pitx_legazpi", name: "PITX to Legazpi bus", mode: "bus", stops: ["pitx", "lucena", "daet", "naga", "legazpi"], fare: "bus" },
  { key: "pitx_batangas", name: "PITX to Batangas City bus", mode: "bus", stops: ["pitx", "sto_tomas", "lipa_terminal", "batangas_city"], fare: "bus" },
  { key: "buendia_lucena", name: "Buendia to Lucena via Candelaria bus", mode: "bus", stops: ["buendia", "san_pablo", "tiaong", "candelaria", "lucena"], fare: "unknown" },
  { key: "monumento_angeles", name: "Monumento to Angeles bus", mode: "bus", stops: ["monumento", "malolos", "san_fernando", "angeles"], fare: "bus" },
  { key: "cubao_zambales", name: "Cubao to Iba via Olongapo bus", mode: "bus", stops: ["cubao", "angeles", "olongapo", "iba"], fare: "bus" },
  { key: "pitx_nasugbu", name: "PITX to Nasugbu bus", mode: "bus", stops: ["pitx", "tagaytay", "nasugbu"], fare: "bus" },
  { key: "edsa_carousel", name: "EDSA Carousel bus", mode: "bus", stops: ["pitx", "buendia", "edsa_taft", "cubao", "north_ave", "monumento"], fare: { flat: 1500 } },
  // UV Express vans
  { key: "lipa_san_pablo_van", name: "Lipa to San Pablo van", mode: "van", stops: ["lipa_terminal", "san_pablo"], fare: "van" },
  { key: "san_pablo_calamba_van", name: "San Pablo to Calamba van", mode: "van", stops: ["san_pablo", "calamba"], fare: "van" },
  { key: "calamba_alabang_van", name: "Calamba to Alabang van", mode: "van", stops: ["calamba", "santa_rosa", "alabang"], fare: "van" },
  { key: "lipa_batangas_van", name: "Lipa to Batangas City van", mode: "van", stops: ["lipa_terminal", "batangas_city"], fare: "van" },
  { key: "antipolo_cubao_van", name: "Antipolo to Cubao van", mode: "van", stops: ["antipolo", "cubao"], fare: "van" },
  { key: "angeles_clark_van", name: "Angeles to Clark van", mode: "van", stops: ["angeles", "clark"], fare: "van" },
  { key: "tarlac_cabanatuan_van", name: "Tarlac to Cabanatuan van", mode: "van", stops: ["tarlac", "cabanatuan"], fare: "van" },
  { key: "baguio_dagupan_van", name: "Baguio to Dagupan van", mode: "van", stops: ["baguio", "dagupan"], fare: "van" },
  { key: "naga_legazpi_van", name: "Naga to Legazpi van", mode: "van", stops: ["naga", "legazpi"], fare: "van" },
  { key: "alabang_pitx_van", name: "Alabang to PITX van", mode: "van", stops: ["alabang", "pitx"], fare: "van" },
  // Jeepneys
  { key: "lipa_market_jeep", name: "Lipa market jeepney", mode: "jeepney", stops: ["lipa_palengke", "lipa_terminal"], fare: { flat: 1400 } },
  { key: "sm_lipa_jeep", name: "SM Lipa jeepney", mode: "jeepney", stops: ["sm_lipa", "lipa_palengke"], fare: { flat: 1200 } },
  { key: "lipa_tiaong_jeep", name: "Lipa to Tiaong jeepney", mode: "jeepney", stops: ["lipa_terminal", "tiaong"], fare: "unknown" },
  { key: "tiaong_candelaria_jeep", name: "Tiaong to Candelaria jeepney", mode: "jeepney", stops: ["tiaong", "candelaria"], fare: { flat: 3000 } },
  { key: "san_pablo_tiaong_jeep", name: "San Pablo to Tiaong jeepney", mode: "jeepney", stops: ["san_pablo", "tiaong"], fare: { flat: 4000 } },
  { key: "vito_cruz_central_jeep", name: "Vito Cruz to Central jeepney", mode: "jeepney", stops: ["vito_cruz", "central_manila"], fare: { flat: 1300 } },
  { key: "angeles_san_fernando_jeep", name: "Angeles to San Fernando jeepney", mode: "jeepney", stops: ["angeles", "san_fernando"], fare: { flat: 2500 } },
  // Tricycles (documented stands only; short hops)
  { key: "lipa_trike", name: "Lipa market to SM tricycle", mode: "tricycle", stops: ["lipa_palengke", "sm_lipa"], fare: { range: [3000, 5000] } },
  { key: "san_pablo_trike", name: "San Pablo terminal to market tricycle", mode: "tricycle", stops: ["san_pablo", "san_pablo_market"], fare: { range: [2000, 3500] } },
  { key: "candelaria_trike", name: "Candelaria terminal to market tricycle", mode: "tricycle", stops: ["candelaria", "candelaria_market"], fare: { range: [2000, 3000] } },
  // Rail
  { key: "lrt1", name: "LRT-1", mode: "lrt", stops: ["baclaran", "edsa_taft", "buendia", "vito_cruz", "central_manila", "monumento"], fare: "rail" },
  { key: "mrt3", name: "MRT-3", mode: "lrt", stops: ["edsa_taft", "cubao", "north_ave"], fare: "rail" },
  { key: "lrt2", name: "LRT-2", mode: "lrt", stops: ["recto", "cubao", "antipolo"], fare: "rail" },
];

const pid = (k: string) => `place_test_${k}`;
const sid = (k: string) => `stop_test_${k}`;

const places: Place[] = cities.map((c) => ({
  id: pid(c.key), name: `${c.name} (DEMO)`, aliases: [c.name, ...(c.aliases ?? [])],
  kind: /terminal|hub/i.test(c.name) ? "terminal" : "landmark", locality: "Luzon (DEMO)",
  point: { latitude: c.lat, longitude: c.lon }, evidence: ev(),
}));
const stops: Stop[] = cities.map((c) => ({
  id: sid(c.key), placeId: pid(c.key), label: `${c.name} (DEMO)`, point: { latitude: c.lat, longitude: c.lon },
  board: true, alight: true, evidence: ev(),
}));

const services: Service[] = lines.map((l) => ({
  id: `service_test_${l.key}`, name: `${l.name} (DEMO)`, mode: l.mode, signboardAliases: [], evidence: ev(),
}));

const directions: Direction[] = [];
const routeStops: RouteStop[] = [];
for (const l of lines) {
  for (const [suffix, order] of [["fwd", l.stops], ["rev", [...l.stops].reverse()]] as const) {
    const last = order[order.length - 1] as string;
    directions.push({
      id: `dir_test_${l.key}_${suffix}`, serviceId: `service_test_${l.key}`, headsign: `${city(last).name} (DEMO)`,
      availability: "documented", availabilityNote: "SYNTHETIC DEMO DATA; not a real service.", evidence: ev(),
    });
    order.forEach((k, i) => routeStops.push({
      directionId: `dir_test_${l.key}_${suffix}`, sequence: i + 1, stopId: sid(k),
      board: i < order.length - 1, alight: i > 0, evidence: ev(),
    }));
  }
}

const pesos = (n: number): number => Math.max(1200, Math.round(n) * 100);
const matrixFare = (l: Line, rate: { base: number; perKm: number }): FarePolicy => {
  const matrix: NonNullable<FarePolicy["matrix"]> = [];
  for (const order of [l.stops, [...l.stops].reverse()]) {
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        matrix.push({ fromStopId: sid(order[i] as string), toStopId: sid(order[j] as string), centavos: pesos(rate.base + rate.perKm * km(order[i] as string, order[j] as string)) });
      }
    }
  }
  return { id: `fare_test_${l.key}`, serviceId: `service_test_${l.key}`, kind: "matrix", evidence: ev(), matrix };
};
const fares: FarePolicy[] = lines.map((l) => {
  const base = { id: `fare_test_${l.key}`, serviceId: `service_test_${l.key}` };
  if (l.fare === "bus") return matrixFare(l, { base: 15, perKm: 2.2 });
  if (l.fare === "van") return matrixFare(l, { base: 20, perKm: 2.8 });
  if (l.fare === "rail") return matrixFare(l, { base: 14, perKm: 1.6 });
  if (l.fare === "unknown") return { ...base, kind: "unknown", evidence: ev("unknown") };
  if ("flat" in l.fare) return { ...base, kind: "flat", flatCentavos: l.fare.flat, evidence: ev() };
  return { ...base, kind: "flat", flatRange: { minCentavos: l.fare.range[0], maxCentavos: l.fare.range[1] }, evidence: ev() };
});

// Synthetic short walks between places of the same town, both directions.
const walkPairs: [string, string][] = [
  ["lipa_terminal", "lipa_palengke"], ["lipa_palengke", "sm_lipa"], ["lipa_terminal", "sm_lipa"],
  ["san_pablo", "san_pablo_market"], ["candelaria", "candelaria_market"],
  ["vito_cruz", "central_manila"], ["central_manila", "recto"], ["edsa_taft", "baclaran"],
];
const walkLinks: WalkLink[] = walkPairs.flatMap(([a, b]) => [[a, b], [b, a]].map(([from, to]) => {
  const meters = Math.ceil(km(from as string, to as string) * 1000 * 1.3 + 20);
  return {
    id: `walk_test_${from}_to_${to}`, fromPlaceId: pid(from as string), toPlaceId: pid(to as string), meters,
    steps: [`DEMO: walk from ${city(from as string).name} to ${city(to as string).name} (about ${meters} m).`],
    evidence: ev(),
  };
}));

const pack: TransitPack = {
  schemaVersion: "1.0",
  packId: "pack_test_luzon_demo",
  version: "test_fixture_luzon_demo_1",
  kind: "test_fixture",
  createdAt: AT,
  coverageLabels: ["DEMO DATA, NOT REAL: synthetic routes, stops, fares and walks across Luzon, for testing and demos only"],
  sources: [{
    id: SOURCE, title: "SYNTHETIC Luzon demo data", publisher: "AlalayByahe test fixtures", retrievedAt: AT,
    usageBasis: "Invented for testing and demos. Town coordinates are approximate public geography; every route, stop, fare and walk is made up. Never release data.",
    factsSupported: ["Graph shape for demos and automated tests only"], checkedBy: "Generated by scripts/build-luzon-demo.ts",
  }],
  places, stops, services, directions, routeStops, walkLinks, fares,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote ${OUTPUT}: ${places.length} places, ${services.length} services, ${directions.length} directions, ${fares.length} fares, ${walkLinks.length} walks.`);
