# Shared Integration Contract v1.0 — proposed for approval

Status: architecture selected; implementation not started. Once approved, Member 4 (the user) owns changes. This is a plan, not executable source already delivered.

## 1. Stack and model
| Component | Planning pin | Purpose |
|---|---|---|
| Node / npm | 24.14.0 / 11.9.0 available locally | Toolchain; standardize team Node major |
| Expo / React Native / React | 57.0.27 / 0.86.3 / 19.2.3 | Native Android and iOS |
| expo-router | 57.0.25 | Native screen navigation |
| expo-file-system / expo-sqlite | 57.0.7 / 57.0.4 | Private model storage and local transit database |
| expo-location | 57.0.20 | Foreground position, optional permission |
| expo-build-properties | 57.0.22 | Native build configuration |
| expo-dev-client | 57.0.19 | Development only; demo uses installed release build |
| llama.rn | 0.12.9 | Native llama.cpp inference |
| TypeScript / @types/react | 6.0.3 / 19.2.2 | Expo template aligned type checks |
| tsx | 4.23.15 | Pure TypeScript tests with Node node:test |
| @noble/hashes | 2.4.0 | Bounded incremental SHA256, MIT |

These are proposed exact starting versions from official SDK57 mappings and tagged releases, not an installed lockfile. Member 4 installs once, resolves Expo-required navigation dependencies with expo install, checks expo-doctor, and commits the lockfile. No member independently upgrades dependencies. Expo 57 with llama.rn0.12.9 is **unverified as a combination**; the llama example uses RN0.82.0. Both native builds and real inference must pass the first gate. If it fails, Member 4 and Member 1 select a documented compatible Expo/RN pair, update contract v1.1 and every branch before continuing. Never assume wildcard peer dependencies prove compatibility.

Sources: [Expo SDK57](https://docs.expo.dev/versions/latest/), [official native package mapping](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json), [template](https://raw.githubusercontent.com/expo/expo/sdk-57/templates/expo-template-default/package.json), [llama.rn tagged release](https://github.com/mybigday/llama.rn/releases/tag/v0.12.9), [tsx release](https://github.com/privatenumber/tsx/releases/tag/v4.23.15).

Primary model: **Qwen/Qwen2.5-0.5B-Instruct-GGUF**, Apache-2.0, Q4_K_M.
- Revision: `9217f5db79a29953eb74d5343926648285ec7e67`
- File: `qwen2.5-0.5b-instruct-q4_k_m.gguf`
- Bytes: `491400032` (491.4 MB decimal)
- SHA256: `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`
- Pinned download: `https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf`

Accuracy upgrade candidate only after measurement: **Qwen/Qwen2.5-1.5B-Instruct-GGUF**, Apache-2.0, Q4_K_M; revision `91cad51170dc346986eccefdc2dd33a9da36ead9`; file `qwen2.5-1.5b-instruct-q4_k_m.gguf`; bytes `1117320736`; SHA256 `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`. Do not download both by default.

File bytes are not runtime RAM. Peak memory, cold initialization, Taglish accuracy and speed are **not measured yet**. Initial engineering settings: CPU baseline, context 2048, output limit 256 tokens, temperature 0; one inference at a time. Metal acceleration is an iPhone experiment after correctness; Android OpenCL/NPU is deferred. No fine-tuning.

Sources: [0.5B publisher revision](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/commit/9217f5db79a29953eb74d5343926648285ec7e67), [1.5B publisher revision](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/tree/91cad51170dc346986eccefdc2dd33a9da36ead9).

## 2. Repository and ownership
```text
app/                         # Member 3 screens; Member 4 owns _layout.tsx
src/contracts/index.ts       # Member 4, frozen v1.0
src/contracts/validators.ts  # Member 4
src/ai/                      # Member 1
src/routing/                 # Member 2, pure TypeScript
src/data/                    # Member 2 schemas/import/validation
src/storage/                 # Member 4 SQLite/files adapters
src/application/             # Member 4 orchestration and dependency wiring
src/ui/                      # Member 3 components/theme/presentation
src/network/                 # Member 4 optional geocode/walk adapter
assets/data/                 # Member 2 verified release pack only
tests/ai/                    # Member 1
tests/routing/               # Member 2
tests/ui/                    # Member 3 fixtures and manual scripts
tests/integration/           # Member 4
tests/fixtures/              # explicit synthetic test packs, release-excluded
scripts/                     # Member 4 checks; Member 2 data validator by agreement
services/geo-proxy/          # Member 4 optional Cloudflare Worker
docs/evidence/               # anonymized measurements, data provenance
docs/planning/               # this approved planning package
app.config.ts, package.json, package-lock.json, tsconfig.json,
.gitignore, android/, ios/   # Member 4; Member 1 native edits coordinated
```
No model binaries, API keys, .env contents, signing profiles, private device identifiers or personal journey logs in Git. Native folders are generated and kept consistent by Member 4; choose one prebuild strategy and document it. Resolve imports from contracts with explicit relative imports initially; do not invent conflicting aliases.

Use lower_snake_case stable IDs, lowercase modes and ISO 8601 timestamps with timezone. Prefix IDs by entity: `place_`, `stop_`, `service_`, `dir_`, `walk_`, `fare_`, `source_`; never use an array index as ID. A service is a published/verified route, not a live vehicle trip. Direction is explicit; a reverse direction is a separate record. A landmark is not automatically a legal boarding stop.

## 3. Shared TypeScript types
```ts
export const CONTRACT_VERSION = "1.0" as const;
export type Mode = "van" | "jeepney" | "bus" | "tricycle" | "lrt";
export type Locale = "en" | "fil" | "taglish";
export type Priority = "nearest_useful" | "fewest_transfers" | "lowest_known_fare";
export type Reliability = "verified" | "estimated" | "unknown";
export type ErrorCode =
  | "AI_NOT_READY" | "AI_INIT_FAILED" | "AI_INVALID_OUTPUT" | "AI_TIMEOUT"
  | "CANCELLED" | "INVALID_INPUT" | "NEEDS_CLARIFICATION"
  | "PLACE_NOT_FOUND" | "OUTSIDE_COVERAGE" | "NO_VERIFIED_JOURNEY"
  | "CONSTRAINT_UNSATISFIED" | "SEARCH_LIMIT_REACHED"
  | "DATA_NOT_READY" | "DATA_INVALID" | "STORAGE_FULL"
  | "NETWORK_UNAVAILABLE" | "NETWORK_LIMIT" | "PERMISSION_DENIED";
export interface AppError {
  code: ErrorCode; message: string; retryable: boolean;
  detail?: { field?: string; candidateIds?: string[]; missingConnection?: string };
}
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };
export interface Point { latitude: number; longitude: number }
export interface Evidence {
  sourceIds: string[]; checkedAt: string;
  reliability: Reliability; note?: string;
}
export interface SourceRef {
  id: string; title: string; url?: string;
  publisher: string; publishedAt?: string; retrievedAt: string;
  usageBasis: string; factsSupported: string[];
  checkedBy: string; note?: string;
}
export interface Place {
  id: string; name: string; aliases: string[];
  kind: "landmark" | "terminal" | "station" | "address" | "boarding_point";
  locality: string; point: Point; evidence: Evidence;
}
export interface Stop {
  id: string; placeId: string; label: string;
  point: Point; board: boolean; alight: boolean;
  evidence: Evidence;
}
export interface Service {
  id: string; name: string; mode: Mode;
  signboardAliases: string[]; evidence: Evidence;
}
export interface Direction {
  id: string; serviceId: string; headsign: string;
  availability: "documented" | "unknown" | "suspended";
  availabilityNote: string; evidence: Evidence;
}
export interface RouteStop {
  directionId: string; sequence: number; stopId: string;
  board: boolean; alight: boolean; evidence: Evidence;
}
export interface WalkLink {
  id: string; fromPlaceId: string; toPlaceId: string;
  meters: number; steps: string[]; evidence: Evidence;
  // Directed pedestrian path; reverse requires its own evidence.
}
export interface FarePolicy {
  id: string; serviceId: string;
  kind: "flat" | "matrix" | "distance" | "unknown";
  validFrom?: string; validTo?: string; evidence: Evidence;
  // Pesos stored as integer centavos.
  flatCentavos?: number;
  flatRange?: { minCentavos: number; maxCentavos: number };
  matrix?: { fromStopId: string; toStopId: string; centavos: number }[];
  distanceRule?: {
    baseCentavos: number; includedMeters: number;
    incrementMeters: number; incrementCentavos: number;
    verifiedSegmentMeters: { directionId: string; fromStopId: string;
      toStopId: string; meters: number }[];
  };
  discountRules?: {
    passenger: "student" | "senior" | "pwd";
    numerator: number; denominator: number; rounding: "floor" | "ceil" | "nearest";
    evidence: Evidence;
  }[];
}
export interface TransitPack {
  schemaVersion: "1.0"; packId: string; version: string;
  kind: "release" | "test_fixture"; createdAt: string;
  coverageLabels: string[];
  places: Place[]; stops: Stop[]; services: Service[];
  directions: Direction[]; routeStops: RouteStop[];
  walkLinks: WalkLink[]; fares: FarePolicy[]; sources: SourceRef[];
}
export interface RawIntent {
  kind: "journey" | "onboard" | "unrelated";
  originText: string | null; destinationText: string | null;
  useCurrentLocation: boolean;
  allowedModes: Mode[] | null; excludedModes: Mode[];
  priority: Priority | null;
  maxAccessWalkMeters: number | null;
  maxTransferWalkMeters: number | null;
  maxEgressWalkMeters: number | null;
  budgetCentavos: number | null;
  directOnly: boolean;
  ambiguities: string[];
}
export interface ExtractInput {
  queryId: string; text: string; locale: Locale;
  // Context is advisory; it never silently replaces explicit user words.
  knownPlaceLabels: string[];
}
export interface Extraction {
  intent: RawIntent;
  engine: { kind: "phone_local" | "laptop_local"; modelId: string;
    modelRevision: string; runtime: string };
  elapsedMs: number;
}
export interface ResolvedEndpoint {
  placeId: string; label: string; point: Point;
  // Arbitrary coordinate endpoints need verified/online walking links before routing.
  provenance: "stored" | "gps" | "online";
}
export interface OnboardContext {
  directionId: string;
  confirmedNextStopId: string;
  confirmedAt: string;
  // A manually confirmed next legal alighting stop in this direction.
  // No prediction that a bus is here or will arrive now.
}
export interface JourneyPreferences {
  allowedModes: Mode[]; priority: Priority;
  maxAccessWalkMeters: number; maxTransferWalkMeters: number;
  maxEgressWalkMeters: number; directOnly: boolean;
  budgetCentavos: number | null;
  passenger: "regular" | "student" | "senior" | "pwd";
}
export interface RouteRequest {
  queryId: string; origin: ResolvedEndpoint; destination: ResolvedEndpoint;
  preferences: JourneyPreferences; onboard?: OnboardContext;
}
export interface FareQuote {
  status: Reliability; minCentavos: number | null; maxCentavos: number | null;
  sourceIds: string[]; basis: string;
}
export interface WalkLeg {
  kind: "walk"; linkId: string; fromPlaceId: string; toPlaceId: string;
  meters: number; instructions: string[]; evidence: Evidence;
}
export interface RideLeg {
  kind: "ride"; serviceId: string; directionId: string; mode: Mode;
  serviceName: string; headsign: string; boardStopId: string; alightStopId: string;
  boardLabel: string; alightLabel: string;
  alreadyOnboard: boolean; fare: FareQuote; evidence: Evidence;
}
export type JourneyLeg = WalkLeg | RideLeg;
export interface JourneyOption {
  id: string; legs: JourneyLeg[]; transfers: number; walkMeters: number;
  fare: { status: "complete" | "partial" | "unknown";
    knownMinCentavos: number; knownMaxCentavos: number;
    unknownRideLegs: number; sourceIds: string[] };
  rankReason: string; warnings: string[]; datasetVersion: string;
}
export interface RouteResult {
  queryId: string; options: JourneyOption[];
  coverageWarnings: string[];
  // Empty options is an error, never an apparently successful complete journey.
}
export interface PlaceCandidate {
  place: Place; match: "exact" | "alias" | "fuzzy";
}
export interface ResolveResult {
  candidates: PlaceCandidate[];
  needsConfirmation: boolean;
}
export type ModelState =
  | { phase: "absent" | "downloading" | "checking" | "initializing";
      progress: number | null }
  | { phase: "ready"; modelId: string }
  | { phase: "failed"; error: AppError };
export interface ModelManifest {
  id: string; revision: string; filename: string; bytes: number;
  sha256: string; license: string; url: string;
}
export interface AiPort {
  getState(): ModelState;
  ensureModel(onProgress: (state: ModelState) => void): Promise<Result<void>>;
  initialize(): Promise<Result<void>>;
  extract(input: ExtractInput): Promise<Result<Extraction>>;
  cancel(queryId: string): Promise<void>;
  release(): Promise<void>;
}
export interface TransitRepository {
  initialize(): Promise<Result<void>>;
  getPack(): Promise<Result<TransitPack>>;
  resolvePlace(text: string): Promise<Result<ResolveResult>>;
  getPlace(id: string): Promise<Result<Place>>;
  replacePack(pack: TransitPack): Promise<Result<void>>;
  close(): Promise<void>;
}
export interface RoutePort {
  plan(request: RouteRequest, pack: TransitPack): Promise<Result<RouteResult>>;
}
export interface GeoPort {
  searchAddress(text: string): Promise<Result<PlaceCandidate[]>>;
  getWalk(from: Place, to: Place): Promise<Result<WalkLink>>;
}
export interface JourneyDraft {
  queryId: string; extraction: Extraction;
  originCandidates: PlaceCandidate[]; destinationCandidates: PlaceCandidate[];
  preferences: JourneyPreferences;
  missingFields: ("origin" | "destination" | "onboard_context")[];
  warnings: string[]; requiresConfirmation: true;
}
export interface JourneyController {
  interpret(input: ExtractInput): Promise<Result<JourneyDraft>>;
  // AI fields are always shown for confirmation before route computation.
  submitConfirmed(request: RouteRequest): Promise<Result<RouteResult>>;
  submitManual(request: RouteRequest): Promise<Result<RouteResult>>;
  cancel(queryId: string): Promise<void>;
}
```

Defaults: all five modes, nearest_useful ranking, access/egress 1000 m, transfer walking 500 m adjustable, regular passenger, no budget, directOnly false. A preference is strict when explicitly stated. All walk fields mean real pedestrian distance, not straight-line distance. Optional online adapters register their SourceRef records and temporary endpoint/walk records in a validated working pack snapshot before planning; no dangling source/place IDs. Save a path for later offline use only with the user's action/consent, preserving provider attribution. No artificial transfer-count cap. Onboard transfers count each switch to another service; pre-trip transfers = max(0, ride boardings - 1). Splitting the same service across graph edges is not a new boarding. Existing-ride fare remains unknown unless supported; do not treat it as zero or automatically already paid.

## 4. Runtime validation and extraction schema

All external JSON, including model text and downloaded packs, is untrusted. Implement validators once in src/contracts/validators.ts. Return typed Result errors, not exceptions across module boundaries. The raw extraction JSON Schema is object, additionalProperties false, all RawIntent keys required; nullable strings/numbers are explicit null; modes/priority/kind are enums; nonnegative integer centavos and meters; ambiguities array of strings. App limits: text 600 characters, place labels max 30, output 256 tokens initially. If output truncates at that limit, reject it; adjust measured token budget centrally rather than accept partial JSON.

Canonical RawIntent JSON Schema (use the same object for grammar and validation):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "kind",
    "originText",
    "destinationText",
    "useCurrentLocation",
    "allowedModes",
    "excludedModes",
    "priority",
    "maxAccessWalkMeters",
    "maxTransferWalkMeters",
    "maxEgressWalkMeters",
    "budgetCentavos",
    "directOnly",
    "ambiguities"
  ],
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "journey",
        "onboard",
        "unrelated"
      ]
    },
    "originText": {
      "type": [
        "string",
        "null"
      ]
    },
    "destinationText": {
      "type": [
        "string",
        "null"
      ]
    },
    "useCurrentLocation": {
      "type": "boolean"
    },
    "allowedModes": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "van",
              "jeepney",
              "bus",
              "tricycle",
              "lrt"
            ]
          },
          "uniqueItems": true
        }
      ]
    },
    "excludedModes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "van",
          "jeepney",
          "bus",
          "tricycle",
          "lrt"
        ]
      },
      "uniqueItems": true
    },
    "priority": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "string",
          "enum": [
            "nearest_useful",
            "fewest_transfers",
            "lowest_known_fare"
          ]
        }
      ]
    },
    "maxAccessWalkMeters": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "maxTransferWalkMeters": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "maxEgressWalkMeters": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "budgetCentavos": {
      "type": [
        "integer",
        "null"
      ],
      "minimum": 0
    },
    "directOnly": {
      "type": "boolean"
    },
    "ambiguities": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}
```

llama.rn0.12.9 invocation uses `response_format: { type: "json_schema", json_schema: { schema: extractionSchema } }`. Completion returns string fields, not parsed RawIntent. JSON.parse, structural validation, truncation/context/interruption checks, then semantic validation. Schema grammar can enforce syntax, **not correct place roles or understanding**. Do not display model-generated travel instructions or peso amounts.

Example desired extraction (illustration, not an executed inference):
```json
{
  "kind": "journey", "originText": "Lipa", "destinationText": "San Pablo",
  "useCurrentLocation": false, "allowedModes": null, "excludedModes": ["bus"],
  "priority": "fewest_transfers", "maxAccessWalkMeters": null,
  "maxTransferWalkMeters": null, "maxEgressWalkMeters": null,
  "budgetCentavos": null, "directOnly": false, "ambiguities": []
}
```
Input: “From Lipa to San Pablo, ayoko bus, konting lipat sana.”
Contradictory mode constraints, reversed origin/destination uncertainty, unrelated text, missing origin or destination, and fuzzy/multiple-branch place matches require confirmation. “Uwi” without a user-selected home is unresolved. AI-supplied latitude, route IDs and fares are never trusted because they are not output fields.

Repository example: resolvePlace("San Pablo") returns explicit candidates; an exact place match may be chosen only if unique and scoped. Names with multiple localities/branches return needsConfirmation true.
Routing example: a synthetic test request using place_test_a and place_test_b may return three ordered legs (walk, ride, walk), transfers 0 and fare partial if the ride fare is unknown. The fixture is marked kind test_fixture. This is not evidence of a provincial journey.
Failure example:
```json
{"ok":false,"error":{"code":"NO_VERIFIED_JOURNEY","message":"No verified complete journey available.","retryable":false,"detail":{"missingConnection":"Selected places have no validated connecting service."}}}
```
GeoPort returns source-attributed address candidates or directed walking paths with meters and instructions; a geocoded coordinate alone is not a walk path or valid boarding point.
AI unavailable example: AI_NOT_READY offers manual origin/destination/preferences, which calls submitManual with the same RouteRequest.

## 5. Deterministic routing and fares

Build an expanded directed graph using places/stops, service direction and ordered stop sequence. Boarding is permitted only when stop AND route-stop board flags are true; alighting likewise. Generate a ride transition between two stops only in increasing sequence, with evidence of service connection. Walk transitions require directed WalkLink evidence. Boarding and transfers update state; do not charge per adjacent ride edge.

Use nonnegative multicriteria label-setting search: state includes stop/place and active service direction; labels record transfers, walking distance, and fare completeness/cost. Pareto prune dominated labels; deduplicate equivalent journeys; return at most three distinct options. Search has a computation guard (proposed 10,000 labels), not a transfer cap; exhaustion returns SEARCH_LIMIT_REACHED, never “no route.” Cycles cannot improve a label. For nearest_useful, choose the shortest **feasible access walk** among complete valid paths, then fewer transfers, egress walk, total walk; do not choose a nearby disconnected terminal. For fewest_transfers, transfers then total walk. For lowest_known_fare, compare only journeys with complete supported fare; label partial options separately and explain inability to prove cheapest across unknown-fare services.

Apply strict modes, budget and walking limits before accepting an option. A budget cannot be certified with unknown fares. DirectOnly allows one service (or continuation of current service); never silently relax. If no matching option, CONSTRAINT_UNSATISFIED when a verified unconstrained journey exists; otherwise NO_VERIFIED_JOURNEY. Explain and offer editable preferences.

Validate flat policies: exactly one of flatCentavos or flatRange; range min≤max. Distance increments and denominators must be positive. Fare matrix lookup uses board/alight pair; flat once per boarding; distance only with documented service distance and increments/rounding, never aerial distance. Unknown has null min/max; never zero. Positive ranges remain ranges. Conflicting or expired policies are unknown pending verification. Partial totals expose known subtotal and unknownRideLegs; UI must never call a partial subtotal the total. Discount needs documented applicability and rounding. No inferred live wait/traffic/travel times.

Onboard search begins at confirmed next legal alighting point in the selected direction; it may continue along the current service until a useful alighting point. Evaluate whole journey and downstream transfer; do not instruct immediate alighting based on compass direction or line intersections. If service/location/direction cannot be confirmed, ask for details and offer a pre-trip plan from a known safe stop.

## 6. Local database design

SQLite schema mirrors TransitPack:
- metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL): schemaVersion, packId, version, kind.
- sources(id TEXT PRIMARY KEY, payload_json TEXT NOT NULL).
- places(id TEXT PRIMARY KEY, name TEXT NOT NULL, locality TEXT NOT NULL, latitude REAL, longitude REAL, payload_json TEXT NOT NULL).
- aliases(place_id TEXT REFERENCES places, normalized TEXT, PRIMARY KEY(place_id, normalized)); index normalized.
- stops(id TEXT PRIMARY KEY, place_id TEXT REFERENCES places, payload_json TEXT NOT NULL).
- services(id TEXT PRIMARY KEY, mode TEXT CHECK in five enum values, payload_json TEXT NOT NULL).
- directions(id TEXT PRIMARY KEY, service_id TEXT REFERENCES services, payload_json TEXT NOT NULL).
- route_stops(direction_id TEXT REFERENCES directions, sequence INTEGER, stop_id TEXT REFERENCES stops, payload_json TEXT NOT NULL, PRIMARY KEY(direction_id, sequence)); index stop_id.
- walk_links(id TEXT PRIMARY KEY, from_place_id TEXT REFERENCES places, to_place_id TEXT REFERENCES places, meters INTEGER CHECK(meters>=0), payload_json TEXT NOT NULL).
- fare_policies(id TEXT PRIMARY KEY, service_id TEXT REFERENCES services, payload_json TEXT NOT NULL).

Serialized payload preserves full typed records; indexed columns must match validated payload. Enable foreign keys. Parameters bound, no string-built SQL. Validate full pack before import; transactionally replace, check integrity, rollback on failure; preserve last valid pack. Reject duplicate IDs, dangling references, non-increasing/duplicate stop sequence, invalid lat/lon, missing fact evidence, invalid fares and distances. Release/demo rejects kind test_fixture and fixture namespaces (test_ or _test_ IDs). Suspended directions excluded. Dates displayed; “documented” is not live availability.

The small pack can be loaded to memory for pure route computation after validation; SQLite is durable authority. No remote backend required to plan. Stored walking paths are mandatory for offline access/transfer/egress assertions. Direct station/stop endpoints need no invented zero-distance walk. GPS coordinates get a temporary place record and online verified walk link if connected; otherwise ask user to pick stored endpoint. Do not snap raw GPS by aerial distance and claim walkability.

## 7. Model lifecycle, download and initialization

Use private persistent document storage and manifest metadata. Download to .part, show progress/cancel/retry, check expected bytes and SHA256 with incremental file reading/native hash (benchmark the adapter), then atomic move on same filesystem. Do not read 491 MB into one JS array. Reuse valid existing file; partial file is never initialized. Insufficient storage detected before download where API supports it; keep old valid model until replacement verified. Model download must be an explicit setup action; no hidden cellular download.

expo-file-system57 File/Directory/Paths, DownloadTask and FileHandle APIs must be checked against installed typings. Use @noble/hashes2.4.0: import sha256 from the named export in "@noble/hashes/sha2.js", and bytesToHex from "@noble/hashes/utils.js". Create sha256.create(), update each bounded Uint8Array chunk, then bytesToHex(hasher.digest()). Count bytes as read, discard each chunk and yield between chunks for cancellation/progress; no concatenation/base64/Node crypto. Exact Metro/Hermes integration and hashing speed remain untested and are part of the first gate. Source: [tagged noble-hashes documentation](https://raw.githubusercontent.com/paulmillr/noble-hashes/2.4.0/README.md). SHA verifies integrity; provenance also requires pinned publisher HTTPS URL and license. No arbitrary user-supplied model URL in P0.

One AiPort manager per application; native context is not React state. Initialize once, serialize inference, include queryId, stopCompletion on cancellation/timeout, ignore stale result IDs, release only when safe. Backgrounding cancels current extraction; do not rely on a long background job. Release on lifecycle teardown/memory pressure; cold reload stays possible. Use llama.rn plugin enableEntitlements false for initial free Personal Team signing and verify build. Do not assume optional extended-memory entitlement is available.

initialize validates model+runtime versions. ensureModel handles download only; offline absence reports AI_NOT_READY. TransitRepository initializes independently so manual search remains useful. App boot awaits repository and reports AI readiness separately. AI timeout target: 15 s warm, 30 s cold allowance; cancellation stops native completion before next job. interpret returns an editable JourneyDraft, never a route before confirmation. Missing fields/candidates remain in the draft. submitConfirmed and submitManual validate a complete RouteRequest and call the same route engine; ambiguity or missing fields produce NEEDS_CLARIFICATION. No raw personal query logging.

## 8. Optional online contract, configuration and privacy

Core configuration (public, committed): contractVersion, modelManifest, packVersion, maxInputCharacters, inferenceTimeoutMs, routingLabelLimit, enableOnlineHelpers false by default until verified, public GEO_PROXY_URL. Secrets: ORS_API_KEY only in Worker secrets; never EXPO_PUBLIC_* or native bundle. No cloud AI endpoint.

Optional GeoPort calls HTTPS helper only after explicit online action/consent. Proxy endpoints: POST /v1/geocode {query:string}; POST /v1/walk {from:Point,to:Point}; return Result with shared candidate/walk types and Evidence. Limit query length, coordinate bounds to pilot areas, body size, request rates and upstream quota. A client-embedded reusable token is not a private secret. Provider outage/quota => NETWORK_UNAVAILABLE/NETWORK_LIMIT; retain stored-place workflow.

Openrouteservice free account/key availability and terms are a gate; current production quota/no-card status was not conclusively verified. Cloudflare Workers Free has no-card signup, but do not enable a paid tier. No auto-upgrade. Disable helpers if zero-cost gate fails. Provider coordinate/address processing is disclosed. Do not send natural-language conversation to an online AI. Geocode result alone does not certify walk safety; known transfer routes still require documented access.

Nominatim public endpoint is not default: no autocomplete, aggregate 1 request/s, cache, attribution and identified client required if deliberately selected. No public OSM tile offline bulk download. Map screen is P1; ordered instructions do not need tiles.

## 9. Scanner compatibility (P1, excluded from P0)

If time permits only after gates pass, freeze contract v1.1:
```ts
interface ScanCandidate { serviceId: string; directionIds: string[];
  matchedTokens: string[]; needsConfirmation: boolean }
interface ScanResult { rawText: string; candidates: ScanCandidate[];
  quality: "usable" | "low" | "unreadable"; warnings: string[] }
interface ScanPort { scan(localImageUri: string): Promise<Result<ScanResult>> }
```
Local OCR technology and exact package are intentionally **not selected** for the overnight P0. Member 1 must research/native-test before any scanner task begins. No cloud OCR substitution. Never equate matched text with complete route/direction; user confirms service, then the same deterministic route engine evaluates relevance. Manual service selection already supports onboard replanning.

## 10. Contract change procedure

Member proposing change states trigger, exact type/schema diff, affected modules/tests and migration. Member 4 approves and increments minor version for compatible additions, major for incompatible changes. Publish one commit before dependent work; each member rebases and acknowledges. Do not improvise incompatible fields. If schedule cannot support migration, defer feature.

## 11. Exact illustrative module examples

These are schema examples only, not measured inference or real transport records. Synthetic coordinates/distances/service labels must stay inside tests and never ship as a demo dataset.

ExtractInput:
```json
{
  "queryId": "test_query_001",
  "text": "From Lipa to San Pablo, ayoko bus, konting lipat sana.",
  "locale": "taglish",
  "knownPlaceLabels": [
    "Lipa",
    "San Pablo"
  ]
}
```

RouteRequest for a synthetic graph:
```json
{
  "queryId": "test_query_002",
  "origin": {
    "placeId": "place_test_a",
    "label": "TEST ONLY Origin",
    "point": {
      "latitude": 0,
      "longitude": 0
    },
    "provenance": "stored"
  },
  "destination": {
    "placeId": "place_test_b",
    "label": "TEST ONLY Destination",
    "point": {
      "latitude": 0,
      "longitude": 0.001
    },
    "provenance": "stored"
  },
  "preferences": {
    "allowedModes": [
      "van",
      "jeepney",
      "bus",
      "tricycle",
      "lrt"
    ],
    "priority": "nearest_useful",
    "maxAccessWalkMeters": 1000,
    "maxTransferWalkMeters": 500,
    "maxEgressWalkMeters": 1000,
    "directOnly": false,
    "budgetCentavos": null,
    "passenger": "regular"
  }
}
```

Result<RouteResult> for that synthetic graph:
```json
{
  "ok": true,
  "value": {
    "queryId": "test_query_002",
    "options": [
      {
        "id": "journey_test_001",
        "legs": [
          {
            "kind": "walk",
            "linkId": "walk_test_access",
            "fromPlaceId": "place_test_a",
            "toPlaceId": "place_test_board",
            "meters": 100,
            "instructions": [
              "TEST ONLY walking step."
            ],
            "evidence": {
              "sourceIds": [
                "source_test_fixture"
              ],
              "checkedAt": "2026-10-09T21:00:00+08:00",
              "reliability": "verified",
              "note": "Synthetic unit-test evidence only; prohibited in release."
            }
          },
          {
            "kind": "ride",
            "serviceId": "service_test_001",
            "directionId": "dir_test_001",
            "mode": "bus",
            "serviceName": "TEST ONLY service",
            "headsign": "TEST ONLY direction",
            "boardStopId": "stop_test_board",
            "alightStopId": "stop_test_alight",
            "boardLabel": "TEST ONLY boarding",
            "alightLabel": "TEST ONLY alighting",
            "alreadyOnboard": false,
            "fare": {
              "status": "unknown",
              "minCentavos": null,
              "maxCentavos": null,
              "sourceIds": [],
              "basis": "No fare in synthetic fixture."
            },
            "evidence": {
              "sourceIds": [
                "source_test_fixture"
              ],
              "checkedAt": "2026-10-09T21:00:00+08:00",
              "reliability": "verified",
              "note": "Synthetic unit-test evidence only; prohibited in release."
            }
          },
          {
            "kind": "walk",
            "linkId": "walk_test_egress",
            "fromPlaceId": "place_test_alight",
            "toPlaceId": "place_test_b",
            "meters": 100,
            "instructions": [
              "TEST ONLY walking step."
            ],
            "evidence": {
              "sourceIds": [
                "source_test_fixture"
              ],
              "checkedAt": "2026-10-09T21:00:00+08:00",
              "reliability": "verified",
              "note": "Synthetic unit-test evidence only; prohibited in release."
            }
          }
        ],
        "transfers": 0,
        "walkMeters": 200,
        "fare": {
          "status": "unknown",
          "knownMinCentavos": 0,
          "knownMaxCentavos": 0,
          "unknownRideLegs": 1,
          "sourceIds": []
        },
        "rankReason": "Shortest feasible access walk in synthetic fixture.",
        "warnings": [
          "Synthetic test fixture; not a real journey."
        ],
        "datasetVersion": "test_fixture_1"
      }
    ],
    "coverageWarnings": [
      "Unit-test example only."
    ]
  }
}
```

ModelState examples: `{"phase":"downloading","progress":0.5}`, `{"phase":"ready","modelId":"qwen2.5-0.5b-q4_k_m"}`. Public progress is normalized0–1; adapters convert runtime progress units, never expose mixed0–100 and0–1 values. getState is synchronous; initialize/ensureModel resolve Result<void> and failures use AppError.

Repository resolution success: `{"ok":true,"value":{"candidates":[],"needsConfirmation":true}}` for an unresolved query. Exact unique matches return a complete PlaceCandidate. getPack returns the full validated TransitPack; storage does not silently manufacture missing records.

Draft example shape: `{queryId, extraction, originCandidates, destinationCandidates, preferences, missingFields, warnings, requiresConfirmation:true}`. Populate from actual extraction + repository; confirmation produces RouteRequest used by submitConfirmed. submitManual skips AI but uses the same validator/planner.

GeoPort failure: `{"ok":false,"error":{"code":"NETWORK_UNAVAILABLE","message":"Online lookup is unavailable.","retryable":true}}`. Success returns complete source-backed PlaceCandidate[] or WalkLink; provider SourceRef records must be in the working pack snapshot.

ScanResult (deferred) example: `{"rawText":"unclear text","candidates":[],"quality":"unreadable","warnings":["Enter the service manually."]}`. An empty/unconfirmed candidate never starts routing automatically.
