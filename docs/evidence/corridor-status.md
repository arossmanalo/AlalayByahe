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
| LRT-1 ride | Station order, direction, board/alight permissions, fare for the pair | Operator images exist (S-01 to S-04), unread | Open, readable by a person now |
| LRT-1 station to destination | Directed walking path to Vito Cruz/Taft destination | None | Missing |
| Reverse (Vito Cruz/Taft to Candelaria) | Independent evidence for every leg | None | Missing |

## What this means for the app and the demo

- The only data that can plausibly reach the pack soonest is the LRT-1 portion, because the operator publishes it. Its station order and the fares between the stations in the Vito Cruz/Taft area need a person to read S-02, S-03 and S-04 and transcribe them.
- An LRT-1-only pack would let the engine plan stations to stations, but it would **not** cover any of the three target corridors end to end. It must be advertised as exactly that (LRT-1 stations only) if it is ever shipped.
- No road-based leg (jeepney, van, bus, tricycle) has any evidence. These need dated observations by teammates who rode the service, recorded as source records and reviewed by someone else before use. The planning rules allow dated teammate observations only if team rules permit; that permission is a decision for Member 4.

## Next actions

1. **Member 4 / user:** approve downloading the two LRMC fare matrix images and the route map (or read them in a browser and send the values). I will then transcribe and cross-check them.
2. **Teammates on the ground:** for each corridor, record the terminal, operator, exact boarding and alighting points, the headsign, the fare paid, the date, and the walking path between linked stops. Reverse direction separately.
3. **Member 2 (me):** after (1), build `assets/data/release.json` containing only the transcribed LRT-1 facts, validate it in release mode, and state its coverage as LRT-1 stations only.
4. A second registered teammate must check every transcribed fact against its source before it is marked verified.
