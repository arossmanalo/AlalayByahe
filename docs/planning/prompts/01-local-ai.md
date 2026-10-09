# PROMPT 1 — Local AI and Computer Vision Developer

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
Member 1: **Local AI and Computer Vision Developer**.
Real phone-native extraction, verified model storage, cancellation/lifecycle, Taglish semantic evaluation and offline evidence. Do not write route/fare data or a cloud inference service.
Your work must integrate with three peers through the complete shared contract below. Member 4 is the user and owns integration, merges, contracts and root configuration. Use the task IDs in status/handoff reports. Do not begin P1 while any critical P0 gate fails.

## C. Detailed Task List
### AI-001 — Prove real native inference on both platforms

- **Task ID:** AI-001
- **Task title:** Prove real native inference on both platforms
- **Priority:** P0
- **Objective:** Resolve the largest implementation risk before expanding AI work.
- **Functional requirements:** Install signed native apps on iPhone14Pro and an available Android; run one fresh schema-constrained completion from publisher GGUF.
- **Technical requirements:** llama.rn0.12.9, proposed Expo 57 baseline; CPU first; plugin optional entitlements disabled for Personal Team.
- **Files/modules involved:** src/ai/nativeProbe.ts; docs/evidence/native-gate.md; native config edits coordinated with Member 4.
- **Dependencies:** INT-001; may use small local development probe before final UI.
- **Inputs:** Verified model file path; ExtractInput; device OS/RAM/storage; generated native project.
- **Outputs:** Actual JSON text and parsed validity result; per-platform build/install/inference evidence.
- **Implementation steps:** Inspect installed APIs; coordinate NDK/cmake/signing; load file; issue short completion; capture engine/device/runtime; stop/release; repeat on other OS. For this probe, manually acquire the publisher-pinned file into private app storage and verify its size/hash; AI-002 later automates acquisition, so this task does not wait on AI-002.
- **Edge cases:** Unsupported ABI, build failure, signing entitlements, missing model, context initialization/OOM.
- **Acceptance criteria:** Both builds install and perform actual native inference; failures explicitly block phone-local claim.
- **Testing requirements:** Manual physical test on both platforms; no simulator or mocked inference substitute.
- **Estimated effort:** 90–120 min shared with INT-001; early gate
- **Integration instructions:** Expose experiment results to Member 4; retain one pinned dependency set before UI imports.
- **Completion evidence:** Build commands/results, anonymized device table and actual output/timing; identify untested platforms.

### AI-002 — Implement verified model acquisition and readiness

- **Task ID:** AI-002
- **Task title:** Implement verified model acquisition and readiness
- **Priority:** P0
- **Objective:** Make one-time model setup durable and recoverable.
- **Functional requirements:** Explicit download, progress/cancel/retry, byte/hash validation and offline reuse; report separate AI state.
- **Technical requirements:** ExpoFS installed File/DownloadTask/FileHandle APIs; @noble/hashes2.4.0 incremental sha256.create/update/digest with bounded chunks and yielding; no full-file JS buffer.
- **Files/modules involved:** src/ai/modelStore.ts; src/ai/modelManifest.ts; tests/ai/model-store.test.ts
- **Dependencies:** AI-001, INT-001; storage adapter cooperation.
- **Inputs:** ModelManifest pinned URL/revision/bytes/SHA; private file paths.
- **Outputs:** Result<void> from ensureModel; ModelState progress; verified final GGUF path.
- **Implementation steps:** Check space; download .part; hash incrementally; atomic promote; persist manifest; validate existing file; keep prior valid model during replacement.
- **Edge cases:** Interrupted download, wrong bytes/hash, storage full, repeated setup, offline first launch, app killed during promotion.
- **Acceptance criteria:** Only verified complete file initializes; restart reuses it; setup never downloads silently.
- **Testing requirements:** Adapter tests for corruption/retry; real interrupted/restart download on one phone; verify second phone preload.
- **Estimated effort:** 60–90 min plus network transfer
- **Integration instructions:** UiPort consumes state; Member 4 wires private storage; do not write model into repository.
- **Completion evidence:** Hash/byte evidence, state transitions, transfer time and restart results; actual Metro/Hermes hash adapter test.

### AI-003 — Implement structured Taglish extraction

- **Task ID:** AI-003
- **Task title:** Implement structured Taglish extraction
- **Priority:** P0
- **Objective:** Turn free text into validated journey slots without generating routes.
- **Functional requirements:** Support English/Filipino/Taglish, strict mode exclusions, walk preferences, origin/destination and onboard kind; return clarification for missing/conflicting fields.
- **Technical requirements:** RawIntent schema, response_format JSON grammar, JSON.parse + shared validators; short prompt; all modes enum.
- **Files/modules involved:** src/ai/extract.ts; src/ai/prompt.ts; tests/ai/extraction.test.ts; docs/evidence/taglish-cases.md
- **Dependencies:** AI-001; shared validators INT-001; AI-002 for installed runtime.
- **Inputs:** ExtractInput with max600 chars and scoped place labels.
- **Outputs:** Result<Extraction>; truthful engine model/revision/time; AI_INVALID_OUTPUT on malformed/incomplete output.
- **Implementation steps:** Define schema/prompt; test literal roles/negation; validate every key; never infer coordinates/fares; surface ambiguities; evaluate held-out cases.
- **Edge cases:** Swapped roles, slang, repeated names, missing origin, home unknown, injection, unsupported location, contradictory modes.
- **Acceptance criteria:** At least20 held-out cases; target ≥90% exact critical slots/preferences, no silent wrong role accepted; state misses and require confirmation.
- **Testing requirements:** Pure validator tests plus actual fresh inference corpus on Android/iPhone; no prompt examples counted as held-out.
- **Estimated effort:** 90 min
- **Integration instructions:** Member 4 resolves raw texts into place candidates; Member 3 confirms fields; never return journey instructions.
- **Completion evidence:** Case inputs, expected slots, actual outputs and accuracy calculation by device/model.

### AI-004 — Add cancellation and lifecycle safety

- **Task ID:** AI-004
- **Task title:** Add cancellation and lifecycle safety
- **Priority:** P0
- **Objective:** Keep repeated queries and app backgrounding consistent.
- **Functional requirements:** One active completion; stop on cancel/timeout/background; old results cannot overwrite new query.
- **Technical requirements:** AiPort manager, queryId guard, stopCompletion and release promises; no native context in React state.
- **Files/modules involved:** src/ai/manager.ts; tests/ai/lifecycle.test.ts
- **Dependencies:** AI-003; INT-003 orchestration integration.
- **Inputs:** queryId, ExtractInput, app lifecycle event.
- **Outputs:** Result errors AI_TIMEOUT/CANCELLED; stable ModelState; safe release.
- **Implementation steps:** Serialize jobs; correlate IDs; stop native completion; await stop before new job; cancel on background; tear down safely; allow reinit.
- **Edge cases:** Cancel before init, double cancel, timeout then new request, release while running, resume after memory pressure.
- **Acceptance criteria:** No stale result, duplicate context or concurrent generation; next request works after cancel.
- **Testing requirements:** Fake native adapter state tests then real timeout/background/repeat physical tests.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Controller and UI invoke cancel; Member 4 owns app-level lifecycle listener.
- **Completion evidence:** Actual repeated/cancel tests, failure codes and observed recovery; no crash claim without device run.

### AI-005 — Measure accuracy, speed and memory; choose final model

- **Task ID:** AI-005
- **Task title:** Measure accuracy, speed and memory; choose final model
- **Priority:** P0
- **Objective:** Select smallest useful model from real evidence.
- **Functional requirements:** Compare cold/warm runs, difficult Taglish roles/negation; upgrade only if 0.5B inadequate and 1.5B usable.
- **Technical requirements:** Same runtime/context/output settings recorded; profiling tools; sample counts, median/p95; memory readings only if available.
- **Files/modules involved:** docs/evidence/ai-benchmarks.md; tests/ai/corpus.json; src/ai/modelManifest.ts if coordinated
- **Dependencies:** AI-002–AI-004; native builds INT-005.
- **Inputs:** Held-out corpus, phone specs, timers, profiler observations.
- **Outputs:** Final model choice and real benchmark table; explicit unknowns/failed cases.
- **Implementation steps:** Run20+ unique queries per primary phone; separate cold start; record errors; profile; inspect thermal behavior; make measured keep/upgrade decision before freeze.
- **Edge cases:** Model bigger than storage, slower 1.5B, thermal throttling, no memory tool, partial JSON truncation.
- **Acceptance criteria:** Targets: warm p95≤10 s, warm timeout 15 s; otherwise report actual and recovery; no unsupported accuracy/performance claims.
- **Testing requirements:** Physical both OS; extra Androids if available after primary pass.
- **Estimated effort:** 60–90 min; optional upgrade adds transfer/validation time
- **Integration instructions:** Member 4 release manifest locked; Member 3 displays honest state; no late model swap after regression.
- **Completion evidence:** Raw anonymized runs and aggregate formula; license/runtime/model revision.

### AI-006 — Prove offline AI and hand off

- **Task ID:** AI-006
- **Task title:** Prove offline AI and hand off
- **Priority:** P0
- **Objective:** Deliver reproducible real phone-local inference integrated with routing.
- **Functional requirements:** New query works after forcequit/relaunch in airplane mode; manual fallback when model absent.
- **Technical requirements:** Release bundled JS; no Metro/USB/laptop endpoint; current AiPort contract.
- **Files/modules involved:** docs/evidence/offline-ai.md; src/ai/README.md; tests/ai/
- **Dependencies:** AI-004, INT-003, INT-005, ROUTE-006.
- **Inputs:** Installed release, verified model+pack, fresh query not precomputed.
- **Outputs:** Per-device offline evidence and complete AI handoff.
- **Implementation steps:** Stop Metro; disconnect USB; disable radios; relaunch; run new query; demonstrate clarification; verify no hidden network dependency; document setup.
- **Edge cases:** Absent model, offline first launch, restart, version mismatch, fallback mistaken for AI.
- **Acceptance criteria:** At least one true new phone-local extraction on Android and iPhone; unsupported cases clear.
- **Testing requirements:** Coordinate acceptance T-OFF-01 and T-AI-01 on physical devices.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 archives evidence for video/README; all actual adapter imports connected.
- **Completion evidence:** Commands/setup, actual outputs, timings, offline clip/screens, tests executed and known limitations.

### AI-101 — Prototype local signboard OCR only after P0

- **Task ID:** AI-101
- **Task title:** Prototype local signboard OCR only after P0
- **Priority:** P1
- **Objective:** Add scanner only if the core is stable and ample time remains.
- **Functional requirements:** Quality gating, tokens, candidates and manual correction; route relevance via deterministic planner.
- **Technical requirements:** Runtime/package not selected; must research exact local OCR native compatibility first; contract v1.1.
- **Files/modules involved:** src/ai/scanner/; tests/ai/scanner/; UI/native edits coordinated.
- **Dependencies:** All P0 integrated and tested; Member 4 approval before feature freeze.
- **Inputs:** LocalImageUri and verified service aliases.
- **Outputs:** ScanResult with rawText/candidates/quality/warnings.
- **Implementation steps:** Select/test local OCR; sanitize image; extract; match aliases; confirm direction; never infer route solely from token.
- **Edge cases:** All scanner rows in edge matrix; privacy, permission, bad image, OOM.
- **Acceptance criteria:** Real offline OCR and correct candidate confirmation; otherwise cut scanner.
- **Testing requirements:** Physical images and airplane-mode test; no cloud OCR.
- **Estimated effort:** 2–4h; outside baseline, likely cut
- **Integration instructions:** Member 3 optional screen and Member 2 aliases; contract change first.
- **Completion evidence:** Exact library/license/model, actual OCR runs and unsupported images.


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
- EC-001 (P0): Destination only → Ask origin; retain destination; handling: Draft missingFields origin; user copy: "Where are you starting?".
- EC-002 (P0): Origin only → Ask destination; handling: Draft missingFields destination; user copy: "Where do you want to go?".
- EC-003 (P0): Same origin/destination → Confirm already at selected place; no invented ride; handling: Compare resolved IDs; distinguish similar labels; user copy: "These places match. Did you mean another branch?".
- EC-004 (P0): Misspelled destination → Offer labeled candidate, require selection; handling: Normalized alias/fuzzy matching, never silent fuzzy pick; user copy: "Did you mean this place?".
- EC-005 (P0): Local abbreviation → Resolve documented alias within locality; handling: Alias register and unique candidate check; user copy: "Confirm this location.".
- EC-006 (P0): Unfamiliar Taglish → Clarify unresolved field or offer manual form; handling: Schema+semantic validation; no freeform instructions; user copy: "I could not identify that place. Choose it manually.".
- EC-007 (P0): Language switches mid-sentence → Preserve roles and exclusions; handling: Held-out mixed-language cases; editable draft; user copy: "Check your origin and destination.".
- EC-008 (P0): Ambiguous place name → Show distinct locality candidates; handling: Multiple candidate IDs, confirmation; user copy: "Which San Pablo do you mean?".
- EC-009 (P0): Landmark with many branches → Require branch/locality; handling: Branch labels in Place records; user copy: "Choose the branch.".
- EC-010 (P0): Slang → Extract only understood grounded fields; handling: Short prompt; alias only for documented place names; user copy: "Please confirm these places.".
- EC-011 (P0): Unsupported location → Explain coverage and stored-place options; handling: PLACE_NOT_FOUND or OUTSIDE_COVERAGE; user copy: "This place is outside our verified coverage.".
- EC-012 (P0): Contradictory modes/preferences → Ask user to choose; no relaxation; handling: Nonempty allowed-minus-excluded validation; user copy: "Your mode preferences conflict. Which should apply?".
- EC-013 (P0): Unrelated text → No routing or fabricated chat answer; handling: kind unrelated => INVALID_INPUT; user copy: "Enter an origin and destination.".
- EC-014 (P0): Extremely long text → Reject over600 chars, retain editable input; handling: Client/controller length check before model; user copy: "Please shorten your query to 600 characters.".
- EC-015 (P0): Prompt injection → Treat as data; no arbitrary execution/route facts; handling: Fixed system prompt/schema; no tools/SQL from LLM; user copy: "Confirm the journey fields.".
- EC-016 (P0): Invalid JSON/extra keys → Reject extraction, offer retry/manual; handling: JSON.parse and strict validator; AI_INVALID_OUTPUT; user copy: "AI could not read that request. Try again or choose places.".
- EC-017 (P0): Origin/destination reversed → Show extracted fields before routing; user corrects; handling: Held-out exact-role tests; mandatory confirmation; user copy: "Check which place you are leaving and going to.".
- EC-018 (P0): Inference timeout → Stop native completion; manual/retry available; handling: AI_TIMEOUT; await stop; queryId guard; user copy: "AI took too long. You can choose places manually.".
- EC-019 (P0): Uwi/home without saved selected home → Ask destination; handling: No guessed home/history; user copy: "Which place is home for this trip?".
- EC-020 (P0): Negative/NaN walk or fare preference → Reject; explain valid units; handling: Finite nonnegative integer validation; user copy: "Enter a valid walking limit or budget.".
- EC-021 (P0): Truncated/context-full completion → Reject even if fragment resembles JSON; handling: Runtime flags plus schema validation; user copy: "AI response was incomplete. Retry or choose manually.".
- EC-022 (P0): AI claims unsupported confidence → Do not show probabilistic certainty; handling: No confidence percentage in extraction contract; user copy: "Please confirm the extracted places.".
- EC-083 (P0): Internet drops midquery → Local AI/stored routing continue; optional lookup errors separately; handling: Local ports independent of GeoPort; user copy: "Offline stored-place planning is available.".
- EC-084 (P0): Cold launch without internet → Use verified persisted model/pack; handling: Installed release JS; boot readiness; user copy: "Ready for supported stored-place trips.".
- EC-085 (P0): Model missing → Manual route form; explicit setup needed; handling: AI_NOT_READY; user copy: "Download the AI model when connected, or choose places manually.".
- EC-086 (P0): Model init failure → Do not crash/fake AI; retry/manual; handling: AI_INIT_FAILED with safe teardown; user copy: "AI is unavailable. Manual planning is available.".
- EC-087 (P0): DB missing/corrupt → Use valid bundled pack/recovery only if validated; handling: DATA_NOT_READY/DATA_INVALID; preserve backup; user copy: "Transit data could not be loaded.".
- EC-088 (P0): Storage full → Stop download/update, preserve valid resources; handling: STORAGE_FULL; .part cleanup on safe retry; user copy: "Free storage, then retry.".
- EC-089 (P0): Offline map absent → Instructions/diagram continue; no tile promise; handling: P1 map disabled offline; user copy: "Street map needs connectivity.".
- EC-090 (P0): Never downloaded model → Explain first-time setup; no AI claim; handling: Absent ModelState; manual route if data ready; user copy: "One-time AI setup needs internet.".
- EC-091 (P0): GPS unavailable → Pick stored origin; handling: Optional foreground permission/result failure; user copy: "Choose your starting place.".
- EC-092 (P0): GPS inaccurate → Ask confirmation; no blind snap; handling: Accuracy shown if available; legal walk path required; user copy: "Confirm this location or select a place.".
- EC-093 (P0): Permissions revoked → Recover with manual paths; handling: Read permission state on action/resume; user copy: "Permission is unavailable; choose manually.".
- EC-094 (P0): Restart offline → Persist model/pack; new query works; handling: Private documents + SQLite, no Metro dependency; user copy: "Offline resources are ready.".
- EC-095 (P0): Low-power mode → Short inference; allow cancel/manual; handling: Measured timeout, no promised speed; user copy: "AI may take longer; manual planning is available.".
- EC-096 (P0): Inference slow → Cancel/timeout and retry/manual; handling: Single job and stopCompletion; user copy: "AI took too long.".
- EC-097 (P0): Model/app incompatibility → Reject manifest version; safe model reset; handling: Runtime/model compatibility check; user copy: "AI resources need a compatible update.".
- EC-098 (P0): Download interrupted → Never initialize partial file; resume/retry; handling: .part + integrity + atomic promotion; user copy: "Download paused or interrupted.".
- EC-099 (P0): Hash mismatch → Delete/quarantine partial; never initialize; handling: SHA256/bytes check; user copy: "Model integrity check failed. Retry download.".
- EC-100 (P0): Pack update interrupted → Old valid pack still works; handling: Transactional import/rollback; user copy: "Previous transit data remains available.".
- EC-101 (P0): New offline address/walking link missing → Offer stored endpoint, not invented walking; handling: No offline arbitrary geocode promise; user copy: "This new address/path needs internet or a stored place.".
- EC-102 (P0): App backgrounds during inference → Stop and ignore late completion; handling: Lifecycle cancel/queryId guard; user copy: "Query cancelled. You can try again.".
- EC-062 (P1): Blurry image → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Retake when safely stopped".
- EC-063 (P1): Low lighting → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Use better light when safely stopped".
- EC-064 (P1): Glare → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Change angle safely".
- EC-065 (P1): Moving vehicle → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Do not capture while moving or near traffic".
- EC-066 (P1): Rotated signboard → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Try a clearer upright image".
- EC-067 (P1): Partial obstruction → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Some destinations are hidden".
- EC-068 (P1): Text too small → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Move closer only when safe".
- EC-069 (P1): Multiple signboards → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Select/crop one signboard".
- EC-070 (P1): Handwritten labels → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Confirm recognized text manually".
- EC-071 (P1): Mixed fonts → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Confirm recognized text".
- EC-072 (P1): Filipino/English abbreviations → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Choose the matched service".
- EC-073 (P1): Similar OCR characters → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Correct the text".
- EC-074 (P1): Ambiguous extracted destination → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Choose the intended place/service".
- EC-075 (P1): Unknown route → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "No verified service matches this sign".
- EC-076 (P1): Correct text but misleading direction → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Confirm service direction".
- EC-077 (P1): No signboard → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "No readable signboard found".
- EC-078 (P1): Camera permission denied → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Allow camera or enter sign text manually".
- EC-079 (P1): Camera unavailable → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Enter sign text manually".
- EC-080 (P1): Unsupported image file → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Choose a supported image".
- EC-081 (P1): OCR/model timeout → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Retry or enter sign text manually".
- EC-082 (P1): Device OOM → Do not recommend an unconfirmed route; offer safe retake/manual service selection; handling: If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort; user copy: "Scanner unavailable; use manual service selection".
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
src/ai/, tests/ai/, AI-specific docs/evidence/; model manifest belongs to this role. Native app config, lockfile and contracts require Member 4 coordination. Scanner is P1 only.
Shared files requiring coordination: src/contracts/*, package.json/lock, app.config.ts, tsconfig, root layout, native android/ios, global build/release scripts. Member 4 publishes contract changes first; all affected branches rebase/acknowledge. Don't independently scaffold or upgrade libraries.

Mocks permitted only under tests/development with visible DEV FIXTURE labeling. Every role eventually must verify its real dependencies: Member 1 native inference; Member 2 source-backed release graph; Member 3 realcontroller/results; Member 4 actual integrated native release. Do not overwrite existing user data during stateful tests.

## J. Git Workflow
If no repository is connected, report that accurately. During implementation Member 4 initializes/connects the team repo and publishes the baseline, then members clone/branch. Branch: feat/ai/<lowercase-task-id>. No direct shared-main changes except user-owned coordinated merges.

Standing user instruction: after each prompt/change, commit task-owned changes and push when the repository is connected. Inspect status/diff; don't commit unrelated work or secrets; no empty commit for read-only prompts. Verify remote SHA before claiming GitHub completion. Commit messages describe concrete behavior and task scope.

PR/handoff includes task IDs, actual behavior, contract diff if any, tests actually executed and known limitations. Member 4 merges after relevant checks. If branch protection unavailable, only Member 4 merges, main stays buildable. Rebase/fetch at milestones; resolve conflicts with owner, no blind ours/theirs on contracts/lockfile. Never force-push shared main.

## K. Expected Deliverables
AiPort implementation, verified manifest/download adapter, canonical RawIntent schema integration, tested lifecycle, held-out corpus, actual device benchmark/offline evidence, setup notes and model/license notices.
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
