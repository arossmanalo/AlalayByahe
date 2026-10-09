import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import type { AiPort, Extraction, RawIntent, Result, RouteRequest, TransitPack } from "../../src/contracts";
import { ok } from "../../src/contracts/result";
import { defaultPreferences } from "../../src/contracts/defaults";
import { SqlTransitRepository } from "../../src/storage/transit-repository";
import type { SqlDriver } from "../../src/storage/sql-driver";
import { mini, NOW } from "../routing/helpers";
export { NOW };

export function pack(): TransitPack {
  return mini({ lines: [
    { svc: "bus", mode: "bus", stops: ["a", "b"], fare: { flat: 1000 } },
    { svc: "jeep", mode: "jeepney", stops: ["b", "c"], fare: { unknown: true } },
  ] });
}
export function request(data: TransitPack, from = "a", to = "c", queryId = "query_test"): RouteRequest {
  const endpoint = (name: string) => {
    const place = data.places.find(p => p.id === "place_test_" + name)!;
    return { placeId: place.id, label: place.name, point: { ...place.point }, provenance: "stored" as const };
  };
  return { queryId, origin: endpoint(from), destination: endpoint(to), preferences: defaultPreferences() };
}
export function intent(overrides: Partial<RawIntent> = {}): RawIntent {
  return { kind: "journey", originText: "TEST ONLY a", destinationText: "TEST ONLY c",
    useCurrentLocation: false, allowedModes: null, excludedModes: [], priority: null,
    maxAccessWalkMeters: null, maxTransferWalkMeters: null, maxEgressWalkMeters: null,
    budgetCentavos: null, directOnly: false, ambiguities: [], ...overrides };
}
export function extraction(overrides: Partial<RawIntent> = {}): Extraction {
  return { intent: intent(overrides), engine: { kind: "phone_local", modelId: "test_only",
    modelRevision: "test_only", runtime: "test_only" }, elapsedMs: 1 };
}
export function ai(overrides: Partial<AiPort> = {}): AiPort {
  return { getState: () => ({ phase: "ready", modelId: "test_only" }),
    ensureModel: async () => ok(undefined), initialize: async () => ok(undefined),
    extract: async () => ok(extraction()), cancel: async () => undefined,
    release: async () => undefined, ...overrides };
}
export function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
export function errorCode<T>(result: Result<T>): string {
  if (result.ok) throw new Error("Expected an error");
  return result.error.code;
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
// Real SQLite, isolated under this checkout. It does not establish Expo SQLite
// compatibility or touch an installed user's database.
export function database(path = ":memory:") {
  const native = new DatabaseSync(path);
  let failNextInsert = false;
  const connection = {
    async exec(sql: string) { native.exec(sql); },
    async run(sql: string, parameters: (string | number | null)[] = []) {
      if (failNextInsert && sql.startsWith("INSERT")) {
        failNextInsert = false; throw new Error("SQLITE_FULL");
      }
      native.prepare(sql).run(...parameters);
    },
    async all<T>(sql: string, parameters: (string | number | null)[] = []): Promise<T[]> {
      return native.prepare(sql).all(...parameters) as T[];
    },
  };
  const driver: SqlDriver = { ...connection,
    async transaction(work) {
      native.exec("BEGIN IMMEDIATE");
      try { const result = await work(connection); native.exec("COMMIT"); return result; }
      catch (cause) { native.exec("ROLLBACK"); throw cause; }
    },
    async close() { native.close(); },
  };
  return { native, driver, failInsert: () => { failNextInsert = true; } };
}
export async function repository(data = pack()) {
  const db = database();
  const repo = new SqlTransitRepository(async () => db.driver, { allowTestFixtures: true });
  value(await repo.initialize()); value(await repo.replacePack(data));
  return { repo, ...db };
}
export function testDirectory() {
  const root = resolve(".test-tmp");
  mkdirSync(root, { recursive: true });
  const path = mkdtempSync(resolve(root, "sqlite-"));
  return { path, remove() {
    const rel = relative(root, resolve(path));
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Unsafe test cleanup");
    rmSync(path, { recursive: true, force: true });
  } };
}
