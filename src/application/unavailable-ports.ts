import type { AiPort, GeoPort, RoutePort } from "../contracts";
import { fail } from "../contracts/result";

// These ports report missing integration. They never produce mock AI or routes.
export function unavailableAi(): AiPort {
  return {
    getState: () => ({ phase: "absent", progress: null }),
    ensureModel: async () => fail("AI_NOT_READY", "Member 1's model setup is not integrated yet."),
    initialize: async () => fail("AI_NOT_READY", "Local AI is not integrated yet."),
    extract: async () => fail("AI_NOT_READY", "Local AI is unavailable. Choose places manually."),
    cancel: async () => undefined,
    release: async () => undefined,
  };
}
export function unavailableRoutes(): RoutePort {
  return { plan: async () => fail("DATA_NOT_READY", "Member 2's routing engine is not integrated yet.") };
}
export function disabledGeo(): GeoPort {
  return {
    searchAddress: async () => fail("NETWORK_UNAVAILABLE", "Online address lookup is disabled. Choose a stored place."),
    getWalk: async () => fail("NETWORK_UNAVAILABLE", "Online walking lookup is disabled."),
  };
}

