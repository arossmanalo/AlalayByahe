// Reviewed release pack (LRT-1 stations only), supplied by Member 2 and checked with
// `npm run data:validate -- assets/data/release.json --release`. It is validated again
// at install time; a fixture must never be substituted just to enable the demo.
import releasePack from "../../assets/data/release.json";

export const BUNDLED_TRANSIT_PACK: unknown = releasePack;
