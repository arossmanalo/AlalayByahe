# PROMPT 2 — Transportation Data and Routing Developer

## A. Project Context
You are one AI coding assistant supporting a registered member of a four-person hackathon team. Start in Planning Mode. Inspect the current workspace and prepare your execution plan; do not write production code until the team/user has approved implementation. Once approved, proceed in dependency order and persist through the assigned P0 tasks.

AlalayByahe is a standalone Android AND iPhone commute assistant: ask in Filipino, English or Taglish and receive a grounded journey. Meaningful inference executes on the phone after one-time model setup; graph routing/fares and stored-place lookup are also local. Never invent boarding points, transit connections or peso amounts. Local inference interprets language; deterministic verified data decides routes.

Architecture: Expo 57/RN0.86.3 native app, llama.rn0.12.9 with Qwen2.5-0.5B-Instruct Q4_K_M (~491 MB), SQLite offline pack, strict TypeScript contracts and deterministic instructions. The exact pins/manifest are included below. Android standalone compilation has passed; installed-app inference on both OS and the iOS native build remain unverified. Read docs/evidence/builds.md before making compatibility claims. Mac/Xcode 26.6 is reported available with free Personal Team signing; no paid Apple developer membership. Personal Team build expires in seven days; no TestFlight/App Store claim. The current Windows build host uses Node 24.14/npm11.9 and Android Studio JBR 21, with SDK 36, NDK 27.1.12297006 and CMake 3.22.1 provisioned during the build. Use short physical checkout/cache paths as documented in README.

Phones: iPhone14Pro; Huawei "Pro50" exact identity pending; Realme10Pro+5G and HonorX9b. Actual installed OS/physical RAM/free storage must be inspected. No benchmarks or device compatibility results exist yet.

Target corridors: Lipa→Candelaria Quezon; Lipa→San Pablo Laguna; Candelaria→Vito Cruz/Taft. All are targets; no complete current primary stop-level pack has been established. Source verification gates decide supported subset. User permits smaller verified demo coverage if necessary and later reviewed data expansion; do not invent missing services. Town lists and terminal addresses do not establish a full journey.

P0: local Taglish extraction + confirmation, manual fallback, real directed paths, nearest useful legal boarding/dropoff, variable transfers without artificial cap, manual onboard replanning, van/jeepney/bus/tricycle/LRT types, truthful fares and offline cold-launch proof. Default walking1 km access/egress, 500 m transfers adjustable. Explicit modes/direct/budget/walk restrictions are strict; explain no match and let user choose changes. Scanner is cuttable P1; map/online helpers optional. No nationwide/live vehicle/fastest traffic claims.

New arbitrary addresses/GPS walking paths may need optional internet; offline uses stored places and documented walking links. No paid dependencies/automatic upgrades. Local model download needs internet once and persistent private storage. Optional providers receive selected addresses/coordinates, never the conversation to cloud AI.

Internal deadline: Oct 10,2026,10 AM Philippine time, with feature freeze 4 AM/release gate 6 AM/submission target 8:30 AM. Actual participant briefing PDF is missing; detailed rubric/timings/public-repo/post/one-submission rules from team prompts await confirmation. Public event page confirms team1–4, built during event, disclosure, repo/video and SM Makati afternoon demo. Follow actual official briefing if supplied; retain conservative internal deadline.

## B. Developer Role
Member 2: **Transportation Data and Routing Developer**.
Source-backed places/services/directions/walking/fare data, directed full-journey routing and useful terminal selection. AI never provides authoritative transit facts. All three corridors are targets, not existing verified coverage.
Your work must integrate with three peers through the complete shared contract below. Member 4 is the user and owns integration, merges, contracts and root configuration. Use the task IDs in status/handoff reports. Do not begin P1 while any critical P0 gate fails.

## C. Detailed Task List
### ROUTE-001 — Establish corridor evidence and source register

- **Task ID:** ROUTE-001
- **Task title:** Establish corridor evidence and source register
- **Priority:** P0
- **Objective:** Determine which real journeys can be supported.
- **Functional requirements:** Research all three target corridors; record exact direction/stops/permissions/walks; distinguish terminal facts from complete service chain.
- **Technical requirements:** Primary operator/LGU/LRMC sources and legal map facts; SourceRef/Evidence; no synthetic release data.
- **Files/modules involved:** docs/evidence/sources.md; docs/evidence/corridor-status.md
- **Dependencies:** None; start parallel with native gate.
- **Inputs:** Published sources, dated teammate observations only if rules permit; requested corridors.
- **Outputs:** Source register and per-corridor missing/confirmed connection list.
- **Implementation steps:** Inspect source limits; collect fact-specific evidence; verify coordinate separately; check reverse independently; identify tricycle areas/fares; set data gate status.
- **Edge cases:** Town list mistaken for stop sequence, stale/contradictory fare, geocode mistaken for service, inaccessible source.
- **Acceptance criteria:** No corridor called supported until each ride/walk/legal stop is evidenced; unresolved sources transparent.
- **Testing requirements:** Paper trace/review by another registered teammate; source dates/usage basis checked.
- **Estimated effort:** 120 min first pass; continue only useful verification
- **Integration instructions:** Send clear coverage status at M1/M2; Member 3 can show actual limits; do not block pure graph tests.
- **Completion evidence:** URLs/dates/facts/license, outstanding gaps and explicit verified subset.

### ROUTE-002 — Build and validate separate release/test packs

- **Task ID:** ROUTE-002
- **Task title:** Build and validate separate release/test packs
- **Priority:** P0
- **Objective:** Make source-backed transit data queryable and safe to import.
- **Functional requirements:** Stable place/stop/service/direction IDs, directed walks, ordered stops, fare/source records; test pack kept separate.
- **Technical requirements:** TransitPack1.0, shared validation; schema mapping to SQLite; integrity/coordinate bounds.
- **Files/modules involved:** src/data/validatePack.ts; assets/data/release.json; tests/fixtures/transit-pack.json; tests/routing/data.test.ts
- **Dependencies:** ROUTE-001 for release evidence; INT-001 schema; INT-002 import collaboration.
- **Inputs:** Source register and validated fact records.
- **Outputs:** Release TransitPack only if real evidence; explicitly synthetic test_fixture pack; validation Result.
- **Implementation steps:** Normalize aliases; encode mode/direction; attach evidence; validate refs/sequences; reject fixtures from release; document coverage.
- **Edge cases:** Duplicate IDs/stops, dangling refs, invalid lat/lon, impossible paths, missing board/alight evidence.
- **Acceptance criteria:** Valid real pack imports; invalid pack rejected; synthetic pack cannot pass release gate.
- **Testing requirements:** Automated all-reference/schema tests, intentionally corrupt packs, manual source-to-record audit.
- **Estimated effort:** 60–90 min plus verification gaps
- **Integration instructions:** Member 4 importer reads exact TransitPack; routing receives immutable validated pack.
- **Completion evidence:** Validation output, pack version/hash and actual covered journeys; no fabricated placeholder release.json.

### ROUTE-003 — Implement directed multimodal journey search

- **Task ID:** ROUTE-003
- **Task title:** Implement directed multimodal journey search
- **Priority:** P0
- **Objective:** Return valid full journeys and nearest useful boarding point.
- **Functional requirements:** Strict modes/walk limits, no arbitrary transfer cap, legal stop order, up to 3 distinct options; no-route vs computationlimit distinct.
- **Technical requirements:** Pure TS expanded graph, nonnegative Pareto label-setting; stop+active direction state; computation guard.
- **Files/modules involved:** src/routing/graph.ts; src/routing/search.ts; tests/routing/search.test.ts
- **Dependencies:** ROUTE-002 test pack; INT-001 interfaces.
- **Inputs:** RouteRequest, validated TransitPack.
- **Outputs:** Result<RouteResult> with complete ordered JourneyLegs, transfers, rankReason or precise error.
- **Implementation steps:** Build directed connections; walk evidence only; board/alight checks; track new boarding; prune cycles; rank feasible full paths; reject unknown link.
- **Edge cases:** Disconnected closest terminal, reverse route, 3+transfers, cycles, similar stop names, walk cap, search guard.
- **Acceptance criteria:** Correct paper-oracle paths on small graphs; no illegal direction/boarding; nearest candidate useful for entire journey.
- **Testing requirements:** Fixtures: zero/one/two/three transfers, loop, disconnected, forbidden mode, guard; mutate graph to expose failures.
- **Estimated effort:** 90–120 min
- **Integration instructions:** RoutePort pure; Member 4 invokes after resolution; UI receives normalized legs.
- **Completion evidence:** Executed behavioral tests and worked path trace; complexity/label guard explained.

### ROUTE-004 — Implement fare calculation and honest ranking

- **Task ID:** ROUTE-004
- **Task title:** Implement fare calculation and honest ranking
- **Priority:** P0
- **Objective:** Show grounded costs without fictional totals.
- **Functional requirements:** Flat/matrix/documented-distance fares once per ride; ranges/discount basis; unknown and subtotal handling.
- **Technical requirements:** Integer centavos; FarePolicy/FareQuote; completeness-aware ranking; invalid/expired/conflicting policy unknown.
- **Files/modules involved:** src/routing/fares.ts; src/routing/rank.ts; tests/routing/fares.test.ts
- **Dependencies:** ROUTE-002, ROUTE-003.
- **Inputs:** Ride legs, policies, passenger preference, budget.
- **Outputs:** FareQuote per ride and aggregate complete/partial/unknown; lowest-known-fare qualification.
- **Implementation steps:** Lookup board/alight pair; apply documented rounding/discount; aggregate known min/max; retain unknown count; strict budget cannot assume unknown0.
- **Edge cases:** Expired policy, conflicting sources, missing distance, transfer double charge, range, onboard fare unknown.
- **Acceptance criteria:** Unknown never zero; subtotal labeled; no cheapest/within budget claim against unknown cost.
- **Testing requirements:** Fixtures for partial total, multiple boardings, missing pair, expiry/conflict, documented discount rounding.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 3 displays precise status/basis; Member 4 validates result shape.
- **Completion evidence:** Actual test output and formula/source trace; unresolved fare policies list.

### ROUTE-005 — Add manual onboard downstream transfer planning

- **Task ID:** ROUTE-005
- **Task title:** Add manual onboard downstream transfer planning
- **Priority:** P0
- **Objective:** Evaluate whether current service can contribute to destination path.
- **Functional requirements:** Confirmed direction and next legal stop; continue current ride to useful alighting/transfer, then another service if valid.
- **Technical requirements:** OnboardContext state, route sequence, legal transfer WalkLinks; same RoutePort and source evidence.
- **Files/modules involved:** src/routing/onboard.ts; tests/routing/onboard.test.ts
- **Dependencies:** ROUTE-003, ROUTE-004; frozen OnboardContext contract. UI-005 may develop in parallel with labeled adapters; it is not a prerequisite for routing logic.
- **Inputs:** RouteRequest.onboard with known directionId and confirmedNextStopId.
- **Outputs:** Continuation/transfer options or clarification; correct transfer count and unknowncurrent fare.
- **Implementation steps:** Check next stop belongs to direction; seed current-service state; enumerate later legal alighting; find complete onward path; avoid compass-only rejection.
- **Edge cases:** Current wrong way but useful downstream interchange, no legal alighting, passed stop, route crossing without walk, unknown service/direction.
- **Acceptance criteria:** No unsafe immediate dropoff or invented transfer; full path decides relevance.
- **Testing requirements:** Behavior tests with downstream connection and false intersection; physical/manual confirmation flow.
- **Estimated effort:** 60 min
- **Integration instructions:** Member 3 confirms context; Member 4 validates timestamps and avoids claiming tracking.
- **Completion evidence:** Worked fixture traces, actual test output, clear no-live-position boundary.

### ROUTE-006 — Audit real routes and integration correctness

- **Task ID:** ROUTE-006
- **Task title:** Audit real routes and integration correctness
- **Priority:** P0
- **Objective:** Prove algorithm results match current supported data.
- **Functional requirements:** Every demo path traced to evidence; release pack excludes fixture data; gaps shown explicitly.
- **Technical requirements:** Data validation, real engine run, forward/reverse separate; no fare amount inferred by AI.
- **Files/modules involved:** docs/evidence/route-audit.md; tests/routing/real-pack.test.ts if pack exists
- **Dependencies:** ROUTE-002–ROUTE-005; INT-003; sources complete for supported subset.
- **Inputs:** Final real pack and planned demo queries.
- **Outputs:** Per-corridor verified/unsupported status, expected journey traces and result comparisons.
- **Implementation steps:** Run validator; compare each leg to source; test exact role swap/reverse; verify walks/permissions; record unknown fares; lock dataset version.
- **Edge cases:** Model chooses unsupported place, incomplete chain, stale data, test case accidentally fixture, invalid walk path.
- **Acceptance criteria:** All advertised supported paths independently reviewed; unsupported corridors not marketed as functional.
- **Testing requirements:** Pure tests and source audit; manual route instructions review by teammate; no physical travel claim without it.
- **Estimated effort:** 60–90 min
- **Integration instructions:** Member 4 locks pack before regression/video; Member 3 displays actual coverage.
- **Completion evidence:** Executed output, source-linked audit, pack version and unresolved gaps.

### ROUTE-101 — Expand verified dataset after core freeze only by approval

- **Task ID:** ROUTE-101
- **Task title:** Expand verified dataset after core freeze only by approval
- **Priority:** P1
- **Objective:** Add more genuine routes/fare support without disrupting demo.
- **Functional requirements:** Tester-proposed data is reviewed; additional modes/places carry evidence.
- **Technical requirements:** Same pack version/schema and source review; no automatic publication.
- **Files/modules involved:** assets/data/; docs/evidence/
- **Dependencies:** ROUTE-006 and user-approved time available before freeze.
- **Inputs:** Draft verified facts from team/public sources.
- **Outputs:** New validated pack version and regression evidence.
- **Implementation steps:** Review each fact; add directed records; run full pack/route audit; coordinate atomic update; freeze again.
- **Edge cases:** Unreviewed tester route, mixed versions, missing reverse, license unclear.
- **Acceptance criteria:** No expanded coverage claim before end-to-end pass.
- **Testing requirements:** Validator+affected routes+release regression.
- **Estimated effort:** Variable, 60–120 min per bounded addition
- **Integration instructions:** Member 4 approves pack swap and QA; Member 3 labels coverage.
- **Completion evidence:** New sources, diff, actual validation and regressions.


## D. Technical Specifications
Use TypeScript, native Expo/ReactNative, the exact planning versions below and one central npm lockfile. Routing/data modules are pure TS; native model/storage adapters are separated from tests. Units are integer meters/centavos and source-attributed data. IDs stable, dates ISO8601 with timezone. Correctness comes before polish.

The shared contract in section E includes all required type definitions, function signatures, JSON schema, model manifest, SQL design, lifecycle and exact illustrative input/output examples. It is included here so this prompt is usable without another chat/file. These are planned contracts, not delivered working code.

Testing: typecheck + meaningful Node node:test via tsx for pure logic/adapters; real device tests for native inference/SQLite/signing/offline. No simulated result may establish phone compatibility or transport reality. Runtime or dependency changes require Member 4 approval and a new contract version.

## E. Shared Architecture and Integration Contracts
### Shared Integration Contract v1.0 — proposed for approval

Status: implementation approved October 9; Member 4 owns the installed baseline and shared configuration. Real AI, routing and UI ports are connected on feat/integration/int-001-foundation. See docs/evidence/integration.md for actual checks and remaining physical/data gates.

#### 1. Stack and model
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
| TypeScript / @types/react | 6.0.3 / 19.2.4 | Installed Expo-compatible type checks |
| tsx | 4.23.15 | Pure TypeScript tests with Node node:test |
| @noble/hashes | 2.4.0 | Bounded incremental SHA256, MIT |

Member 4 installed the proposed core versions and committed package-lock.json. Expo-required peers are pinned: safe-area-context 5.7.0, screens 4.26.0, reanimated 4.5.1, worklets 0.10.1, linking 57.0.12, constants 57.0.21, font 57.0.4 and system-ui 57.0.4. React types were aligned to 19.2.4 during the initial compatibility check; interfaces and TransitPack schema remain 1.0. Use npm ci. Expo Doctor passes 21/21; Android and iOS Hermes bundles compile. These checks do not establish phone inference or iOS native compatibility. Both physical inference gates remain required. If the core Expo/RN pair changes, update contract v1.1 before dependent work.

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

#### 2. Repository and ownership
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

#### 3. Shared TypeScript types
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

#### 4. Runtime validation and extraction schema

All external JSON, including model text and downloaded packs, is untrusted. Shared validators live in src/contracts/validators.ts; pack validation delegates to Member 2's src/data/validatePack.ts. Return typed Result errors, not exceptions across module boundaries. The raw extraction JSON Schema is object, additionalProperties false, all RawIntent keys required; nullable strings/numbers are explicit null; modes/priority/kind are enums; nonnegative integer centavos and meters; ambiguities array of strings. App limits: text 600 characters, place labels max 30, output 256 tokens initially. If output truncates at that limit, reject it; adjust measured token budget centrally rather than accept partial JSON.

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

#### 5. Deterministic routing and fares

Build an expanded directed graph using places/stops, service direction and ordered stop sequence. Boarding is permitted only when stop AND route-stop board flags are true; alighting likewise. Generate a ride transition between two stops only in increasing sequence, with evidence of service connection. Walk transitions require directed WalkLink evidence. Boarding and transfers update state; do not charge per adjacent ride edge.

Use nonnegative multicriteria label-setting search: state includes stop/place and active service direction; labels record transfers, walking distance, and fare completeness/cost. Pareto prune dominated labels; deduplicate equivalent journeys; return at most three distinct options. Search has a computation guard (proposed 10,000 labels), not a transfer cap; exhaustion returns SEARCH_LIMIT_REACHED, never “no route.” Cycles cannot improve a label. For nearest_useful, choose the shortest **feasible access walk** among complete valid paths, then fewer transfers, egress walk, total walk; do not choose a nearby disconnected terminal. For fewest_transfers, transfers then total walk. For lowest_known_fare, compare only journeys with complete supported fare; label partial options separately and explain inability to prove cheapest across unknown-fare services.

Apply strict modes, budget and walking limits before accepting an option. A budget cannot be certified with unknown fares. DirectOnly allows one service (or continuation of current service); never silently relax. If no matching option, CONSTRAINT_UNSATISFIED when a verified unconstrained journey exists; otherwise NO_VERIFIED_JOURNEY. Explain and offer editable preferences.

Validate flat policies: exactly one of flatCentavos or flatRange; range min≤max. Distance increments and denominators must be positive. Fare matrix lookup uses board/alight pair; flat once per boarding; distance only with documented service distance and increments/rounding, never aerial distance. Unknown has null min/max; never zero. Positive ranges remain ranges. Conflicting or expired policies are unknown pending verification. Partial totals expose known subtotal and unknownRideLegs; UI must never call a partial subtotal the total. Discount numerator/denominator is the payable share (4/5 means pay 80%), with documented applicability and rounding. No inferred live wait/traffic/travel times.

Onboard search begins at confirmed next legal alighting point in the selected direction; it may continue along the current service until a useful alighting point. Evaluate whole journey and downstream transfer; do not instruct immediate alighting based on compass direction or line intersections. If service/location/direction cannot be confirmed, ask for details and offer a pre-trip plan from a known safe stop.

#### 6. Local database design

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

#### 7. Model lifecycle, download and initialization

Use private persistent document storage and manifest metadata. Download to .part, show progress/cancel/retry, check expected bytes and SHA256 with incremental file reading/native hash (benchmark the adapter), then atomic move on same filesystem. Do not read 491 MB into one JS array. Reuse valid existing file; partial file is never initialized. Insufficient storage detected before download where API supports it; keep old valid model until replacement verified. Model download must be an explicit setup action; no hidden cellular download.

expo-file-system57 File/Directory/Paths, DownloadTask and FileHandle APIs must be checked against installed typings. Use @noble/hashes2.4.0: import sha256 from the named export in "@noble/hashes/sha2.js", and bytesToHex from "@noble/hashes/utils.js". Create sha256.create(), update each bounded Uint8Array chunk, then bytesToHex(hasher.digest()). Count bytes as read, discard each chunk and yield between chunks for cancellation/progress; no concatenation/base64/Node crypto. Exact Metro/Hermes integration and hashing speed remain untested and are part of the first gate. Source: [tagged noble-hashes documentation](https://raw.githubusercontent.com/paulmillr/noble-hashes/2.4.0/README.md). SHA verifies integrity; provenance also requires pinned publisher HTTPS URL and license. No arbitrary user-supplied model URL in P0.

One AiPort manager per application; native context is not React state. Initialize once, serialize inference, include queryId, stopCompletion on cancellation/timeout, ignore stale result IDs, release only when safe. Backgrounding cancels current extraction; do not rely on a long background job. Release on lifecycle teardown/memory pressure; cold reload stays possible. Use llama.rn plugin enableEntitlements false for initial free Personal Team signing and verify build. Do not assume optional extended-memory entitlement is available.

initialize validates model+runtime versions. ensureModel handles download only; offline absence reports AI_NOT_READY. TransitRepository initializes independently so manual search remains useful. App boot awaits repository and reports AI readiness separately. AI timeout target: 15 s warm, 30 s cold allowance; cancellation stops native completion before next job. interpret returns an editable JourneyDraft, never a route before confirmation. Missing fields/candidates remain in the draft. submitConfirmed and submitManual validate a complete RouteRequest and call the same route engine; ambiguity or missing fields produce NEEDS_CLARIFICATION. No raw personal query logging.

#### 8. Optional online contract, configuration and privacy

Core configuration (public, committed): contractVersion, modelManifest, packVersion, maxInputCharacters, inferenceTimeoutMs, routingLabelLimit, enableOnlineHelpers false by default until verified, public GEO_PROXY_URL. Secrets: ORS_API_KEY only in Worker secrets; never EXPO_PUBLIC_* or native bundle. No cloud AI endpoint.

Integration semantics: submitConfirmed retains the current JourneyDraft queryId, including explicit edits. Manual/new natural-language queries create a new ID. Backgrounding cancels pending jobs while preserving a completed editable draft. Onboard origin uses the confirmed next stop's placeId and either the stored place point or that stop's documented point; repeated next-stop occurrences require clarification. Mode allow-lists govern future boardings, while continuing the vehicle already occupied is allowed.

Optional GeoPort calls HTTPS helper only after explicit online action/consent. Proxy endpoints: POST /v1/geocode {query:string}; POST /v1/walk {from:Point,to:Point}; return Result with shared candidate/walk types and Evidence. Limit query length, coordinate bounds to pilot areas, body size, request rates and upstream quota. A client-embedded reusable token is not a private secret. Provider outage/quota => NETWORK_UNAVAILABLE/NETWORK_LIMIT; retain stored-place workflow.

Openrouteservice free account/key availability and terms are a gate; current production quota/no-card status was not conclusively verified. Cloudflare Workers Free has no-card signup, but do not enable a paid tier. No auto-upgrade. Disable helpers if zero-cost gate fails. Provider coordinate/address processing is disclosed. Do not send natural-language conversation to an online AI. Geocode result alone does not certify walk safety; known transfer routes still require documented access.

Nominatim public endpoint is not default: no autocomplete, aggregate 1 request/s, cache, attribution and identified client required if deliberately selected. No public OSM tile offline bulk download. Map screen is P1; ordered instructions do not need tiles.

#### 9. Scanner compatibility (P1, excluded from P0)

If time permits only after gates pass, freeze contract v1.1:
```ts
interface ScanCandidate { serviceId: string; directionIds: string[];
  matchedTokens: string[]; needsConfirmation: boolean }
interface ScanResult { rawText: string; candidates: ScanCandidate[];
  quality: "usable" | "low" | "unreadable"; warnings: string[] }
interface ScanPort { scan(localImageUri: string): Promise<Result<ScanResult>> }
```
Local OCR technology and exact package are intentionally **not selected** for the overnight P0. Member 1 must research/native-test before any scanner task begins. No cloud OCR substitution. Never equate matched text with complete route/direction; user confirms service, then the same deterministic route engine evaluates relevance. Manual service selection already supports onboard replanning.

#### 10. Contract change procedure

Member proposing change states trigger, exact type/schema diff, affected modules/tests and migration. Member 4 approves and increments minor version for compatible additions, major for incompatible changes. Publish one commit before dependent work; each member rebases and acknowledges. Do not improvise incompatible fields. If schedule cannot support migration, defer feature.

#### 11. Exact illustrative module examples

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


## F. Implementation Instructions
1. Inspect current repo/status, actual source, package lock, AGENTS instructions and available tools. Preserve unrelated work; never expose .env contents.
2. Confirm branch/base contract version, package versions and your file ownership. Check native API signatures against installed/tagged docs.
3. Identify factual blockers yourself; report exact build/source/API errors. Do not ask for information a read-only tool can verify.
4. Produce a task-specific plan with dependency order, tests, actual acceptance and timeboxes. Wait for implementation approval unless the user has already supplied it.
5. After approval implement one small real component, check it, then expand. Use exact interfaces; coordinate shared changes.
6. Work in parallel with interface-conforming development/test adapters. Fixture packs are kind test_fixture and use fixture namespaces; release cannot use them.
7. Deliver an early real slice to Member 4 at checkpoints, rather than a final large untested branch.
8. Execute relevant behavior tests/typecheck; native behavior tested on actual phones. Record Pass/Fail/NotRun, not anticipated outcomes.
9. Review the role-specific edges below and the assigned task's requirements. Any fabricated/unsafe path/local-AI claim blocks release.
10. Replace mocks through central dependency wiring, never a hidden fallback. Manual route search remains honestly labeled when AI fails.
11. Document exact setup, dependency/version changes, evidence, limitations and integration instructions. Prepare small commits/PRs with actual results.

Coordination rules:
1. Respect ownership; coordinate cross-module edits with the owner.
2. Follow contract v1.0; never invent incompatible fields, enums, storage or APIs.
3. Keep the selected architecture; justify and obtain team approval for major changes.
4. Build the smallest real component, verify it, then expand.
5. Label mocks/fixtures; never present them as real inference or verified transit.
6. Prioritize working P0 over visual completeness.
7. No hidden network or cloud AI dependency in the core.
8. Verify installed versions/APIs before use; native compatibility is a gate.
9. Preserve unrelated work and user data; do not overwrite another branch's changes.
10. Report blockers early with exact evidence; no incompatible workaround.
11. Report only tests actually executed, including failures/untested cases.
12. Respect feature/submission freezes and cut optional work early.

## G. Edge Cases
- EC-023 (P0): No complete known connection → Return no verified journey; separate known terminal facts; handling: NO_VERIFIED_JOURNEY; do not join unknown edges; user copy: "No verified complete journey available.".
- EC-024 (P0): No direct route but transfer exists → Offer transfer only if directOnly false; handling: Directed search with boarding state; user copy: "This option requires a transfer.".
- EC-025 (P0): Multiple routes → Return up to 3 distinct valid options and rank reasons; handling: Pareto prune + dedup; stable sort; user copy: "Choose an option.".
- EC-026 (P0): Transfer stops disconnected → Reject connection; handling: No validated directed WalkLink => no transfer; user copy: "This transfer connection is not verified.".
- EC-027 (P0): Graph cycles → Terminate without fabricated extra rides; handling: Dominance pruning and computation guard; user copy: "No valid journey found within the search limit.".
- EC-028 (P0): Reverse direction requested → Use separately validated direction or fail; handling: Increasing sequence; no inferred reverse edges; user copy: "No verified service in that direction.".
- EC-029 (P0): Coordinate between known stops → Use legal accessible stop via real walking path; handling: No mid-road boarding from GPS snap; user copy: "Choose a verified boarding point.".
- EC-030 (P0): Journey requires walking → Respect actual path and limit; handling: Access/transfer/egress separate cap; user copy: "This journey needs a longer walk than your limit.".
- EC-031 (P0): Refused mode → Exclude strictly; handling: Filter service mode before accepting path; user copy: "No verified option matches your selected modes.".
- EC-032 (P0): Cheapest vs fewest transfers → Compare only supported costs; qualify cheapest; handling: Completeness-aware ranking; user copy: "Some fares are unknown, so cheapest cannot be confirmed.".
- EC-033 (P0): Preference cannot be met → Explain and ask whether user wants edit; handling: CONSTRAINT_UNSATISFIED, no auto-relax; user copy: "No matching option. Change your preferences to see others.".
- EC-034 (P0): Incomplete transport records → Exclude incomplete path, report gap; handling: Release validator and path completeness; user copy: "A connection is missing from our verified data.".
- EC-035 (P0): Suspended/rerouted service → Exclude suspension; stale route not live promise; handling: Direction availability and source-date review; user copy: "This service is excluded or needs confirmation.".
- EC-036 (P0): Outdated source → Display date; require review before release claim; handling: Validity policy and source audit; user copy: "Service information may have changed.".
- EC-037 (P0): Impractical interchange → Reject without pedestrian access evidence; handling: No aerial proximity transfer; user copy: "This transfer path is not verified.".
- EC-038 (P0): Similar names far apart → Distinguish IDs/locality/coordinates; handling: Place candidates require confirmation; user copy: "Choose the correct location.".
- EC-039 (P0): Duplicate stop records → Reject import or merge only after evidence review; handling: Stable IDs and duplicate/ref tests; user copy: "Transit data could not be validated.".
- EC-040 (P0): Inconsistent coordinates → Reject impossible records/path; handling: Finite lat/lon bounds; locality/path audit; user copy: "This location data needs review.".
- EC-041 (P0): Nearest terminal disconnected → Search other useful terminals within walk cap; handling: Rank only complete feasible journeys; user copy: "The closest terminal has no verified connection for this trip.".
- EC-042 (P0): Journey needs3+ transfers → Allow if graph/constraints support it; handling: No transfer-count cap; guard on computation only; user copy: "This option has several transfers.".
- EC-043 (P0): Computation guard exceeded → Return explicit limited-search failure; handling: SEARCH_LIMIT_REACHED, not no-route conclusion; user copy: "Search limit reached. Try a narrower journey.".
- EC-044 (P0): Route lines cross → Do not infer interchange; handling: Legal stops + directed walking evidence required; user copy: "A crossing alone is not a verified transfer.".
- EC-045 (P0): Current vehicle wrong immediate direction but useful downstream stop → Evaluate whole continuation+transfer path; handling: Onboard current-direction state and later legal stops; user copy: "You may continue to this verified transfer point.".
- EC-046 (P0): Onboard service/direction/next stop unknown → Require manual confirmation or pre-trip from known stop; handling: OnboardContext validator; user copy: "Confirm your current service and next stop.".
- EC-047 (P0): Selected next stop already passed/not on service → Reject stale context; handling: Membership/order and user confirmation; user copy: "Select a stop ahead in this direction.".
- EC-048 (P0): Tricycle arbitrary origin/destination → No invented service-area edge; handling: Documented stand/service area only; user copy: "No verified tricycle connection is available.".
- EC-049 (P0): Budget with unknown fares → Do not certify affordable option; handling: Unknown fares fail strict-budget certification; user copy: "This option cannot be confirmed within your budget.".
- EC-050 (P0): Station/terminal entrance closed or inaccessible → Do not use unverified access path; handling: Entrance/walk evidence and availability note; user copy: "Confirm access; this path is not currently verified.".
- EC-051 (P0): Missing fare → Unknown, null values; handling: No default zero; user copy: "Confirm fare with the driver/operator.".
- EC-052 (P0): Outdated schedule → Unknown pending review; date visible; handling: ValidFrom/validTo and source check; user copy: "Fare information needs updating.".
- EC-053 (P0): Distance unavailable → No distance fare computation; handling: Require documented service-meter record; user copy: "Fare cannot be calculated from available distance data.".
- EC-054 (P0): Discount requested → Apply only documented eligibility/rounding; handling: FarePolicy discount rules; user copy: "Discount applicability must be confirmed.".
- EC-055 (P0): Transfers separate fares → Charge once per new boarding; handling: Ride-level fare policy, not graph-edge cost; user copy: "Each ride may have a separate fare.".
- EC-056 (P0): Fare range → Show range and basis; handling: Integer min/max aggregation; user copy: "Estimated fare range shown.".
- EC-057 (P0): Total incomplete → Known subtotal plus unknown legs; handling: partial status; UI wording test; user copy: "Known subtotal; some ride fares are unknown.".
- EC-058 (P0): Conflicting sources → Mark unresolved, no favored fictional value; handling: Conflict review excludes policy; user copy: "Fare sources disagree. Please confirm.".
- EC-059 (P0): Adjustment not documented → No inferred surcharge/discount; handling: Policy availability check; user copy: "This fare adjustment is not verified.".
- EC-060 (P0): Current ride payment unknown → Do not assume zero/already paid; handling: Onboard quote remains unknown if unsupported; user copy: "Current ride fare/payment is not confirmed.".
- EC-061 (P0): Money rounding/units wrong → Reject invalid and use integer centavos; handling: Policy-specific documented rounding; no float accumulation; user copy: "Fare data could not be validated.".
- EC-134 (P0): Wrong boarding location → Require legal documented board flags; handling: Stop AND route-stop board permission; user copy: "Confirm this service at the listed boarding point.".
- EC-135 (P0): Wrong service direction → Prominent headsign; no inverse edge; handling: Separate Direction and sequence; user copy: "Check the vehicle direction before boarding.".
- EC-136 (P0): Unsafe/nonexistent transfer → Reject unverified link; handling: Documented pedestrian path/access required; user copy: "No verified safe transfer path is available.".
- EC-137 (P0): Unverified dropoff → Cannot make complete journey; handling: Alight flags and downstream path evidence; user copy: "This dropoff is not verified.".
- EC-138 (P0): Insufficient evidence for route claim → Coveragegap explicitly shown; handling: Release audit blocks advertising; user copy: "No verified complete journey available.".
- EC-139 (P0): Outdated fare/service → Show dates and unknown/confirmation; handling: Currentvalidity/source review; user copy: "Confirm current service and fare.".
- EC-140 (P1): Camera near traffic → Do not prompt dangerouscapture; handling: P1 safetytext; manual service alternative; user copy: "Use the camera only when safely stopped.".
These are planned tests. Scanner cases remain deferred unless scanner is genuinely implemented and enabled. No edge list entry is a claim that a test passed.

## H. Testing and Acceptance Criteria
Assigned task acceptance/test/evidence fields are binding. Common release gates:
- Android and iPhone installed Release cold-launch without Metro/USB/ExpoGo.
- A new actual phone-local extraction in airplane mode, model+runtime/version evidence.
- AI critical-slot target ≥90% on ≥20 held-out cases per primary device; publish actual misses, require confirmation. Target is not a result.
- Warm extraction target p95≤10 s, timeout 15 s; cold initialization soft target≤30 s; report measured counts/settings/errors and memory only if actually profiled.
- Real source-backed complete path, legal board/alight/direction and directed pedestrian links; no crossing-only transfer.
- Strict preferences unchanged until the user edits; transfer count is journey-dependent.
- Fare unknown never0, subtotal never called full total; no unprovable cheapest/fastest badge.
- Model bytes/SHA verified and resources persist; malformed output/data rejected, old valid data survives failed update.
- Repeated/edit/cancel/background results are correlated, accessible UI and manual recovery.
- No release fixtures, secret keys, signing data, model binaries or hidden cloud-AI dependencies.
- Actual supported coverage stated; none of the three target corridors claimed before full audit.
- Every task report separates executed, failed, blocked, deferred and untested work.

## I. Files and Module Ownership
src/data/, src/routing/, assets/data/, tests/routing/, data/source docs/evidence/. Coordinate importer with Member 4; shared contracts/config/UI are not independently editable.
Shared files requiring coordination: src/contracts/*, package.json/lock, app.config.ts, tsconfig, root layout, native android/ios, global build/release scripts. Member 4 publishes contract changes first; all affected branches rebase/acknowledge. Don't independently scaffold or upgrade libraries.

Mocks permitted only under tests/development with visible DEV FIXTURE labeling. Every role eventually must verify its real dependencies: Member 1 native inference; Member 2 source-backed release graph; Member 3 realcontroller/results; Member 4 actual integrated native release. Do not overwrite existing user data during stateful tests.

## J. Git Workflow
If no repository is connected, report that accurately. During implementation Member 4 initializes/connects the team repo and publishes the baseline, then members clone/branch. Branch: feat/routes/<lowercase-task-id>. No direct shared-main changes except user-owned coordinated merges.

Standing user instruction: after each prompt/change, commit task-owned changes and push when the repository is connected. Inspect status/diff; don't commit unrelated work or secrets; no empty commit for read-only prompts. Verify remote SHA before claiming GitHub completion. Commit messages describe concrete behavior and task scope.

PR/handoff includes task IDs, actual behavior, contract diff if any, tests actually executed and known limitations. Member 4 merges after relevant checks. If branch protection unavailable, only Member 4 merges, main stays buildable. Rebase/fetch at milestones; resolve conflicts with owner, no blind ours/theirs on contracts/lockfile. Never force-push shared main.

## K. Expected Deliverables
Source register, actual corridor status, validated release pack if evidence exists, separate synthetic fixture pack, pure RoutePort graph/ranking/fare/onboard logic, executed behavior tests and real-path source audit.
Provide working source only after approval, meaningful tests, setup/docs, exact dependency requests, known bugs/limits, integration notes and actual evidence. All assigned P0 tasks must be integrated/tested or explicitly unresolved; P1 can be cut. No external messages/posts/submission/publication without direct user authorization. Team communication remains the human teammates' responsibility unless explicitly authorized.

Checkpoints: ~22:30 native+source gate;00:30 real vertical slice;02:00 essential flows/releases;04:00 freeze;06:00 offline release proof;07:30 materials;08:30 submission target;10:00 internal hard freeze. Rebase schedule if start is later, cut P1, preserve testing/submission buffer.

## L. Completion Report Format
Return:
- Tasks completed/integrated/tested, with IDs.
- Files created/modified and ownership coordination.
- Tests executed: exact command/device, actual result, failures and not-run reasons.
- Interfaces implemented and contract version.
- Dependencies required/pins and actual lockfile changes.
- Known bugs and limitations, including unsupported devices/coverage.
- Unresolved blockers with evidence and next owner/action.
- Contract changes proposed/approved, migration and affected modules.
- Integration instructions, init/cleanup/setup, commit and remote SHA when verified.
- Remaining tasks/deferred P1 and deadline impact.

Never claim native/offline/model/route reality from a mock, test anticipated result or unexecuted command. Do not claim a post, deployment, push or submission that did not occur.
