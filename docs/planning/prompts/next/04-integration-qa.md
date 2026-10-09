# NEXT PROMPT 4: Member 4, Integration, release and QA (INT-005, INT-006, INT-007)

> **Scope change (2026-10-10): iOS is excluded.** The team dropped iPhone because of limited resources, so Android is the only target platform. Read every iOS/iPhone requirement below as out of scope; it is kept as history. No iOS native build, signing, install or inference has been done or claimed.

You are the AI coding assistant for **Member 4**, owner of contracts, storage, application wiring, native projects, release and merges. You are the only member who merges to `main`. Plan first, then execute. Implementation is authorized.

## State of `main` (verify, do not trust)
- Repo https://github.com/arossmanalo/AlalayByahe, `main` at merge `8ae8c16` or later. Merged: PR #5 (Member 3 UI-006), #6 (your integration branch with Member 1's AI-005/006 diagnostics and Member 2's reviewed LRT-1 pack), #7 (Member 2's end-to-end tests and doc corrections). `git pull && npm ci`: `npm run typecheck` clean, `npm test` 442 pass, `npm run data:validate` passes with the release pack, **`npm run release:check` is blocked by exactly three items**: (1) missing matching Android physical evidence, (2) missing matching iOS physical evidence, (3) the recorded Android artifact (`34236a5`) is stale for current runtime sources.
- The bundled pack is `pack_lrt1` version `lrt1_2026_10_10_1` (LRT-1 stations only), content SHA-256 `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`. **Nothing has run on a phone.** No target corridor is supported.
- The teammates are waiting for you: Members 1 and 3 need an APK on a phone; Member 2 needs the rebuilt app to finish ROUTE-006.

## Do this, in order
1. **Pack freeze.** Agree with Member 2 and the user on a time after which the pack does not change (a pack change is a runtime change and invalidates artifacts). Note it in `docs/evidence/integration.md`.
2. **Rebuild Android from a clean short-path checkout of the exact `main` commit** (README, `D:\ab-native`). Build **two** artifacts and keep them separate: (a) the **release build** with no diagnostics flag, the one physical evidence is recorded against; (b) a **benchmark build** with `EXPO_PUBLIC_AI_DIAGNOSTICS=1` for Member 1's probe, corpus and lifecycle runs. Record each in `docs/evidence/native-artifacts.json` (file, source commit, size, SHA-256, flag) and `builds.md`. Give Members 1 and 3 the file names and hashes, and the install command `adb install -r`. Confirm `release:check` no longer reports the artifact as stale (it will still report physical evidence).
3. **Decide Member 3's proposals** (they need your `app.config.ts`): `orientation: "portrait"` vs rotation, `userInterfaceStyle: "automatic"` vs `"light"` until there is a dark palette, engine text localization (defer unless Members 2 and 4 provide stable codes). Make the change before step 2 if you accept any, so the build includes it.
4. **iPhone on the Mac:** same commit, `npm ci`, `npx expo prebuild --platform ios`, Release build with the Personal Team, install on the iPhone 14 Pro. Record the seven-day expiry and that there is no TestFlight or App Store claim. Hand the install to Members 1 and 3 for their runs.
5. **Physical acceptance, both platforms** (`docs/evidence/physical-release.example.json`, checklist in README), filled into `docs/evidence/physical-release.json`: install, cold launch without Metro or USB, SQLite persists across restart, model download, hash and restart (Member 1), fresh phone-local extraction feeding real routing, cancel and background recovery, and the offline proof (Metro stopped, USB unplugged, airplane mode, force-quit, relaunch, fresh query). Each report must match the artifact hash, source commit, pack version and model revision. Never fill in a result you did not witness.
6. **Merge duty:** review and merge Members 1, 2 and 3's PRs as they arrive, after `typecheck`, `test`, `data:validate` and `release:check` (blocked only by physical evidence). Never force-push `main`.
7. **INT-007 (docs, video, submission):** correct the README and evidence to match actual status; final disclosures (inference stays on the device, online helpers off, no paid services, Qwen2.5 Apache-2.0, LRMC as the fare source, OpenStreetMap and Wikipedia attribution for station coordinates); a reviewable submission outline and a video script. Do not publish, post or submit anything without the user's direct authorization. **The participant briefing PDF is still missing**; verify the official requirements before claiming compliance.
8. Reassess the 19 high npm advisories in the Expo/Metro toolchain before distribution (`docs/evidence/integration.md`).
9. **Time:** the provisional internal deadline is 2026-10-10 10:00 PHT (feature freeze 04:00, release gate 06:00, submission target 08:30). Check the actual current time and the latest user-approved schedule now. If gates cannot be met, ship the narrower honest scope: "LRT-1 stations only", and say plainly that phone inference, offline operation and iOS were or were not verified.

## Rules
- Never claim native, offline, iOS or route reality without physical evidence. Node tests and Hermes exports prove nothing about phones.
- No secrets, signing material, keys, `*.gguf` or personal logs in Git.
- Contract or dependency changes must be versioned and announced; no silent upgrades.
- Git: small branches from `main`, PR for your own changes too, verify remote SHAs.

## Report format
Tasks and IDs; PRs merged with SHAs; artifacts with hashes and flags; exact commands and results; per-gate Pass/Fail/Not Run; blockers with owners; deadline impact; verified remote `main` SHA.
