import { readFileSync } from "node:fs";
import { normalizeAlias } from "../src/data/normalize";
import { validatePack } from "../src/data/validatePack";
import { planRoute } from "../src/routing/routePort";
import { defaultPreferences } from "../src/contracts/defaults";
import type { JourneyOption, Mode, Place } from "../src/contracts/index";

/**
 * Plans a trip on the SYNTHETIC Luzon demo pack and prints it.
 * Usage: npx tsx scripts/luzon-demo.ts "Lipa" "Baguio" [--modes bus,van] [--direct] [--student]
 *        npx tsx scripts/luzon-demo.ts --places        (list every demo place)
 * Every route, stop, fare and walk here is invented. This is not transit information.
 */

const BANNER = "*** DEMO DATA, NOT REAL: synthetic routes and fares for testing only ***";
const packResult = validatePack(JSON.parse(readFileSync("tests/fixtures/luzon-demo-pack.json", "utf8")), { target: "development" });
if (!packResult.ok) throw new Error("demo pack is invalid");
const pack = packResult.value;

const find = (text: string): Place => {
  const key = normalizeAlias(text);
  const hits = pack.places.filter((p) => [p.name, ...p.aliases].some((a) => normalizeAlias(a) === key));
  if (hits.length !== 1) throw new Error(hits.length === 0 ? `No demo place matches "${text}". Try --places.` : `"${text}" is ambiguous: ${hits.map((h) => h.name).join("; ")}`);
  return hits[0] as Place;
};
const pesos = (c: number): string => `P${(c / 100).toFixed(2)}`;

const args = process.argv.slice(2);
console.log(BANNER);
if (args.includes("--places")) {
  for (const p of pack.places) console.log(`${p.name}   (also: ${p.aliases.filter((a) => a !== p.name.replace(" (DEMO)", "")).slice(0, 3).join(", ")})`);
  process.exit(0);
}
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--modes");
if (positional.length < 2) throw new Error('Usage: npx tsx scripts/luzon-demo.ts "<from>" "<to>"');
const from = find(positional[0] as string);
const to = find(positional[1] as string);
const modesArg = args[args.indexOf("--modes") + 1];
const prefs = {
  ...defaultPreferences(),
  ...(args.includes("--modes") && modesArg ? { allowedModes: modesArg.split(",") as Mode[] } : {}),
  ...(args.includes("--direct") ? { directOnly: true } : {}),
  ...(args.includes("--student") ? { passenger: "student" as const } : {}),
  maxTransferWalkMeters: 2000, maxAccessWalkMeters: 2000, maxEgressWalkMeters: 2000,
};
const endpoint = (p: Place) => ({ placeId: p.id, label: p.name, point: p.point, provenance: "stored" as const });
const result = planRoute({ queryId: "luzon_demo_cli", origin: endpoint(from), destination: endpoint(to), preferences: prefs }, pack);

console.log(`\n${from.name}  ->  ${to.name}`);
if (!result.ok) {
  console.log(`\nNo journey: ${result.error.code}. ${result.error.message}`);
  process.exit(0);
}
const show = (o: JourneyOption, n: number): void => {
  const fare = o.fare.status === "complete" ? `${pesos(o.fare.knownMinCentavos)}${o.fare.knownMaxCentavos !== o.fare.knownMinCentavos ? ` to ${pesos(o.fare.knownMaxCentavos)}` : ""} total`
    : o.fare.status === "partial" ? `known subtotal ${pesos(o.fare.knownMinCentavos)}, ${o.fare.unknownRideLegs} ride fare(s) unknown (NOT the total)` : "fare unknown";
  console.log(`\nOption ${n}: ${o.transfers} transfer(s), ${o.walkMeters} m walking, ${fare}`);
  console.log(`  ${o.rankReason}`);
  o.legs.forEach((l, i) => {
    if (l.kind === "walk") console.log(`  ${i + 1}. Walk ${l.meters} m  (${l.instructions[0] ?? ""})`);
    else console.log(`  ${i + 1}. ${l.mode.toUpperCase()}: board ${l.boardLabel}, sign "${l.headsign}", get off ${l.alightLabel}`);
  });
};
result.value.options.forEach((o, i) => show(o, i + 1));
console.log(`\n${BANNER}`);
