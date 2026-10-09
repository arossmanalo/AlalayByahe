import { openNativeSqlDriver } from "../storage/native-sql-driver";
import { SqlTransitRepository } from "../storage/transit-repository";
import { createRoutePort } from "../routing/routePort";
import { createPhoneAi } from "../ai/phone";
import { BUNDLED_TRANSIT_PACK } from "./bundled-pack";
import { createApplicationServices, type ApplicationServices } from "./services";

// Only real adapters enter the native composition root. No test pack or canned
// extraction is bundled; model setup remains an explicit action in the UI.
export function createNativeApplication(): ApplicationServices {
  // The flag is read inline so the bundler can fold it away and leave the demo pack out of release bundles.
  if (process.env.EXPO_PUBLIC_DEMO_BUILD === "1") {
    // DEMO BUILD ONLY (EXPO_PUBLIC_DEMO_BUILD=1). The demo pack is loaded with require() so a
    // release bundle, where the flag is off, never includes it. It lives in its own database,
    // and every screen shows the test-pack warning because the pack kind is test_fixture.
    const { DEMO_TRANSIT_PACK } = require("./demo-pack") as typeof import("./demo-pack");
    return createApplicationServices({
      repository: new SqlTransitRepository(() => openNativeSqlDriver("alalaybyahe-demo.db"), { allowTestFixtures: true }),
      routes: createRoutePort(),
      ai: createPhoneAi(),
      bundledPack: DEMO_TRANSIT_PACK,
      allowTestFixtures: true,
    });
  }
  return createApplicationServices({
    repository: new SqlTransitRepository(openNativeSqlDriver),
    routes: createRoutePort(),
    ai: createPhoneAi(),
    bundledPack: BUNDLED_TRANSIT_PACK,
  });
}
