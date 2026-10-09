# PROMPT 3 — Native Frontend and User Experience Developer

## A. Project Context
You are one AI coding assistant supporting a registered member of a four-person hackathon team. Start in Planning Mode. Inspect the current workspace and prepare your execution plan; do not write production code until the team/user has approved implementation. Once approved, proceed in dependency order and persist through the assigned P0 tasks.

AlalayByahe is a standalone Android AND iPhone commute assistant: ask in Filipino, English or Taglish and receive a grounded journey. Meaningful inference executes on the phone after one-time model setup; graph routing/fares and stored-place lookup are also local. Never invent boarding points, transit connections or peso amounts. Local inference interprets language; deterministic verified data decides routes.

Architecture: Expo 57/RN0.86.3 native app, llama.rn0.12.9 with Qwen2.5-0.5B-Instruct Q4_K_M (~491 MB), SQLite offline pack, strict TypeScript contracts and deterministic instructions. The exact pins/manifest are included below. This native package combination is untested: build/install/actual-inference gate on both OS first. Mac/Xcode 26.6 is reported available with free Personal Team signing; no paid Apple developer membership. Personal Team build expires in seven days; no TestFlight/App Store claim. Windows has Node 24.14/npm11.9, JDK 17, AndroidStudio but missing NDK/cmake/cmdline tools at inspected SDK; verify/install required tool versions early.

Phones: iPhone14Pro; Huawei "Pro50" exact identity pending; Realme10Pro+5G and HonorX9b. Actual installed OS/physical RAM/free storage must be inspected. No benchmarks or device compatibility results exist yet.

Target corridors: Lipa→Candelaria Quezon; Lipa→San Pablo Laguna; Candelaria→Vito Cruz/Taft. All are targets; no complete current primary stop-level pack has been established. Source verification gates decide supported subset. User permits smaller verified demo coverage if necessary and later reviewed data expansion; do not invent missing services. Town lists and terminal addresses do not establish a full journey.

P0: local Taglish extraction + confirmation, manual fallback, real directed paths, nearest useful legal boarding/dropoff, variable transfers without artificial cap, manual onboard replanning, van/jeepney/bus/tricycle/LRT types, truthful fares and offline cold-launch proof. Default walking1 km access/egress, 500 m transfers adjustable. Explicit modes/direct/budget/walk restrictions are strict; explain no match and let user choose changes. Scanner is cuttable P1; map/online helpers optional. No nationwide/live vehicle/fastest traffic claims.

New arbitrary addresses/GPS walking paths may need optional internet; offline uses stored places and documented walking links. No paid dependencies/automatic upgrades. Local model download needs internet once and persistent private storage. Optional providers receive selected addresses/coordinates, never the conversation to cloud AI.

Internal deadline: Oct 10,2026,10 AM Philippine time, with feature freeze 4 AM/release gate 6 AM/submission target 8:30 AM. Actual participant briefing PDF is missing; detailed rubric/timings/public-repo/post/one-submission rules from team prompts await confirmation. Public event page confirms team1–4, built during event, disclosure, repo/video and SM Makati afternoon demo. Follow actual official briefing if supplied; retain conservative internal deadline.

## B. Developer Role
Member 3: **Native Frontend and User Experience Developer**.
Accessible phone search, editable extraction confirmation, manual fallback, strict preferences, options/boarding/dropoff/fare/diagram, readiness/error recovery and manual onboard flow.
Your work must integrate with three peers through the complete shared contract below. Member 4 is the user and owns integration, merges, contracts and root configuration. Use the task IDs in status/handoff reports. Do not begin P1 while any critical P0 gate fails.

## C. Detailed Task List
### UI-001 — Build native shell and accessible visual system

- **Task ID:** UI-001
- **Task title:** Build native shell and accessible visual system
- **Priority:** P0
- **Objective:** Provide usable phone screens while modules are built.
- **Functional requirements:** Setup/home/confirm/results/detail/about native navigation, safe areas, readable hierarchy.
- **Technical requirements:** ExpoRouter native stack, StyleSheet, stable hooks/Pressable/Text; no new major UI library.
- **Files/modules involved:** app/index.tsx; app/setup.tsx; src/ui/theme.ts; src/ui/components/; rootlayout coordinated.
- **Dependencies:** INT-001; contract frozen.
- **Inputs:** Labeled mock readiness and valid test fixtures.
- **Outputs:** Native navigation shell and reusable status/step/button components.
- **Implementation steps:** Inspect baseline; create readable theme; build layouts; label dev fixtures; avoid render-heavy work; test small/large fonts.
- **Edge cases:** Small screen, clipped keyboard, safe area, font scaling, accessibility focus.
- **Acceptance criteria:** Every P0 screen reachable; primary actions labeled; no fixture presented as real data.
- **Testing requirements:** Physical/simulator layout and screen reader manual checks; actual device before freeze.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 supplies controller/context only; UI components don'tinitialize native engine.
- **Completion evidence:** Screen captures, tested sizes/OS and documented accessibility issues.

### UI-002 — Build text/manual entry and confirmation

- **Task ID:** UI-002
- **Task title:** Build text/manual entry and confirmation
- **Priority:** P0
- **Objective:** Let user correct AI fields and choose explicit constraints.
- **Functional requirements:** 600-character text limit; editable origin/destination; branch/locality candidates; strict modes/walk/direct/budget; manual route flow.
- **Technical requirements:** JourneyController.interpret returns JourneyDraft; confirm fields then submitConfirmed; manual selections call submitManual. Controlled stable form state; no direct raw model call.
- **Files/modules involved:** app/confirm.tsx; src/ui/journey-form.tsx; src/ui/place-picker.tsx
- **Dependencies:** UI-001; contract; mock repository/controller permitted until INT-003.
- **Inputs:** AI extraction candidates or manual place selections.
- **Outputs:** Confirmed RouteRequest; missing/ambiguous field recovery.
- **Implementation steps:** Build input form; preserve query; show candidates; enable swap/edit; apply defaults visibly; parse centavos/meters; confirm explicit exclusions.
- **Edge cases:** Destination only, home unknown, exact ambiguous name, invalid number, empty modes, same endpoint.
- **Acceptance criteria:** No hidden default origin; no automatic relaxation; all essential fields editable.
- **Testing requirements:** Manual scenarios for ambiguous branch, role correction, direct restriction and manual AI unavailable.
- **Estimated effort:** 60–75 min
- **Integration instructions:** Use JourneyController APIs; no raw generation/geocode in screen.
- **Completion evidence:** Actual form test steps/results and contract-conforming fixtures.

### UI-003 — Render grounded options and step instructions

- **Task ID:** UI-003
- **Task title:** Render grounded options and step instructions
- **Priority:** P0
- **Objective:** Make boarding, direction and dropoff obvious.
- **Functional requirements:** Up to 3 options with rank reason/transfers/fare status; ordered walk/ride steps; diagram; sources/date/warnings.
- **Technical requirements:** RouteResult/JourneyLeg templates, localized labels; no generated instructions or fastest badges.
- **Files/modules involved:** app/results.tsx; app/journey.tsx; src/ui/journey-card.tsx; src/ui/journey-steps.tsx
- **Dependencies:** UI-001; contract; ROUTE-003/004 later integration.
- **Inputs:** RouteResult or explicit test fixtures.
- **Outputs:** Accessible journey cards/detail; complete/partial/unknown fare presentation.
- **Implementation steps:** Distinguish board/dropoff; headsign prominent; show walking meters/steps; subtotal+unknown legs; evidence details; long journey scroll.
- **Edge cases:** Many transfers, unknown fare, no result, missing required leg field, range, misleading partial total.
- **Acceptance criteria:** User can name boarding point/direction/dropoff from screen; partial total never shown as total.
- **Testing requirements:** Manual fixture walkthrough then real pack journey; screen reader order and large font checks.
- **Estimated effort:** 75–90 min
- **Integration instructions:** Member 2 owns result semantics; report gaps rather than fill fields in UI.
- **Completion evidence:** Screens for complete/partial/unknown and actual route; manual results.

### UI-004 — Implement setup, offline and recovery states

- **Task ID:** UI-004
- **Task title:** Implement setup, offline and recovery states
- **Priority:** P0
- **Objective:** Make readiness and limitations actionable.
- **Functional requirements:** Model download state/progress/retry; separate pack readiness; AI unavailable manual action; unsupported/no journey/constraint errors.
- **Technical requirements:** ModelState/AppError; public readiness adapter; connectivity display not route proof.
- **Files/modules involved:** app/setup.tsx; src/ui/readiness.tsx; src/ui/error-card.tsx; src/ui/offline-status.tsx
- **Dependencies:** UI-001; AI-002; INT-002/003.
- **Inputs:** ModelState, dataset version, Result failures.
- **Outputs:** Preserved inputs and correct recovery actions; no false offline-ready label.
- **Implementation steps:** Render states; add retry/cancel; show download size; known-place offline explanation; optional online consent; specific constraint recovery.
- **Edge cases:** Offline first launch, missing model/data, full storage, GPS denied, network quota, corrupted pack.
- **Acceptance criteria:** Recovery works without restart where possible; manual flow accessible when AI fails.
- **Testing requirements:** Manual state matrix with mocks, then real interrupted download/offline test.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 wires adapters; Member 1 owns model state; no uncontrolled file access in UI.
- **Completion evidence:** State screenshots/results, verified readiness behavior and remaining limitations.

### UI-005 — Build manual onboard replan flow

- **Task ID:** UI-005
- **Task title:** Build manual onboard replan flow
- **Priority:** P0
- **Objective:** Support user's current-vehicle scenario without pretending automatic tracking.
- **Functional requirements:** Pick service/direction, confirm next known stop, destination; explain continue/transfer options and uncertainty.
- **Technical requirements:** OnboardContext and same RouteRequest/result screens; no background GPS.
- **Files/modules involved:** app/onboard.tsx; src/ui/onboard-form.tsx
- **Dependencies:** UI-002/003; ROUTE-005.
- **Inputs:** Service/direction lists and user-confirmed next stop.
- **Outputs:** Valid OnboardContext or clarification; readable downstream transfer instructions.
- **Implementation steps:** Show mode/service/headsign; filter stops by direction; require confirmation; route with context; offer pre-trip known stop fallback if uncertain.
- **Edge cases:** Unknown vehicle, passed stop, wrong direction, transfer crossing without connection.
- **Acceptance criteria:** No assertion that app knows vehicle location or arrival; no immediate unsafe dropoff prompt.
- **Testing requirements:** Manual wrong direction/useful transfer and unknown service tests; compare engine output.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 2 validates continuation; Member 4 controller accepts context.
- **Completion evidence:** Actual flow results and screenshots, tested source/fixture boundary.

### UI-006 — Verify native UX and integrate real adapters

- **Task ID:** UI-006
- **Task title:** Verify native UX and integrate real adapters
- **Priority:** P0
- **Objective:** Remove demo mocks and make flow dependable on both phones.
- **Functional requirements:** Real controller only in release; complete query→confirm→result; edit/cancel/retry; localized warnings; accessible small screen.
- **Technical requirements:** Current contracts; release flag forbids mock providers; RN best practice review.
- **Files/modules involved:** src/ui/; app/; docs/evidence/ui-qa.md; tests/ui/manual.md
- **Dependencies:** UI-002–UI-005; INT-003/005; AI-006; ROUTE-006.
- **Inputs:** Actual installed app, real pack/model and device settings.
- **Outputs:** UX QA report and fixed P0 presentation defects.
- **Implementation steps:** Switch dependency injection once; remove fixture imports; test keyboard/scaling/reader; repeated queries; record coverage/readiness; finish polish before freeze.
- **Edge cases:** Stale results, rapid tap, suspended app, giant text, incomplete instructions.
- **Acceptance criteria:** No release fixture or raw AI instructions; users can recover/modify queries; real both OS flow tested.
- **Testing requirements:** Physical Android/iPhone smoke plus accessibility manual cases.
- **Estimated effort:** 60–90 min
- **Integration instructions:** Member 4 owns wiring/release gate; UI reports semantically missing data instead of patching.
- **Completion evidence:** Executed manual checklist, OS/screen sizes, real flow clip and defects.

### UI-101 — Add optional map/scanner screens after core

- **Task ID:** UI-101
- **Task title:** Add optional map/scanner screens after core
- **Priority:** P1
- **Objective:** Improve convenience only if underlying modules are real.
- **Functional requirements:** Map requires attribution; scanner requires confirmed tokens/service; manual correction; no false offline map claim.
- **Technical requirements:** Frozen v1.1 ScanPort or verified map provider; no new paid dependency.
- **Files/modules involved:** app/scan.tsx; app/map.tsx; src/ui/ optional modules.
- **Dependencies:** All UI P0; AI-101 real OCR; Member 4 approval before freeze.
- **Inputs:** Real ScanResult or attributed map coordinates.
- **Outputs:** Optional screen with clear quality/offline limitations.
- **Implementation steps:** Confirm data/runtime; build screen; permissions; connect same route planner; test unavailable feature states.
- **Edge cases:** All scanner edge cases, unavailable tiles, dangerous camera use.
- **Acceptance criteria:** Optional feature can be disabled; core unchanged; no fake OCR.
- **Testing requirements:** Physical local OCR/offline and map attribution checks.
- **Estimated effort:** 90–180 min; outside baseline
- **Integration instructions:** Coordinate contract/native changes; never start if gates are failing.
- **Completion evidence:** Actual results/providers/attribution or explicit cut.


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
- EC-103 (P0): Origin unknown → Offer location permission or stored picker; handling: No required GPS; user copy: "Choose a starting place.".
- EC-104 (P0): Board/dropoff confusing → Different explicit labels and step order; handling: JourneyLeg-derived templates; user copy: "Board here. Get off here.".
- EC-105 (P0): Unknown transport term → Plain label and optional explanation; handling: Mode display names; user copy: "Van/UV, jeepney, bus, tricycle or LRT.".
- EC-106 (P0): Poor vision → Contrast, screen reader, noncolor warnings; handling: Accessible roles/labels, scalable type; user copy: "Warnings include text, not just color.".
- EC-107 (P0): Filipino preference → Use translated labels/fallback; handling: Locale enum; names preserved; user copy: "Mga hakbang sa biyahe.".
- EC-108 (P0): Small screen → Scrollable safe layout and accessible actions; handling: Safe area, responsive widths, keyboard handling; user copy: "All controls remain reachable.".
- EC-109 (P0): Large text overflow → Wrap and scroll; no truncation of critical stops; handling: Font-scaling manual test; user copy: "Full boarding/dropoff text remains visible.".
- EC-110 (P0): Many journey steps → Ordered readable scroll/diagram; handling: Stable keys and step order; user copy: "Follow the numbered steps.".
- EC-111 (P0): Incomplete instructions → Reject incomplete journey; no UI invented step; handling: Required leg fields + validation; user copy: "Complete instructions are unavailable.".
- EC-112 (P0): Entry mistake → Edit/swap/reset without losing everything; handling: Controlled confirmation form; user copy: "Edit your origin or destination.".
- EC-113 (P0): Edit journey after result → Invalidate stale result and replan; handling: New queryId; cancellation; user copy: "Plan updated journey.".
- EC-114 (P0): Repeat earlier search → Explicit repeat action; don't imply automatic history; handling: Current-session selection or optional consented history P2; user copy: "Run this search again.".
- EC-115 (P0): Connectivity changes → Update onlinehelper status; core stays separate; handling: Readiness independent of connectivity; user copy: "Online lookup unavailable; stored places still work.".
- EC-116 (P0): Camera/location permission denied → No permission loop; manual alternative; handling: Action-based permissions; user copy: "Choose places/services manually.".
- EC-117 (P0): Rapid submit doubletap → One active job; cancel/replace deliberately; handling: Disabled submit/loading+queryId; user copy: "Planning your journey.".
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
app/ screens except app/_layout.tsx; src/ui/; tests/ui/; UI docs/evidence/. Root layout, controllers, native modules, SQLite, contracts/dependencies require coordination.
Shared files requiring coordination: src/contracts/*, package.json/lock, app.config.ts, tsconfig, root layout, native android/ios, global build/release scripts. Member 4 publishes contract changes first; all affected branches rebase/acknowledge. Don't independently scaffold or upgrade libraries.

Mocks permitted only under tests/development with visible DEV FIXTURE labeling. Every role eventually must verify its real dependencies: Member 1 native inference; Member 2 source-backed release graph; Member 3 realcontroller/results; Member 4 actual integrated native release. Do not overwrite existing user data during stateful tests.

## J. Git Workflow
If no repository is connected, report that accurately. During implementation Member 4 initializes/connects the team repo and publishes the baseline, then members clone/branch. Branch: feat/ui/<lowercase-task-id>. No direct shared-main changes except user-owned coordinated merges.

Standing user instruction: after each prompt/change, commit task-owned changes and push when the repository is connected. Inspect status/diff; don't commit unrelated work or secrets; no empty commit for read-only prompts. Verify remote SHA before claiming GitHub completion. Commit messages describe concrete behavior and task scope.

PR/handoff includes task IDs, actual behavior, contract diff if any, tests actually executed and known limitations. Member 4 merges after relevant checks. If branch protection unavailable, only Member 4 merges, main stays buildable. Rebase/fetch at milestones; resolve conflicts with owner, no blind ours/theirs on contracts/lockfile. Never force-push shared main.

## K. Expected Deliverables
Native P0 screens/components, exact adapters to JourneyController, visible labeled development fixtures removed from release, accessible layouts, actual both-platform UX check results and limitations.
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
