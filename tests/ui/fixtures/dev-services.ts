// Member 3: DEV FIXTURE UiServices so screens can be exercised before INT-003 wiring exists.
// kind "dev_fixture" makes every screen show a DEV FIXTURE banner. Release wiring must never import this.
// The controller returns canned, contract-shaped results; it does no AI inference and no routing.
import type {
  AppError,
  Extraction,
  JourneyController,
  JourneyDraft,
  JourneyOption,
  ModelManifest,
  ModelState,
  PlaceCandidate,
  RawIntent,
  Result,
  RideLeg,
  RouteRequest,
  RouteResult,
  WalkLeg,
} from "../../../src/contracts";
import { DEFAULT_PREFERENCES } from "../../../src/ui/form-logic";
import type { UiServices } from "../../../src/ui/services";
import { devPack, FIXTURE_EVIDENCE } from "./dev-pack";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const fail = (code: AppError["code"], message: string, retryable: boolean, detail?: AppError["detail"]) =>
  ({ ok: false, error: { code, message, retryable, ...(detail ? { detail } : {}) } }) as const;

const placeById = (id: string) => devPack.places.find((p) => p.id === id)!;

// Public manifest values from contract v1.0 §1; shown for layout only.
export const devModelManifest: ModelManifest = {
  id: "qwen2.5-0.5b-q4_k_m",
  revision: "9217f5db79a29953eb74d5343926648285ec7e67",
  filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  bytes: 491400032,
  sha256: "74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db",
  license: "Apache-2.0",
  url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf",
};

function createFixtureAi(initial: ModelState): UiServices["ai"] {
  let state: ModelState = initial;
  return {
    getState: () => state,
    async ensureModel(onProgress) {
      for (let i = 0; i <= 10; i++) {
        state = { phase: "downloading", progress: i / 10 };
        onProgress(state);
        await delay(150);
      }
      state = { phase: "checking", progress: null };
      onProgress(state);
      await delay(400);
      return { ok: true, value: undefined };
    },
    async initialize() {
      state = { phase: "initializing", progress: null };
      await delay(400);
      state = { phase: "ready", modelId: "DEV FIXTURE (no model loaded)" };
      return { ok: true, value: undefined };
    },
  };
}

function walk(linkId: string, from: string, to: string, meters: number): WalkLeg {
  return {
    kind: "walk",
    linkId,
    fromPlaceId: from,
    toPlaceId: to,
    meters,
    instructions: ["TEST ONLY walking step."],
    evidence: FIXTURE_EVIDENCE,
  };
}

function ride(overrides: Partial<RideLeg> & Pick<RideLeg, "serviceId" | "directionId" | "mode">): RideLeg {
  return {
    kind: "ride",
    serviceName: "TEST ONLY service",
    headsign: "TEST ONLY direction",
    boardStopId: "stop_test_board",
    alightStopId: "stop_test_alight",
    boardLabel: "TEST ONLY Boarding Stop",
    alightLabel: "TEST ONLY Alighting Stop",
    alreadyOnboard: false,
    fare: { status: "unknown", minCentavos: null, maxCentavos: null, sourceIds: [], basis: "No fare in synthetic fixture." },
    evidence: FIXTURE_EVIDENCE,
    ...overrides,
  };
}

function fixtureOptions(request: RouteRequest): JourneyOption[] {
  const o = request.origin.placeId;
  const d = request.destination.placeId;
  const onboard = request.onboard !== undefined;
  const common = { datasetVersion: devPack.version, warnings: ["Synthetic test fixture; not a real journey."] };

  const unknownFare: JourneyOption = {
    ...common,
    id: "journey_test_001",
    legs: [
      ...(onboard ? [] : [walk("walk_test_access", o, "place_test_board", 100)]),
      ride({
        serviceId: "service_test_001",
        directionId: "dir_test_001",
        mode: "bus",
        serviceName: "TEST ONLY Bus Line",
        headsign: "TEST ONLY Northbound",
        alreadyOnboard: onboard,
      }),
      walk("walk_test_egress", "place_test_alight", d, 100),
    ],
    transfers: 0,
    walkMeters: onboard ? 100 : 200,
    fare: { status: "unknown", knownMinCentavos: 0, knownMaxCentavos: 0, unknownRideLegs: 1, sourceIds: [] },
    rankReason: "TEST ONLY: shortest feasible access walk in synthetic fixture.",
  };

  const partialFare: JourneyOption = {
    ...common,
    id: "journey_test_002",
    legs: [
      walk("walk_test_access", o, "place_test_board", 100),
      ride({
        serviceId: "service_test_002",
        directionId: "dir_test_002",
        mode: "jeepney",
        serviceName: "TEST ONLY Jeep Line",
        headsign: "TEST ONLY Eastbound",
        alightStopId: "stop_test_mid",
        alightLabel: "TEST ONLY Middle Stop",
        fare: { status: "verified", minCentavos: 1300, maxCentavos: 1500, sourceIds: ["source_test_fixture"], basis: "TEST ONLY flat range." },
      }),
      walk("walk_test_transfer", "place_test_mid", "place_test_mid", 50),
      ride({
        serviceId: "service_test_001",
        directionId: "dir_test_001",
        mode: "bus",
        serviceName: "TEST ONLY Bus Line",
        headsign: "TEST ONLY Northbound",
        boardStopId: "stop_test_mid",
        boardLabel: "TEST ONLY Middle Stop",
      }),
      walk("walk_test_egress", "place_test_alight", d, 100),
    ],
    transfers: 1,
    walkMeters: 250,
    fare: { status: "partial", knownMinCentavos: 1300, knownMaxCentavos: 1500, unknownRideLegs: 1, sourceIds: ["source_test_fixture"] },
    rankReason: "TEST ONLY: one transfer, partial fare.",
  };

  const completeFare: JourneyOption = {
    ...common,
    id: "journey_test_003",
    legs: [
      walk("walk_test_access", o, "place_test_board", 1250),
      ride({
        serviceId: "service_test_002",
        directionId: "dir_test_002",
        mode: "jeepney",
        serviceName: "TEST ONLY Jeep Line",
        headsign: "TEST ONLY Eastbound",
        fare: { status: "verified", minCentavos: 1300, maxCentavos: 1300, sourceIds: ["source_test_fixture"], basis: "TEST ONLY flat fare." },
      }),
    ],
    transfers: 0,
    walkMeters: 1250,
    fare: { status: "complete", knownMinCentavos: 1300, knownMaxCentavos: 1300, unknownRideLegs: 0, sourceIds: ["source_test_fixture"] },
    rankReason: "TEST ONLY: complete known fare.",
  };

  const incomplete: JourneyOption = {
    ...completeFare,
    id: "journey_test_004_incomplete",
    legs: [ride({ serviceId: "service_test_002", directionId: "dir_test_002", mode: "jeepney", alightLabel: "" })],
    rankReason: "TEST ONLY: missing alighting label; UI must hide it.",
  };

  if (onboard) return [unknownFare];
  if (request.preferences.directOnly) return [unknownFare, completeFare];
  return [unknownFare, partialFare, completeFare, incomplete];
}

function draftFor(queryId: string, text: string): JourneyDraft {
  const lower = text.toLowerCase();
  const noBus = /ayoko.*bus|no bus|walang bus/.test(lower);
  const mall = lower.includes("mall");
  const destinationCandidates: PlaceCandidate[] = mall
    ? [
        { place: placeById("place_test_mall_north"), match: "alias" },
        { place: placeById("place_test_mall_south"), match: "alias" },
      ]
    : [{ place: placeById("place_test_b"), match: "fuzzy" }];
  const intent: RawIntent = {
    kind: "journey",
    originText: "TEST ONLY Origin A",
    destinationText: mall ? "mall" : "destinasyon B",
    useCurrentLocation: false,
    allowedModes: null,
    excludedModes: noBus ? ["bus"] : [],
    priority: lower.includes("lipat") ? "fewest_transfers" : null,
    maxAccessWalkMeters: null,
    maxTransferWalkMeters: null,
    maxEgressWalkMeters: null,
    budgetCentavos: null,
    directOnly: lower.includes("diretso"),
    ambiguities: mall ? ["Which mall branch?"] : [],
  };
  const extraction: Extraction = {
    intent,
    engine: { kind: "laptop_local", modelId: "DEV FIXTURE (no model)", modelRevision: "none", runtime: "dev_fixture" },
    elapsedMs: 0,
  };
  return {
    queryId,
    extraction,
    originCandidates: [{ place: placeById("place_test_a"), match: "exact" }],
    destinationCandidates,
    preferences: {
      ...DEFAULT_PREFERENCES,
      allowedModes: DEFAULT_PREFERENCES.allowedModes.filter((m) => !(noBus && m === "bus")),
      priority: intent.priority ?? DEFAULT_PREFERENCES.priority,
      directOnly: intent.directOnly,
    },
    missingFields: [],
    warnings: ["DEV FIXTURE: this draft was not produced by a real model."],
    requiresConfirmation: true,
  };
}

function createFixtureController(): JourneyController {
  const cancelled = new Set<string>();
  const route = async (request: RouteRequest): Promise<Result<RouteResult>> => {
    await delay(500);
    if (cancelled.has(request.queryId)) return fail("CANCELLED", "Cancelled.", true);
    if (request.destination.placeId === "place_test_none") {
      return fail("NO_VERIFIED_JOURNEY", "No verified complete journey available.", false, {
        missingConnection: "TEST ONLY: selected places have no validated connecting service.",
      });
    }
    if (request.destination.placeId === "place_test_constraint") {
      return fail("CONSTRAINT_UNSATISFIED", "TEST ONLY: only a bus journey exists, and bus is excluded.", false);
    }
    return {
      ok: true,
      value: {
        queryId: request.queryId,
        options: fixtureOptions(request),
        coverageWarnings: ["DEV FIXTURE: synthetic data, not a real journey."],
      },
    };
  };
  return {
    async interpret(input) {
      await delay(700);
      if (cancelled.has(input.queryId)) return fail("CANCELLED", "Cancelled.", true);
      const lower = input.text.toLowerCase();
      if (lower.includes("timeout")) return fail("AI_TIMEOUT", "TEST ONLY simulated timeout.", true);
      if (lower.includes("unrelated")) return fail("INVALID_INPUT", "TEST ONLY: request was not a journey.", false);
      return { ok: true, value: draftFor(input.queryId, input.text) };
    },
    submitConfirmed: route,
    submitManual: route,
    async cancel(queryId) {
      cancelled.add(queryId);
    },
  };
}

export function createDevFixtureServices(options: { aiReady?: boolean } = {}): UiServices {
  return {
    kind: "dev_fixture",
    controller: createFixtureController(),
    ai: createFixtureAi(
      options.aiReady ? { phase: "ready", modelId: "DEV FIXTURE (no model loaded)" } : { phase: "absent", progress: null },
    ),
    repository: {
      async getPack() {
        await delay(200);
        return { ok: true, value: devPack };
      },
      async resolvePlace(text) {
        await delay(200);
        const q = text.trim().toLowerCase();
        const candidates: PlaceCandidate[] = devPack.places
          .filter((p) => p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.includes(q)))
          .map((p) => ({ place: p, match: p.name.toLowerCase() === q ? "exact" : p.aliases.includes(q) ? "alias" : "fuzzy" }));
        return {
          ok: true,
          value: { candidates, needsConfirmation: !(candidates.length === 1 && candidates[0]?.match === "exact") },
        };
      },
    },
    modelManifest: devModelManifest,
    onlineHelpersEnabled: false,
  };
}
