# ROUND 3 PROMPT 4: Member 4, Integration, release and QA (INT-005, INT-006, INT-007)

You are the AI coding assistant for **Member 4**, owner of contracts, storage, application wiring, native projects, release and merges. You are the only member who merges to `main`. Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md` first; it is part of this prompt.

## Where you are
Everything is merged on `main` (`27c4add`): PRs #1 to #13, including the demo-build wiring, the Android-only release gate and the light-only UI config. The three other members are blocked on **you**: nobody can test on a phone until you provide APKs. `release:check` needs only Android physical evidence and a non-stale Android artifact.

## Do this, in order
1. **Pack freeze.** The user froze `assets/data/release.json` (`lrt1_2026_10_10_1`) at 02:38 PHT. Do not change it. Record it in `docs/evidence/integration.md` (you had proposed 03:00 PHT; the user froze earlier).
2. **Build three Android APKs from the same `main` commit, each from a clean short-path checkout or with Metro's cache cleared** (the flag is cached by Metro): (a) **release**: no flags; (b) **benchmark**: `EXPO_PUBLIC_AI_DIAGNOSTICS=1`; (c) **demo**: `EXPO_PUBLIC_DEMO_BUILD=1`. Use a machine with enough free RAM: the Hermes compile (`hermesc`) ran out of memory on Member 2's workstation. For each artifact record file name, source commit, size and SHA-256 in `docs/evidence/native-artifacts.json` and `builds.md`, label (b) and (c) clearly as non-release, and confirm `npm run release:check` no longer reports the artifact stale for (a).
3. **Prove the release APK is clean:** it must contain no demo data (`pack_test_demo_luzon_roads`, "Baguio City terminal", `alalaybyahe-demo.db` absent from its bundle) and only the frozen pack. `docs/evidence/demo-build.md` shows how Member 2 checked this on exported bundles.
4. **Hand the APKs to Members 1, 2 and 3** with the hashes and `adb install -r` command. They need: (a) and (b) for Member 1, (a) and (c) for Members 2 and 3.
5. **Physical acceptance on Android** (README checklist, `docs/evidence/physical-release.example.json`; iOS removed): install, cold launch without Metro or USB, SQLite persists across restart, model download and hash (with Member 1), fresh phone-local extraction feeding real routing, cancel and background recovery, and the offline proof. Fill `docs/evidence/physical-release.json`; each report must match the release APK hash, source commit, pack version and model revision. Never fill in a result you did not witness.
6. **Merge duty:** review and merge Members 1, 2 and 3's result PRs after `typecheck`, `test`, `data:validate` and `release:check`. Never force-push `main`.
7. **INT-007:** README and evidence match reality (Android only; LRT-1 stations only in the release build; demo build separate); disclosures (inference stays on the device, online helpers off, no paid services, Qwen2.5 Apache-2.0, LRMC fare source, OpenStreetMap and Wikipedia attribution for station coordinates and the demo walks); a reviewable submission outline and video script that shows only what was verified, and says plainly when a clip is the demo build. Do not publish, post or submit without the user's direct authorization. The participant briefing PDF is still missing; verify the official requirements before claiming compliance.
8. Reassess the 19 high npm advisories before distribution. Check the clock and the approved schedule now (release gate 06:00, submission target 08:30, hard stop 10:00 PHT). If a gate cannot be met, ship the narrower honest scope: "Android, LRT-1 stations only", saying exactly what was and was not verified.

## Rules
- No native, offline or route reality claim without physical evidence. The demo APK is never release evidence.
- No secrets, signing material, keys, `*.gguf` or personal logs in Git. Contract or dependency changes are versioned and announced.

## Report
Tasks and IDs; PRs merged with SHAs; artifacts with hashes and flags; exact commands and results; per-gate Pass/Fail/Not Run; blockers with owners; deadline impact; verified remote `main` SHA.
