# Artifact record templates (INT-005)

Blanks to copy when the builder reports. **Do not paste these into `docs/evidence/native-artifacts.json` until every field is real.** `npm run release:check` reads that file: an entry with an empty or malformed commit or hash is reported as "source commit could not be verified" and blocks the release check. Keep blanks here.

`native-artifacts.json` is an array. Add one object per APK. The gate only accepts evidence for an entry with `"variant": "release"`; a benchmark or demo entry can never satisfy it (enforced in `src/application/release-gate.ts` and tested). Only the release APK may appear in `physical-release.json`.

## What the builder must send back (per APK)

| Field | Where it comes from |
|---|---|
| File name | the copied file, `alalaybyahe-0.1.0-<commit7>-<release\|benchmark\|demo>.apk` |
| Source commit (40 hex) | `git rev-parse HEAD` on the build machine, same commit for all three |
| Size in bytes | `(Get-Item <apk>).Length` |
| SHA-256 (64 lowercase hex) | `Get-FileHash <apk> -Algorithm SHA256` (lowercase it) |
| Built at (UTC ISO) | the build machine's clock |
| `check-bundle-clean` line | `PASS` or `FAIL` from `npx tsx scripts/check-bundle-clean.ts <apk> --expect release\|demo` |
| Flags | none / `EXPO_PUBLIC_AI_DIAGNOSTICS=1` / `EXPO_PUBLIC_DEMO_BUILD=1` |

If the clean check prints FAIL, do not record the APK as usable; rebuild from a clean state.

## `native-artifacts.json` entries (fill all fields, then append)

```json
{
  "platform": "android",
  "variant": "release",
  "artifactFilename": "alalaybyahe-0.1.0-<commit7>-release.apk",
  "sourceCommit": "<40 hex>",
  "artifactSha256": "<64 hex>",
  "bytes": 0,
  "builtAt": "<ISO UTC>",
  "flags": "none",
  "bundleCheck": "PASS --expect release",
  "signing": "generated_debug_key_for_local_testing"
}
```

```json
{
  "platform": "android",
  "variant": "benchmark",
  "artifactFilename": "alalaybyahe-0.1.0-<commit7>-benchmark.apk",
  "sourceCommit": "<40 hex>",
  "artifactSha256": "<64 hex>",
  "bytes": 0,
  "builtAt": "<ISO UTC>",
  "flags": "EXPO_PUBLIC_AI_DIAGNOSTICS=1",
  "bundleCheck": "PASS --expect release (demo data absent; cannot tell it from release by this check)",
  "signing": "generated_debug_key_for_local_testing",
  "note": "NON-RELEASE. For AI probe, corpus and lifecycle runs only."
}
```

```json
{
  "platform": "android",
  "variant": "demo",
  "artifactFilename": "alalaybyahe-0.1.0-<commit7>-demo.apk",
  "sourceCommit": "<40 hex>",
  "artifactSha256": "<64 hex>",
  "bytes": 0,
  "builtAt": "<ISO UTC>",
  "flags": "EXPO_PUBLIC_DEMO_BUILD=1",
  "bundleCheck": "PASS --expect demo",
  "signing": "generated_debug_key_for_local_testing",
  "note": "NON-RELEASE. Invented Luzon network and unverified road drafts; test-data banner on every screen."
}
```

## `builds.md` section (append under a new heading, with the real values)

```markdown
## Android APKs for commit <commit7> (<date>)

Built on <machine, OS, RAM> by <person> with `scripts/build-all-apks.ps1`. Same source commit for all three. Never committed to Git.

| Label | File | Size (bytes) | SHA-256 | Flags | Bundle check | Release evidence? |
|---|---|---|---|---|---|---|
| release | <file> | <n> | <hash> | none | <PASS/FAIL> | **Yes (the only one)** |
| benchmark | <file> | <n> | <hash> | EXPO_PUBLIC_AI_DIAGNOSTICS=1 | <PASS/FAIL> | No |
| demo | <file> | <n> | <hash> | EXPO_PUBLIC_DEMO_BUILD=1 | <PASS/FAIL> | No |

`npm run release:check` after recording the release APK: <paste output>.
Installed on a phone: <Not Run / device, build, date>. Cold launch without Metro: <Not Run / result>.
```

## Distribution message

Release + benchmark to Member 1; release + demo to Members 2 and 3. Install: `adb install -r <file>`. Installing one replaces another (same package name), so say which build is on the phone before every test. Verify the hash first: `Get-FileHash <file> -Algorithm SHA256` must equal the value above.
