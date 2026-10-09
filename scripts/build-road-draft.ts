import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Direction, Evidence, FarePolicy, Place, RouteStop, Service, SourceRef, Stop, TransitPack, WalkLink } from "../src/contracts/index";

/**
 * Builds data/candidates/roads-draft.json: the verified LRT-1 pack plus DRAFT road routes taken
 * from teammate reports relayed by the user on 2026-10-10. Every road fact is "estimated"
 * (teammate-reported, undated, no named recorder, not independently checked), so the release
 * gate refuses this pack on purpose. It becomes shippable only after a second teammate checks
 * each leg and the evidence is raised to "verified". Run: tsx scripts/build-road-draft.ts
 *
 * Not included because the data is incomplete: the SM Lipa jeepney and the Wawa jeepney of
 * the Lipa to San Pablo trip (no boarding spot, no Wawa point), the Quiapo/UST/Gil Puyat jeeps (no boarding spot), return trips,
 * and student fares (reported amounts do not follow one documented ratio).
 */

const BASE = "assets/data/release.json";
const OUTPUT = "data/candidates/roads-draft.json";
const OBSERVED_AT = "2026-10-10T02:30:00+08:00";

const base = JSON.parse(readFileSync(BASE, "utf8")) as TransitPack;

const TEAM = "source_team_reports_2026_10_10";
const JAC = "source_jacliner_routes";
const PITX = "source_pitx_gates";
const GREENLINE = "source_greenline_wikipedia";
const WALKS = "source_valhalla_osm_walks";
const OSM = "source_osm_nominatim_places";

const ev = (sourceIds: string[], note: string): Evidence => ({ sourceIds, checkedAt: OBSERVED_AT, reliability: "estimated", note });
const REPORTED = "Reported by teammates and relayed by the user; undated, no named recorder, not yet checked by a second teammate.";

const sources: SourceRef[] = [
  {
    id: TEAM, title: "Teammate-reported routes, stops and fares (relayed in chat)", publisher: "AlalayByahe team via the user",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Reported field knowledge. Map pins were read from Google Maps short links the user sent. Undated, recorder not named, not independently checked.",
    factsSupported: ["Which jeeps, buses and fares connect the places", "Boarding and drop-off places and their map pins"],
    checkedBy: "Not yet checked by a second teammate", note: "See docs/evidence/teammate-observations.md",
  },
  {
    id: JAC, title: "JAC Liner Terminals and Routes", url: "https://jacliner.com/terminals-and-routes", publisher: "JAC Liner Inc. (operator)",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Operator website, read 2026-10-10. Shows Candelaria as a pick-up and drop-off point on its Lucena route and a JAC Liner Buendia terminal on Sen. Gil J. Puyat Ave. corner Donada St., Pasay. No fares, schedules or stop pins.",
    factsSupported: ["A bus operator serves Candelaria on the Lucena route", "A JAC Liner terminal exists at Buendia, Pasay"],
    checkedBy: "Member 2 assistant; not yet checked by a second teammate",
  },
  {
    id: PITX, title: "PITX passenger guide: transport and gates", url: "https://pitx.ph/passengers-guide/transport/", publisher: "PITX (operator)",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Operator page dated 9 Oct 2026. Lists Gate 5 (ground floor) for Batangas, Laguna and Quezon buses, city buses including 'Fairview via East Ave' with no gate shown, and Gate 9 with no routes listed.",
    factsSupported: ["Provincial buses to Quezon use Gate 5 per this page", "Fairview city bus exists; gate not stated"],
    checkedBy: "Member 2 assistant; not yet checked by a second teammate", note: "The reported Gate 9 for the Fairview bus is NOT confirmed by this page.",
  },
  {
    id: GREENLINE, title: "Greenline Express", url: "https://en.wikipedia.org/wiki/Greenline_Express", publisher: "Wikipedia contributors (CC BY-SA 4.0)",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Secondary source: a Greenline city bus plies SM Fairview to PITX via Taft Ave. and Quezon Ave.",
    factsSupported: ["A Fairview to PITX city bus runs along Taft Avenue"],
    checkedBy: "Member 2 assistant; not yet checked by a second teammate",
  },
  {
    id: OSM, title: "OpenStreetMap place search (Nominatim)", url: "https://nominatim.openstreetmap.org/", publisher: "OpenStreetMap contributors (ODbL 1.0, attribution required)",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Used once to find the map point of the named Puregold in San Pablo (Cipriano B. Colago Avenue). The point is an approximate place location, not the jeepney or van drop-off spot. A search for 'Wawa' in Barangay Del Remedio returned no matching place, so no Wawa point is used.",
    factsSupported: ["Approximate location of Puregold San Pablo"],
    checkedBy: "Member 2 assistant; not yet checked by a second teammate",
  },
  {
    id: WALKS, title: "Pedestrian routes computed on OpenStreetMap data (Valhalla, FOSSGIS server)", url: "https://valhalla1.openstreetmap.de/", publisher: "OpenStreetMap contributors (ODbL 1.0, attribution required)",
    retrievedAt: OBSERVED_AT,
    usageBasis: "Computed walking routes between the reported pins. Not walked by a teammate; ends at the station's approximate map point, not a surveyed entrance.",
    factsSupported: ["Walking distance and turns between two pins"],
    checkedBy: "Member 2 assistant; not yet checked by a second teammate",
  },
];

const place = (id: string, name: string, locality: string, lat: number, lon: number, kind: Place["kind"], note: string): Place => ({
  id, name, aliases: [], kind, locality, point: { latitude: lat, longitude: lon },
  evidence: ev([TEAM], `${note} ${REPORTED}`),
});

const places: Place[] = [
  place("place_lipa_mcdo_la_salle", "McDonald's near De La Salle Lipa", "Lipa City", 13.94134, 121.149253, "boarding_point", "Boarding point of the 'Lipa Palengke' jeep."),
  place("place_lipa_town_proper", "Lipa town proper (jeep drop)", "Lipa City", 13.939738, 121.161626, "boarding_point", "Drop-off point of the 'Lipa Palengke' jeep."),
  place("place_lipa_tiaong_terminal", "Lipa terminal of the Tiaong jeep", "Lipa City", 13.940246, 121.162833, "terminal", "Where the walk from the town drop ends; start of the Tiaong jeep."),
  place("place_tiaong_intersection", "Tiaong intersection", "Tiaong, Quezon", 13.960353, 121.321225, "boarding_point", "End of the Tiaong jeep; boarding point of the Candelaria jeep."),
  place("place_lipa_van_terminal", "Lipa van terminal (vans to San Pablo)", "Lipa City", 13.942662, 121.153493, "terminal", "Boarding point of the van to San Pablo."),
  {
    ...place("place_san_pablo_puregold", "Puregold San Pablo", "San Pablo City, Laguna", 14.0730005, 121.3161194, "boarding_point", "Where the van is reported to drop; the map point is the store's, not a surveyed drop-off spot."),
    evidence: ev([TEAM, OSM], `Where the van is reported to drop. The map point is the store's location from OpenStreetMap, not a surveyed drop-off spot. ${REPORTED}`),
  },
  place("place_candelaria_town_proper", "Candelaria town proper (Mang Inasal stop)", "Candelaria, Quezon", 13.9287883, 121.4240524, "boarding_point", "Candelaria jeep drop; the user confirmed this pin (Google Maps names it Non-Stop Gas Station)."),
  place("place_candelaria_hacienda_inn", "Bus stop in front of Hacienda Inn", "Candelaria, Quezon", 13.92878, 121.425215, "boarding_point", "Boarding stop for the Buendia and PITX buses."),
  place("place_pasay_mixue_gil_puyat", "Mixue Gil Puyat (bus drop)", "Pasay City", 14.555245, 120.997014, "boarding_point", "Drop-off of the Buendia bus, 2008e Taft Ave, Barangay 47, Pasay."),
  place("place_pitx_terminal", "PITX terminal", "Parañaque City", 14.510111, 120.991182, "terminal", "Parañaque Integrated Terminal Exchange, 1 Kennedy Road, Tambo. Pin is the building, not a gate."),
  place("place_manila_taft_dlsu", "Taft Avenue near DLSU (bus drop)", "Manila", 14.565312, 120.994036, "boarding_point", "Drop-off of the Fairview bus near Vito Cruz."),
];

const stop = (placeId: string, label: string, board: boolean, alight: boolean): Stop => {
  const p = places.find((x) => x.id === placeId)!;
  return { id: placeId.replace("place_", "stop_"), placeId, label, point: { ...p.point }, board, alight, evidence: ev([TEAM], REPORTED) };
};

// Stops allow both flags; each direction's route stops restrict boarding and alighting to the reported ends.
const stops: Stop[] = places.map((p) => stop(p.id, p.name, true, true));

interface Line {
  key: string; name: string; mode: Service["mode"]; headsign: string;
  from: string; to: string; centavos: number; sourceIds: string[]; note: string;
}

const lines: Line[] = [
  { key: "lipa_palengke_jeep", name: "Jeepney Lipa Palengke", mode: "jeepney", headsign: "Lipa Palengke", from: "place_lipa_mcdo_la_salle", to: "place_lipa_town_proper", centavos: 1400, sourceIds: [TEAM], note: "Regular fare P14 as reported (student P12 is not modelled)." },
  { key: "lipa_san_pablo_van", name: "Van Lipa to San Pablo", mode: "van", headsign: "San Pablo", from: "place_lipa_van_terminal", to: "place_san_pablo_puregold", centavos: 13000, sourceIds: [TEAM], note: "Regular fare P130 as reported; operator and signboard not stated, so 'San Pablo' is inferred from 'van going to San Pablo'. The reported ride is up to Puregold." },
  { key: "tiaong_jeep", name: "Jeepney Tiaong (Bantayan)", mode: "jeepney", headsign: "Tiaong / Bantayan", from: "place_lipa_tiaong_terminal", to: "place_tiaong_intersection", centavos: 6000, sourceIds: [TEAM], note: "One long ride with no intermediate stops recorded. Regular fare P60 (student P50 not modelled)." },
  { key: "candelaria_jeep", name: "Jeepney to Candelaria", mode: "jeepney", headsign: "Candelaria", from: "place_tiaong_intersection", to: "place_candelaria_town_proper", centavos: 3000, sourceIds: [TEAM], note: "Headsign inferred from the report 'goes straight to Candelaria'. Regular fare P30 (student P25 not modelled)." },
  { key: "buendia_bus", name: "Bus Candelaria to Buendia", mode: "bus", headsign: "Buendia", from: "place_candelaria_hacienda_inn", to: "place_pasay_mixue_gil_puyat", centavos: 25000, sourceIds: [TEAM, JAC], note: "Regular fare P250 as reported (student P230 not modelled). JAC Liner/Lucena Lines serve Candelaria and have a Buendia terminal; the operator of the reported bus was not stated." },
  { key: "pitx_bus", name: "Bus Candelaria to PITX", mode: "bus", headsign: "PITX", from: "place_candelaria_hacienda_inn", to: "place_pitx_terminal", centavos: 21000, sourceIds: [TEAM], note: "Regular fare P210 as reported (student P180 not modelled). Operator not stated." },
  { key: "fairview_bus", name: "City bus PITX to SM Fairview (Taft Avenue)", mode: "bus", headsign: "SM Fairview", from: "place_pitx_terminal", to: "place_manila_taft_dlsu", centavos: 2000, sourceIds: [TEAM, GREENLINE, PITX], note: "Fare P20 as reported. Reported to board at PITX Gate 9, which the PITX page does not confirm (it lists no routes for Gate 9). That it passes Vito Cruz on Taft Avenue rests on a secondary source." },
];

const services: Service[] = lines.map((l) => ({
  id: `service_${l.key}`, name: l.name, mode: l.mode, signboardAliases: [l.headsign], evidence: ev(l.sourceIds, `${l.note} ${REPORTED}`),
}));
const directions: Direction[] = lines.map((l) => ({
  id: `dir_${l.key}`, serviceId: `service_${l.key}`, headsign: l.headsign, availability: "documented",
  availabilityNote: "Reported by teammates; not live availability. Operating hours are not recorded.",
  evidence: ev(l.sourceIds, `${l.note} ${REPORTED}`),
}));
const routeStops: RouteStop[] = lines.flatMap((l) => [
  { directionId: `dir_${l.key}`, sequence: 1, stopId: l.from.replace("place_", "stop_"), board: true, alight: false, evidence: ev(l.sourceIds, REPORTED) },
  { directionId: `dir_${l.key}`, sequence: 2, stopId: l.to.replace("place_", "stop_"), board: false, alight: true, evidence: ev(l.sourceIds, REPORTED) },
]);
const fares: FarePolicy[] = lines.map((l) => ({
  id: `fare_${l.key}`, serviceId: `service_${l.key}`, kind: "flat", flatCentavos: l.centavos,
  evidence: ev(l.sourceIds, `${l.note} ${REPORTED}`),
}));

const walkEvidence = (note: string): Evidence => ev([WALKS, TEAM], `${note} Computed on OpenStreetMap data, not walked by a teammate. Ends at the station's approximate map point, not a surveyed entrance.`);
const walkLinks: WalkLink[] = [
  {
    id: "walk_lipa_town_to_tiaong_terminal", fromPlaceId: "place_lipa_town_proper", toPlaceId: "place_lipa_tiaong_terminal", meters: 150,
    steps: ["Walk east on G. A. Solis Street for about 102 m.", "Turn left (about 4 m).", "Turn right onto the walkway (about 30 m).", "Turn right onto the crosswalk (about 14 m) and arrive at the Tiaong jeep terminal."],
    evidence: walkEvidence("Walk from the Lipa jeep drop to the Tiaong jeep terminal."),
  },
  {
    id: "walk_mixue_gil_puyat_to_lrt_gil_puyat", fromPlaceId: "place_pasay_mixue_gil_puyat", toPlaceId: "place_lrt1_gil_puyat", meters: 790,
    steps: ["Walk north on Taft Avenue for about 60 m.", "Turn left onto San Juan Street (about 279 m).", "Turn left onto Leveriza Street (about 151 m).", "Turn left onto Senator Gil J. Puyat Avenue (about 181 m).", "Turn right onto the walkway (about 26 m).", "Turn left onto Senator Gil J. Puyat Avenue (about 51 m).", "Bear left (about 42 m) to the Gil Puyat LRT station."],
    evidence: walkEvidence("Walk from the Mixue bus drop to Gil Puyat LRT station. Long because of the pedestrian route; much longer than the 125 m straight line."),
  },
  {
    id: "walk_taft_dlsu_to_lrt_vito_cruz", fromPlaceId: "place_manila_taft_dlsu", toPlaceId: "place_lrt1_vito_cruz", meters: 234,
    steps: ["Walk southeast on the walkway for about 97 m.", "Turn right onto the crosswalk (about 20 m).", "Turn left onto Taft Avenue (about 116 m) to the Vito Cruz LRT station."],
    evidence: walkEvidence("Walk from the Fairview bus drop near DLSU to Vito Cruz LRT station."),
  },
];

const pack: TransitPack = {
  ...base,
  packId: "pack_lrt1_roads_draft",
  version: "lrt1_roads_draft_2026_10_10_1",
  createdAt: OBSERVED_AT,
  coverageLabels: [
    ...base.coverageLabels,
    "DRAFT, unverified: Lipa (McDonald's near De La Salle) to Candelaria by three jeepneys, and Candelaria to Vito Cruz by bus plus LRT-1 or by bus via PITX, and the Lipa van to Puregold San Pablo. One direction only; reported by teammates; not independently checked.",
  ],
  sources: [...base.sources, ...sources],
  places: [...base.places, ...places],
  stops: [...base.stops, ...stops],
  services: [...base.services, ...services],
  directions: [...base.directions, ...directions],
  routeStops: [...base.routeStops, ...routeStops],
  walkLinks: [...base.walkLinks, ...walkLinks],
  fares: [...base.fares, ...fares],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote ${OUTPUT}: ${pack.places.length} places, ${pack.services.length} services, ${pack.walkLinks.length} walk links.`);
