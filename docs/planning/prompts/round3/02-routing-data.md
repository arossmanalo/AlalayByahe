# ROUND 3 PROMPT 2: Member 2, Transportation data and routing (ROUTE-006 on the app, data upkeep)

You are the AI coding assistant for **Member 2**, owner of `src/data/`, `src/routing/`, `assets/data/`, `assets/demo/`, `tests/routing/` and data provenance in `docs/evidence/`. Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md` first; it is part of this prompt.

## Where you are
- The frozen release pack (LRT-1 stations only) is merged and bundled. The road-route drafts (`data/candidates/roads-draft.json`) and the invented Luzon network (`tests/fixtures/luzon-demo-pack.json`) are combined into `assets/demo/demo-pack.json` for the **demo build only**. Regenerate in this order if either input changes: `npx tsx scripts/build-road-draft.ts`, `npx tsx scripts/build-luzon-demo.ts`, `npx tsx scripts/build-demo-app-pack.ts`.
- ROUTE-006 is partly done: a self-audit, an independent LRT-1 review (Aryl Manalo, 2026-10-10), and software end-to-end runs through the controller and through Member 3's presenters (`tests/integration/release-pack*.test.ts`, `tests/ui/real-pack-ui.test.ts`). **Not done: any run on a phone, and any review of rendered screens.**
- All three target corridors remain unsupported in the release build. The road routes in the demo build are unverified.

## Do this
1. **ROUTE-006 on the app.** When Member 4 supplies the **release APK**, and with Member 3 (who holds the screen walk), compare the rendered journeys with the LRMC matrix: Vito Cruz to Baclaran P21 verified; Taft to Vito Cruz P20 both ways with opposite headsigns; Pedro Gil to Vito Cruz as a student P19 labelled estimated; Dr. Santos to Fernando Poe Jr. P52; Lipa to Candelaria and any other unsupported pair must end in "No verified complete journey available" with the stated coverage. Record Pass/Fail with screenshots and the reviewer's name in `docs/evidence/route-audit.md`.
2. **Demo build check.** When Member 4 supplies the **demo APK**, confirm on the phone that the test-pack banner shows on every screen, that Laoag to Legazpi and Lipa (McDonald's near De La Salle) to Candelaria plan, that the fares match `docs/evidence/pack-status.md` (P104 for the three jeepneys), and that the release APK shows none of it. Record the results; do not record the demo APK as release evidence.
3. **Road routes to real coverage (optional, only with evidence).** To move a road leg from the demo build into the release pack you need, per leg: signboard, direction, a pin for the boarding and the drop-off, the fare paid, a date and named recorder, a measured walk, and a second checker; use `scripts/road-draft-review-sheet.ts` and `docs/evidence/unblock-kit.md`. This changes the frozen pack, so it needs the user's and Member 4's agreement, a new version, a re-review, a rebuild and repeat device tests. Without that, leave the release pack alone.
4. Keep `pack-status.md`, `corridor-status.md`, `sources.md`, `route-audit.md` and the ROUTE rows in `docs/planning/04-team-execution.md` accurate.
5. ROUTE-101 stays off until ROUTE-006 passes and the user approves.

## Rules
- No synthetic or unverified data in `assets/data`. Unknown fares stay unknown, never zero. Partial subtotals are labelled. No claim of live arrivals, fastest travel or current availability.
- Do not change contracts, dependencies, `package.json` or other members' files; propose to the owner. Do not send LTFRB or FOI requests yourself.

## Report
Tasks and IDs; files; exact commands and results; pack versions and hashes; coverage actually supported; Pass/Fail/Not Run; open gaps with owners; remote SHA.
