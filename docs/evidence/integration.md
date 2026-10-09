# Member 4 integration checkpoint — October 9–10, 2026

Branch: `feat/integration/int-001-foundation`. Implementation is authorized by the user's Member 4 assignment. The original checkout changed to Member 2's branch during work; integration was isolated in `.worktrees/member4`.

## Integrated source

| Area | Evidence |
|---|---|
| INT-001 | Pinned Expo/RN/llama baseline, npm lockfile, native config, contracts and runtime validators |
| INT-002 | Private serialized SQLite repository, bound statements, transactional import, rollback, payload/index/alias/metadata checks; incremental hash adapter |
| INT-003 | Real AiPort from Member 1, RoutePort from Member 2, UiProvider/screens from Member 3; confirmation, manual path, correlated cancellation, typed errors |
| INT-005 | Standalone Android test APK built and signature/hash/runtime checked; Mac Release procedure documented; physical installs Not Run |
| INT-006 | 369 behavior tests pass, TypeScript passes; release gate rejects incomplete evidence and unbundled/fixture data |
| INT-007 | README, build handoff and reviewable submission outline; video/publication/submission Not Performed |

Published peer commits integrated: routing/data/source register `b376524` (includes `7ebddfb`, `928e092`), AI `58f48ba`, UI `84e029f`. Whitespace-only contract conflict retained the approved v1.0 type block; the temporary foundation home screen was replaced with Member 3's actual screen.

## Executed checks

| Check | Result and limit |
|---|---|
| `npm ci` | Pass from final lockfile in native build copy; 571 installed packages. No wildcard upgrades |
| `npm run typecheck` | Pass after safe UI array access fixes; strict/noUncheckedIndexedAccess retained |
| Combined Node tests through tsx | **369/369 pass** across AI, routing, UI and integration |
| SQLite tests | Real Node SQLite: persistent close/reopen, invalid import, storage-full rollback, snapshot/queued reads, corrupt indexes/metadata/aliases; Expo device SQLite Not Run |
| `npm run doctor` | Pinned expo-doctor 1.20.4: **21/21 pass** |
| `npx expo install --check` | Installed SDK mapping passes; the offline invocation could not check the live endpoint |
| `npm run data:validate` | Fixture passes development; fixture rejected by release gate; no actual release pack exists |
| Android + iOS Hermes exports | Pass on the scaffold; integrated-screen export is recorded in builds.md |
| Android native build | See builds.md; compilation is distinct from physical inference |
| iOS prebuild on Windows | Refused by Expo, as expected; no native iOS claim |
| `release:check` | Expected nonzero: release pack and physical proof unavailable; null bundled-pack seam also blocks release |

Test doubles occur only in tests. Native composition imports no test pack, fake AI or canned route. Laptop test results cannot establish phone compatibility, transport reality or airplane-mode behavior.

## Integration corrections

- Pack validation delegates to Member 2's validator, which enforces geography, evidence, references, fare policy shape and fixture exclusion. No competing schema is maintained.
- UI confirmation reuses the interpreted draft query ID. Explicit edits can be reconfirmed until new input, manual planning or explicit cancellation invalidates the draft. Backgrounding cancels pending jobs and preserves a completed editable draft.
- The output guard accepts verified forward occurrence pairs on loop routes and the current onboard label. Mode exclusions apply to future boardings; continuing the vehicle already occupied does not pretend the user boarded a newly forbidden mode. Ambiguous repeated next-stop IDs require clarification.
- AI owns 15-second warm/30-second cold deadlines; the outer controller allows cold timeout plus native stop settlement. A stale job cannot publish its result.
- Member 1's existing optional setup cancellation is forwarded through UiServices; canonical AiPort/type interfaces are unchanged.
- Model manifest/settings come from Member 1's pinned module; hashing opens a read-only file handle. No model binary has been downloaded or committed.
- A reviewed bundled pack installs only when storage is empty. Invalid/fixture packs are refused and an existing pack is preserved.
- The confirmed onboard endpoint can use either its stored place point or that next stop's documented point; arbitrary coordinates are rejected.
- Physical reports must match the recorded native artifact's hash and source commit, pack version, model revision and every acceptance case. The release script also rejects artifacts whose runtime sources differ from the current checkout; documentation-only commits do not invalidate them.
- Release source inspection rejects imports/reexports/dynamic loads from test or fixture modules and explicit fixture-provider wiring. Warning copy and type declarations remain valid.

## Remaining gates

1. Member 2: source-backed legal boarding/dropoff/walk/service/fare evidence and an actual release pack. All three corridors currently remain unverified.
2. Android physical phone: install/cold launch, real model download/hash/restart, fresh inference, cancellation/background recovery and offline commute once data is present. ADB reported no devices.
3. Mac/iPhone: same-commit native Release build, Personal Team signing/install, model setup/inference and offline checks.
4. Member 1: measured Taglish corpus accuracy, load/completion latency and peak memory. Member 3: actual native usability/accessibility.
5. Actual participant briefing and final video/submission receipt.

## Dependency audit

At the initial install, npm reported 29 advisories. Pinned overrides `decode-uri-component@0.5.0` and `xcode > uuid@11.1.1` removed their reported issues. **19 high advisories remain** in Expo/Metro toolchain dependency paths involving braces and node-forge; the registry had no fixed releases for those two packages at this checkpoint. No forced downgrade to incompatible Expo/RN versions was performed. Expo Doctor success does not mean npm audit is clean.

Relevant advisory records: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Reassess before distribution; these are dependency findings, not evidence of a demonstrated application exploit.

## Checkpoint 2026-10-10 (about 01:40 PHT): config decisions, pack freeze, audit

State verified on `main` at `3aabd53`: `npm run typecheck` clean, `npm test` 442 pass, `npm run doctor` 21/21, `npm run data:validate` passes the bundled `pack_lrt1` (`lrt1_2026_10_10_1`, SHA-256 `f2499c54…22c2931`). `release:check` is blocked only by missing Android and iOS physical evidence and the stale Android artifact (`34236a5`). Nothing has run on a phone.

### `app.config.ts` decisions (Member 3 proposals)

| Proposal | Decision | Reason |
|---|---|---|
| `userInterfaceStyle` | Changed to `"light"` | The palette is light only. `"automatic"` risked an illegible status bar or keyboard in system dark mode. Revisit when a dark palette exists. |
| `orientation` | Kept `"portrait"` | Smaller test surface before the freeze; rotation is not a P0 requirement. Screens already apply side safe-area insets if it is enabled later. |
| Engine text localization | Deferred | Needs stable codes from Members 2 and 4. Engine messages stay English. |

The `userInterfaceStyle` change is a runtime change: any artifact built before it is stale for `release:check`.

### Pack freeze (proposed, not yet agreed)

Proposed: no change to `assets/data/release.json` after **03:00 PHT on 2026-10-10**, so a build and device tests fit before the 06:00 release gate. Any later change invalidates the recorded artifact and the physical report. Member 2 and the user must agree to this time; until they do it is a proposal.

### Dependency audit reassessment

`npm audit` still reports 19 high advisories, all in Expo/Metro toolchain paths (`braces`, `node-forge` via `@expo/code-signing-certificates`). The only offered fix is `npm audit fix --force`, which would install `expo@44.0.6`, an incompatible downgrade, so it was not applied. These packages run at build time on the developer machine; they are not application code and they do not take user input at runtime. This is a finding to disclose, not evidence of an application exploit. No change made.

### Install scripts

llama.rn's postinstall fetches its prebuilt native libraries. After `npm ci` on Node 24.21 / npm 11.19 the iOS `rnllama.xcframework` and Android `jniLibs` were present. npm 11.19 prints an install-scripts notice; confirm the libraries exist after any fresh install before building.

### Build host status

This Mac has Xcode 26.6 but no signing identity (Personal Team not configured) and no connected iPhone. It has no Android SDK, `adb` or Android device. Android release and benchmark APKs have not been rebuilt for the current commit.
