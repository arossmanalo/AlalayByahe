# NEXT PROMPT 2: Member 2, Transportation data and routing (ROUTE-001, 002, 006 remainder)

> **Scope change (2026-10-10): iOS is excluded.** The team dropped iPhone because of limited resources, so Android is the only target platform. Read every iOS/iPhone requirement below as out of scope; it is kept as history. No iOS native build, signing, install or inference has been done or claimed.

You are the AI coding assistant for **Member 2**, owner of `src/data/`, `src/routing/`, `assets/data/`, `tests/routing/` and data provenance in `docs/evidence/`. Plan first, then execute. Implementation is authorized.

## State of `main` (verify, do not trust)
- Repo https://github.com/arossmanalo/AlalayByahe, `main` at merge `8ae8c16` or later. `npm ci`, `npm run typecheck`, `npm test` (442 pass), `npm run data:validate` (fixture passes, release pack passes `--release` with 0 errors and 0 warnings), `npm run release:check` (blocked by exactly three items: no Android evidence, no iOS evidence, stale Android artifact).
- **Merged and bundled:** `assets/data/release.json`, pack `pack_lrt1`, version `lrt1_2026_10_10_1`, content SHA-256 `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`. LRT-1 stations only: 25 stations, ride legs both directions, LRMC stored value fares between every pair, no walking links, no road services. Independently reviewed by Aryl Manalo on 2026-10-10 (order, two full rows, 24 pairs, 5 coordinates, 2 headsigns); routing facts `verified`, coordinates `estimated`. Built by `scripts/build-lrt1-pack.ts`. Imported by `src/application/bundled-pack.ts`.
- Software end-to-end tests pass: `tests/integration/release-pack.test.ts` and `bundled-pack.test.ts` (real pack, production-mode SQLite install, real controller and RoutePort, AI as a labelled test double).
- **All three target corridors are unsupported.** The team-reported road routes are in `docs/evidence/teammate-observations.md` as unreviewed leads with two open conflicts (reported LRT Pedro Gil to Vito Cruz P25 and P12 vs LRMC P19 stored value, P20 single journey; "Quiapo/UST" jeeps head away from Vito Cruz).
- Any pack change is a runtime change: it invalidates the Android artifact Member 4 is about to build and must be re-reviewed. **Do not change the pack after Member 4 starts the final build unless the user and Member 4 agree.** Ask them for the pack freeze time.

## Remaining work
1. **ROUTE-006 on the real app.** Once Member 4 provides the rebuilt APK and Member 3 has the screens running, sit with them (or read their screenshots) and compare every rendered instruction, fare and warning for these journeys with the LRMC matrix: Vito Cruz to Baclaran (P21), Taft to Vito Cruz (P20 both ways), Pedro Gil to Vito Cruz (P19 stored value; the student view shows an estimate), Dr. Santos to Fernando Poe Jr. (P52), and an unsupported pair such as Lipa to Candelaria ("No verified complete journey available" plus the stated coverage). Record Pass/Fail with screenshots in `docs/evidence/route-audit.md`. Name the reviewer.
2. **Answer Member 3's open question:** for an onboard request the engine ignores `request.origin` and starts from the confirmed direction and next stop (`src/routing/onboard.ts`). The UI sending the next stop's place as origin is fine. Write that into `docs/evidence/routing-notes.md` and tell Member 3.
3. **Road corridors, only with evidence.** For each leg you want to add, obtain from a teammate who actually rides it: signboard text, direction, exact boarding and drop-off spots with GPS, fare paid, a date and named recorder, and the measured walking path (meters and steps) between legs. Use `docs/evidence/unblock-kit.md` section B. Resolve the two conflicts above with the reporters first. A second registered teammate must check each record. Reverse directions are separate. Convert to pack records, bump the pack version, regenerate, validate with `--release`, re-run the tests and the end-to-end tests, then tell Member 4 (the native app must be rebuilt). If a corridor cannot be completed end to end, say so and leave it unsupported. No fabricated stops, no arbitrary tricycle edges, no walking path by aerial distance.
4. **Walking links to and from LRT-1 stations** (for example De La Salle or SM places to a station) are optional extras and need the same measured-path evidence.
5. **LTFRB request:** the draft is in `unblock-kit.md` section C. A human sends it; do not send anything yourself.
6. Keep `pack-status.md`, `corridor-status.md`, `sources.md`, `route-audit.md` and the ROUTE rows in `docs/planning/04-team-execution.md` accurate.
7. **ROUTE-101 (P1)** stays off until ROUTE-006 passes and the user approves.

## Rules
- No synthetic data in `assets/data`. Unknown fares stay unknown, never zero. Partial subtotals are labelled. No claim of live arrivals, fastest travel or current availability.
- Do not change contracts, dependencies, `package.json` or other members' files; propose to the owner.
- Git: branch from `main`, for example `feat/routes/route-006-device`, push, open a PR to `main`; Member 4 merges. Verify the remote SHA.

## Report format
Tasks and IDs; files; exact commands and results; pack version and hash; coverage actually supported; Pass/Fail/Not Run; open gaps with owners; remote SHA.
