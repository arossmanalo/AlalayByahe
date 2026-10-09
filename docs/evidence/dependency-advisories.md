# Dependency advisories (INT-006), 2026-10-10

Run on `main` (`053caa3`) with `npm audit --json` after `npm ci` (Node 24.21, npm 11.19). **No dependency was changed.** A dependency change needs a versioned contract note and the user's approval.

## Result

`npm audit` reports 19 high advisories and nothing critical, moderate or low. They come from only **two** advisories; the other 17 entries are packages that depend on those two.

| Advisory | Package (installed = latest published) | Severity | What it is |
|---|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces` 3.0.3 (range `<=3.0.3`) | high, CVSS 7.5 | Stack-exhaustion denial of service through deeply nested glob patterns |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | `node-forge` 1.4.0 (range `<=1.4.0`) | high, CVSS 7.5 | RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements |

Dependency paths (`npm ls`): `expo → @expo/cli → node-forge` and `@expo/cli → @expo/code-signing-certificates → node-forge`; `expo → @expo/metro → metro-file-map → micromatch → braces`.

## Reachable in the shipped app?

Method: exported the Android bundle with a source map (`expo export --no-bytecode --dump-sourcemap --clear`, 1,370 source files, 63 packages) and listed which `node_modules` packages end up in it.

| Package | In the app bundle |
|---|---|
| `braces`, `micromatch`, `node-forge` | **No** |
| `metro`, `metro-config`, `@expo/cli`, `@expo/metro-config`, `@expo/code-signing-certificates` | **No** |
| `react-native`, `expo`, `react-native-screens`, `react-native-worklets` | Yes, but they appear in the audit only because their *build-time* dependency trees contain `braces`/`node-forge`; the vulnerable code itself is not shipped |
| `llama.rn`, `expo-sqlite`, `@noble/hashes` | Yes, not flagged |

So neither advisory is reachable from code that runs on the phone. Both are in tooling that runs on the developer's machine while building (Metro file watching, Expo CLI code signing). The app does not parse glob patterns from users or verify RSA signatures. The risk is limited to a developer building a project with malicious input files, which is not this team's situation. This is a source-map check of the JavaScript bundle; it does not inspect the native Android libraries, but those come from llama.rn and React Native, not from `braces` or `node-forge`.

## Why there is no fix to apply

- Both vulnerable packages are already at the latest published versions, and each advisory's range includes that version. There is no patched release to upgrade to.
- `npm audit fix --force` proposes `expo@44.0.6`, `react-native@0.72.17`, `react-native-reanimated@4.2.2` and `react-native-worklets@0.7.4`. These are downgrades of years of releases and are incompatible with Expo 57 / React Native 0.86, so they were not applied.
- An `overrides` entry for `braces` or `node-forge` has nothing newer to point at.

## Proposals (not applied)

1. **Disclose, do not patch.** State in the README that 19 high advisories remain in build tooling with no published fix, not reachable at runtime. Done in `README.md` and `docs/disclosures.md`.
2. **Re-run `npm audit` after the next Expo SDK 57 patch release** and upgrade within the SDK's own pinned set when `braces` or `node-forge` publish a fix. Treat that as a versioned dependency change with a new lockfile and a rebuild.
3. **Do not distribute build machines' tooling**; only the APK is distributed, and it does not contain these packages.
4. If the team wants a lower number before submission and accepts the risk, there is no safe way to do it in the remaining time. Do not use `--force`.

## Not checked

Native (Gradle/CocoaPods) dependencies are not covered by `npm audit`. Transitive native libraries inside the APK were not scanned.
