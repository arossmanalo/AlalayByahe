import type { ExtractInput, Locale, RawIntent, Result } from "../contracts";
import { AI_MESSAGES, fail, ok } from "./errors";
import { extractionSchema } from "./extractionSchema";
import { INFERENCE_SETTINGS } from "./modelManifest";
import { buildMessages } from "./prompt";
import type { CompletionOutcome, CompletionRequest } from "./runtime";
import { checkIntentAgainstQuery, validateRawIntent } from "./validateIntent";

const LOCALES: readonly Locale[] = ["en", "fil", "taglish"];
const MAX_QUERY_ID_CHARS = 128;
const MAX_LABEL_CHARS = 120;

/** Boundary check before any model work (EC-014, EC-020-style input rejection). */
export function validateExtractInput(
  input: unknown,
  limits: { maxInputCharacters: number; maxKnownPlaceLabels: number } = INFERENCE_SETTINGS,
): Result<ExtractInput> {
  if (typeof input !== "object" || input === null) {
    return fail("INVALID_INPUT", AI_MESSAGES.emptyQuery, false, { field: "input" });
  }
  const { queryId, text, locale, knownPlaceLabels } = input as Record<string, unknown>;
  if (typeof queryId !== "string" || queryId.trim().length === 0 || queryId.length > MAX_QUERY_ID_CHARS) {
    return fail("INVALID_INPUT", "Query ID is missing or invalid.", false, { field: "queryId" });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return fail("INVALID_INPUT", AI_MESSAGES.emptyQuery, false, { field: "text" });
  }
  if (Array.from(text).length > limits.maxInputCharacters) {
    return fail("INVALID_INPUT", AI_MESSAGES.tooLong, false, { field: "text" });
  }
  if (typeof locale !== "string" || !(LOCALES as readonly string[]).includes(locale)) {
    return fail("INVALID_INPUT", "Unsupported language setting.", false, { field: "locale" });
  }
  if (
    !Array.isArray(knownPlaceLabels) ||
    knownPlaceLabels.length > limits.maxKnownPlaceLabels ||
    !knownPlaceLabels.every((l) => typeof l === "string" && l.length <= MAX_LABEL_CHARS)
  ) {
    return fail("INVALID_INPUT", "Too many or invalid known place labels.", false, { field: "knownPlaceLabels" });
  }
  return ok({ queryId, text, locale: locale as Locale, knownPlaceLabels: [...knownPlaceLabels] });
}

export function buildCompletionRequest(
  input: ExtractInput,
  settings: { maxOutputTokens: number; temperature: number; seed: number } = INFERENCE_SETTINGS,
): CompletionRequest {
  return {
    messages: buildMessages(input),
    jsonSchema: extractionSchema,
    maxTokens: settings.maxOutputTokens,
    temperature: settings.temperature,
    seed: settings.seed,
  };
}

/**
 * Turns raw completion text into a validated RawIntent. Any sign the output was
 * cut short is rejected even if the fragment parses (EC-021).
 */
export function interpretCompletion(
  outcome: CompletionOutcome,
  input: ExtractInput,
  maxOutputTokens: number = INFERENCE_SETTINGS.maxOutputTokens,
): Result<RawIntent> {
  const incomplete =
    outcome.truncated ||
    outcome.contextFull ||
    outcome.interrupted ||
    outcome.stoppedLimit ||
    !outcome.stoppedEos ||
    outcome.tokensPredicted >= maxOutputTokens;
  if (incomplete) {
    return fail("AI_INVALID_OUTPUT", AI_MESSAGES.incomplete, true, {
      field: "completion",
      missingConnection: "Completion did not finish cleanly.",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outcome.text.trim());
  } catch {
    return fail("AI_INVALID_OUTPUT", AI_MESSAGES.invalidOutput, true, {
      field: "completion",
      missingConnection: "Output is not valid JSON.",
    });
  }

  const structural = validateRawIntent(parsed);
  if (!structural.ok) return structural;
  return ok(checkIntentAgainstQuery(structural.value, input.text));
}
