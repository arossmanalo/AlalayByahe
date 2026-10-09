import type { Place, ResolveResult, Result, TransitPack, TransitRepository } from "../contracts";
import { fail, ok, storageFailure } from "../contracts/result";
import { validateTransitPack } from "../contracts/validators";
import { normalizePlaceText, resolveStoredPlaces } from "./place-search";
import { SCHEMA } from "./schema";
import type { SqlConnection, SqlDriver } from "./sql-driver";

type PayloadRow = Record<string, unknown> & { payload_json: string };
const TABLES = ["sources", "places", "stops", "services", "directions", "route_stops", "walk_links", "fare_policies"] as const;

export class SqlTransitRepository implements TransitRepository {
  private db: SqlDriver | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  constructor(
    private readonly open: () => Promise<SqlDriver>,
    private readonly options: { allowTestFixtures?: boolean } = {},
  ) {}
  // All operations use one private connection and the same queue. Readers cannot
  // join or observe the middle of an asynchronous pack replacement transaction.
  private queue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.tail.then(work, work);
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  private async integrity(connection: SqlConnection): Promise<void> {
    const checks = await connection.all<{ integrity_check: string }>("PRAGMA integrity_check");
    if (checks.length !== 1 || checks[0]?.integrity_check !== "ok") throw new Error("SQLite integrity failure");
    if ((await connection.all("PRAGMA foreign_key_check")).length) throw new Error("SQLite foreign key failure");
  }
  private async readPack(): Promise<Result<TransitPack>> {
    if (!this.db) return fail("DATA_NOT_READY", "Transit storage is not initialized.", true);
    const metadata = await this.db.all<{ value: string }>("SELECT value FROM metadata WHERE key = ?", ["header"]);
    if (!metadata[0]) return fail("DATA_NOT_READY", "No verified transit pack is installed.", false);
    const header: unknown = JSON.parse(metadata[0].value);
    if (!header || typeof header !== "object" || Array.isArray(header)) return fail("DATA_INVALID", "Invalid pack header.");
    const collected: Record<string, unknown> = { ...header };
    const storedMetadata = await this.db.all<{ key: string; value: string }>("SELECT key, value FROM metadata");
    for (const key of ["schemaVersion", "packId", "version", "kind"]) {
      if (storedMetadata.find(row => row.key === key)?.value !== collected[key]) throw new Error("Pack metadata mismatch");
    }
    const keys = ["sources", "places", "stops", "services", "directions", "routeStops", "walkLinks", "fares"];
    for (let i = 0; i < TABLES.length; i++) {
      const table = TABLES[i]!, key = keys[i]!;
      const order = table === "route_stops" ? "direction_id, sequence" : "id";
      collected[key] = (await this.db.all<PayloadRow>("SELECT * FROM " + table + " ORDER BY " + order))
        .map(row => {
          const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
          const point = payload.point as Record<string, unknown> | undefined;
          const fields: Record<string, unknown> = table === "route_stops"
            ? { direction_id: payload.directionId, sequence: payload.sequence, stop_id: payload.stopId }
            : { id: payload.id };
          if (table === "places") Object.assign(fields, { name: payload.name, locality: payload.locality, latitude: point?.latitude, longitude: point?.longitude });
          if (table === "stops") fields.place_id = payload.placeId;
          if (table === "services") fields.mode = payload.mode;
          if (table === "directions" || table === "fare_policies") fields.service_id = payload.serviceId;
          if (table === "walk_links") Object.assign(fields, { from_place_id: payload.fromPlaceId, to_place_id: payload.toPlaceId, meters: payload.meters });
          if (Object.entries(fields).some(([column, value]) => row[column] !== value)) throw new Error("Pack row/index mismatch");
          return payload;
        });
    }
    const validated = validateTransitPack(collected, this.options);
    if (!validated.ok) return validated;
    const expectedAliases = validated.value.places.flatMap(p =>
      [...new Set([p.name, ...p.aliases].map(normalizePlaceText).filter(Boolean))].map(label => [p.id, label].join(":")),
    ).sort();
    const actualAliases = (await this.db.all<{ place_id: string; normalized: string }>("SELECT place_id, normalized FROM aliases"))
      .map(row => [row.place_id, row.normalized].join(":")).sort();
    if (JSON.stringify(actualAliases) !== JSON.stringify(expectedAliases)) throw new Error("Pack alias index mismatch");
    return validated;
  }
  initialize(): Promise<Result<void>> {
    return this.queue(async () => {
      this.closed = false;
      try {
        this.db ??= await this.open();
        await this.db.exec(SCHEMA);
        await this.integrity(this.db);
        const version = await this.db.all<{ value: string }>("SELECT value FROM metadata WHERE key = ?", ["schemaVersion"]);
        if (version[0] && version[0].value !== "1.0") return fail("DATA_INVALID", "Unsupported transit schema version.");
        const existing = await this.readPack();
        return existing.ok || existing.error.code === "DATA_NOT_READY" ? ok(undefined) : existing;
      } catch (cause) { return storageFailure(cause); }
    });
  }
  getPack(): Promise<Result<TransitPack>> {
    return this.queue(async () => {
      try { return await this.readPack(); }
      catch (cause) { return storageFailure(cause); }
    });
  }
  getPlace(id: string): Promise<Result<Place>> {
    return this.queue(async () => {
      try {
        const pack = await this.readPack();
        if (!pack.ok) return pack;
        const place = pack.value.places.find(p => p.id === id);
        return place ? ok(place) : fail("PLACE_NOT_FOUND", "Choose a stored place.", false, { field: "placeId" });
      } catch (cause) { return storageFailure(cause); }
    });
  }
  resolvePlace(text: string): Promise<Result<ResolveResult>> {
    return this.queue(async () => {
      if (!text.trim() || text.length > 600) return fail("INVALID_INPUT", "Enter a short place name.");
      try {
        const pack = await this.readPack();
        if (!pack.ok) return pack;
        // Pack size is bounded. Exact/alias/fuzzy resolution is deterministic and
        // preserves branch ambiguity; no fuzzy result is selected automatically.
        return ok(resolveStoredPlaces(text, pack.value.places));
      } catch (cause) { return storageFailure(cause); }
    });
  }
  replacePack(pack: TransitPack): Promise<Result<void>> {
    const validated = validateTransitPack(pack, this.options);
    if (!validated.ok) return Promise.resolve(validated);
    // Snapshot synchronously before any await; callers cannot mutate pending import.
    const snapshot: TransitPack = JSON.parse(JSON.stringify(validated.value));
    return this.queue(async () => {
      if (!this.db || this.closed) return fail("DATA_NOT_READY", "Initialize storage before installing data.", true);
      try {
        await this.db.transaction(async connection => {
          for (const table of ["aliases", "route_stops", "walk_links", "fare_policies", "directions", "stops", "services", "places", "sources", "metadata"]) {
            await connection.exec("DELETE FROM " + table);
          }
          const { sources, places, stops, services, directions, routeStops, walkLinks, fares, ...header } = snapshot;
          const meta: Record<string, string> = {
            header: JSON.stringify(header), schemaVersion: snapshot.schemaVersion,
            packId: snapshot.packId, version: snapshot.version, kind: snapshot.kind,
          };
          for (const [key, value] of Object.entries(meta)) await connection.run("INSERT INTO metadata(key,value) VALUES (?,?)", [key, value]);
          for (const row of sources) await connection.run("INSERT INTO sources(id,payload_json) VALUES (?,?)", [row.id, JSON.stringify(row)]);
          for (const row of places) {
            await connection.run("INSERT INTO places(id,name,locality,latitude,longitude,payload_json) VALUES (?,?,?,?,?,?)",
              [row.id, row.name, row.locality, row.point.latitude, row.point.longitude, JSON.stringify(row)]);
            for (const label of new Set([row.name, ...row.aliases].map(normalizePlaceText).filter(Boolean))) {
              await connection.run("INSERT INTO aliases(place_id,normalized) VALUES (?,?)", [row.id, label]);
            }
          }
          for (const row of stops) await connection.run("INSERT INTO stops(id,place_id,payload_json) VALUES (?,?,?)", [row.id, row.placeId, JSON.stringify(row)]);
          for (const row of services) await connection.run("INSERT INTO services(id,mode,payload_json) VALUES (?,?,?)", [row.id, row.mode, JSON.stringify(row)]);
          for (const row of directions) await connection.run("INSERT INTO directions(id,service_id,payload_json) VALUES (?,?,?)", [row.id, row.serviceId, JSON.stringify(row)]);
          for (const row of routeStops) await connection.run("INSERT INTO route_stops(direction_id,sequence,stop_id,payload_json) VALUES (?,?,?,?)",
            [row.directionId, row.sequence, row.stopId, JSON.stringify(row)]);
          for (const row of walkLinks) await connection.run("INSERT INTO walk_links(id,from_place_id,to_place_id,meters,payload_json) VALUES (?,?,?,?,?)",
            [row.id, row.fromPlaceId, row.toPlaceId, row.meters, JSON.stringify(row)]);
          for (const row of fares) await connection.run("INSERT INTO fare_policies(id,service_id,payload_json) VALUES (?,?,?)", [row.id, row.serviceId, JSON.stringify(row)]);
          await this.integrity(connection);
        });
        return ok(undefined);
      } catch (cause) { return storageFailure(cause); }
    });
  }
  close(): Promise<void> {
    return this.queue(async () => {
      this.closed = true;
      const db = this.db; this.db = null;
      await db?.close();
    });
  }
}
