import type { JourneyPreferences, Mode } from "./index";

export const MODES: readonly Mode[] = ["van", "jeepney", "bus", "tricycle", "lrt"];
export function defaultPreferences(): JourneyPreferences {
  return {
    allowedModes: [...MODES],
    priority: "nearest_useful",
    maxAccessWalkMeters: 1000,
    maxTransferWalkMeters: 500,
    maxEgressWalkMeters: 1000,
    directOnly: false,
    budgetCentavos: null,
    passenger: "regular",
  };
}

