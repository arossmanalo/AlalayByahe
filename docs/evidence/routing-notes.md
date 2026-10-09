# Routing engine notes (ROUTE-003, ROUTE-004, ROUTE-005)

Last updated: 2026-10-09 (Member 2). Everything here describes code that exists and tests that were run on the
synthetic fixture and tiny synthetic graphs. **No real route has been planned**: there is no release pack
(see `pack-status.md`). Nothing below is evidence about real transport.

## Where the code is

| Concern | File |
|---|---|
| Indexed read-only graph over a validated pack | `src/routing/graph.ts` |
| Label-setting search (pre-trip and onboard) | `src/routing/search.ts` |
| Fares: policies, validity, discounts, aggregation | `src/routing/fares.ts` |
| Leg building, ranking, option text | `src/routing/rank.ts` |
| Onboard context checks | `src/routing/onboard.ts` |
| `RoutePort` implementation, constraint diagnosis | `src/routing/routePort.ts` |

Entry points: `createRoutePort({ now?, labelLimit? })` (contract `RoutePort`) and `planRoute(request, pack, options)`
(synchronous, used by tests). `now` is injected so fare validity is deterministic.

## How a journey is found

State is either "on foot at a place" or "riding direction D at position P". Moves:

1. **Walk** along a documented, directed `WalkLink`. Chained links form one walking segment whose total is limited.
2. **Board** where the stop AND the route-stop both allow boarding, in a `documented` direction of an allowed mode.
3. **Ride** to the next stop of the same direction (increasing sequence only; never backwards, never a reverse direction).
4. **Alight** where the stop AND the route-stop both allow alighting.

Rules that follow from the contract:

- No transfer cap. Transfers = rides boarded minus one. Continuing past intermediate stops is not a new boarding.
- Walk limits are inclusive and apply per segment: access (before the first ride), transfer (between rides), egress (after the last ride).
- Two stops that share a `placeId` can be exchanged with no walk. A different place needs a documented walk link. A route line merely crossing another is never a transfer.
- A journey needs at least one ride. A walk-only option is not offered.
- Directions that are `suspended` or `unknown` are not routed.
- Up to three options, one per distinct ordered list of directions. The best variant of each route is kept.

### Pareto pruning and the guard

A label records rides, access walk, total walk, the open walking segment and the fare bounds (known min, known max,
unknown-ride count). A new label is dropped only when an existing label at the same state is no worse on every
one of those, and not identical. Identical-cost labels are kept up to three per state so equally good services can
all be offered. Labels are popped in an order that never puts a label before one that could dominate it
(every ordering component is non-decreasing along an edge), so a cycle can never improve a label and the search
terminates.

The computation guard is 10,000 labels (`routingLabelLimit`). Reaching it returns `SEARCH_LIMIT_REACHED`; it is never
reported as "no route", and partial results are not returned because they could hide a better option.
It is a guard on work, not on transfers.

### When nothing matches

1. A search with the user's strict preferences finds nothing.
2. A search with every preference relaxed finds nothing: `NO_VERIFIED_JOURNEY`.
3. Otherwise `CONSTRAINT_UNSATISFIED`, naming each single preference whose relaxation would produce a journey
   (modes, direct-only, budget, walking limits). Nothing is ever relaxed on the user's behalf.

## Worked path trace (fixture, paper oracle)

Request: `place_test_a` to `place_test_c`, defaults (all modes, 1000 m access/egress, 500 m transfer).

```
place_test_a --walk_test_access 100 m--> place_test_board
  board stop_test_board on dir_test_001 (bus, board=true both flags)
  ride  stop_test_board -> stop_test_mid -> stop_test_alight   (one boarding)
  alight stop_test_alight (alight=true both flags)            -> place_test_alight
--walk_test_transfer 150 m (documented, directed)--> place_test_xfer
  board stop_test_xfer on dir_test_003 (jeepney)
  ride  stop_test_xfer -> stop_test_dest_drop
  alight stop_test_dest_drop                                   -> place_test_dest_stop
--walk_test_egress2 100 m--> place_test_c
```

Result: transfers 1 (two boardings), walk 100 + 150 + 100 = 350 m, access 100 m, egress 100 m.
Fare: the bus has an `unknown` policy so its fare is unknown; the jeepney is a distance fare with 2,200 m of documented
service distance, inside the 4,000 m included, so the base 1,300 centavos applies. Aggregate: `partial`, known
subtotal 1,300 centavos, 1 unknown ride. The same journey with the van (estimated flat 6,000 centavos) in place of the
bus is the second option, `complete` at 7,300. Both outcomes are asserted in `tests/routing/search.test.ts`.

## Decisions to review

| # | Decision | Why |
|---|---|---|
| 1 | Discount ratio `numerator/denominator` is the **payable share** (4/5 means pay 80%). | The contract does not say. Awaiting confirmation by the contract owner; I author the pack, so data and code agree. A rule that is missing for a passenger type yields the regular fare marked `estimated`, never a guessed discount. |
| 2 | A distance fare with a partial increment is a **range** (round down to round up), status `estimated`. | The data format has no rounding rule for partial increments. |
| 3 | Date-only `validFrom`/`validTo` are inclusive Philippine calendar days. | Fares are local and the contract only says ISO 8601. |
| 4 | Two current policies for one service that give different amounts make the fare unknown. | "Fare sources disagree. Please confirm." |
| 5 | Onboard: the **current ride is allowed even if its mode is excluded**; the mode allow-list governs later services. | The passenger is physically on it. |
| 6 | Onboard: the current ride's fare is always unknown, so a strict budget can never be certified while onboard. | Payment status is not known (EC-060). |
| 7 | Onboard: a stop that a loop passes twice needs clarification. | We cannot tell which pass the passenger is on. |
| 8 | Onboard leg shows the confirmed next stop as its start, labelled "Currently onboard; next stop: ...". | The boarding point is not known and is not invented. |
| 9 | `nearest_useful` does not use fare as a tie-break. | An unknown fare carries a 0 subtotal and must not look cheaper than a known one. |
| 10 | `lowest_known_fare` lists fully known fares first (worst case, then best case), then incomplete ones, labelled as not comparable. | Contract section 5. |

## Not done / limits

- Verified only on synthetic data. Real-route correctness is ROUTE-006 and needs the ROUTE-001 evidence.
- Waiting time, traffic and travel time are not modelled; no "fastest" claim is made anywhere.
- Fare validity is evaluated at the injected clock; there is no per-trip date selection.
- Search state grows with stops per direction (`boardIndex` is part of the onboard state). Packs of corridor size are far below the guard; a very large pack would hit `SEARCH_LIMIT_REACHED` rather than run long.
- Member 4's `validateTransitPack` (in `src/contracts/validators.ts`) and my `validatePack` overlap. Mine is stricter on evidence, fares and walks; theirs additionally forbids a repeated stop within a direction. They should be reconciled before release (one source of truth).
