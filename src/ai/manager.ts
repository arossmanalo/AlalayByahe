import type { AiPort, ExtractInput, Extraction, ModelState, Result } from "../contracts";
import { AI_MESSAGES, fail, ok } from "./errors";
import { buildCompletionRequest, interpretCompletion, validateExtractInput } from "./extract";
import { EXPECTED_RUNTIME, INFERENCE_SETTINGS, type InferenceSettings } from "./modelManifest";
import type { ModelStore } from "./modelStore";
import type { CompletionOutcome, CompletionRequest, LlamaRuntime, LlamaSession } from "./runtime";
import { buildSummaryRequest, checkSummary, templateSummary, tripFacts, type TripSummary, type TripSummaryInput } from "./summary";

/**
 * ModelState has no "installed but not loaded" phase in contract v1.0. Until a
 * v1.1 phase exists, a verified file awaiting initialize() reports checking/1.
 */
export const VERIFIED_NOT_LOADED: ModelState = { phase: "checking", progress: 1 };
const ABSENT: ModelState = { phase: "absent", progress: null };

export interface AiManager extends AiPort {
  subscribe(listener: (state: ModelState) => void): () => void;
  /** For the app lifecycle listener (Member 4): background / memory pressure. */
  cancelActive(): Promise<void>;
  /** Cancels an in-flight ensureModel() download or verification. */
  cancelModelSetup(): void;
  /**
   * Development diagnostics only (AI-005): raw native results of completions that
   * finished on their own. Held in memory by the caller; never persisted here.
   */
  observeCompletions(listener: (event: CompletionEvent) => void): () => void;
  /**
   * AI trip summary of one verified journey option (user-approved, 2026-10-10). Always resolves with a
   * summary: the model's text only if it passes checkSummary, otherwise the deterministic template.
   * Shares the single active completion, so it is cancelled by cancel(queryId) and by a newer query.
   */
  summarize(input: TripSummaryInput): Promise<Result<TripSummary>>;
}

export interface CompletionEvent {
  queryId: string;
  outcome: CompletionOutcome;
  elapsedMs: number;
}

export interface Timers {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface AiManagerDeps {
  store: ModelStore;
  runtime: LlamaRuntime;
  expectedLlamaCppBuild?: string;
  settings?: Partial<InferenceSettings>;
  timers?: Timers;
}

type AbortReason = "cancelled" | "timeout" | "superseded" | "released" | "background";

interface Job {
  queryId: string;
  session: LlamaSession;
  abortReason: AbortReason | null;
  signalAbort: () => void;
  aborted: Promise<void>;
  settled: Promise<void>;
  stopping: Promise<void> | null;
}

const defaultTimers: Timers = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createAiManager(deps: AiManagerDeps): AiManager {
  const { store, runtime } = deps;
  const manifest = store.manifest;
  const settings: InferenceSettings = { ...INFERENCE_SETTINGS, ...deps.settings };
  const timers = deps.timers ?? defaultTimers;
  const expectedBuild = deps.expectedLlamaCppBuild ?? EXPECTED_RUNTIME.llamaCppBuild;

  let state: ModelState = ABSENT;
  const listeners = new Set<(s: ModelState) => void>();
  const completionObservers = new Set<(event: CompletionEvent) => void>();
  let session: LlamaSession | null = null;
  let warm = false;
  let lifecycleEpoch = 0;
  let initPromise: Promise<Result<void>> | null = null;
  let setupPromise: Promise<Result<void>> | null = null;
  let setupAbort: AbortController | null = null;
  let active: Job | null = null;
  let requestSeq = 0;
  const pendingQueryIds = new Set<string>();
  const cancelledPending = new Set<string>();

  function setState(next: ModelState): void {
    state = next;
    for (const listener of listeners) {
      try {
        listener(next);
      } catch {
        // A UI listener failure must not break inference state.
      }
    }
  }

  function settleWithin(promise: Promise<void>, ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      const handle = timers.setTimeout(() => resolve(false), ms);
      promise.then(() => {
        timers.clearTimeout(handle);
        resolve(true);
      });
    });
  }

  function abortJob(job: Job, reason: AbortReason): Promise<void> {
    if (job.abortReason === null) job.abortReason = reason;
    job.signalAbort();
    if (job.stopping) return job.stopping;
    job.stopping = (async () => {
      try {
        await job.session.stop();
      } catch {
        // Stop failures are judged by whether the completion settles below.
      }
      const stopped = await settleWithin(job.settled, settings.stopSettleTimeoutMs);
      if (active === job) active = null;
      if (!stopped && session === job.session) {
        // Native generation ignored stop; this context can no longer be trusted.
        session = null;
        warm = false;
        job.session.release().catch(() => undefined);
        setState({
          phase: "failed",
          error: { code: "AI_INIT_FAILED", message: AI_MESSAGES.initFailed, retryable: true },
        });
      }
    })();
    return job.stopping;
  }

  async function stateAfterUnload(): Promise<ModelState> {
    try {
      const inspection = await store.inspect();
      return inspection.status === "verified" ? VERIFIED_NOT_LOADED : ABSENT;
    } catch {
      return ABSENT;
    }
  }

  function getState(): ModelState {
    return state;
  }

  function ensureModel(onProgress: (state: ModelState) => void): Promise<Result<void>> {
    if (state.phase === "ready" && session) return Promise.resolve(ok(undefined));
    // A verified model is already being loaded; do not overwrite that state.
    if (initPromise) return Promise.resolve(ok(undefined));
    if (setupPromise) return setupPromise;
    const controller = new AbortController();
    setupAbort = controller;
    const emit = (next: ModelState) => {
      setState(next);
      try {
        onProgress(next);
      } catch {
        // Progress callbacks are advisory.
      }
    };
    setupPromise = (async (): Promise<Result<void>> => {
      try {
        const inspection = await store.inspect();
        if (inspection.status === "verified") {
          if (!session) emit(VERIFIED_NOT_LOADED);
          return ok(undefined);
        }
        if (inspection.status === "unverified") {
          const verified = await store.verifyExisting(emit, controller.signal);
          if (verified.ok) {
            emit(VERIFIED_NOT_LOADED);
            return ok(undefined);
          }
          if (verified.error.code === "CANCELLED") {
            emit(ABSENT);
            return fail(verified.error.code, verified.error.message, true);
          }
          // The corrupt file was removed; continue with a fresh explicit download.
        }
        const acquired = await store.acquire(emit, controller.signal);
        if (!acquired.ok) {
          emit(acquired.error.code === "CANCELLED" ? ABSENT : { phase: "failed", error: acquired.error });
          return { ok: false, error: acquired.error };
        }
        emit(VERIFIED_NOT_LOADED);
        return ok(undefined);
      } catch (e) {
        const error = { code: "AI_NOT_READY" as const, message: AI_MESSAGES.notReady, retryable: true };
        emit({ phase: "failed", error });
        return fail(error.code, error.message, true, { missingConnection: String(e) });
      }
    })().finally(() => {
      setupPromise = null;
      setupAbort = null;
    });
    return setupPromise;
  }

  function initialize(): Promise<Result<void>> {
    if (state.phase === "ready" && session) return Promise.resolve(ok(undefined));
    if (initPromise) return initPromise;
    if (setupPromise) return Promise.resolve(fail("AI_NOT_READY", "AI model setup is still running.", true));
    const epoch = lifecycleEpoch;
    initPromise = (async (): Promise<Result<void>> => {
      if (runtime.info.llamaCppBuild !== expectedBuild) {
        const error = { code: "AI_INIT_FAILED" as const, message: AI_MESSAGES.incompatible, retryable: false };
        setState({ phase: "failed", error });
        return fail(error.code, error.message, false, {
          missingConnection: `Runtime ${runtime.info.label} does not match pinned llama.cpp build ${expectedBuild}.`,
        });
      }

      let modelPath: string;
      try {
        const inspection = await store.inspect();
        if (inspection.status === "absent") {
          setState(ABSENT);
          return fail("AI_NOT_READY", AI_MESSAGES.notReady, true);
        }
        if (inspection.status === "unverified") {
          // Local verification only (e.g. a manually preloaded file); never downloads.
          const verified = await store.verifyExisting(setState, new AbortController().signal);
          if (!verified.ok) {
            setState(ABSENT);
            return { ok: false, error: verified.error };
          }
          modelPath = verified.value;
        } else {
          modelPath = inspection.path;
        }
      } catch (e) {
        setState(ABSENT);
        return fail("AI_NOT_READY", AI_MESSAGES.notReady, true, { missingConnection: String(e) });
      }

      setState({ phase: "initializing", progress: 0 });
      let loaded: LlamaSession;
      try {
        loaded = await runtime.load(
          modelPath,
          { contextTokens: settings.contextTokens, gpuLayers: settings.gpuLayers },
          (fraction) => {
            if (epoch === lifecycleEpoch && state.phase === "initializing") {
              setState({ phase: "initializing", progress: Math.min(1, Math.max(0, fraction)) });
            }
          },
        );
      } catch (e) {
        const error = { code: "AI_INIT_FAILED" as const, message: AI_MESSAGES.initFailed, retryable: true };
        setState({ phase: "failed", error });
        return fail(error.code, error.message, true, { missingConnection: String(e) });
      }

      if (epoch !== lifecycleEpoch) {
        // release() ran while loading; do not keep a context nobody owns.
        await loaded.release().catch(() => undefined);
        return fail("CANCELLED", "AI was released before it finished loading.", true);
      }
      session = loaded;
      warm = false;
      setState({ phase: "ready", modelId: manifest.id });
      return ok(undefined);
    })().finally(() => {
      initPromise = null;
    });
    return initPromise;
  }

  /** One active completion with queryId correlation, cancel, timeout and awaited native stop. */
  async function runCompletion(
    queryId: string,
    request: CompletionRequest,
  ): Promise<Result<{ outcome: CompletionOutcome; elapsedMs: number }>> {
    const seq = ++requestSeq;
    pendingQueryIds.add(queryId);
    try {
      // One active completion: a newer query stops the older one and waits for
      // native generation to settle before starting.
      while (active) await abortJob(active, "superseded");
      if (seq !== requestSeq) return fail("CANCELLED", "A newer query replaced this one.", true);
      if (cancelledPending.delete(queryId)) return fail("CANCELLED", AI_MESSAGES.cancelled, true);
    } finally {
      pendingQueryIds.delete(queryId);
    }

    const current = session;
    if (state.phase !== "ready" || !current) return fail("AI_NOT_READY", AI_MESSAGES.notReady, true);

    let signalAbort = () => {};
    const aborted = new Promise<void>((resolve) => {
      signalAbort = resolve;
    });
    const startedAt = timers.now();
    let native: Promise<CompletionOutcome>;
    try {
      native = current.complete(request);
    } catch (e) {
      native = Promise.reject(e);
    }
    const job: Job = {
      queryId: queryId,
      session: current,
      abortReason: null,
      signalAbort,
      aborted,
      settled: native.then(
        () => undefined,
        () => undefined,
      ),
      stopping: null,
    };
    active = job;

    let timeoutHandle: unknown;
    const timedOut = new Promise<void>((resolve) => {
      timeoutHandle = timers.setTimeout(resolve, warm ? settings.warmTimeoutMs : settings.coldTimeoutMs);
    });
    type Winner =
      | { kind: "done"; outcome: CompletionOutcome }
      | { kind: "error"; error: unknown }
      | { kind: "aborted" }
      | { kind: "timeout" };
    const winner: Winner = await Promise.race<Winner>([
      native.then(
        (outcome) => ({ kind: "done", outcome }),
        (error: unknown) => ({ kind: "error", error }),
      ),
      aborted.then(() => ({ kind: "aborted" })),
      timedOut.then(() => ({ kind: "timeout" })),
    ]);
    timers.clearTimeout(timeoutHandle);

    if (winner.kind === "timeout" && job.abortReason === null) await abortJob(job, "timeout");
    if (job.abortReason !== null) {
      if (job.stopping) await job.stopping;
      return job.abortReason === "timeout"
        ? fail("AI_TIMEOUT", AI_MESSAGES.timeout, true)
        : fail("CANCELLED", AI_MESSAGES.cancelled, true);
    }

    if (active === job) active = null;
    if (winner.kind === "error") {
      return fail("AI_INVALID_OUTPUT", AI_MESSAGES.invalidOutput, true, {
        field: "completion",
        missingConnection: String(winner.error),
      });
    }
    if (winner.kind !== "done") return fail("CANCELLED", AI_MESSAGES.cancelled, true);
    warm = true;
    const elapsedMs = Math.max(0, Math.round(timers.now() - startedAt));
    return ok({ outcome: winner.outcome, elapsedMs });
  }

  async function extract(rawInput: ExtractInput): Promise<Result<Extraction>> {
    const checked = validateExtractInput(rawInput, settings);
    if (!checked.ok) return checked;
    const input = checked.value;

    const completed = await runCompletion(input.queryId, buildCompletionRequest(input, settings));
    if (!completed.ok) return completed;
    const { outcome, elapsedMs } = completed.value;
    for (const observer of completionObservers) {
      try {
        observer({ queryId: input.queryId, outcome: outcome, elapsedMs });
      } catch {
        // Diagnostics must never affect extraction.
      }
    }

    const intent = interpretCompletion(outcome, input, settings.maxOutputTokens);
    if (!intent.ok) return intent;
    return ok({
      intent: intent.value,
      engine: {
        kind: runtime.info.kind,
        modelId: manifest.id,
        modelRevision: manifest.revision,
        runtime: runtime.info.label,
      },
      elapsedMs,
    });
  }

  async function summarize(input: TripSummaryInput): Promise<Result<TripSummary>> {
    const facts = tripFacts(input.option, input.request);
    const fallback = (reason: NonNullable<TripSummary["fallbackReason"]>): Result<TripSummary> =>
      ok({ text: templateSummary(facts, input.language), source: "template", fallbackReason: reason });
    if (state.phase !== "ready" || !session) return fallback("ai_not_ready");
    const completed = await runCompletion(input.queryId, buildSummaryRequest(facts, input.language));
    if (!completed.ok) {
      if (completed.error.code === "CANCELLED") return completed;
      return fallback(completed.error.code === "AI_NOT_READY" ? "ai_not_ready" : "ai_failed");
    }
    const text = checkSummary(completed.value.outcome, facts);
    if (text === null) return fallback("check_failed");
    return ok({
      text,
      source: "phone_ai",
      engine: { modelId: manifest.id, modelRevision: manifest.revision, runtime: runtime.info.label },
      elapsedMs: completed.value.elapsedMs,
    });
  }

  async function cancel(queryId: string): Promise<void> {
    if (active && active.queryId === queryId) {
      await abortJob(active, "cancelled");
    } else if (pendingQueryIds.has(queryId)) {
      cancelledPending.add(queryId);
    }
  }

  async function cancelActive(): Promise<void> {
    requestSeq++;
    if (active) await abortJob(active, "background");
  }

  function cancelModelSetup(): void {
    setupAbort?.abort();
  }

  async function release(): Promise<void> {
    lifecycleEpoch++;
    requestSeq++;
    // Detach first so no new completion can start on a context being released.
    const loaded = session;
    session = null;
    warm = false;
    if (active) await abortJob(active, "released");
    if (initPromise) await initPromise.catch(() => undefined);
    if (loaded) await loaded.release().catch(() => undefined);
    setState(await stateAfterUnload());
  }

  function subscribe(listener: (s: ModelState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function observeCompletions(listener: (event: CompletionEvent) => void): () => void {
    completionObservers.add(listener);
    return () => {
      completionObservers.delete(listener);
    };
  }

  return {
    getState,
    ensureModel,
    initialize,
    extract,
    summarize,
    cancel,
    release,
    subscribe,
    cancelActive,
    cancelModelSetup,
    observeCompletions,
  };
}
