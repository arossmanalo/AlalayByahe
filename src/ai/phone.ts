import { createExpoModelFiles } from "./expoModelFiles";
import { createLlamaRnRuntime } from "./llamaRnRuntime";
import { createAiManager, type AiManager } from "./manager";
import { PRIMARY_MODEL } from "./modelManifest";
import { createModelStore, type ModelStore } from "./modelStore";
import { createNobleSha256 } from "./nobleSha256";
import type { LlamaRuntime } from "./runtime";

// Native wiring for the installed app. Member 4's providers create exactly one
// manager per application (contract v1.0 §7) outside React render.

export function createPhoneModelStore(): ModelStore {
  return createModelStore({ manifest: PRIMARY_MODEL, files: createExpoModelFiles(), createHasher: createNobleSha256 });
}

export function createPhoneRuntime(): LlamaRuntime {
  return createLlamaRnRuntime();
}

export function createPhoneAi(): AiManager {
  return createAiManager({ store: createPhoneModelStore(), runtime: createPhoneRuntime() });
}
