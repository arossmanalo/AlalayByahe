import type { ExtractInput, RawIntent } from "../contracts";
import { buildCompletionRequest, interpretCompletion } from "./extract";
import { INFERENCE_SETTINGS } from "./modelManifest";
import type { ModelStore } from "./modelStore";
import type { CompletionOutcome, LlamaRuntime } from "./runtime";

// AI-001 gate: load the publisher GGUF, run one fresh schema-constrained
// completion, release, and return everything needed for docs/evidence/native-gate.md.
// Call from a development button handler, never during render.

export interface NativeProbeReport {
  startedAt: string;
  platformLabel: string;
  runtime: string;
  runtimeKind: string;
  modelId: string;
  modelRevision: string;
  modelVerification: "verified_marker" | "verified_now" | "failed";
  verificationMs: number | null;
  loadMs: number | null;
  completionMs: number | null;
  queryText: string;
  rawText: string | null;
  /** Text actually validated (chat template header removed), when it differs from rawText. */
  textUsed: string | null;
  outcome: Omit<CompletionOutcome, "text"> | null;
  parsed: { ok: true; intent: RawIntent } | { ok: false; code: string; detail: string } | null;
  error: string | null;
}

export interface NativeProbeOptions {
  runtime: LlamaRuntime;
  store: ModelStore;
  /** Anonymized, e.g. "Android 15 / Realme 10 Pro+" — no device identifiers. */
  platformLabel: string;
  text: string;
  now?: () => number;
}

export async function runNativeProbe(options: NativeProbeOptions): Promise<NativeProbeReport> {
  const { runtime, store } = options;
  const now = options.now ?? (() => Date.now());
  const report: NativeProbeReport = {
    startedAt: new Date().toISOString(),
    platformLabel: options.platformLabel,
    runtime: runtime.info.label,
    runtimeKind: runtime.info.kind,
    modelId: store.manifest.id,
    modelRevision: store.manifest.revision,
    modelVerification: "failed",
    verificationMs: null,
    loadMs: null,
    completionMs: null,
    queryText: options.text,
    rawText: null,
    textUsed: null,
    outcome: null,
    parsed: null,
    error: null,
  };

  let path: string;
  const inspection = await store.inspect();
  if (inspection.status === "verified") {
    report.modelVerification = "verified_marker";
    path = inspection.path;
  } else {
    const t0 = now();
    const verified = await store.verifyExisting(() => undefined, new AbortController().signal);
    report.verificationMs = now() - t0;
    if (!verified.ok) {
      report.error = `Model not verified: ${verified.error.code} ${verified.error.detail?.missingConnection ?? ""}`.trim();
      return report;
    }
    report.modelVerification = "verified_now";
    path = verified.value;
  }

  const input: ExtractInput = { queryId: "probe_ai_001", text: options.text, locale: "taglish", knownPlaceLabels: [] };
  const t1 = now();
  let session;
  try {
    session = await runtime.load(path, {
      contextTokens: INFERENCE_SETTINGS.contextTokens,
      gpuLayers: INFERENCE_SETTINGS.gpuLayers,
    });
  } catch (e) {
    report.error = `Load failed: ${String(e)}`;
    return report;
  }
  report.loadMs = now() - t1;

  try {
    const t2 = now();
    const outcome = await session.complete(buildCompletionRequest(input));
    report.completionMs = now() - t2;
    const { text, rawText, ...flags } = outcome;
    report.rawText = rawText ?? text;
    report.textUsed = rawText !== undefined ? text : null;
    report.outcome = flags;
    const parsed = interpretCompletion(outcome, input);
    report.parsed = parsed.ok
      ? { ok: true, intent: parsed.value }
      : { ok: false, code: parsed.error.code, detail: parsed.error.detail?.missingConnection ?? parsed.error.message };
  } catch (e) {
    report.error = `Completion failed: ${String(e)}`;
  } finally {
    await session.release().catch(() => undefined);
  }
  return report;
}
