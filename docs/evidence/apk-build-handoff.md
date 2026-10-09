# APK build handoff (2026-10-10)

Status: **no APK has been built.** Two attempts per flavor on Member 2's Windows PC failed with
"The paging file is too small" (Windows commit memory exhausted) and Hermes "LLVM ERROR: out of memory".
This is environmental, not a code fault. Everything needed is on `main` (`0c43c2f` or later).

## Who builds
Anyone with a machine that has about 16 GB free RAM/commit and the Android SDK, NDK 27.1.12297006,
CMake 3.22.1 and JDK 17+ (Android Studio's JBR works). Close heavy apps first. Keep C: with several GB free.

## Steps (Windows)
1. `git clone https://github.com/arossmanalo/AlalayByahe C:\ab` (short path), `cd C:\ab`, `npm ci`.
2. Set `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT` (see `android-build-runbook.md`).
3. `powershell -File scripts\build-all-apks.ps1 -OutDir C:\ab-out`
   builds release, benchmark (`EXPO_PUBLIC_AI_DIAGNOSTICS=1`) and demo (`EXPO_PUBLIC_DEMO_BUILD=1`),
   hashes each and runs `scripts/check-bundle-clean.ts` (`--expect release` for release and benchmark, `--expect demo` for demo).
4. Read `C:\ab-out\status.txt` and `check-*.txt`. Never commit APKs.

## Record (Member 4)
For each APK: file name, source commit, size, SHA-256 into `docs/evidence/native-artifacts.json` and `builds.md`;
label benchmark and demo as non-release; then `npm run release:check`. Release APK must pass the clean check
(no `pack_test_demo_luzon_roads`, no "Baguio City terminal", no `alalaybyahe-demo.db`).

## Distribution
Release + benchmark to Member 1; release + demo to Members 2 and 3. `adb install -r <file>`.
