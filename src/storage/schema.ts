// Static SQL only. All runtime values are bound by the repository.
export const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, locality TEXT NOT NULL,
  latitude REAL NOT NULL, longitude REAL NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS aliases (
  place_id TEXT NOT NULL REFERENCES places(id), normalized TEXT NOT NULL,
  PRIMARY KEY (place_id, normalized)
);
CREATE INDEX IF NOT EXISTS aliases_normalized ON aliases(normalized);
CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY NOT NULL, place_id TEXT NOT NULL REFERENCES places(id),
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('van','jeepney','bus','tricycle','lrt')),
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS directions (
  id TEXT PRIMARY KEY NOT NULL, service_id TEXT NOT NULL REFERENCES services(id),
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS route_stops (
  direction_id TEXT NOT NULL REFERENCES directions(id),
  sequence INTEGER NOT NULL CHECK(sequence >= 0),
  stop_id TEXT NOT NULL REFERENCES stops(id), payload_json TEXT NOT NULL,
  PRIMARY KEY (direction_id, sequence)
);
CREATE INDEX IF NOT EXISTS route_stops_stop ON route_stops(stop_id);
CREATE TABLE IF NOT EXISTS walk_links (
  id TEXT PRIMARY KEY NOT NULL,
  from_place_id TEXT NOT NULL REFERENCES places(id),
  to_place_id TEXT NOT NULL REFERENCES places(id),
  meters INTEGER NOT NULL CHECK(meters >= 0), payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fare_policies (
  id TEXT PRIMARY KEY NOT NULL, service_id TEXT NOT NULL REFERENCES services(id),
  payload_json TEXT NOT NULL
);
`;

