# Route audit (ROUTE-006)

Date: 2026-10-09. Auditor: Member 2 (assistant-assisted). **This is a self-audit, not the independent teammate review the plan requires.** Status: **ROUTE-006 is not complete** (no end-to-end run in the integrated app yet; the LRT-1 transcription has had an independent review).

## Verdict per corridor

| Corridor | Verdict | Reason |
|---|---|---|
| Lipa to Candelaria, Quezon | **Unsupported. Do not advertise.** | No evidenced ride, stop, direction, walk or fare. |
| Lipa to San Pablo, Laguna | **Unsupported. Do not advertise.** | Only an unlabelled van line on a commercial site (sources.md S-15). No operator, boarding point or fare. |
| Candelaria to Vito Cruz / Taft | **Unsupported. Do not advertise.** | Only the final LRT-1 leg has an operator source. The road leg, the drop-off, the walk to a station, and the reverse have none. |

The only data with an operator source is **LRT-1 station-to-station travel, 25 stations, stored value fares**, held in `assets/data/release.json` (reviewed by Aryl Manalo on 2026-10-10; not yet bundled into the app).

## What was audited, and how

| Check | How | Result |
|---|---|---|
| Fare transcription | LRMC stored value matrix read in the browser pane; all 600 ordered pairs read twice in mirrored cells from different screenshots | All agree (the build script refuses to write if any pair disagrees) |
| Fare plausibility | Test: no fare shrinks as the ride lengthens | Pass |
| Spot values read independently | 16 pairs in `tests/routing/real-pack.test.ts`, both directions | Pass |
| Station order | Row order of the official matrix; cross-checked with Wikipedia's station list and with increasing latitude | Consistent |
| Coordinates | Wikipedia vs OpenStreetMap, within about 10 to 200 m where both exist; Baclaran corrected; Balintawak, Fernando Poe Jr., Central, MIA Road, Redemptorist-Aseana single-source | Approximate, `estimated` |
| Engine against the transcription | Every one of the 600 ordered station pairs planned on a verified-in-memory copy; ride, fare and zero transfers match the matrix | Pass |
| Release gate | `data:validate --release` 0 errors, 0 warnings; Member 4's validator accepts it; an unreviewed copy is still refused (test) | Pass |
| Independent review | Aryl Manalo, 2026-10-10: station order, full Vito Cruz and EDSA rows, 24 sampled pairs incl. corners, 5 coordinates, 2 headsigns | All matched |
| Forward/reverse | Reverse trips use the separate northbound/southbound records; both give the same documented fare | Pass |

## Worked traces compared with the source image

| Journey | Expected from the LRMC matrix | Engine output |
|---|---|---|
| Vito Cruz to Baclaran | P21, one southbound ride | 2100 centavos, `dir_lrt1_southbound`, 0 transfers, 0 m walk |
| Baclaran to Vito Cruz | P21, one northbound ride | 2100, `dir_lrt1_northbound` |
| Vito Cruz to EDSA (Taft) and back | P20 | 2000 both ways |
| Dr. Santos to Fernando Poe Jr. and back | P52 | 5200 both ways |
| Student fare, Vito Cruz to Baclaran | No discount documented in the data | 2100, status `estimated`, basis says no discount is documented |

## What is not audited

- No physical check of any station, entrance, platform or walking path. Walking links to and from stations do not exist in the data, so the app cannot yet plan "my place to the station" or "station to my destination".
- Operating hours, disruptions and headways are not recorded (and are never claimed).
- Single journey fares are not transcribed. Whether single journey tickets are still sold is unconfirmed.
- No road service on any target corridor.
- No second teammate has reviewed any transcription, route trace or instruction text. No travel claim is made.

## Edge-case coverage (planned cases for Member 2, against what is actually tested)

"Tested" means an automated test that ran and passed on synthetic data or the LRT-1 candidate. It does not mean the case is proven on real roads.

| Case | Covered by |
|---|---|
| EC-023 no verified journey; EC-028 reverse needs its own record | `tests/routing/search.test.ts` "direction is never inferred" |
| EC-024, EC-025, EC-042 transfers, up to 3 options, 5-transfer chain | search tests, graph shapes |
| EC-026, EC-037, EC-044, EC-136 crossing or aerial proximity is not a transfer | "does not treat crossing route lines as a transfer without a directed walk" |
| EC-027, EC-043 cycles and the search guard | walk-cycle and `SEARCH_LIMIT_REACHED` tests |
| EC-030, EC-031, EC-033 walk limits, modes, preference not met | "strict preferences are never relaxed silently" |
| EC-032, EC-049, EC-057 cheapest vs fewest, budget with unknown fare, partial subtotal | "fare-aware ranking is honest" |
| EC-034, EC-039, EC-040 incomplete data, duplicate stops, bad coordinates | `tests/routing/data.test.ts` |
| EC-035 suspended or unknown-availability direction | search and fixture tests |
| EC-041 nearest terminal is disconnected | "prefers the nearest terminal that actually connects" |
| EC-045, EC-046, EC-047 onboard downstream path, unknown context, stale or absent stop | `tests/routing/onboard.test.ts` |
| EC-048 tricycle needs a documented stand and walk | fixture tricycle journey uses its documented walk only (structural; no separate negative test) |
| EC-051, EC-052, EC-053, EC-058 missing, outdated, distance-less and conflicting fares | `tests/routing/fares.test.ts` |
| EC-054, EC-059 discounts, undocumented adjustments | fares tests; **meaning of the ratio still awaits the contract owner** |
| EC-055, EC-056, EC-061 per-boarding fares, ranges, integer rounding | fares and search tests |
| EC-060 current ride payment unknown | onboard tests |
| EC-134, EC-135, EC-137 board/alight permissions and direction | search tests, validator flag checks |
| **Not covered** | EC-029 (GPS between stops; a controller concern), EC-038 (similar names; repository), EC-050 (closed entrances), EC-036/EC-139 (source-date review; only fare expiry is automated), EC-138 (coverage gap shown to the user; the release gate blocks it but UI display is Member 3's) |

## Required before ROUTE-006 can be called done

1. ~~Independent review of the LRT-1 transcription~~ Done 2026-10-10; pack at `assets/data/release.json` passes the release gate.
2. Real road-service evidence for at least one target corridor (LTFRB Region IV-A route list and fares, plus dated teammate observations), transcribed with walking links and reviewed.
3. The integrated app (INT-003) runs those journeys end to end, and a teammate reads the rendered instructions against the sources.
4. Member 4 locks the pack version before regression and the demo.

Until the rest is done, the app must say what it covers: **LRT-1 stations only**. No target corridor is supported.
