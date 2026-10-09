import { INFERENCE_SETTINGS, PRIMARY_MODEL } from "../ai/modelManifest";

export const MODEL_MANIFEST = Object.freeze(PRIMARY_MODEL);
export const APP_LIMITS = Object.freeze({
  maxInputCharacters: 600,
  maxKnownPlaceLabels: 30,
  inferenceTimeoutMs: INFERENCE_SETTINGS.warmTimeoutMs,
  controllerTimeoutMs: INFERENCE_SETTINGS.coldTimeoutMs + INFERENCE_SETTINGS.stopSettleTimeoutMs,
  routingLabelLimit: 10_000,
  enableOnlineHelpers: false,
});
