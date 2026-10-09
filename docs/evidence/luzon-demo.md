# Luzon demo pack (SYNTHETIC, for demos and testing only)

`tests/fixtures/luzon-demo-pack.json`, built by `scripts/build-luzon-demo.ts` (pack `pack_test_luzon_demo`, version `test_fixture_luzon_demo_1`).

**Everything in it is invented**: the routes, stops, fares, walks and the existence of every line. Town coordinates are approximate public geography. It is a `test_fixture` pack, every ID starts `test_`, every place and service name ends "(DEMO)", and its coverage label reads "DEMO DATA, NOT REAL". The release gate refuses it, including if its kind is flipped to `release`. It must never be bundled in a release build, never be presented as verified coverage, and never replace `assets/data/release.json`.

## What it contains

45 places, 33 services (66 directions, each line in both directions), 33 fare policies, 16 walks, spanning Laoag, Vigan, Dagupan, Baguio, Tarlac, Cabanatuan, Santiago, Tuguegarao, Angeles, Clark, Olongapo, Iba, Malolos, San Fernando, Metro Manila hubs (Cubao, PITX, Buendia, EDSA Taft, Monumento, North Avenue, Vito Cruz, Baclaran, Central, Recto, Alabang), Calabarzon (Calamba, Santa Rosa, San Pablo, Santo Tomas, Lipa, Batangas City, Tiaong, Candelaria, Lucena, Tagaytay, Nasugbu, Antipolo) and Bicol (Daet, Naga, Legazpi). Modes: bus, van, jeepney, tricycle and rail (LRT-1, MRT-3, LRT-2 labelled DEMO). Fares include matrix (distance-based demo amounts), flat, ranges, and unknown ones, so partial totals and unknown fares appear in results.

## How to see it

```bash
npx tsx scripts/luzon-demo.ts --places
npx tsx scripts/luzon-demo.ts "Lipa" "Baguio"
npx tsx scripts/luzon-demo.ts "Laoag" "Legazpi" --student
npx tsx scripts/luzon-demo.ts "Candelaria" "Vito Cruz" --modes bus,lrt
```

The command uses the real routing engine and prints a DEMO banner before and after every result.

## Tests

`tests/routing/luzon-demo.test.ts`: validates for development, is refused for release, names say DEMO, spans Luzon, every place reachable from Cubao and back, Lipa to Baguio (two transfers), Laoag to Legazpi (three rides), partial fare with an unknown ride, strict direct-only and mode exclusions, tricycle range fare, rail transfers, and the search guard.

## Showing it in the app

Yes, in a separate **demo build** only: see `docs/evidence/demo-build.md`. That build loads `assets/demo/demo-pack.json` (the real LRT-1 stations, the unverified road-route drafts and this synthetic network) with the test-pack warning on every screen. The release build contains none of it.
