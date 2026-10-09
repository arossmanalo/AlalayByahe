// Member 3: SYNTHETIC test fixture pack for UI development only. kind "test_fixture", test_ namespaces.
// Release builds must never import this file. Nothing here describes a real place, service or fare.
import type { Evidence, Place, TransitPack } from "../../../src/contracts";

export const FIXTURE_EVIDENCE: Evidence = {
  sourceIds: ["source_test_fixture"],
  checkedAt: "2026-10-09T21:00:00+08:00",
  reliability: "verified",
  note: "Synthetic unit-test evidence only; prohibited in release.",
};

function place(id: string, name: string, locality: string, kind: Place["kind"], lng: number, aliases: string[] = []): Place {
  return { id, name, aliases, kind, locality, point: { latitude: 0, longitude: lng }, evidence: FIXTURE_EVIDENCE };
}

export const devPack: TransitPack = {
  schemaVersion: "1.0",
  packId: "pack_test_ui",
  version: "test_fixture_1",
  kind: "test_fixture",
  createdAt: "2026-10-09T21:00:00+08:00",
  coverageLabels: ["TEST ONLY synthetic area (not real coverage)"],
  places: [
    place("place_test_a", "TEST ONLY Origin A", "Test Town", "landmark", 0, ["origin a"]),
    place("place_test_b", "TEST ONLY Destination B", "Test Town", "landmark", 0.01, ["destination b"]),
    place("place_test_board", "TEST ONLY Boarding Stop", "Test Town", "boarding_point", 0.001),
    place("place_test_mid", "TEST ONLY Middle Stop", "Test Town", "boarding_point", 0.005),
    place("place_test_alight", "TEST ONLY Alighting Stop", "Test Town", "boarding_point", 0.009),
    place("place_test_mall_north", "TEST ONLY Mall", "North Test City", "landmark", 0.02, ["mall"]),
    place("place_test_mall_south", "TEST ONLY Mall", "South Test City", "landmark", 0.03, ["mall"]),
    place("place_test_none", "TEST ONLY Unconnected Place", "Test Town", "landmark", 0.04),
    place("place_test_constraint", "TEST ONLY Bus-Only Place", "Test Town", "landmark", 0.05),
  ],
  stops: [
    { id: "stop_test_board", placeId: "place_test_board", label: "TEST ONLY Boarding Stop", point: { latitude: 0, longitude: 0.001 }, board: true, alight: true, evidence: FIXTURE_EVIDENCE },
    { id: "stop_test_mid", placeId: "place_test_mid", label: "TEST ONLY Middle Stop", point: { latitude: 0, longitude: 0.005 }, board: true, alight: true, evidence: FIXTURE_EVIDENCE },
    { id: "stop_test_alight", placeId: "place_test_alight", label: "TEST ONLY Alighting Stop", point: { latitude: 0, longitude: 0.009 }, board: false, alight: true, evidence: FIXTURE_EVIDENCE },
  ],
  services: [
    { id: "service_test_001", name: "TEST ONLY Bus Line", mode: "bus", signboardAliases: ["TEST BUS"], evidence: FIXTURE_EVIDENCE },
    { id: "service_test_002", name: "TEST ONLY Jeep Line", mode: "jeepney", signboardAliases: ["TEST JEEP"], evidence: FIXTURE_EVIDENCE },
  ],
  directions: [
    { id: "dir_test_001", serviceId: "service_test_001", headsign: "TEST ONLY Northbound", availability: "documented", availabilityNote: "Synthetic.", evidence: FIXTURE_EVIDENCE },
    { id: "dir_test_001_rev", serviceId: "service_test_001", headsign: "TEST ONLY Southbound", availability: "suspended", availabilityNote: "Synthetic suspended direction.", evidence: FIXTURE_EVIDENCE },
    { id: "dir_test_002", serviceId: "service_test_002", headsign: "TEST ONLY Eastbound", availability: "unknown", availabilityNote: "Synthetic.", evidence: FIXTURE_EVIDENCE },
  ],
  routeStops: [
    { directionId: "dir_test_001", sequence: 1, stopId: "stop_test_board", board: true, alight: false, evidence: FIXTURE_EVIDENCE },
    { directionId: "dir_test_001", sequence: 2, stopId: "stop_test_mid", board: true, alight: true, evidence: FIXTURE_EVIDENCE },
    { directionId: "dir_test_001", sequence: 3, stopId: "stop_test_alight", board: false, alight: true, evidence: FIXTURE_EVIDENCE },
    { directionId: "dir_test_002", sequence: 1, stopId: "stop_test_board", board: true, alight: false, evidence: FIXTURE_EVIDENCE },
    { directionId: "dir_test_002", sequence: 2, stopId: "stop_test_mid", board: false, alight: true, evidence: FIXTURE_EVIDENCE },
  ],
  walkLinks: [
    { id: "walk_test_access", fromPlaceId: "place_test_a", toPlaceId: "place_test_board", meters: 100, steps: ["TEST ONLY walking step."], evidence: FIXTURE_EVIDENCE },
    { id: "walk_test_egress", fromPlaceId: "place_test_alight", toPlaceId: "place_test_b", meters: 100, steps: ["TEST ONLY walking step."], evidence: FIXTURE_EVIDENCE },
  ],
  fares: [
    { id: "fare_test_002", serviceId: "service_test_002", kind: "flat", flatRange: { minCentavos: 1300, maxCentavos: 1500 }, evidence: FIXTURE_EVIDENCE },
    { id: "fare_test_001", serviceId: "service_test_001", kind: "unknown", evidence: FIXTURE_EVIDENCE },
  ],
  sources: [
    {
      id: "source_test_fixture",
      title: "TEST ONLY synthetic fixture",
      publisher: "AlalayByahe tests",
      retrievedAt: "2026-10-09T21:00:00+08:00",
      usageBasis: "Synthetic data for development; not a real source.",
      factsSupported: ["nothing real"],
      checkedBy: "member_3_ui",
    },
  ],
};
