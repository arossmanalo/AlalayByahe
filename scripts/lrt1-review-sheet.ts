import { readFileSync } from "node:fs";

/**
 * Prints a checklist for the independent reviewer of data/candidates/lrt1-candidate.json.
 * Usage: npx tsx scripts/lrt1-review-sheet.ts [seed]
 * The reviewer compares each printed value with the official LRMC stored value matrix image
 * (the image titled "New LRT-1 Stored Value Fare Matrix", served at the file name containing SJT).
 */

interface PackLike {
  places: { id: string; name: string; point: { latitude: number; longitude: number } }[];
  fares: { matrix: { fromStopId: string; toStopId: string; centavos: number }[] }[];
  directions: { id: string; headsign: string }[];
}

const pack = JSON.parse(readFileSync("data/candidates/lrt1-candidate.json", "utf8")) as PackLike;
const seed = Number(process.argv[2] ?? 20261010);

let state = seed >>> 0;
const rand = (): number => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
};

const names = pack.places.map((p) => p.name.replace(" Station", ""));
const stopFor = (i: number): string => `stop_lrt1_${(pack.places[i] as { id: string }).id.replace("place_lrt1_", "")}`;
const matrix = pack.fares[0]!.matrix;
const fare = (a: number, b: number): number =>
  matrix.find((m) => m.fromStopId === stopFor(a) && m.toStopId === stopFor(b))!.centavos / 100;

console.log("# LRT-1 candidate review sheet\n");
console.log("Image: https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SJT-fare-matrix-effective-April-2-2025-1.png");
console.log('Check the title says "Stored Value" and "Effective April 2, 2025". Fares below are pesos, row station to column station.\n');

console.log("## 1. Station order (south to north) must equal the image's row order\n");
names.forEach((n, i) => console.log(`${String(i + 1).padStart(2)}. ${n}`));

const full = (label: string): void => {
  const i = names.findIndex((n) => n.startsWith(label));
  console.log(`\n## Full row: ${names[i]}\n`);
  console.log(names.map((n, j) => `${n}: ${i === j ? "16 (same station)" : fare(i, j)}`).join("\n"));
};
full("Vito Cruz");
full("EDSA");

console.log("\n## 2. Four corners and 20 random pairs\n");
const picks: [number, number][] = [[0, names.length - 1], [names.length - 1, 0], [0, 1], [names.length - 2, names.length - 1]];
while (picks.length < 24) {
  const a = Math.floor(rand() * names.length);
  const b = Math.floor(rand() * names.length);
  if (a !== b && !picks.some(([x, y]) => x === a && y === b)) picks.push([a, b]);
}
picks.forEach(([a, b], k) => console.log(`${String(k + 1).padStart(2)}. ${names[a]} -> ${names[b]}: ${fare(a, b)}   [ ] matches`));

console.log("\n## 3. Coordinates (open each on a map; must be within about 200 m of the station)\n");
for (const label of ["Baclaran", "EDSA", "Vito Cruz", "Pedro Gil", "Fernando Poe Jr."]) {
  const p = pack.places.find((x) => x.name.startsWith(label))!;
  console.log(`${p.name}: https://www.openstreetmap.org/?mlat=${p.point.latitude}&mlon=${p.point.longitude}#map=18/${p.point.latitude}/${p.point.longitude}   [ ] ok`);
}

console.log("\n## 4. Directions\n");
for (const d of pack.directions) console.log(`${d.id}: headsign "${d.headsign}"   [ ] matches the LRMC route map`);

console.log("\nReviewer name: ____________   Date: ____________   Disagreements: ____________");
