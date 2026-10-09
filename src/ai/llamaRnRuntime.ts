import { BuildInfo, initLlama, type LlamaContext } from "llama.rn";
import { extractCompletionText } from "./completionText";
import { EXPECTED_RUNTIME } from "./modelManifest";
import type { CompletionOutcome, CompletionRequest, LlamaRuntime, LlamaSession, LoadSettings } from "./runtime";

// Real phone-local adapter over llama.rn 0.12.9 (checked against its installed
// typings). Only the manager calls it; UI code never touches the native context.

function toOutcome(result: Awaited<ReturnType<LlamaContext["completion"]>>): CompletionOutcome {
  const picked = extractCompletionText(result.text, result.content);
  return {
    text: picked.text,
    ...(picked.rawText !== undefined ? { rawText: picked.rawText } : {}),
    truncated: result.truncated,
    contextFull: result.context_full,
    interrupted: result.interrupted,
    stoppedEos: result.stopped_eos,
    stoppedLimit: result.stopped_limit > 0,
    tokensPredicted: result.tokens_predicted,
    tokensEvaluated: result.tokens_evaluated,
    tokensCached: result.tokens_cached,
    promptMs: result.timings?.prompt_ms ?? 0,
    predictedMs: result.timings?.predicted_ms ?? 0,
  };
}

function createSession(context: LlamaContext): LlamaSession {
  let released = false;
  return {
    async complete(request: CompletionRequest): Promise<CompletionOutcome> {
      if (released) throw new Error("Llama context already released.");
      const result = await context.completion({
        messages: request.messages,
        // llama.rn's default; set explicitly so a default change cannot alter the prompt.
        // It does not remove the header from `text` (see completionText.ts).
        add_generation_prompt: true,
        n_predict: request.maxTokens,
        temperature: request.temperature,
        seed: request.seed,
        response_format: { type: "json_schema", json_schema: { strict: true, schema: request.jsonSchema } },
      });
      return toOutcome(result);
    },
    async stop(): Promise<void> {
      if (!released) await context.stopCompletion();
    },
    async release(): Promise<void> {
      if (released) return;
      released = true;
      await context.release();
    },
  };
}

export function createLlamaRnRuntime(): LlamaRuntime {
  return {
    info: {
      kind: "phone_local",
      label: `${EXPECTED_RUNTIME.packageName}@${EXPECTED_RUNTIME.packageVersion} (llama.cpp b${BuildInfo.number})`,
      llamaCppBuild: String(BuildInfo.number),
    },
    async load(modelPath: string, settings: LoadSettings, onProgress?: (fraction: number) => void) {
      const context = await initLlama(
        {
          model: modelPath,
          n_ctx: settings.contextTokens,
          n_gpu_layers: settings.gpuLayers,
          // One sequence: the manager allows a single active completion.
          n_parallel: 1,
          use_mlock: false,
        },
        // llama.rn reports 0-100; the contract exposes 0-1 only.
        onProgress ? (percent) => onProgress(Math.min(1, Math.max(0, percent / 100))) : undefined,
      );
      return createSession(context);
    },
  };
}
