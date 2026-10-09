import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Evidence, FarePolicy, TransitPack } from "../src/contracts/index";

/**
 * Builds assets/data/release.json (ROUTE-001/002): the LRT-1 station-to-station pack.
 *
 * Source: the official LRMC "New LRT-1 Stored Value Fare Matrix" (effective April 2, 2025),
 * transcribed by Member 2's assistant and independently reviewed by Aryl Manalo on 2026-10-10
 * (station order, the full Vito Cruz and EDSA rows, 24 sampled pairs including the corners,
 * five map coordinates and the two direction headsigns; all matched). The build also refuses
 * to write unless all 600 ordered pairs agree across mirrored readings.
 *
 * Scope: all 25 LRT-1 stations Dr. Santos to Fernando Poe Jr., ride legs and stored value fares
 * only. No walking links, no road services; it covers none of the three target corridors end
 * to end. Station coordinates are approximate and stay "estimated". Run: tsx scripts/build-lrt1-pack.ts
 */

const OUTPUT = "assets/data/release.json";
const CHECKED_AT = "2026-10-10T00:41:24+08:00";
const REVIEWER = "Aryl Manalo";

interface Station { key: string; name: string; aliases: string[]; lat: number; lon: number; coordSources: string[]; coordNote: string }

// Order is the order of the rows of the official LRMC matrix, south to north.
const STATIONS: Station[] = [
  { key: "dr_santos", name: "Dr. Santos Station", aliases: ["Dr. Santos", "LRT Dr. Santos"], lat: 14.4853, lon: 120.98956, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; OSM bus stops nearby sit about 200 m east." },
  { key: "ninoy_aquino_avenue", name: "Ninoy Aquino Avenue Station", aliases: ["Ninoy Aquino Avenue", "Ninoy Aquino Ave"], lat: 14.49864, lon: 120.99436, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM bus stop within about 40 m." },
  { key: "pitx", name: "PITX Station", aliases: ["PITX", "LRT PITX"], lat: 14.50848, lon: 120.99128, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 100 m." },
  { key: "mia_road", name: "MIA Road Station", aliases: ["MIA Road"], lat: 14.51843, lon: 120.99299, coordSources: ["source_wikipedia_station_coordinates"], coordNote: "Wikipedia point only; no OSM cross-check was returned." },
  { key: "redemptorist_aseana", name: "Redemptorist-Aseana Station", aliases: ["Redemptorist-Aseana", "Redemptorist", "Aseana"], lat: 14.53028, lon: 120.99294, coordSources: ["source_wikipedia_station_coordinates"], coordNote: "Wikipedia point only; no OSM cross-check was returned." },
  { key: "baclaran", name: "Baclaran Station", aliases: ["Baclaran", "LRT Baclaran"], lat: 14.5339, lon: 120.998, coordSources: ["source_osm_nominatim"], coordNote: "OpenStreetMap bus-stop nodes at the station. The Wikipedia point for Baclaran is identical to its EDSA point and was rejected." },
  { key: "edsa", name: "EDSA Station", aliases: ["EDSA", "Taft Avenue", "Taft", "LRT EDSA", "LRT Taft"], lat: 14.538825, lon: 121.00068, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 60 m. Wikipedia's route diagram labels this station Taft Avenue; the LRMC matrix labels it EDSA." },
  { key: "libertad", name: "Libertad Station", aliases: ["Libertad", "LRT Libertad"], lat: 14.54778, lon: 120.99863, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 60 m." },
  { key: "gil_puyat", name: "Gil Puyat Station", aliases: ["Gil Puyat", "Buendia", "LRT Buendia"], lat: 14.55413, lon: 120.99718, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; OSM bus stop about 125 m north. OSM also names the station Buendia." },
  { key: "vito_cruz", name: "Vito Cruz Station", aliases: ["Vito Cruz", "LRT Vito Cruz"], lat: 14.563475, lon: 120.99468, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 60 m." },
  { key: "quirino", name: "Quirino Station", aliases: ["Quirino", "LRT Quirino"], lat: 14.57022, lon: 120.99168, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 100 m." },
  { key: "pedro_gil", name: "Pedro Gil Station", aliases: ["Pedro Gil", "LRT Pedro Gil"], lat: 14.57663, lon: 120.98799, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 40 m." },
  { key: "un_avenue", name: "UN Avenue Station", aliases: ["UN Avenue", "UN Ave", "United Nations", "LRT United Nations"], lat: 14.58249, lon: 120.98466, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 50 m. The LRMC matrix says UN Avenue; Wikipedia and OSM say United Nations." },
  { key: "central", name: "Central Terminal Station", aliases: ["Central", "Central Terminal", "LRT Central"], lat: 14.5929, lon: 120.98162, coordSources: ["source_wikipedia_station_coordinates"], coordNote: "Wikipedia point only; no OSM cross-check was returned." },
  { key: "carriedo", name: "Carriedo Station", aliases: ["Carriedo", "LRT Carriedo"], lat: 14.599, lon: 120.98136, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 10 m." },
  { key: "doroteo_jose", name: "Doroteo Jose Station", aliases: ["Doroteo Jose", "D. Jose", "LRT Doroteo Jose"], lat: 14.605475, lon: 120.98207, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 40 m. The LRMC matrix says D. Jose." },
  { key: "bambang", name: "Bambang Station", aliases: ["Bambang", "LRT Bambang"], lat: 14.61111, lon: 120.9825, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 50 m." },
  { key: "tayuman", name: "Tayuman Station", aliases: ["Tayuman", "LRT Tayuman"], lat: 14.616794, lon: 120.98276, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 30 m." },
  { key: "blumentritt", name: "Blumentritt Station", aliases: ["Blumentritt", "LRT Blumentritt"], lat: 14.622728, lon: 120.98289, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 10 m." },
  { key: "abad_santos", name: "Abad Santos Station", aliases: ["Abad Santos", "LRT Abad Santos"], lat: 14.630617, lon: 120.98141, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 20 m." },
  { key: "r_papa", name: "R. Papa Station", aliases: ["R. Papa", "LRT R. Papa"], lat: 14.636086, lon: 120.98231, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 30 m." },
  { key: "fifth_avenue", name: "5th Avenue Station", aliases: ["5th Avenue", "Fifth Avenue", "LRT 5th Avenue"], lat: 14.644475, lon: 120.98358, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 30 m." },
  { key: "monumento", name: "Monumento Station", aliases: ["Monumento", "LRT Monumento"], lat: 14.654094, lon: 120.98391, coordSources: ["source_wikipedia_station_coordinates", "source_osm_nominatim"], coordNote: "Wikipedia point; agrees with OSM within about 30 m." },
  { key: "balintawak", name: "Balintawak Station", aliases: ["Balintawak", "LRT Balintawak"], lat: 14.657344, lon: 121.00396, coordSources: ["source_wikipedia_station_coordinates"], coordNote: "Wikipedia point only; no OSM cross-check was returned." },
  { key: "fernando_poe_jr", name: "Fernando Poe Jr. Station", aliases: ["Fernando Poe Jr.", "FPJ", "Roosevelt", "LRT Fernando Poe Jr."], lat: 14.657494, lon: 121.02121, coordSources: ["source_wikipedia_station_coordinates"], coordNote: "Wikipedia point only; no OSM cross-check was returned. Formerly Roosevelt station per Wikipedia." },
];

// Stored value fares in pesos, transcribed from the LRMC "New LRT-1 Stored Value Fare Matrix"
// (effective April 2, 2025), read in four blocks. Rows and columns follow STATIONS.
// The matrix is symmetric, so the upper-right block (read from the top rows) and the
// lower-left block (read from the bottom rows) are independent readings of the same
// numbers; the script asserts they agree before anything is written.
const TOP_LEFT: number[][] = [ // stations 1-14 by 1-14
  [16, 19, 20, 22, 23, 26, 27, 28, 29, 31, 32, 33, 34, 36],
  [19, 16, 18, 20, 21, 23, 24, 26, 27, 28, 29, 31, 32, 33],
  [20, 18, 16, 18, 19, 22, 22, 24, 25, 27, 28, 29, 30, 32],
  [22, 20, 18, 16, 17, 20, 20, 22, 23, 25, 26, 27, 28, 30],
  [23, 21, 19, 17, 16, 18, 19, 21, 22, 23, 25, 26, 27, 29],
  [26, 23, 22, 20, 18, 16, 17, 19, 20, 21, 22, 24, 25, 27],
  [27, 24, 22, 20, 19, 17, 16, 18, 19, 20, 22, 23, 24, 26],
  [28, 26, 24, 22, 21, 19, 18, 16, 17, 19, 20, 21, 22, 24],
  [29, 27, 25, 23, 22, 20, 19, 17, 16, 18, 19, 20, 21, 23],
  [31, 28, 27, 25, 23, 21, 20, 19, 18, 16, 17, 19, 20, 22],
  [32, 29, 28, 26, 25, 22, 22, 20, 19, 17, 16, 17, 19, 20],
  [33, 31, 29, 27, 26, 24, 23, 21, 20, 19, 17, 16, 17, 19],
  [34, 32, 30, 28, 27, 25, 24, 22, 21, 20, 19, 17, 16, 18],
  [36, 33, 32, 30, 29, 27, 26, 24, 23, 22, 20, 19, 18, 16],
];
const TOP_RIGHT: number[][] = [ // stations 1-14 by 15-25 (Carriedo to Fernando Poe Jr.)
  [37, 38, 39, 40, 41, 42, 43, 45, 46, 49, 52],
  [35, 36, 36, 37, 38, 40, 41, 42, 44, 47, 50],
  [33, 34, 35, 36, 37, 38, 39, 40, 42, 45, 48],
  [31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 46],
  [30, 31, 32, 33, 34, 35, 36, 37, 39, 42, 45],
  [28, 29, 30, 30, 31, 33, 34, 35, 37, 40, 43],
  [27, 28, 29, 30, 31, 32, 33, 34, 36, 39, 42],
  [25, 26, 27, 28, 29, 30, 31, 33, 34, 38, 40],
  [24, 25, 26, 27, 28, 29, 30, 32, 33, 37, 39],
  [23, 24, 25, 25, 26, 28, 29, 30, 32, 35, 38],
  [21, 22, 23, 24, 25, 27, 28, 29, 31, 34, 37],
  [20, 21, 22, 23, 24, 25, 26, 28, 29, 33, 35],
  [19, 20, 21, 22, 23, 24, 25, 27, 28, 32, 34],
  [17, 18, 19, 20, 21, 23, 23, 25, 27, 30, 33],
];
const BOTTOM_LEFT: number[][] = [ // stations 15-25 by 1-14, read separately from the bottom rows
  [37, 35, 33, 31, 30, 28, 27, 25, 24, 23, 21, 20, 19, 17],
  [38, 36, 34, 32, 31, 29, 28, 26, 25, 24, 22, 21, 20, 18],
  [39, 36, 35, 33, 32, 30, 29, 27, 26, 25, 23, 22, 21, 19],
  [40, 37, 36, 34, 33, 30, 30, 28, 27, 25, 24, 23, 22, 20],
  [41, 38, 37, 35, 34, 31, 31, 29, 28, 26, 25, 24, 23, 21],
  [42, 40, 38, 36, 35, 33, 32, 30, 29, 28, 27, 25, 24, 23],
  [43, 41, 39, 37, 36, 34, 33, 31, 30, 29, 28, 26, 25, 23],
  [45, 42, 40, 38, 37, 35, 34, 33, 32, 30, 29, 28, 27, 25],
  [46, 44, 42, 40, 39, 37, 36, 34, 33, 32, 31, 29, 28, 27],
  [49, 47, 45, 43, 42, 40, 39, 38, 37, 35, 34, 33, 32, 30],
  [52, 50, 48, 46, 45, 43, 42, 40, 39, 38, 37, 35, 34, 33],
];
const BOTTOM_RIGHT: number[][] = [ // stations 15-25 by 15-25
  [16, 17, 18, 19, 20, 21, 22, 24, 25, 29, 31],
  [17, 16, 17, 18, 19, 20, 21, 23, 24, 28, 30],
  [18, 17, 16, 17, 18, 20, 20, 22, 23, 27, 30],
  [19, 18, 17, 16, 17, 19, 20, 21, 23, 26, 29],
  [20, 19, 18, 17, 16, 18, 19, 20, 22, 25, 28],
  [21, 20, 20, 19, 18, 16, 17, 19, 20, 24, 26],
  [22, 21, 20, 20, 19, 17, 16, 18, 19, 23, 25],
  [24, 23, 22, 21, 20, 19, 18, 16, 18, 21, 24],
  [25, 24, 23, 23, 22, 20, 19, 18, 16, 20, 22],
  [29, 28, 27, 26, 25, 24, 23, 21, 20, 16, 19],
  [31, 30, 30, 29, 28, 26, 25, 24, 22, 19, 16],
];

const SVC_PESOS: number[][] = [
  ...TOP_LEFT.map((row, i) => [...row, ...(TOP_RIGHT[i] as number[])]),
  ...BOTTOM_LEFT.map((row, i) => [...row, ...(BOTTOM_RIGHT[i] as number[])]),
];

for (let i = 0; i < STATIONS.length; i++) {
  if ((SVC_PESOS[i] ?? []).length !== STATIONS.length) throw new Error(`matrix row ${i} has the wrong length`);
  if (SVC_PESOS[i]![i] !== 16) throw new Error(`matrix diagonal at ${i} should be the 16 peso minimum`);
  for (let j = 0; j < STATIONS.length; j++) {
    if (SVC_PESOS[i]![j] !== SVC_PESOS[j]![i]) throw new Error(`matrix is not symmetric at ${i},${j}`);
  }
}

const ev = (sourceIds: string[], note: string, reliability: Evidence["reliability"] = "verified"): Evidence => ({ sourceIds, checkedAt: CHECKED_AT, reliability, note });
const REVIEWED = `Transcribed by Member 2's assistant; checked by ${REVIEWER} on 2026-10-10 against the LRMC image (station order, full Vito Cruz and EDSA rows, 24 sampled pairs); all 600 pairs also agree across mirrored readings.`;

const placeId = (k: string): string => `place_lrt1_${k}`;
const stopId = (k: string): string => `stop_lrt1_${k}`;
const northbound = "dir_lrt1_northbound";
const southbound = "dir_lrt1_southbound";

const matrix: NonNullable<FarePolicy["matrix"]> = [];
STATIONS.forEach((a, i) => STATIONS.forEach((b, j) => {
  if (i !== j) matrix.push({ fromStopId: stopId(a.key), toStopId: stopId(b.key), centavos: (SVC_PESOS[i] as number[])[j]! * 100 });
}));

const lrmcSource = ["source_lrmc_svc_matrix_2025_04_02"];
const routeEvidence = ev(lrmcSource, `Station order is the row order of the LRMC fare matrix; a fare exists for every ordered pair, which implies boarding and alighting at each station in both directions. ${REVIEWED}`);

const pack: TransitPack = {
  schemaVersion: "1.0",
  packId: "pack_lrt1",
  version: "lrt1_2026_10_10_1",
  kind: "release",
  createdAt: CHECKED_AT,
  coverageLabels: [
    "LRT-1 only: Dr. Santos to Fernando Poe Jr. (25 stations), rides and stored value fares. Reviewed 2026-10-10. No road services, no walking links, no target corridor covered end to end.",
  ],
  sources: [
    {
      id: "source_lrmc_svc_matrix_2025_04_02", title: "New LRT-1 Stored Value Fare Matrix, effective April 2, 2025",
      url: "https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SJT-fare-matrix-effective-April-2-2025-1.png",
      publisher: "Light Rail Manila Corporation (LRMC)", retrievedAt: CHECKED_AT,
      usageBasis: "Operator publication read on screen, transcribed for all 25 stations, and reviewed by a teammate. The image titled Stored Value is served at the file name containing SJT; file names on the LRMC site are swapped, so the title inside the image was used.",
      factsSupported: ["Station order south to north", "Stored value fare for each station pair among the 25 stations", "Both directions served between every pair"],
      checkedBy: `Member 2 assistant; reviewed by ${REVIEWER}, 2026-10-10`,
    },
    {
      id: "source_wikipedia_lrt1", title: "LRT Line 1 (Metro Manila)", url: "https://en.wikipedia.org/wiki/LRT_Line_1_(Metro_Manila)",
      publisher: "Wikipedia contributors", retrievedAt: CHECKED_AT,
      usageBasis: "CC BY-SA 4.0. Used only to cross-check station names, terminals and the Taft Avenue name for EDSA station.",
      factsSupported: ["Terminals Dr. Santos and Fernando Poe Jr.", "EDSA station is also called Taft Avenue"],
      checkedBy: `Member 2 assistant; reviewed by ${REVIEWER}, 2026-10-10`,
    },
    {
      id: "source_wikipedia_station_coordinates", title: "Wikipedia station articles (coordinates via MediaWiki API)", url: "https://en.wikipedia.org/wiki/LRT_Line_1_(Metro_Manila)",
      publisher: "Wikipedia contributors", retrievedAt: CHECKED_AT,
      usageBasis: "CC BY-SA 4.0. Approximate station coordinates only. The Baclaran value duplicates the EDSA value, which is wrong, so it was not used.",
      factsSupported: ["Approximate station coordinates"],
      checkedBy: `Member 2 assistant; five coordinates reviewed by ${REVIEWER}, 2026-10-10`,
    },
    {
      id: "source_osm_nominatim", title: "OpenStreetMap via Nominatim search", url: "https://nominatim.openstreetmap.org/",
      publisher: "OpenStreetMap contributors", retrievedAt: CHECKED_AT,
      usageBasis: "ODbL 1.0, attribution required: Data (c) OpenStreetMap contributors. Used to cross-check station coordinates and the Buendia name; nodes are bus stops beside the stations, not platforms.",
      factsSupported: ["Approximate station coordinates", "Gil Puyat station is also called Buendia"],
      checkedBy: `Member 2 assistant; five coordinates reviewed by ${REVIEWER}, 2026-10-10`,
    },
  ],
  places: STATIONS.map((s) => ({
    id: placeId(s.key), name: s.name, aliases: s.aliases, kind: "station" as const, locality: "Metro Manila",
    point: { latitude: s.lat, longitude: s.lon },
    evidence: ev(s.coordSources, `${s.coordNote} Approximate; not a surveyed entrance. Baclaran, EDSA, Vito Cruz, Pedro Gil and Fernando Poe Jr. were checked on a map by ${REVIEWER}; the other stations were not.`, "estimated"),
  })),
  stops: STATIONS.map((s) => ({
    id: stopId(s.key), placeId: placeId(s.key), label: `${s.name.replace(" Station", "")} (LRT-1 platform)`,
    point: { latitude: s.lat, longitude: s.lon }, board: true, alight: true, evidence: routeEvidence,
  })),
  services: [{
    id: "service_lrt1", name: "LRT-1", mode: "lrt", signboardAliases: ["LRT-1", "LRT Line 1", "Line 1"], evidence: routeEvidence,
  }],
  directions: [
    {
      id: northbound, serviceId: "service_lrt1", headsign: "Fernando Poe Jr.", availability: "documented",
      availabilityNote: "Documented only by the fare matrix. Operating hours and disruptions are not recorded; not live availability.",
      evidence: ev(["source_lrmc_svc_matrix_2025_04_02", "source_wikipedia_lrt1"], `Headsign from the northern terminal named by Wikipedia. ${REVIEWED}`),
    },
    {
      id: southbound, serviceId: "service_lrt1", headsign: "Dr. Santos", availability: "documented",
      availabilityNote: "Documented only by the fare matrix. Operating hours and disruptions are not recorded; not live availability.",
      evidence: ev(["source_lrmc_svc_matrix_2025_04_02", "source_wikipedia_lrt1"], `Headsign from the southern terminal named by Wikipedia. ${REVIEWED}`),
    },
  ],
  routeStops: [
    ...STATIONS.map((s, i) => ({
      directionId: northbound, sequence: i + 1, stopId: stopId(s.key),
      board: i < STATIONS.length - 1, alight: i > 0, evidence: routeEvidence,
    })),
    ...[...STATIONS].reverse().map((s, i) => ({
      directionId: southbound, sequence: i + 1, stopId: stopId(s.key),
      board: i < STATIONS.length - 1, alight: i > 0, evidence: routeEvidence,
    })),
  ],
  walkLinks: [],
  fares: [{
    id: "fare_lrt1_svc_2025_04_02", serviceId: "service_lrt1", kind: "matrix", validFrom: "2025-04-02",
    evidence: ev(lrmcSource, `Stored value card fares only. Single journey fares are a different table and are not included. ${REVIEWED}`),
    matrix,
  }],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote ${OUTPUT}: ${pack.places.length} stations, ${matrix.length} stored value fares.`);
