# Demo build (road routes and the Luzon demo network)

Decision (the user, 2026-10-10): the road routes and the Luzon demo data are to ship, as **demo data**, in a **separate demo build**. The release build stays clean and is the only build recorded as release evidence.

## What the demo build contains

`assets/demo/demo-pack.json` (built by `scripts/build-demo-app-pack.ts`; pack `pack_test_demo_luzon_roads`, version `test_fixture_demo_2026_10_10_1`, `kind: "test_fixture"`):

| Layer | Source | Status |
|---|---|---|
| Real LRT-1, 25 stations, LRMC stored value fares | the reviewed release pack | verified |
| Road routes: Lipa to Candelaria, Candelaria to Vito Cruz (two ways), Lipa van to San Pablo | teammate reports, operator research, computed walks (`data/candidates/roads-draft.json`) | **unverified**, evidence `estimated` |
| Luzon network: 45 places, 33 lines, all five modes, Laoag to Legazpi | invented (`tests/fixtures/luzon-demo-pack.json`) | **synthetic** |

Because the pack kind is `test_fixture`, the app shows its test-pack warning banner on every screen, the About screen says so, and every result carries the first coverage label "DEMO BUILD: this pack contains INVENTED routes ... Do not rely on it to travel."

## How it is switched on

| Piece | File |
|---|---|
| Build flag | `EXPO_PUBLIC_DEMO_BUILD=1` at build time (read inline in `src/application/native-services.ts`) |
| Demo composition | same services as the release app, but loads the demo pack, uses a **separate database** `alalaybyahe-demo.db` (so installing it never replaces a release install's data), and passes `allowTestFixtures` |
| Pack module | `src/application/demo-pack.ts`, loaded with `require()` only when the flag is on |
| Controller guard | `validateRouteResult` normally refuses any leg that is not `verified`. With `allowTestFixtures` it also accepts `estimated` (never `unknown`), so demo journeys display their honest fare status. The release composition never sets it. |

## Proof the release build stays clean

Run on 2026-10-10 with a cleared Metro cache (`expo export --clear --platform android`), searching the Hermes bytecode:

| Build | Release pack `lrt1_2026_10_10_1` | Demo pack id | "Baguio City terminal" | `alalaybyahe-demo.db` | Size |
|---|---|---|---|---|---|
| Flag off (release) | present | **absent** | **absent** | **absent** | 3,305,062 B |
| `EXPO_PUBLIC_DEMO_BUILD=1` | present | present | present | present | 3,366,641 B |

An earlier export without `--clear` reused Metro's cached transform and gave identical output for both flags, so **always build the demo and the release from a clean checkout or with `--clear`**. Tests in `tests/integration/demo-build.test.ts` also check that the flag is inline, that the demo pack is required in one place only and never imported statically, and that `bundled-pack.ts` never mentions it.

## How Member 4 builds it

```powershell
# Demo APK: its own file name and hash; never recorded as release evidence
$env:EXPO_PUBLIC_DEMO_BUILD = '1'
npm run build:android:foundation        # from a clean short-path checkout, or clear Metro's cache first

# Release APK: flag unset, a different clean checkout (or cleared cache)
Remove-Item Env:EXPO_PUBLIC_DEMO_BUILD
npm run build:android:foundation
```

Keep the two artifacts separate in `docs/evidence/native-artifacts.json` and `builds.md`, label the demo one `demo`, and never put it in `physical-release.json`. `release:check` still checks only the release path (unchanged: `bundled-pack.ts` imports `assets/data/release.json`). The rule that no screen may claim real coverage from this build is enforced by the banner and the coverage label, not by trust.

## What it is not

It is not real transit data and does not change the frozen release pack. Do not demonstrate the demo build as verified coverage, and do not record it as release evidence.

## Re-check after the 2026-10-10 merges

After PRs #10 to #13 were merged into this branch, the cleared-cache Hermes export failed on this workstation with "LLVM ERROR: out of memory" inside `hermesc`. The commit that exported fine earlier the same day (`d04549d`) failed the same way, so the cause was the machine's memory state, not the code. The same check was repeated on a plain JavaScript export (`expo export --clear --no-bytecode`), which skips `hermesc`:

| Build | Release pack | Demo pack id | "Baguio City terminal" | `alalaybyahe-demo.db` |
|---|---|---|---|---|
| Flag off (release) | present | **absent** | **absent** | **absent** |
| `EXPO_PUBLIC_DEMO_BUILD=1` | present | present | present | present |

The Hermes export and APK build still need to be run by Member 4 on a machine with enough memory.


## Clean demo names, sample fares and showcase trips (2026-10-10, pack `test_fixture_demo_2026_10_10_2`)

For a smoother live demo the demo build now reads like a normal app:
- Sample places, services and headsigns use plain names (no "(DEMO)" suffix, no "hub"): for example "Cubao terminal", "Baguio City terminal", "Vito Cruz jeepney stop". The PITX sample terminal is "PITX Parañaque terminal".
- Typing "Lipa" lists the road-draft stop "McDonald's near De La Salle Lipa" and the sample "Lipa City terminal"; "Candelaria" lists the Mang Inasal stop and the sample terminal.
- The two sample fares that were deliberately unknown (Buendia to Lucena bus, Lipa to Tiaong jeepney) are filled with sample amounts (P420.00 and P28.00, **estimated**) in the demo build only. `tests/fixtures/luzon-demo-pack.json` still keeps them unknown to test partial totals.
- The per-screen test-pack banner and the Setup warning are hidden in the demo build (`UiServices.hideTestPackBanner`, set from `DEMO_BUILD` in `src/application/ui-bridge.tsx`). Fixture services still always show theirs.
- **Still disclosed (kept on purpose):** the About screen says the data is a test fixture, and the coverage line on Results and About reads "Demonstration network: only the 25 LRT-1 stations and their official LRMC fares are verified. Other routes are samples, not real transport information." The fares carry their "(estimated)" label, and journey details show the draft sources. The route data is still invented or unverified, so the video and submission must say the demo build uses sample data, and must not present the sample routes or fares as real.
- A phone that already has the demo app installed keeps its old data (the bundled pack installs only into an empty database). Install the new demo APK on a fresh install, or clear its data (this does not affect the release app, which has its own database).

Showcase trips on the demo pack (default preferences; fares are estimated sample values except the LRT-1 ones, which are the official LRMC fares):

| From | To | Result |
|---|---|---|
| McDonald's near De La Salle Lipa | Candelaria town proper (Mang Inasal stop) | jeepney, 150 m walk, jeepney, jeepney; 2 transfers; P104.00 |
| Bus stop in front of Hacienda Inn | Vito Cruz Station | bus, bus, 234 m walk; 1 transfer; P230.00 |
| Lipa van terminal | Puregold San Pablo | van; direct; P130.00 |
| Laoag terminal | Legazpi terminal | bus, bus, bus; 2 transfers; P1,662.00 |
| Cubao terminal | Baguio City terminal | bus; direct; P464.00 |
| Lipa City terminal | Baguio City terminal | bus, bus, bus; 2 transfers; P639.00 |
| Alabang terminal | Cubao terminal | van, bus; 1 transfer; P67.00 |
| Batangas City terminal | Naga City terminal | bus, bus; 1 transfer; P781.00 |
| Lipa public market | SM City Lipa | jeepney; P12.00 |
| San Pablo City terminal | Candelaria terminal | two bus options; P420.00 |
| Vito Cruz Station | Baclaran Station | LRT-1; P21.00 (real, verified) |
| EDSA Station | Vito Cruz Station | LRT-1; P20.00 (real, verified) |

Regenerate in order: `npx tsx scripts/build-road-draft.ts`, `npx tsx scripts/build-luzon-demo.ts`, `npx tsx scripts/build-demo-app-pack.ts`. The release APK and the frozen pack are unchanged; `check-bundle-clean.ts --expect release` still looks for `pack_test_demo_luzon_roads`, "Baguio City terminal" and `alalaybyahe-demo.db`.
