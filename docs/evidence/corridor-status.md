# Corridor status (ROUTE-001)

As of 2026-10-09, first pass. **No corridor is verified or supported.** Source IDs refer to `sources.md`.

Gate rule: a corridor is "supported" only when every ride, boarding stop, alighting stop, direction, walking link and
fare used by a demo journey has a dated, checked source, and the reverse is evidenced separately.

| Corridor | Status | Confirmed | Missing |
|---|---|---|---|
| Lipa to Candelaria, Quezon | **Not supported** | Nothing usable | Operator/service, boarding stop in Lipa, alighting stop in Candelaria, direction, any transfer, walking paths, fare, reverse direction |
| Lipa to San Pablo, Laguna | **Not supported** | Nothing usable. A San Pablo route-list request exists on the FOI portal (S-09, not opened). | Same as above |
| Candelaria to Vito Cruz / Taft | **Not supported** | LRT-1 exists with Vito Cruz and EDSA (Taft) stations and a 2025-04-02 fare matrix published by the operator as images (S-01 to S-04). Station order and fares are **not yet transcribed**. | The whole road leg from Candelaria to Metro Manila (service, terminal, drop-off), the walk or transfer between that drop-off and an LRT-1 station, which LRT-1 station is the right entry, direction (Baclaran-bound vs Roosevelt-bound), station access walking path, and the fare |

## Per-leg checklist for the Candelaria to Vito Cruz/Taft target

| Leg | Needed fact | Source found | State |
|---|---|---|---|
| Candelaria to the Metro Manila area | Operator, service name, boarding stop, alighting stop, direction, fare | None (only aggregator hints, S-10) | Missing |
| Drop-off to LRT-1 | Directed walking path and metres, or a documented transfer | None | Missing |
| LRT-1 ride | Station order, direction, board/alight permissions, fare for the pair | Stored value fares and station order for all 25 stations (Dr. Santos to Fernando Poe Jr.) transcribed from the operator matrix (S-02), reviewed by Aryl Manalo on 2026-10-10, and packaged in `assets/data/release.json`. Includes Vito Cruz and EDSA (Taft). | **Transcribed and reviewed (2026-10-10).** Station platform access, entrances and operating hours are not recorded. |
| LRT-1 station to destination | Directed walking path to Vito Cruz/Taft destination | None | Missing |
| Reverse (Vito Cruz/Taft to Candelaria) | Independent evidence for every leg | None | Missing |

## What this means for the app and the demo

- The LRT-1 portion is the only data with an operator source. Its 25-station stored value fares are now in an unreviewed candidate pack. Single journey fares (S-03) are not transcribed.
- An LRT-1-only pack would let the engine plan stations to stations, but it would **not** cover any of the three target corridors end to end. It must be advertised as exactly that (LRT-1 stations only) if it is ever shipped.
- No road-based leg (jeepney, van, bus, tricycle) has any evidence. These need dated observations by teammates who rode the service, recorded as source records and reviewed by someone else before use. The planning rules allow dated teammate observations only if team rules permit; that permission is a decision for Member 4.

## Next actions

1. **Done (2026-10-10):** a second registered teammate (Aryl Manalo) checked the LRT-1 transcription; the pack is verified for LRT-1 stations only.
2. **Member 4:** the pack is bundled on `main` (PR #6); rebuild the native app and run the physical tests.
3. **Teammates on the ground:** for each road corridor, record terminals, signboards, exact boarding and drop-off spots with GPS, fares, dates and the walk between legs, using the template in `unblock-kit.md` section B. Reverse directions separately. A second teammate checks each record.
4. **A human:** send the LTFRB Region IV-A request (`unblock-kit.md` section C) if the team wants the authorized route lists.
5. Until legs exist end to end for a corridor, it stays unsupported.

## Road-service leads (see sources.md S-15 to S-19)

Searches found no official list for jeepney, UV Express/van, bus or tricycle service on Lipa, San Pablo or Candelaria. Commercial sites hint that a van runs Lipa City to San Pablo, with no operator, boarding point or fare. The next step for those two corridors is a request to LTFRB Region IV-A and dated teammate observations; until then they stay unsupported.

## Teammate-reported routes (2026-10-10)

The team reported a route and fares for each corridor (see `teammate-observations.md`). They are undated, unattributed, have no stop coordinates or walking paths, and one LRT fare conflicts with the operator matrix. They are **leads, not evidence**: all three corridors remain unsupported until each leg is recorded with the observation template and reviewed.
