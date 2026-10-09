import { openNativeSqlDriver } from "../storage/native-sql-driver";
import { SqlTransitRepository } from "../storage/transit-repository";
import { createRoutePort } from "../routing/routePort";
import { createPhoneAi } from "../ai/phone";
import { BUNDLED_TRANSIT_PACK } from "./bundled-pack";
import { createApplicationServices, type ApplicationServices } from "./services";

// Only real adapters enter the native composition root. No test pack or canned
// extraction is bundled; model setup remains an explicit action in the UI.
export function createNativeApplication(): ApplicationServices {
  return createApplicationServices({
    repository: new SqlTransitRepository(openNativeSqlDriver),
    routes: createRoutePort(),
    ai: createPhoneAi(),
    bundledPack: BUNDLED_TRANSIT_PACK,
  });
}
