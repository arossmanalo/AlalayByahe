// Member 3 (UI-006): when every screen must carry the test-data banner. Pure: no React or native imports.
import type { TransitPack } from "../contracts";

export type TestDataBanner = "dev_fixture" | "test_pack";

/**
 * Fixture services always get the banner. Real services get it whenever the loaded pack is a
 * test_fixture, which is how the demo build (EXPO_PUBLIC_DEMO_BUILD=1) marks its invented and
 * unverified routes. A release pack, or no loaded pack, shows none.
 */
export function testDataBanner(servicesKind: "real" | "dev_fixture", loadedPackKind: TransitPack["kind"] | null): TestDataBanner | null {
  if (servicesKind === "dev_fixture") return "dev_fixture";
  return loadedPackKind === "test_fixture" ? "test_pack" : null;
}
