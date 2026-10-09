import type { ModelManifest } from "../contracts";

// Publisher-pinned model from contract v1.0 §1. Changing any field is a
// coordinated contract change (Member 4), not a local edit.
export const PRIMARY_MODEL: ModelManifest = {
  id: "qwen2.5-0.5b-q4_k_m",
  revision: "9217f5db79a29953eb74d5343926648285ec7e67",
  filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  bytes: 491400032,
  sha256: "74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db",
  license: "Apache-2.0",
  url:
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/" +
    "9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf",
};

// Upgrade candidate only after AI-005 measurement. Never downloaded by default.
export const UPGRADE_CANDIDATE_MODEL: ModelManifest = {
  id: "qwen2.5-1.5b-q4_k_m",
  revision: "91cad51170dc346986eccefdc2dd33a9da36ead9",
  filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  bytes: 1117320736,
  sha256: "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e",
  license: "Apache-2.0",
  url:
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/" +
    "91cad51170dc346986eccefdc2dd33a9da36ead9/qwen2.5-1.5b-instruct-q4_k_m.gguf",
};

// Native runtime the manifest was pinned against. initialize() refuses a
// different llama.cpp build so an unreviewed upgrade cannot load silently.
export const EXPECTED_RUNTIME = {
  packageName: "llama.rn",
  packageVersion: "0.12.9",
  llamaCppBuild: "10256",
} as const;

// Initial engineering settings from contract v1.0 §1/§7. Not measured yet.
export const INFERENCE_SETTINGS = {
  contextTokens: 2048,
  maxOutputTokens: 256,
  temperature: 0,
  seed: 42,
  gpuLayers: 0,
  warmTimeoutMs: 15_000,
  coldTimeoutMs: 30_000,
  stopSettleTimeoutMs: 5_000,
  maxInputCharacters: 600,
  maxKnownPlaceLabels: 30,
} as const;

export type InferenceSettings = { -readonly [K in keyof typeof INFERENCE_SETTINGS]: number };

export function isSameManifest(a: ModelManifest, b: ModelManifest): boolean {
  return (
    a.id === b.id &&
    a.revision === b.revision &&
    a.filename === b.filename &&
    a.bytes === b.bytes &&
    a.sha256.toLowerCase() === b.sha256.toLowerCase() &&
    a.url === b.url
  );
}
