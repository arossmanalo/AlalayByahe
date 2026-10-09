import type { ModelManifest } from "../contracts";

export const MODEL_MANIFEST: Readonly<ModelManifest> = Object.freeze({
  id: "qwen2.5-0.5b-q4_k_m",
  revision: "9217f5db79a29953eb74d5343926648285ec7e67",
  filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  bytes: 491400032,
  sha256: "74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db",
  license: "Apache-2.0",
  url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf",
});
export const APP_LIMITS = Object.freeze({
  maxInputCharacters: 600,
  maxKnownPlaceLabels: 30,
  inferenceTimeoutMs: 15_000,
  routingLabelLimit: 10_000,
  enableOnlineHelpers: false,
});

