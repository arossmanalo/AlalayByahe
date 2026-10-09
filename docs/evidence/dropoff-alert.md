# Drop-off alert logic and trip pins (ALERT-001, ALERT-002)

Status (2026-10-10): pure TypeScript modules with software tests. **Not tested on a phone.** No GPS, vibration, battery or walking result exists.

This supports an optional, user-started convenience alert: "You are near [stop]". It is **not vehicle tracking**. It knows nothing about the vehicle, route, schedule or arrival time, only how far the phone is from one target point. Do not describe it as live, automatic or "arriving now".

## ALERT-001 `src/routing/dropoffProximity.ts`

```ts
createDropoffWatcher(options): Result<DropoffWatcher>   // INVALID_INPUT with detail.field on bad options
watcher.update(fix: { latitude, longitude, accuracyMeters, timestampMs })
  -> { state: "far" | "approaching" | "arrived", distanceMeters: number | null, event?: "approaching" | "arrived", ignored?: "invalid_fix" | "low_accuracy" | "stale_fix" }
watcher.reset()
```

| Option | Default | Meaning |
|---|---|---|
| `target` | required | The drop-off point (use `TripPins.dropoff.point`). |
| `radiusMeters` | 400 | Inside this: counts as arrived. |
| `warnMeters` | 800 | Inside this: approaching. At least `radiusMeters`. |
| `minAccuracyMeters` | 100 | Fixes with a larger accuracy radius are ignored. |
| `debounceFixes` | 2 | Consecutive good fixes inside the radius before `arrived`. |

Behaviour:
- `event` appears only on the update that crosses a threshold, and each of `approaching` and `arrived` fires once.
- The first good fix inside `warnMeters` fires `approaching` immediately (one jump may warn, it cannot arrive). `arrived` needs `debounceFixes` consecutive good fixes inside the radius; any fix outside the radius restarts that count.
- `arrived` is sticky: later drift back outside the radius does not undo it.
- **Re-arm:** only after a good fix farther than `warnMeters + 200` m. Then the state returns to `far` and both events can fire again. This hysteresis stops jitter from repeating alerts.
- Ignored fixes (`invalid_fix`: NaN, infinite, out of range, negative accuracy; `low_accuracy`; `stale_fix`: timestamp not newer than the last accepted fix) leave the state unchanged and never count toward arrival.
- Distances are aerial meters (`aerialMeters` in `src/data/geo.ts`), rounded to whole meters. This is only used to decide when to nudge the user, never for routing or walking directions.

### Thresholds are untested proposals
400 m and 800 m, 100 m accuracy and two fixes are reasoned guesses. They have not been walked with a phone. At a typical 5 to 10 second fix interval, a vehicle at about 40 km/h covers roughly 55 to 110 m between fixes, so 800 m gives only about 1 to 2 minutes of warning. Tune after real tests; do not publish them as measured.

## ALERT-002 `src/routing/tripPins.ts`

```ts
buildTripPins(option: JourneyOption, pack: TransitPack): TripPins
buildTripPinsForResult(result: RouteResult, pack: TransitPack, optionIndex = 0): TripPins | null
```

`TripPins` = `{ optionId, legs: TripLine[], pins: TripPin[], dropoff: TripPin | null, bounds, missingCoordinate: string[] }`.
- `TripPin` = `{ id, kind: "board" | "alight" | "transfer", placeId, stopId, name, point, verification: "verified" | "unverified" }`. First ride board = `board`, final ride alight = `alight`, every stop between rides = `transfer` (one pin when the same stop is reached and left). `dropoff` is the final alight pin and the default alert target.
- `TripLine` = `{ legId, kind: "ride" | "walk", mode, polyline: [lat, lon][], approximate: true, verification }`. Ride lines pass through the pack's ordered stops between board and alight. Walk lines run between the two places. **They are straight segments, not the road, rail or walking path**; label them approximate.
- `verification` is `"verified"` only when the pack is `kind: "release"` and that record's evidence is verified. Everything from a `test_fixture` pack (including LRT-1 stops inside the demo pack) is `"unverified"`; the UI must show it as such.
- A missing or invalid coordinate gives no pin and an entry in `missingCoordinate`, never a guessed point. If `dropoff` is `null`, do not offer the alert.

Coverage today: the release pack has coordinates for the 25 LRT-1 stations only, so verified pins and alerts exist only for LRT-1 journeys. Road drop-offs exist only in the demo pack and are drafts.

## Limits to disclose
- Foreground only. Background location, notifications and a foreground service are not implemented.
- GPS accuracy is poor indoors, between tall buildings and in tunnels; elevated and underground LRT-1 sections may give weak or stale fixes. The alert may be late or missing.
- Continuous location use drains the battery. Fix interval and power use are unmeasured.
- Vibration may be disabled on the phone; the UI must also show text and be readable by TalkBack.
- Location stays on the phone and must not be logged or sent.

## Tests
`tests/routing/dropoff-alert.test.ts` (software only): option validation, single events, debounce, jitter around both thresholds, low accuracy, NaN and out-of-range fixes, out-of-order and repeated timestamps, re-arm, reset, antimeridian and pole, and pins for Vito Cruz to Baclaran, EDSA (Taft) to Vito Cruz both ways, missing coordinates, downgraded evidence and the Lipa to Candelaria demo journey (all unverified, transfer pins between the jeepneys).
