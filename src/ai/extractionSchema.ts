// Canonical RawIntent JSON Schema, copied from contract v1.0 §4. The same
// object is passed to llama.rn as the grammar and used by validateRawIntent.
const MODE_ENUM = ["van", "jeepney", "bus", "tricycle", "lrt"] as const;

export const RAW_INTENT_KEYS = [
  "kind",
  "originText",
  "destinationText",
  "useCurrentLocation",
  "allowedModes",
  "excludedModes",
  "priority",
  "maxAccessWalkMeters",
  "maxTransferWalkMeters",
  "maxEgressWalkMeters",
  "budgetCentavos",
  "directOnly",
  "ambiguities",
] as const;

export const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: [...RAW_INTENT_KEYS],
  properties: {
    kind: { type: "string", enum: ["journey", "onboard", "unrelated"] },
    originText: { type: ["string", "null"] },
    destinationText: { type: ["string", "null"] },
    useCurrentLocation: { type: "boolean" },
    allowedModes: {
      anyOf: [
        { type: "null" },
        { type: "array", items: { type: "string", enum: [...MODE_ENUM] }, uniqueItems: true },
      ],
    },
    excludedModes: {
      type: "array",
      items: { type: "string", enum: [...MODE_ENUM] },
      uniqueItems: true,
    },
    priority: {
      anyOf: [
        { type: "null" },
        { type: "string", enum: ["nearest_useful", "fewest_transfers", "lowest_known_fare"] },
      ],
    },
    maxAccessWalkMeters: { type: ["integer", "null"], minimum: 0 },
    maxTransferWalkMeters: { type: ["integer", "null"], minimum: 0 },
    maxEgressWalkMeters: { type: ["integer", "null"], minimum: 0 },
    budgetCentavos: { type: ["integer", "null"], minimum: 0 },
    directOnly: { type: "boolean" },
    ambiguities: { type: "array", items: { type: "string" } },
  },
} as const;

export const MODES = MODE_ENUM;
export const PRIORITIES = ["nearest_useful", "fewest_transfers", "lowest_known_fare"] as const;
export const INTENT_KINDS = ["journey", "onboard", "unrelated"] as const;
