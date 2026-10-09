// Member 3 (UI-002): pure confirmation-form logic. No React or native imports.
import type {
  JourneyPreferences,
  Mode,
  Place,
  PlaceCandidate,
  Priority,
  RawIntent,
  ResolvedEndpoint,
} from "../contracts";
import { centavosToInput, parseMeters, parsePesosToCentavos } from "./format";

export const MAX_QUERY_CHARS = 600;

export const ALL_MODES: readonly Mode[] = ["van", "jeepney", "bus", "tricycle", "lrt"];
export const ALL_PRIORITIES: readonly Priority[] = ["nearest_useful", "fewest_transfers", "lowest_known_fare"];
export const ALL_PASSENGERS: readonly JourneyPreferences["passenger"][] = ["regular", "student", "senior", "pwd"];

// Contract v1.0 §3 defaults.
export const DEFAULT_PREFERENCES: JourneyPreferences = {
  allowedModes: [...ALL_MODES],
  priority: "nearest_useful",
  maxAccessWalkMeters: 1000,
  maxTransferWalkMeters: 500,
  maxEgressWalkMeters: 1000,
  directOnly: false,
  budgetCentavos: null,
  passenger: "regular",
};

export type QueryCheck = { ok: true; text: string } | { ok: false; reason: "empty" | "too_long" };

/** Rejects (never truncates) text over the limit so the user keeps their full input to edit. */
export function checkQueryText(text: string): QueryCheck {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  if (text.length > MAX_QUERY_CHARS) return { ok: false, reason: "too_long" };
  return { ok: true, text: trimmed };
}

/** Editable string form of JourneyPreferences. */
export interface PreferenceForm {
  allowedModes: Mode[];
  priority: Priority;
  accessText: string;
  transferText: string;
  egressText: string;
  directOnly: boolean;
  budgetText: string;
  passenger: JourneyPreferences["passenger"];
}

export type PreferenceField = "allowedModes" | "access" | "transfer" | "egress" | "budget";

export type PreferenceErrors = Partial<Record<PreferenceField, "empty_modes" | "invalid_meters" | "invalid_budget">>;

export function preferencesToForm(p: JourneyPreferences): PreferenceForm {
  return {
    allowedModes: ALL_MODES.filter((m) => p.allowedModes.includes(m)),
    priority: p.priority,
    accessText: String(p.maxAccessWalkMeters),
    transferText: String(p.maxTransferWalkMeters),
    egressText: String(p.maxEgressWalkMeters),
    directOnly: p.directOnly,
    budgetText: centavosToInput(p.budgetCentavos),
    passenger: p.passenger,
  };
}

export type FormResult = { ok: true; value: JourneyPreferences } | { ok: false; errors: PreferenceErrors };

/** Validates every field; never substitutes a default for an invalid value. */
export function formToPreferences(form: PreferenceForm): FormResult {
  const errors: PreferenceErrors = {};
  if (form.allowedModes.length === 0) errors.allowedModes = "empty_modes";
  const access = parseMeters(form.accessText);
  const transfer = parseMeters(form.transferText);
  const egress = parseMeters(form.egressText);
  const budget = parsePesosToCentavos(form.budgetText);
  if (!access.ok) errors.access = "invalid_meters";
  if (!transfer.ok) errors.transfer = "invalid_meters";
  if (!egress.ok) errors.egress = "invalid_meters";
  if (!budget.ok) errors.budget = "invalid_budget";
  if (!access.ok || !transfer.ok || !egress.ok || !budget.ok || errors.allowedModes) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      allowedModes: ALL_MODES.filter((m) => form.allowedModes.includes(m)),
      priority: form.priority,
      maxAccessWalkMeters: access.value,
      maxTransferWalkMeters: transfer.value,
      maxEgressWalkMeters: egress.value,
      directOnly: form.directOnly,
      budgetCentavos: budget.value,
      passenger: form.passenger,
    },
  };
}

export type ExplicitField =
  | "allowedModes"
  | "priority"
  | "maxAccessWalkMeters"
  | "maxTransferWalkMeters"
  | "maxEgressWalkMeters"
  | "budgetCentavos"
  | "directOnly";

/** Which preferences came from the user's own words, so the form can label the rest as defaults. */
export function explicitFields(intent: RawIntent | null): Set<ExplicitField> {
  const fields = new Set<ExplicitField>();
  if (!intent) return fields;
  if (intent.allowedModes !== null || intent.excludedModes.length > 0) fields.add("allowedModes");
  if (intent.priority !== null) fields.add("priority");
  if (intent.maxAccessWalkMeters !== null) fields.add("maxAccessWalkMeters");
  if (intent.maxTransferWalkMeters !== null) fields.add("maxTransferWalkMeters");
  if (intent.maxEgressWalkMeters !== null) fields.add("maxEgressWalkMeters");
  if (intent.budgetCentavos !== null) fields.add("budgetCentavos");
  if (intent.directOnly) fields.add("directOnly");
  return fields;
}

/**
 * Preselects a candidate only when it is the single exact match. Fuzzy, alias or
 * multiple candidates always require the user to choose.
 */
export function initialCandidate(candidates: PlaceCandidate[]): Place | null {
  const candidate = candidates[0];
  if (candidates.length === 1 && candidate?.match === "exact") return candidate.place;
  return null;
}

export function endpointFromPlace(place: Place): ResolvedEndpoint {
  return { placeId: place.id, label: place.name, point: place.point, provenance: "stored" };
}

export function isSamePlace(a: Place | null, b: Place | null): boolean {
  return a !== null && b !== null && a.id === b.id;
}

/** "place name, locality" unless the name already contains the locality. */
export function placeDisplayName(place: Place): string {
  return place.name.toLowerCase().includes(place.locality.toLowerCase())
    ? place.name
    : `${place.name}, ${place.locality}`;
}

/**
 * EC-011: when the user's words or a search match no stored place, the picker states the supported
 * coverage instead of only "no match", so an unsupported corridor is explained, never routed.
 */
export function needsCoverageHint(aiText: string | null, aiCandidateCount: number, searchCandidateCount: number | null): boolean {
  const aiMissed = aiText !== null && aiText.trim() !== "" && aiCandidateCount === 0;
  return aiMissed || searchCandidateCount === 0;
}

let counter = 0;

/** Stable-format, collision-resistant ID per submission (lower_snake_case, `query_` prefix). */
export function newQueryId(now: number = Date.now()): string {
  counter = (counter + 1) % 1_000_000;
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `query_${now.toString(36)}_${counter.toString(36)}_${random}`;
}
