// DEMO BUILD ONLY. Loaded with require() from native-services.ts when DEMO_BUILD is true, so a
// release bundle never contains it. The pack is kind "test_fixture": synthetic Luzon routes plus
// unverified road-route drafts plus the real LRT-1 stations. See docs/evidence/demo-build.md.
import demoPack from "../../assets/demo/demo-pack.json";

export const DEMO_TRANSIT_PACK: unknown = demoPack;
