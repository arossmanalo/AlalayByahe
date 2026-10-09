# FINISH PROMPT 2: Member 2, Transportation data and routing (ROUTE-001, 002, 006)

You are the AI coding assistant for **Member 2**, owner of `src/data/`, `src/routing/`, `assets/data/`, `tests/routing/` and `docs/evidence/` data provenance in AlalayByahe. Work in Planning Mode first, then execute. Implementation is authorized.

## State of the repository (verify, do not trust)
- Repo: https://github.com/arossmanalo/AlalayByahe, `main` (merge `85ec5a2`). Read `AGENTS.md`, `docs/planning/prompts/02-routing-data.md` (original spec), `docs/evidence/pack-status.md`, `sources.md`, `corridor-status.md`, `teammate-observations.md`, `route-audit.md`, `unblock-kit.md`, `routing-notes.md`.
- `npm ci`, `npm run typecheck`, `npm test` (387 pass at writing). `npm run data:validate` and `npm run release:check` (expected to fail).
- Done and merged: pack validator and release gate (`src/data/validatePack.ts`, also used by Member 4's storage), directed search, fares, ranking, onboard planning (`src/routing/`), synthetic fixture (`tests/fixtures/transit-pack.json`). Discount ratio is confirmed as the **payable share** (4/5 = pay 80%).
- **No `assets/data/release.json` exists.** `src/application/bundled-pack.ts` exports `null`, so the app reports "data unavailable". All three corridors are unsupported.
- Unreviewed candidate: `data/candidates/lrt1-candidate.json` (25 LRT-1 stations, 600 stored value fares, built by `scripts/build-lrt1-candidate.ts` from the LRMC "Stored Value Fare Matrix", effective April 2, 2025; the file names on lrmc.ph are swapped). All evidence is `estimated`; both validators correctly refuse it for release.
- Teammate-reported routes for the three corridors are in `teammate-observations.md` as **unreviewed leads**, with conflicts (LRT Pedro Gil to Vito Cruz reported P25/P12 vs LRMC P19 stored value, P20 single journey; "Quiapo/UST" jeeps head away from Vito Cruz).

## Remaining tasks
- **ROUTE-001/002:** turn evidence into a **verified** release pack.
- **ROUTE-006:** the independent audit, then lock the pack version.
- **ROUTE-101 (P1):** do not start until ROUTE-006 passes and the user approves.

## Do this
1. **Reviewer first.** Get one registered teammate (not you) to complete `docs/evidence/unblock-kit.md` section A against the LRMC image and map. Ask the user who. Without that review, **do not** mark anything `verified`.
2. After the review, regenerate: set the reviewed facts' evidence to `verified`, `checkedBy` to the reviewer's name and date, regenerate `data/candidates/lrt1-candidate.json`, then write `assets/data/release.json`. Run `npm run data:validate -- assets/data/release.json --release`; it must pass with zero errors. Keep coverage honest: "LRT-1 stations only" unless more is verified. Stations lack walking links, so only station-to-station planning is claimed.
3. **Road corridors.** Do not fabricate. Convert a teammate-reported leg into pack records only when it has: exact boarding/alighting spots with GPS, signboard/headsign, direction, a dated named recorder, a measured directed walk (meters and steps) between legs, the fare paid, and a second checker. Use the observation template (`unblock-kit.md` section B). Reverse directions are separate records. Resolve the two conflicts above with the reporters before using those legs. If a corridor cannot be completed end to end, leave it unsupported.
4. **Tricycle legs** need documented stands or service areas; do not invent arbitrary tricycle edges.
5. Extend `tests/routing/real-pack.test.ts` to the final pack: validator pass, every advertised journey traced by hand against its sources, forward and reverse tested separately, fares match sources, unsupported pairs return `NO_VERIFIED_JOURNEY`.
6. Finish `docs/evidence/route-audit.md`: per-corridor verdict, journey traces compared with sources, residual gaps, the reviewer's name. Update `pack-status.md`, `corridor-status.md`, `sources.md` and the ROUTE rows in `docs/planning/04-team-execution.md`.
7. **Hand to Member 4:** tell them the pack version and hash (`npx tsx scripts/validate-data.ts` prints the content SHA-256). They import it in `src/application/bundled-pack.ts` and rebuild the native app (a pack change is a runtime change and invalidates the recorded APK).
8. With Member 4, run planned journeys through the integrated app and compare rendered instructions with sources (this closes ROUTE-006).

## Rules
- No synthetic data in `assets/data`. Unknown fares stay unknown; never zero. Partial subtotals are labelled.
- No claim of live arrivals, fastest travel, or current availability.
- Do not change contracts, dependencies or `package.json`; propose to Member 4.
- Do not send external messages (LTFRB, FOI) yourself; the draft is in `unblock-kit.md` section C for a human to send.
- Git: branch from `main`, e.g. `feat/routes/route-006`, push, open a PR to `main`; Member 4 merges. Verify the remote SHA.

## Report format
Tasks and IDs; files; exact commands and results; pack version and hash; coverage actually supported; Pass/Fail/Not Run; open gaps with owners; remote SHA.
