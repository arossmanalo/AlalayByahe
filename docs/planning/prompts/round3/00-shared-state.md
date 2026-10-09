# Shared state for every member (verify, do not trust)

- Repo https://github.com/arossmanalo/AlalayByahe, `main` at merge `27c4add` or later. `git switch main && git pull && npm ci`. Expect `npm run typecheck` clean and `npm test` 488 passing. `npm run data:validate` passes (fixture accepted for development and refused for release; release pack passes `--release` with 0 errors and 0 warnings).
- **Android only.** iOS was descoped on 2026-10-10 and is not part of production. Do not build, test or claim iOS. The release gate now requires Android evidence only.
- **`npm run release:check` is blocked by exactly two items:** no matching Android physical release evidence, and the recorded Android artifact (`34236a5`) is stale for current runtime sources. Nothing has run on a phone yet.
- **Frozen release data:** `assets/data/release.json`, pack `pack_lrt1`, version `lrt1_2026_10_10_1`, SHA-256 `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`. LRT-1 stations only (25 stations, stored value fares, no walking links, no road services). Frozen at 02:38 PHT on 2026-10-10 by the user. Do not change it; a correction means a new version, a re-review, a rebuild and repeating device tests.
- **Three different Android builds, never mixed up** (each needs its own clean checkout or a cleared Metro cache, because Metro caches the build flag):
  1. **Release APK**: no flags. The only build recorded as release evidence. Contains only the frozen pack.
  2. **Benchmark APK**: `EXPO_PUBLIC_AI_DIAGNOSTICS=1`. For Member 1's probe, corpus and lifecycle runs. Not release evidence.
  3. **Demo APK**: `EXPO_PUBLIC_DEMO_BUILD=1`. Loads `assets/demo/demo-pack.json` (real LRT-1 + unverified road-route drafts + invented Luzon network) into its own database, with the test-pack banner on every screen. Never release evidence. See `docs/evidence/demo-build.md`.
- Every artifact needs its file name, source commit, size and SHA-256 recorded in `docs/evidence/native-artifacts.json`, and a device report must match that hash and commit.
- Build hint: the Hermes compile step can run out of memory on a low-memory machine ("LLVM ERROR: out of memory"). Close heavy programs or build on a machine with more free RAM; a plain JavaScript export does not prove an APK builds.
- Teammates' road-route reports are drafts, not verified. The Luzon network is invented. Neither may be presented as real coverage.
- Internal deadline 2026-10-10 10:00 PHT (release gate 06:00, submission target 08:30). Check the actual time. The participant briefing PDF is still missing.
- Never claim phone inference, offline operation, accuracy, latency or any route you did not witness. Report Pass, Fail, Not Run or Deferred. Git: branch from `main`, small commits, push, open a PR; Member 4 merges. Verify remote SHAs.
