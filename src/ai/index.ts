// Pure exports (safe for Node tests). Native wiring lives in ./phone.
export { createAiManager, VERIFIED_NOT_LOADED, type AiManager, type AiManagerDeps } from "./manager";
export { createModelStore, type ModelFiles, type ModelStore, type Sha256Hasher } from "./modelStore";
export { buildCompletionRequest, interpretCompletion, validateExtractInput } from "./extract";
export { extractionSchema } from "./extractionSchema";
export { checkIntentAgainstQuery, validateRawIntent } from "./validateIntent";
export { EXPECTED_RUNTIME, INFERENCE_SETTINGS, PRIMARY_MODEL, UPGRADE_CANDIDATE_MODEL } from "./modelManifest";
export { runCorpus, scoreCase, summarize, type CorpusCase } from "./evaluation";
export { runNativeProbe, type NativeProbeReport } from "./nativeProbe";
export type { LlamaRuntime, LlamaSession } from "./runtime";
