import type { Extraction } from "../contracts";
import type { ChatMessage } from "./prompt";

// Port over the native inference library. The llama.rn adapter implements it on
// phones; tests use a labeled fake. Nothing here imports React or native code.

export interface RuntimeInfo {
  kind: Extraction["engine"]["kind"];
  /** e.g. "llama.rn@0.12.9 (llama.cpp b10256)" — reported in Extraction.engine.runtime. */
  label: string;
  /** llama.cpp build reported by the native library, compared with EXPECTED_RUNTIME. */
  llamaCppBuild: string;
}

export interface LoadSettings {
  contextTokens: number;
  gpuLayers: number;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  jsonSchema: object;
  maxTokens: number;
  temperature: number;
  seed: number;
}

export interface CompletionOutcome {
  /** Text handed to JSON validation (template header removed, see completionText.ts). */
  text: string;
  /** Native text before cleaning, kept for evidence when it differs from `text`. */
  rawText?: string;
  truncated: boolean;
  contextFull: boolean;
  interrupted: boolean;
  stoppedEos: boolean;
  stoppedLimit: boolean;
  tokensPredicted: number;
  tokensEvaluated: number;
  tokensCached: number;
  promptMs: number;
  predictedMs: number;
}

export interface LlamaSession {
  complete(request: CompletionRequest): Promise<CompletionOutcome>;
  /** Asks native code to stop the active completion; complete() then settles. */
  stop(): Promise<void>;
  release(): Promise<void>;
}

export interface LlamaRuntime {
  readonly info: RuntimeInfo;
  load(modelPath: string, settings: LoadSettings, onProgress?: (fraction: number) => void): Promise<LlamaSession>;
}
