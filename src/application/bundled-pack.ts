// The reviewed release pack: LRT-1 stations only (assets/data/release.json, pack
// lrt1_2026_10_10_1). Member 2 supplies and reviews the JSON; this import is the only
// place it enters the native bundle. `npm run release:check` verifies the bundled value
// is identical to the file and passes validation. A fixture must never be substituted
// just to enable a demo.
import releasePack from "../../assets/data/release.json";

export const BUNDLED_TRANSIT_PACK: unknown = releasePack;
