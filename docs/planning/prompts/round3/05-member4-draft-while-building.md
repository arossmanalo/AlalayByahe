# MEMBER 4 PROMPT: Draft everything while the APK is being built (INT-006, INT-007)

You are the AI coding assistant for **Member 4**. Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md` and `docs/evidence/apk-build-handoff.md` first; both are part of this prompt.

## Situation
No APK exists yet. Builds failed on Member 2's PC (Windows out of commit memory), and someone else will build with `scripts/build-all-apks.ps1`. Do **not** wait for it. Everything below needs no APK. Internal deadline is 2026-10-10 10:00 PHT (release gate 06:00, submission target 08:30); check the clock.

## Hard rules
- Draft only. **Do not publish, post, deploy or submit anything**; the user decides. Do not edit `assets/data/release.json` (frozen).
- Write only what was verified. No claim of phone inference, offline operation, accuracy, latency, live arrivals, fastest travel or road-route coverage. Every device result stays **Not Run** until a person witnesses it.
- Android only. Release build = LRT-1 stations only. Road routes and the Luzon network are the **demo build only**, unverified or invented; say so wherever they appear.
- No secrets, signing material, keys, `*.gguf` or personal logs in Git. Branch from `main`, small commits, push, open a PR. Verify remote SHAs.

## Draft these (in order)
1. **Physical test pack.** A pre-filled `docs/evidence/physical-release.json` skeleton (every result `Not Run`, every hash/commit field blank) and a numbered step-by-step phone script: install by hash, cold launch without Metro or USB, SQLite persistence across restart, model download and SHA-256, fresh phone-local extraction into real routing, cancel and background recovery, then the offline proof (stop Metro, unplug, radios off, force-quit, relaunch, fresh query). One line per step: what to do, what to observe, where to record it.
2. **README and disclosures.** Make README and evidence match reality: Android only; LRT-1 stations only in the release build; demo build separate; inference stays on the device; online helpers off by default and need an explicit action (they send selected addresses/coordinates); no paid services; Qwen2.5-0.5B-Instruct Apache-2.0; LRMC fare source; OpenStreetMap and Wikipedia attribution for station coordinates and the demo walks. List known limitations plainly (three target corridors unsupported, no live arrivals).
3. **Submission outline and video script.** A reviewable outline (problem, what works, how it works, what is verified, limits) and a shot-by-shot script that shows only verified flows, with a clear caption whenever a clip is the demo build. Leave placeholders for device/hash/timing facts to be filled from real evidence.
4. **Requirements check.** The participant briefing PDF is still missing. List every requirement you can verify from the repo and mark the rest "Unverified, needs the official brief". Do not claim compliance.
5. **Dependency advisories.** Run `npm audit`, triage the 19 high advisories (reachable in the shipped app or dev-only), and propose fixes without changing dependencies. A dependency change needs a versioned contract note and the user's approval.
6. **Merge queue.** List open PRs and for each: `typecheck`, `npm test`, `data:validate`, `release:check` status. Merge only after those pass. Never force-push `main`. Include `docs/member2-build-handoff` (build script and handoff) and PR #15 (ROUTE-006 device checklist).
7. **Artifact record template.** Prepare the `native-artifacts.json` and `builds.md` entries (file name, source commit, size, SHA-256, flags, label release / benchmark non-release / demo non-release) as blanks ready to fill when the builder reports.
8. **Who builds.** Confirm with the user who builds the APK and give them `docs/evidence/apk-build-handoff.md`.

## Report
Task IDs; files changed; PRs opened/merged with SHAs; exact commands and results; per-gate Pass/Fail/Not Run; open blockers with owners; deadline impact; verified remote `main` SHA.
