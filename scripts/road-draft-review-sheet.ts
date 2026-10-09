import { readFileSync } from "node:fs";

/**
 * Prints a one-page review sheet for data/candidates/roads-draft.json.
 * Usage: npx tsx scripts/road-draft-review-sheet.ts
 * A teammate who has ridden or can confirm each leg ticks it. Anything unticked is left out
 * of the shipped pack. Nothing here is verified until a person says so.
 */

interface P { id: string; name: string; point: { latitude: number; longitude: number } }
interface Pack {
  places: P[];
  stops: { id: string; placeId: string }[];
  services: { id: string; name: string; mode: string }[];
  directions: { id: string; serviceId: string; headsign: string }[];
  routeStops: { directionId: string; sequence: number; stopId: string }[];
  walkLinks: { id: string; fromPlaceId: string; toPlaceId: string; meters: number; steps: string[] }[];
  fares: { serviceId: string; flatCentavos?: number }[];
}
const pack = JSON.parse(readFileSync("data/candidates/roads-draft.json", "utf8")) as Pack;
const place = (id: string): P => pack.places.find((p) => p.id === id)!;
const link = (p: P): string => `https://www.google.com/maps?q=${p.point.latitude},${p.point.longitude}`;
const stopPlace = (stopId: string): P => place(pack.stops.find((s) => s.id === stopId)!.placeId);

const LRT = /^place_lrt1_/;
console.log("# Road routes review sheet (draft, unverified)\n");
console.log("Tick each leg only if it matches what your team actually rode. Untick or cross out anything wrong.\n");

console.log("## Rides\n");
for (const d of pack.directions.filter((x) => !x.id.startsWith("dir_lrt1_"))) {
  const service = pack.services.find((s) => s.id === d.serviceId)!;
  const [a, b] = pack.routeStops.filter((r) => r.directionId === d.id).sort((x, y) => x.sequence - y.sequence);
  const from = stopPlace(a!.stopId);
  const to = stopPlace(b!.stopId);
  const fare = pack.fares.find((f) => f.serviceId === d.serviceId)?.flatCentavos;
  console.log(`- [ ] **${service.name}** (${service.mode}), signboard "${d.headsign}", regular fare P${(fare ?? 0) / 100}`);
  console.log(`  - Board: ${from.name}  ${link(from)}`);
  console.log(`  - Get off: ${to.name}  ${link(to)}`);
}

console.log("\n## Walks (computed on OpenStreetMap data; nobody has walked them)\n");
for (const w of pack.walkLinks.filter((x) => !LRT.test(x.fromPlaceId) || !LRT.test(x.toPlaceId))) {
  const from = place(w.fromPlaceId);
  const to = place(w.toPlaceId);
  console.log(`- [ ] **${from.name} to ${to.name}**, about ${w.meters} m`);
  for (const s of w.steps) console.log(`  - ${s}`);
}

console.log("\n## Known doubts\n");
console.log("- [ ] The Fairview bus is reported to board at PITX Gate 9. The PITX page (9 Oct 2026) lists no routes for Gate 9, so the gate is not in the data. Does the Fairview bus really go along Taft Avenue past Vito Cruz?");
console.log("- [ ] The Candelaria jeep's signboard is recorded as \"Candelaria\" (inferred). What does it actually say?");
console.log("- [ ] Student fares are NOT in the data (the reported amounts do not follow one fixed discount).");
console.log("- [ ] Only the reported direction is included. Return trips are not.");
console.log("\nReviewer name: ____________   Date: ____________   Legs to remove: ____________");
