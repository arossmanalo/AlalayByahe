import { openNativeSqlDriver } from "../storage/native-sql-driver";
import { SqlTransitRepository } from "../storage/transit-repository";
import { createRoutePort } from "../routing/routePort";
import { createApplicationServices, type ApplicationServices } from "./services";

// Member 2's pure routing port is integrated. Member 1's AiPort remains an
// explicit unavailable state until its real native implementation is delivered.
export function createNativeApplication(): ApplicationServices {
  return createApplicationServices({
    repository: new SqlTransitRepository(openNativeSqlDriver),
    routes: createRoutePort(),
  });
}
