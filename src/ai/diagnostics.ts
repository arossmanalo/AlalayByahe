import type { ExtractInput, Locale, Result } from "../contracts";
import { type CorpusCase, type RunRecord, type RunSummary, runCorpus, summarize } from "./evaluation";
import type { AiManager, CompletionEvent } from "./manager";
import { type NativeProbeReport, runNativeProbe } from "./nativeProbe";
import type { ModelStore } from "./modelStore";
import type { CompletionOutcome, LlamaRuntime } from "./runtime";

// Development diagnostics for the physical gates (AI-001 probe, AI-005 corpus
// benchmark, AI-004 on-device lifecycle). Reports are returned to the caller
// only; nothing is persisted or sent anywhere. Run from button handlers, never
// during render. Each step keeps a single native context alive at a time.

/**
 * Which APK produced a report. There are three Android variants (release,
 * benchmark, demo); every report carries this so results cannot be mixed up.
 */
export interface BuildIdentity {
  /** EXPO_PUBLIC_AI_DIAGNOSTICS=1 was inlined at build time. */
  diagnosticsFlag: boolean;
  /** EXPO_PUBLIC_DEMO_BUILD=1: synthetic/unverified demo pack; never valid for measurement. */
  demoBuild: boolean;
  /** React Native development build (__DEV__). */
  devBuild: boolean;
  /** Pack actually loaded on the device, e.g. pack_lrt1 / lrt1_2026_10_10_1. */
  packId: string | null;
  packVersion: string | null;
}

export function isValidForMeasurement(build: BuildIdentity | null): boolean {
  return build !== null && !build.demoBuild;
}

export interface DiagnosticsDeps {
  /** The app's single AI manager. */
  ai: AiManager;
  /** Identity of the running build; reports without one are not valid measurements. */
  build?: BuildIdentity;
  /** Fresh native runtime/store for the standalone probe (phone adapters on device). */
  createProbeTarget: () => { runtime: LlamaRuntime; store: ModelStore };
  /** Anonymized device label, e.g. "Android 14 / Realme 10 Pro+ 5G". No serials/IMEI. */
  platformLabel: string;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorText(result: Result<unknown>): string | null {
  return result.ok ? null : `${result.error.code}: ${result.error.message}`;
}

export interface ProbeStepReport {
  kind: "ai_001_probe";
  build: BuildIdentity | null;
  validForMeasurement: boolean;
  probe: NativeProbeReport;
  appAiReinitialized: string | null;
}

/** AI-001: release the app context, run the standalone probe, then reload the app context. */
export async function runProbeStep(deps: DiagnosticsDeps, text: string): Promise<ProbeStepReport> {
  await deps.ai.release();
  const target = deps.createProbeTarget();
  const probe = await runNativeProbe({ ...target, platformLabel: deps.platformLabel, text, now: deps.now });
  const reinit = await deps.ai.initialize();
  const build = deps.build ?? null;
  return {
    kind: "ai_001_probe",
    build,
    validForMeasurement: isValidForMeasurement(build),
    probe,
    appAiReinitialized: reinit.ok ? "ok" : errorText(reinit),
  };
}

export interface BenchmarkMiss {
  id: string;
  errorCode: string | null;
  failedSlots: string[];
  rawText: string | null;
  flags: Omit<CompletionOutcome, "text"> | null;
}

/**
 * The locale the app actually sends with every query (src/ui/services.tsx).
 * Benchmarks default to it so they measure production behavior.
 */
export const APP_QUERY_LOCALE: Locale = "taglish";

export type BenchmarkLocaleMode = "app" | "per_case";

export interface BenchmarkReport {
  kind: "ai_005_corpus";
  build: BuildIdentity | null;
  validForMeasurement: boolean;
  startedAt: string;
  platformLabel: string;
  corpusVersion: string;
  /** "app": every case sent as APP_QUERY_LOCALE; "per_case": each case's own locale (comparison only). */
  localeMode: BenchmarkLocaleMode;
  initMs: number | null;
  initError: string | null;
  summary: RunSummary | null;
  misses: BenchmarkMiss[];
  records: RunRecord[];
}

/**
 * AI-005: cold-load the app's model, then run every held-out case sequentially.
 * The first case is reported as the cold run; the rest give warm median/p95.
 */
export async function runBenchmark(
  deps: DiagnosticsDeps,
  corpus: { version: string; cases: CorpusCase[] },
  onProgress?: (done: number, total: number) => void,
  localeMode: BenchmarkLocaleMode = "app",
): Promise<BenchmarkReport> {
  const now = deps.now ?? (() => Date.now());
  const report: BenchmarkReport = {
    kind: "ai_005_corpus",
    build: deps.build ?? null,
    validForMeasurement: isValidForMeasurement(deps.build ?? null),
    startedAt: new Date().toISOString(),
    platformLabel: deps.platformLabel,
    corpusVersion: corpus.version,
    localeMode,
    initMs: null,
    initError: null,
    summary: null,
    misses: [],
    records: [],
  };

  await deps.ai.release();
  const t0 = now();
  const init = await deps.ai.initialize();
  report.initMs = now() - t0;
  if (!init.ok) {
    report.initError = errorText(init);
    return report;
  }

  const raw = new Map<string, CompletionEvent>();
  const stopObserving = deps.ai.observeCompletions((event) => raw.set(event.queryId, event));
  try {
    report.records = await runCorpus(deps.ai, corpus.cases, `bench_${t0}`, {
      firstIsCold: true,
      localeOverride: localeMode === "app" ? APP_QUERY_LOCALE : undefined,
      onRecord: (_record, index, total) => onProgress?.(index + 1, total),
    });
  } finally {
    stopObserving();
  }

  report.summary = summarize(report.records);
  report.misses = report.records
    .filter((r) => !r.score?.exact)
    .map((r) => {
      const event = raw.get(r.queryId);
      const flags = event ? (({ text: _t, ...rest }) => rest)(event.outcome) : null;
      return {
        id: r.id,
        errorCode: r.errorCode,
        failedSlots: r.score ? Object.entries(r.score.slots).filter(([, hit]) => !hit).map(([slot]) => slot) : [],
        rawText: event?.outcome.text ?? null,
        flags,
      };
    });
  return report;
}

export interface LifecycleCheck {
  name: string;
  /** null = inconclusive (e.g. the completion finished before the cancel landed). */
  pass: boolean | null;
  detail: string;
}

export interface LifecycleReport {
  kind: "ai_004_device_lifecycle";
  build: BuildIdentity | null;
  validForMeasurement: boolean;
  startedAt: string;
  platformLabel: string;
  checks: LifecycleCheck[];
  manualChecks: string[];
}

function query(queryId: string, text: string): ExtractInput {
  return { queryId, text, locale: "taglish", knownPlaceLabels: [] };
}

const LONG_QUERY =
  "Galing ako sa terminal, papunta ako sa kabilang bayan, ayoko ng bus at tricycle, hanggang 400 metro lang ang lakad, " +
  "konting lipat lang sana, at may 90 pesos lang ako. Paki-check kung may diretsong sakay.";

/** AI-004 on device: cancel mid-completion, rapid repeat, recovery after each. */
export async function runLifecycleChecks(deps: DiagnosticsDeps): Promise<LifecycleReport> {
  const wait = deps.wait ?? defaultWait;
  const checks: LifecycleCheck[] = [];
  const stamp = Date.now();

  const ready = await deps.ai.initialize();
  if (!ready.ok) {
    checks.push({ name: "initialize", pass: false, detail: errorText(ready) ?? "" });
  } else {
    const pending = deps.ai.extract(query(`life_${stamp}_cancel`, LONG_QUERY));
    await wait(300);
    await deps.ai.cancel(`life_${stamp}_cancel`);
    const cancelled = await pending;
    checks.push(
      cancelled.ok
        ? { name: "cancel_mid_completion", pass: null, detail: "Completion finished before cancel landed; rerun." }
        : {
            name: "cancel_mid_completion",
            pass: cancelled.error.code === "CANCELLED",
            detail: errorText(cancelled) ?? "",
          },
    );
    const after = await deps.ai.extract(query(`life_${stamp}_after_cancel`, "Lipa papuntang San Pablo."));
    checks.push({ name: "next_query_after_cancel", pass: after.ok, detail: errorText(after) ?? "ok" });

    const burst = ["a", "b", "c"].map(async (suffix, i) => {
      await wait(i * 50);
      return deps.ai.extract(query(`life_${stamp}_burst_${suffix}`, `Candelaria papuntang Lipa ${suffix}.`));
    });
    const [a, b, c] = await Promise.all(burst);
    const supersededOk =
      a !== undefined && b !== undefined && c !== undefined &&
      !a.ok && a.error.code === "CANCELLED" && !b.ok && b.error.code === "CANCELLED" && c.ok;
    checks.push({
      name: "rapid_repeat_latest_wins",
      pass: supersededOk,
      detail: [a, b, c].map((r, i) => `${"abc"[i]}=${r === undefined ? "missing" : (errorText(r) ?? "ok")}`).join(" "),
    });
    const state = deps.ai.getState();
    checks.push({ name: "state_ready_after_checks", pass: state.phase === "ready", detail: JSON.stringify(state) });
  }

  return {
    kind: "ai_004_device_lifecycle",
    build: deps.build ?? null,
    validForMeasurement: isValidForMeasurement(deps.build ?? null),
    startedAt: new Date(stamp).toISOString(),
    platformLabel: deps.platformLabel,
    checks,
    manualChecks: [
      "Background mid-completion: on Home, submit a query and press the device Home button within 1 s; return. Expect a cancelled query and the next query to work.",
      "Kill and relaunch: force-stop the app (adb shell am force-stop ph.alalaybyahe.app), relaunch, submit a fresh query. Expect the model to load from disk without downloading.",
    ],
  };
}
