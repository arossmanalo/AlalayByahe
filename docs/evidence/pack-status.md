# Transit pack status (ROUTE-002)

Last updated: 2026-10-09 (Member 2). Everything below was checked against the working tree on this date.

## Release pack

**There is no release pack.** `assets/data/release.json` does not exist, on purpose.

There is an **unreviewed candidate**: `data/candidates/lrt1-candidate.json`, LRT-1 Dr. Santos to Central Terminal (14 stations, ride legs and stored value fares only). Its evidence is `estimated` because no second teammate has checked it, so `npm run data:validate -- data/candidates/lrt1-candidate.json` reports 45 release-gate errors, all of them "must be verified". That refusal is intended.

ROUTE-001 (the corridor evidence and source register) has not been executed: `docs/evidence/sources.md` and
`docs/evidence/corridor-status.md` do not exist. No ride, stop, boarding permission, walking path or fare has been
sourced, so there is nothing true to put in a release pack. A placeholder file would be fabricated data.

| Target corridor | Verified stop-level coverage |
|---|---|
| Lipa to Candelaria, Quezon | None. Target only. |
| Lipa to San Pablo, Laguna | None. Target only. |
| Candelaria to Vito Cruz/Taft | None. Target only. |

The app must not advertise any of these corridors as supported until ROUTE-001 evidence is packaged, validated in
release mode and audited by ROUTE-006.

## What ROUTE-002 delivered

| Item | Path | Status |
|---|---|---|
| TransitPack 1.0 validator (structure, references, sequences, coordinates, evidence, walks, fares) | `src/data/validatePack.ts` | Implemented, tested |
| Release gate (kind, fixture namespace and wording, Philippine bounds, verified routing facts, coverage labels) | `src/data/validatePack.ts` | Implemented, tested |
| Synthetic test pack, `kind: test_fixture`, `test_` namespace | `tests/fixtures/transit-pack.json` | Implemented, validates in development mode only |
| Alias normalization shared with storage | `src/data/normalize.ts` | Implemented, tested |
| Canonical JSON for pack fingerprints | `src/data/canonicalJson.ts` | Implemented, tested |
| CLI: `npm run data:validate` | `scripts/validate-data.ts` | Implemented, run |
| Release `TransitPack` | `assets/data/release.json` | **Not created. Blocked on ROUTE-001.** |

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
