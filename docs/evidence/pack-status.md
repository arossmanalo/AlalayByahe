# Transit pack status (ROUTE-002)

Last updated: 2026-10-10 (Member 2). Checked against the working tree on this date.

## Release pack

`assets/data/release.json` **exists**: pack `pack_lrt1`, version `lrt1_2026_10_10_1`, content SHA-256 (canonical JSON) `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`.

| Field | Value |
|---|---|
| Coverage | **LRT-1 stations only**: all 25 stations, Dr. Santos to Fernando Poe Jr., ride legs in both directions and stored value fares between every pair |
| Fare source | LRMC "New LRT-1 Stored Value Fare Matrix", effective April 2, 2025 (the lrmc.ph file names are swapped; the image at the file name containing SJT is the stored value table) |
| Not included | Single journey fares, walking links, entrances, operating hours, any road service (jeepney, van, bus, tricycle) |
| Review | Independently checked by Aryl Manalo on 2026-10-10 against the LRMC image: station order, the full Vito Cruz and EDSA rows, 24 sampled pairs including the corners, five map coordinates and the two headsigns. All matched. The remaining pairs agree across mirrored readings (the build refuses to write otherwise). |
| Evidence level | Stops, services, directions, route stops and fares are `verified`. Station coordinates stay `estimated` (approximate, from Wikipedia and OpenStreetMap; five were checked on a map). |
| Validation | `npm run data:validate -- assets/data/release.json --release`: 0 errors, 0 warnings. Member 4's `validateTransitPack` also accepts it. |
| Rebuild | `npx tsx scripts/build-lrt1-pack.ts` (needs a new review if any transcription changes) |

It is **bundled in the app on `main`**: `src/application/bundled-pack.ts` imports `assets/data/release.json` (Member 4, PR #6). `npm run release:check` no longer reports the pack as unconnected, and the Android Hermes export bundles it (`lrt1_2026_10_10_1` is present in the bytecode). The pack change is a runtime change, so the recorded Android artifact is stale until Member 4 rebuilds it.

### What this does and does not support

| Target corridor | Verified stop-level coverage |
|---|---|
| Lipa to Candelaria, Quezon | None. Target only. |
| Lipa to San Pablo, Laguna | None. Target only. |
| Candelaria to Vito Cruz/Taft | Only the LRT-1 leg between stations. No road leg, no drop-off, no walking path to a station, no reverse. **Not supported end to end.** |

Because the pack has no walking links, journeys can only start and end at LRT-1 stations. The app must not advertise any target corridor as supported.

## What ROUTE-002 delivered

| Item | Path | Status |
|---|---|---|
| TransitPack 1.0 validator (structure, references, sequences, coordinates, evidence, walks, fares) | `src/data/validatePack.ts` | Implemented, tested |
| Release gate (kind, fixture namespace and wording, Philippine bounds, verified routing facts, coverage labels) | `src/data/validatePack.ts` | Implemented, tested |
| Synthetic test pack, `kind: test_fixture`, `test_` namespace | `tests/fixtures/transit-pack.json` | Implemented, validates in development mode only |
| Alias normalization shared with storage | `src/data/normalize.ts` | Implemented, tested |
| Canonical JSON for pack fingerprints | `src/data/canonicalJson.ts` | Implemented, tested |
| CLI: `npm run data:validate` | `scripts/validate-data.ts` | Implemented, run |
| Release `TransitPack` (LRT-1 stations only) | `assets/data/release.json` | Created, reviewed, validates for release; **bundled in the app on `main`; native rebuild and physical tests pending** |

## Validation rules worth knowing

Applied to every pack:

- Unknown fields are errors, so a typo such as `alights` cannot silently drop a permission.
- IDs are lower_snake_case with the entity prefix (`place_`, `stop_`, `service_`, `dir_`, `walk_`, `fare_`, `source_`) and unique per collection.
- Every reference resolves: stop to place, direction to service, route stop to direction and stop, walk to places, fare to service and stops, evidence to source.
- Each direction has at least two ordered route stops, unique sequences, no stop twice in a row, and (unless suspended) a boardable stop followed by an alightable one.
- A route stop cannot allow boarding or alighting that its stop forbids. The router needs both flags, so a mismatch is a data bug.
- Coordinates are finite and in range. A walk cannot be shorter than the straight line between its places, and the same directed walk cannot be documented twice.
- Evidence needs an ISO 8601 timestamp with timezone. `verified` and `estimated` facts must cite a source. `unknown` evidence cannot back a ride fact.
- Fares are integer centavos. Flat fares have exactly one of amount or range. Matrix and distance entries must be ordered stop pairs on that service. Distance fares need documented segment meters. Unknown fares carry no amounts.

Additionally for `kind: "release"` (enforced whenever a pack claims to be a release):

- No `test_` ID, and no "TEST ONLY", "DEV FIXTURE" or "synthetic unit-test" wording anywhere.
- Coordinates inside the Philippines (catches swapped latitude/longitude and 0,0 placeholders).
- Stops, services, directions, route stops and walk links must be `verified`, not `estimated`.
- A non-empty `coverageLabels` statement.

Loading with `target: "release"` also rejects any pack whose `kind` is not `release`.

## Open questions for other owners

1. **Discount ratio meaning (ROUTE-004, Member 4 contract):** `discountRules.numerator/denominator` does not say whether the ratio is the discount or the price multiplier. The validator only requires `0 <= numerator <= denominator`. ROUTE-004 must pin one meaning before any discount is applied.
2. **Importer alias key (INT-002):** storage should index aliases with `normalizeAlias` from `src/data/normalize.ts` so lookups and imports agree.
3. **Validator at the storage boundary (INT-002):** `replacePack` should call `validatePack(pack, { target })` and store the returned frozen copy. Use `target: "release"` in the release build.

## Known limits of the validator

- It proves a pack is well formed and internally consistent. It cannot prove a route exists in the real world; that is the source audit (ROUTE-006).
- Fare validity dates are checked for order and format only. Expiry against today's date is a fare-calculation concern (ROUTE-004).
- The release-shaped pack used in `tests/routing/data.test.ts` is built in memory from the fixture to exercise the accept path. It is never written to disk and does not represent any service.

## Draft road routes (not shipped)

`data/candidates/roads-draft.json` (built by `scripts/build-road-draft.ts`; version `lrt1_roads_draft_2026_10_10_1`) contains the verified LRT-1 pack plus draft road routes from teammate reports and the operator research. All road facts are `estimated`, so `data:validate --release` reports exactly 42 "must be verified" errors and nothing else. That refusal is intended; **this file is not bundled and `assets/data/release.json` is unchanged.**

| In the draft | Detail |
|---|---|
| Lipa to Candelaria | McDonald's near De La Salle Lipa, jeep "Lipa Palengke" (P14), 150 m walk, jeep "Tiaong / Bantayan" (P60), jeep "Candelaria" (P30). Total P104, two transfers. |
| Candelaria to Vito Cruz, via Buendia bus | Bus "Buendia" (P250) to Mixue Gil Puyat, a 790 m walk, LRT-1 Gil Puyat to Vito Cruz (P18). Needs the user to raise the 500 m transfer walk limit to 800 m. |
| Candelaria to Vito Cruz, via PITX | Bus "PITX" (P210), city bus "SM Fairview" (P20) to Taft Avenue near DLSU, 234 m walk to Vito Cruz LRT. Total P230 plus the walk. Works under the default limits. |
| Lipa to San Pablo (partial) | Van from the Lipa terminal pin (13.942662, 121.153493) to Puregold San Pablo (P130). Puregold's point is from OpenStreetMap and approximate. |
| Not in the draft | The SM Lipa jeepney (its boarding dorm is not given), the Wawa jeepney (out of scope by the user's decision: the corridor ends at Puregold San Pablo), the Quiapo/UST/Gil Puyat jeeps (no boarding spot), every return trip, student fares (the reported amounts do not follow one discount ratio), and PITX Gate 9 (the PITX page does not list it). |

To ship it: a teammate reviews each leg with `npx tsx scripts/road-draft-review-sheet.ts`, the evidence of the confirmed legs is raised to `verified`, unconfirmed legs are removed, the version is bumped, and the pack is validated with `--release` and copied to `assets/data/release.json`. Member 4 then rebuilds the native app.

## Pack freeze

**Frozen on 2026-10-10 02:38 +08:00** by the user's instruction ("ok freeze"), recorded by Member 2.

| Field | Value |
|---|---|
| Frozen file | `assets/data/release.json` |
| Pack | `pack_lrt1`, version `lrt1_2026_10_10_1` |
| Content SHA-256 (canonical JSON) | `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931` |
| Coverage | LRT-1 stations only (25 stations, stored value fares, no walking links, no road services) |
| Validation | `data:validate --release`: 0 errors, 0 warnings |

Assumed with the freeze (the user said "ok freeze" after these were stated): **no road route is in the shipped app**, and the Luzon demo pack stays a laptop and test tool, not a phone build.

Not frozen and not shipped: `data/candidates/roads-draft.json` (unverified road routes), `tests/fixtures/luzon-demo-pack.json` (synthetic demo data), `tests/fixtures/transit-pack.json` (synthetic fixture).

Rules while frozen: no change to `assets/data/release.json` or `src/application/bundled-pack.ts`'s import of it, unless a fact is found wrong. A correction means a new version number, a fresh review, a Member 4 rebuild, and repeating the physical tests that depended on the earlier build. Adding road routes later is a new pack version with the same consequences.
