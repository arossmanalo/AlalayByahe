// Member 3 (UI-001): the single seam between screens and the application layer.
// Member 4 constructs UiServices from the real controller/adapters and mounts <UiProvider> in app/_layout.tsx.
// Screens never touch the native model, SQLite or network directly; they only call these ports.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AiPort,
  JourneyController,
  JourneyDraft,
  ModelManifest,
  ModelState,
  Result,
  RouteRequest,
  RouteResult,
  TransitPack,
  TransitRepository,
} from "../contracts";
import { supersededError } from "./error-logic";
import { MAX_QUERY_CHARS, newQueryId } from "./form-logic";
import { strings, type Strings, type UiLanguage } from "./i18n";
import type { DropoffWatcherFactory, LocationWatchPort } from "./dropoff-alert";

export interface UiServices {
  /** "dev_fixture" shows a DEV FIXTURE banner on every screen. Release wiring must pass "real". */
  kind: "real" | "dev_fixture";
  /** Demo build only: hides the per-screen test-pack banner (the About screen still states the data is a sample). */
  hideTestPackBanner?: boolean;
  /** Demo build only: allow the stop alert on unverified sample locations (the card says so). */
  allowUnverifiedAlerts?: boolean;
  controller: JourneyController;
  ai: Pick<AiPort, "getState" | "ensureModel" | "initialize">;
  repository: Pick<TransitRepository, "getPack" | "resolvePlace">;
  /** Public model manifest from configuration, used to show download size and license. */
  modelManifest: ModelManifest | null;
  /** Mirrors configuration enableOnlineHelpers; false by default. */
  onlineHelpersEnabled: boolean;
  /** Optional native setup control supplied by Member 4; canonical AiPort is unchanged. */
  cancelModelSetup?: () => void;
  /** ALERT-003: foreground phone location for the near-stop alert (wired by Member 4). */
  location?: LocationWatchPort;
  /** ALERT-003: Member 2's createDropoffWatcher (wired by Member 4 once ALERT-001 merges). */
  createDropoffWatcher?: DropoffWatcherFactory;
}

export type PackState = { status: "loading" } | { status: "loaded"; result: Result<TransitPack> };

export type RouteVia = "confirmed" | "manual";

export interface JourneySession {
  /** The user's typed trip, preserved across edits and errors. */
  queryText: string;
  draft: JourneyDraft | null;
  /** The request whose result is currently stored. */
  request: RouteRequest | null;
  result: Result<RouteResult> | null;
  via: RouteVia | null;
  pending: { queryId: string; kind: "interpret" | "route" } | null;
}

const EMPTY_SESSION: JourneySession = {
  queryText: "",
  draft: null,
  request: null,
  result: null,
  via: null,
  pending: null,
};

const KNOWN_PLACE_LABEL_LIMIT = 30; // contract §4: place labels max 30

interface UiContextValue {
  services: UiServices;
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: Strings;
}

interface ReadinessContextValue {
  modelState: ModelState;
  startModelSetup: () => Promise<void>;
  pack: PackState;
  reloadPack: () => Promise<void>;
}

interface SessionContextValue {
  session: JourneySession;
  setQueryText: (text: string) => void;
  interpret: (text: string) => Promise<Result<JourneyDraft>>;
  startManual: () => void;
  planRoute: (request: RouteRequest, via: RouteVia) => Promise<Result<RouteResult>>;
  cancelPending: () => Promise<void>;
  resetTrip: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);
const ReadinessContext = createContext<ReadinessContextValue | null>(null);
const SessionContext = createContext<SessionContextValue | null>(null);

function sameModelState(a: ModelState, b: ModelState): boolean {
  if (a.phase !== b.phase) return false;
  if (a.phase === "ready" && b.phase === "ready") return a.modelId === b.modelId;
  if (a.phase === "failed" && b.phase === "failed") return a.error.code === b.error.code;
  if ("progress" in a && "progress" in b) return a.progress === b.progress;
  return true;
}

export function UiProvider({
  services,
  initialLanguage = "en",
  children,
}: {
  services: UiServices;
  initialLanguage?: UiLanguage;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<UiLanguage>(initialLanguage);

  // --- Readiness: AI and transit data are tracked separately (AGENTS.md).
  const [modelState, setModelState] = useState<ModelState>(() => services.ai.getState());
  const setupRunning = useRef(false);

  const updateModelState = useCallback((next: ModelState) => {
    setModelState((prev) => (sameModelState(prev, next) ? prev : next));
  }, []);

  // getState is synchronous and cheap; polling picks up boot-time initialization done by Member 4's wiring.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!setupRunning.current) updateModelState(services.ai.getState());
    }, 1000);
    return () => clearInterval(timer);
  }, [services, updateModelState]);

  const startModelSetup = useCallback(async () => {
    if (setupRunning.current) return;
    setupRunning.current = true;
    try {
      const ensured = await services.ai.ensureModel(updateModelState);
      if (!ensured.ok) {
        updateModelState({ phase: "failed", error: ensured.error });
        return;
      }
      if (services.ai.getState().phase !== "ready") {
        const init = await services.ai.initialize();
        if (!init.ok) {
          updateModelState({ phase: "failed", error: init.error });
          return;
        }
      }
      updateModelState(services.ai.getState());
    } finally {
      setupRunning.current = false;
    }
  }, [services, updateModelState]);

  const [pack, setPack] = useState<PackState>({ status: "loading" });
  const reloadPack = useCallback(async () => {
    setPack({ status: "loading" });
    const result = await services.repository.getPack();
    setPack({ status: "loaded", result });
  }, [services]);

  useEffect(() => {
    void reloadPack();
  }, [reloadPack]);

  // --- Journey session: one active job, correlated by queryId; stale results are dropped.
  const [session, setSession] = useState<JourneySession>(EMPTY_SESSION);
  const activeQueryId = useRef<string | null>(null);

  const setQueryText = useCallback((queryText: string) => {
    setSession((s) => ({ ...s, queryText }));
  }, []);

  const knownPlaceLabels = useMemo(() => {
    if (pack.status !== "loaded" || !pack.result.ok) return [];
    const labels: string[] = [];
    for (const place of pack.result.value.places) {
      if (!labels.includes(place.name)) labels.push(place.name);
      if (labels.length === KNOWN_PLACE_LABEL_LIMIT) break;
    }
    return labels;
  }, [pack]);

  const interpret = useCallback(
    async (text: string): Promise<Result<JourneyDraft>> => {
      if (activeQueryId.current) return supersededError();
      if (text.length > MAX_QUERY_CHARS) {
        return { ok: false, error: { code: "INVALID_INPUT", message: "Query too long.", retryable: false } };
      }
      const queryId = newQueryId();
      activeQueryId.current = queryId;
      setSession((s) => ({ ...s, pending: { queryId, kind: "interpret" } }));
      const result = await services.controller.interpret({
        queryId,
        text,
        locale: "taglish",
        knownPlaceLabels,
      });
      if (activeQueryId.current !== queryId) return supersededError();
      activeQueryId.current = null;
      setSession((s) => ({
        ...s,
        pending: null,
        // A new draft starts a new trip; any earlier result is now stale (EC-113).
        ...(result.ok ? { draft: result.value, request: null, result: null, via: null } : {}),
      }));
      return result;
    },
    [services, knownPlaceLabels],
  );

  const startManual = useCallback(() => {
    setSession((s) => ({ ...s, draft: null, request: null, result: null, via: null }));
  }, []);

  const planRoute = useCallback(
    async (request: RouteRequest, via: RouteVia): Promise<Result<RouteResult>> => {
      if (activeQueryId.current) return supersededError();
      activeQueryId.current = request.queryId;
      setSession((s) => ({ ...s, pending: { queryId: request.queryId, kind: "route" } }));
      const result =
        via === "manual"
          ? await services.controller.submitManual(request)
          : await services.controller.submitConfirmed(request);
      if (activeQueryId.current !== request.queryId) return supersededError();
      activeQueryId.current = null;
      setSession((s) => ({ ...s, pending: null, request, result, via }));
      return result;
    },
    [services],
  );

  const cancelPending = useCallback(async () => {
    const queryId = activeQueryId.current;
    if (!queryId) return;
    activeQueryId.current = null;
    setSession((s) => ({ ...s, pending: null }));
    await services.controller.cancel(queryId);
  }, [services]);

  const resetTrip = useCallback(() => {
    setSession((s) => ({ ...EMPTY_SESSION, queryText: s.queryText }));
  }, []);

  const uiValue = useMemo<UiContextValue>(
    () => ({ services, language, setLanguage, t: strings[language] }),
    [services, language],
  );
  const readinessValue = useMemo<ReadinessContextValue>(
    () => ({ modelState, startModelSetup, pack, reloadPack }),
    [modelState, startModelSetup, pack, reloadPack],
  );
  const sessionValue = useMemo<SessionContextValue>(
    () => ({ session, setQueryText, interpret, startManual, planRoute, cancelPending, resetTrip }),
    [session, setQueryText, interpret, startManual, planRoute, cancelPending, resetTrip],
  );

  return (
    <UiContext.Provider value={uiValue}>
      <ReadinessContext.Provider value={readinessValue}>
        <SessionContext.Provider value={sessionValue}>{children}</SessionContext.Provider>
      </ReadinessContext.Provider>
    </UiContext.Provider>
  );
}

function required<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`${name} used outside <UiProvider>.`);
  return value;
}

export function useUi(): UiContextValue {
  return required(useContext(UiContext), "useUi");
}

export function useReadiness(): ReadinessContextValue {
  return required(useContext(ReadinessContext), "useReadiness");
}

export function useJourneySession(): SessionContextValue {
  return required(useContext(SessionContext), "useJourneySession");
}
