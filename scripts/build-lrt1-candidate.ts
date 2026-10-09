import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Evidence, FarePolicy, TransitPack } from "../src/contracts/index";

/**
 * Builds data/candidates/lrt1-candidate.json (ROUTE-002 follow-up, ROUTE-001 evidence).
 *
 * This is a CANDIDATE, not a release pack. Every fact below was transcribed by Member 2
 * on 2026-10-09 and has NOT been checked by a second teammate, so all evidence is marked
 * "estimated". The release gate requires routing facts to be "verified", which means this
 * pack is correctly rejected for release until a reviewer checks each transcription against
 * its source and the reliability is raised. Run: tsx scripts/build-lrt1-candidate.ts
 *
 * Scope: LRT-1 stations Dr. Santos to Central Terminal only, ride legs and stored value
 * fares between them. No walking links, no road services. It covers none of the three
 * target corridors end to end.
 */

const OUTPUT = "data/candidates/lrt1-candidate.json";
const CHECKED_AT = "2026-10-09T23:00:00+08:00";

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
];

// Stored value fares in pesos, transcribed from the LRMC "New LRT-1 Stored Value Fare Matrix"
// (effective April 2, 2025). Rows and columns follow STATIONS. Every pair was read twice,
// once in each triangle, and the script asserts the two readings agree.
const SVC_PESOS: number[][] = [
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

for (let i = 0; i < STATIONS.length; i++) {
  if ((SVC_PESOS[i] ?? []).length !== STATIONS.length) throw new Error(`matrix row ${i} has the wrong length`);
  for (let j = 0; j < STATIONS.length; j++) {
    if (SVC_PESOS[i]![j] !== SVC_PESOS[j]![i]) throw new Error(`matrix is not symmetric at ${i},${j}`);
  }
}

const ev = (sourceIds: string[], note: string): Evidence => ({ sourceIds, checkedAt: CHECKED_AT, reliability: "estimated", note });
const UNREVIEWED = "Transcribed by Member 2; not yet checked by a second teammate.";

const placeId = (k: string): string => `place_lrt1_${k}`;
const stopId = (k: string): string => `stop_lrt1_${k}`;
const northbound = "dir_lrt1_northbound";
const southbound = "dir_lrt1_southbound";

const matrix: NonNullable<FarePolicy["matrix"]> = [];
STATIONS.forEach((a, i) => STATIONS.forEach((b, j) => {
  if (i !== j) matrix.push({ fromStopId: stopId(a.key), toStopId: stopId(b.key), centavos: (SVC_PESOS[i] as number[])[j]! * 100 });
}));

const lrmcSource = ["source_lrmc_svc_matrix_2025_04_02"];
const routeEvidence = ev(lrmcSource, `Station order is the row order of the LRMC fare matrix; a fare exists for every ordered pair, which implies boarding and alighting at each station in both directions. ${UNREVIEWED}`);

const pack: TransitPack = {
  schemaVersion: "1.0",
  packId: "pack_lrt1_candidate",
  version: "lrt1_candidate_2026_10_09_1",
  kind: "release",
  createdAt: CHECKED_AT,
  coverageLabels: [
    "LRT-1 only: Dr. Santos to Central Terminal, rides and stored value fares. Unreviewed candidate. No road services, no walking links, no target corridor covered end to end.",
  ],
  sources: [
    {
      id: "source_lrmc_svc_matrix_2025_04_02", title: "New LRT-1 Stored Value Fare Matrix, effective April 2, 2025",
      url: "https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SJT-fare-matrix-effective-April-2-2025-1.png",
      publisher: "Light Rail Manila Corporation (LRMC)", retrievedAt: CHECKED_AT,
      usageBasis: "Operator publication read on screen and transcribed for 14 stations. The image titled Stored Value is served at the file name containing SJT; file names on the LRMC site are swapped, so the title inside the image was used.",
      factsSupported: ["Station order south to north", "Stored value fare for each station pair among the 14 stations", "Both directions served between every pair"],
      checkedBy: "Member 2 (unreviewed)",
    },
    {
      id: "source_wikipedia_lrt1", title: "LRT Line 1 (Metro Manila)", url: "https://en.wikipedia.org/wiki/LRT_Line_1_(Metro_Manila)",
      publisher: "Wikipedia contributors", retrievedAt: CHECKED_AT,
      usageBasis: "CC BY-SA 4.0. Used only to cross-check station names, terminals and the Taft Avenue name for EDSA station.",
      factsSupported: ["Terminals Dr. Santos and Fernando Poe Jr.", "EDSA station is also called Taft Avenue"],
      checkedBy: "Member 2 (unreviewed)",
    },
    {
      id: "source_wikipedia_station_coordinates", title: "Wikipedia station articles (coordinates via MediaWiki API)", url: "https://en.wikipedia.org/wiki/LRT_Line_1_(Metro_Manila)",
      publisher: "Wikipedia contributors", retrievedAt: CHECKED_AT,
      usageBasis: "CC BY-SA 4.0. Approximate station coordinates only. The Baclaran value duplicates the EDSA value, which is wrong, so it was not used.",
      factsSupported: ["Approximate station coordinates"],
      checkedBy: "Member 2 (unreviewed)",
    },
    {
      id: "source_osm_nominatim", title: "OpenStreetMap via Nominatim search", url: "https://nominatim.openstreetmap.org/",
      publisher: "OpenStreetMap contributors", retrievedAt: CHECKED_AT,
      usageBasis: "ODbL 1.0, attribution required: Data (c) OpenStreetMap contributors. Used to cross-check station coordinates and the Buendia name; nodes are bus stops beside the stations, not platforms.",
      factsSupported: ["Approximate station coordinates", "Gil Puyat station is also called Buendia"],
      checkedBy: "Member 2 (unreviewed)",
    },
  ],
  places: STATIONS.map((s) => ({
    id: placeId(s.key), name: s.name, aliases: s.aliases, kind: "station" as const, locality: "Metro Manila",
    point: { latitude: s.lat, longitude: s.lon },
    evidence: ev(s.coordSources, `${s.coordNote} Approximate; not a surveyed entrance. ${UNREVIEWED}`),
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
      evidence: ev(["source_lrmc_svc_matrix_2025_04_02", "source_wikipedia_lrt1"], `Headsign from the northern terminal named by Wikipedia. ${UNREVIEWED}`),
    },
    {
      id: southbound, serviceId: "service_lrt1", headsign: "Dr. Santos", availability: "documented",
      availabilityNote: "Documented only by the fare matrix. Operating hours and disruptions are not recorded; not live availability.",
      evidence: ev(["source_lrmc_svc_matrix_2025_04_02", "source_wikipedia_lrt1"], `Headsign from the southern terminal named by Wikipedia. ${UNREVIEWED}`),
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
    evidence: ev(lrmcSource, `Stored value card fares only. Single journey fares are a different table and are not included. ${UNREVIEWED}`),
    matrix,
  }],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote ${OUTPUT}: ${pack.places.length} stations, ${matrix.length} stored value fares.`);
