# FINISH PROMPT 4: Member 4, Integration, release and QA (INT-005, INT-006, INT-007)

You are the AI coding assistant for **Member 4**, owner of contracts, storage, application wiring, native projects, release and merges in AlalayByahe. Work in Planning Mode first, then execute. Implementation is authorized. You are the only member who merges to `main`.

## State of the repository (verify, do not trust)
- Repo: https://github.com/arossmanalo/AlalayByahe, `main` (merge `85ec5a2`): PRs #1 (full integration), #2 (AI docs) and #3 (LRT-1 candidate and evidence docs) are merged. Read `AGENTS.md`, `README.md`, `docs/evidence/integration.md`, `builds.md`, `native-gate.md`, `native-artifacts.json`, `physical-release.example.json`, and `docs/planning/prompts/04-integration-qa.md`.
- Verified on merged `main`: `npm run typecheck` clean; `npm test` 387 pass; `npm run data:validate` passes the fixture and rejects it for release.
- `npm run release:check` is **blocked** (expected), for five reasons: (1) no source-backed release pack passes validation, (2) no Android physical evidence, (3) no iOS physical evidence, (4) the recorded Android artifact is **stale** (runtime sources changed after commit `34236a5`; PR #3 changed `src/data/validatePack.ts`), (5) the reviewed pack is not connected to the native bundle (`src/application/bundled-pack.ts` exports `null`).
- The root `README.md` still tells people to `git switch --track origin/feat/integration/int-001-foundation`; update it to use `main`.
- Dependency audit: 19 high advisories remain in Expo/Metro toolchain paths (braces, node-forge); reassess before distribution.

## Remaining tasks
- **INT-005:** same-commit standalone Release builds for Android and iPhone.
- **INT-006:** integration, offline and regression gates on physical devices.
- **INT-007:** documentation, video, submission evidence.
- **Merge duty:** merge the other members' PRs as they arrive, after checks.

## Do this
1. **Housekeeping PR:** fix the README switch instruction; delete the stale `.worktrees/member4` assumption if no longer needed (do not remove anyone's uncommitted work).
2. **Unblock the pack with Member 2.** Member 2 delivers `assets/data/release.json` only after an independent teammate verifies the LRT-1 transcription. Arrange that reviewer (a registered teammate other than Member 2). When delivered, run `npm run data:validate -- assets/data/release.json --release`, import it in `src/application/bundled-pack.ts` in one commit (never substitute a fixture), run typecheck and tests. Decide with the team whether teammate observations count as evidence; the travel routes you reported are recorded in `docs/evidence/teammate-observations.md` as unreviewed leads and still need GPS, dates, directions, measured walks and conflict resolution (LRT fare P25 vs LRMC P19/P20; Quiapo/UST direction).
3. **Optional LTFRB request:** the draft is in `docs/evidence/unblock-kit.md` section C. A human must send it.
4. **Rebuild Android** from a clean short-path checkout (`D:\ab-native`, per README) at the final commit; record APK path, size, SHA-256, source commit in `docs/evidence/native-artifacts.json`. `release:check` will mark any later runtime change stale.
5. **iPhone:** on the Mac with Xcode 26.6, `npm ci`, `npx expo prebuild --platform ios`, build Release with the Personal Team, install on iPhone 14 Pro. Record that it expires in seven days and that there is no TestFlight/App Store claim.
6. **Physical acceptance, both platforms** (checklist in README and `physical-release.example.json`, filled into `docs/evidence/physical-release.json`): install, cold launch without Metro or USB, SQLite persists across restart, model download/hash/restart (with Member 1), fresh phone-local extraction, extraction feeds real routing, cancellation and background recovery, then the offline proof: stop Metro, unplug USB, airplane mode, force-quit, relaunch, fresh query. Reports must match the APK/IPA hash, source commit, pack version and model revision.
7. **Coordinate:** Member 1 (AI-005/006 measurements), Member 2 (ROUTE-006 end-to-end journey audit using the integrated app), Member 3 (UI-006 native UX). Merge their PRs after typecheck, tests and `data:validate`.
8. **INT-007:** fix README status to match reality; final disclosures (local inference stays on the device, optional online helpers are off, no paid services, model license Apache-2.0, OpenStreetMap/Wikipedia attribution for station coordinates if used, LRMC as the fare source); a reviewable submission outline and a video script. Do not publish, post or submit without the user's direct authorization. **The participant briefing PDF is still missing**; verify official requirements before claiming compliance. The provisional internal deadline is 2026-10-10 10:00 PHT (feature freeze 04:00, release gate 06:00, submission target 08:30); recheck the current time and the latest user-approved schedule.
9. Re-run `release:check`; it may pass only when every item is genuinely true. Never force it.

## Rules
- Do not claim native, offline or route reality without the physical evidence. Mocked adapters prove nothing about devices.
- Never commit secrets, signing material, keys, model binaries (`*.gguf`) or personal journey logs. Do not force-push `main`.
- Contract or dependency changes: version the contract and tell every member; no silent upgrades.
- If a gate cannot be met by the freeze, ship the narrower honest scope: say exactly what is supported (for example "LRT-1 stations only") and what is not.

## Report format
Tasks and IDs; PRs merged with SHAs; exact commands and results; per-gate Pass/Fail/Not Run; artifacts with hashes; remaining blockers with owners; deadline impact; verified remote `main` SHA.
