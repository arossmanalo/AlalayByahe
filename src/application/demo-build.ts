// True only in a DEMO build (EXPO_PUBLIC_DEMO_BUILD=1 at build time). A demo build loads the
// SYNTHETIC and unverified demo pack instead of the reviewed release pack, into a separate
// database, with the test-pack warning on every screen. It must never be the build that is
// recorded as release evidence, and the release build leaves this flag off.
export const DEMO_BUILD: boolean = process.env.EXPO_PUBLIC_DEMO_BUILD === "1";
