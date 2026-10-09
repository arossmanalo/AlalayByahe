import { INFERENCE_SETTINGS, PRIMARY_MODEL } from "../ai/modelManifest";

export const MODEL_MANIFEST = Object.freeze(PRIMARY_MODEL);
export const APP_LIMITS = Object.freeze({
  maxInputCharacters: 600,
  maxKnownPlaceLabels: 30,
  inferenceTimeoutMs: INFERENCE_SETTINGS.warmTimeoutMs,
  controllerTimeoutMs: INFERENCE_SETTINGS.coldTimeoutMs + INFERENCE_SETTINGS.stopSettleTimeoutMs,
  routingLabelLimit: 10_000,
  // DEMO BUILD ONLY: the joined demo network needs a larger computation guard so every pair of demo
  // places finishes (measured: 50,000 labels, slowest pair about 21 ms on a laptop). Release keeps 10,000.
  demoRoutingLabelLimit: 50_000,
  enableOnlineHelpers: false,
});
