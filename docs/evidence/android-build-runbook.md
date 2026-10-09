# Android build and install runbook (Windows host)

Source commit for all three builds: the same `main` commit. Runtime sources verified at `69536ea`; later documentation, script and test commits do not make an artifact stale. Record the exact commit you built with `git rev-parse HEAD`.

Three builds, never mixed up. Build each from a **clean state**: Metro caches the build flag, and Gradle may reuse an old bundle, so delete `android`, `.tmp` and `node_modules\.cache` between builds (keep `node_modules` and the Gradle cache). Each build recompiles the native code (about 16–19 minutes on this host). If `hermesc` fails with "LLVM ERROR: out of memory", close other programs and rerun.

| Build | Flag set before `npm run build:android:foundation` | Record as release evidence |
|---|---|---|
| release | none (`Remove-Item Env:EXPO_PUBLIC_AI_DIAGNOSTICS, Env:EXPO_PUBLIC_DEMO_BUILD -ErrorAction SilentlyContinue`) | **Yes, the only one** |
| benchmark | `$env:EXPO_PUBLIC_AI_DIAGNOSTICS = '1'` | No |
| demo | `$env:EXPO_PUBLIC_DEMO_BUILD = '1'` | No |

## One-time setup

```powershell
Set-Location D:\ab-native          # short path, no spaces (README)
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'D:\AlalaySdk'; $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = 'D:\ab-g'
git fetch origin; git switch main; git pull --ff-only; git rev-parse HEAD   # note this commit
npm ci
```

After `npm ci`, confirm llama.rn's native libraries exist (npm 11 prints an install-scripts notice): `Test-Path node_modules\llama.rn\android\src\main\jniLibs` must be `True`. If it is `False`, the app would build without inference.

## For each build

```powershell
Remove-Item -Recurse -Force android, .tmp, node_modules\.cache -ErrorAction SilentlyContinue
# set (or clear) the flag for this build, see the table
npm run build:android:foundation
$apk = "android\app\build\outputs\apk\release\app-release.apk"
Copy-Item $apk "D:\ab-out\alalaybyahe-0.1.0-<commit7>-<release|benchmark|demo>.apk"   # create D:\ab-out first
Get-FileHash $apk -Algorithm SHA256; (Get-Item $apk).Length
npx tsx scripts\check-bundle-clean.ts $apk --expect release     # use --expect demo for the demo build
```

`check-bundle-clean.ts` must print PASS: release and benchmark builds must show the demo data **absent**, the demo build **present**. It cannot tell release from benchmark, so keep those file names apart and confirm on the phone: `alalaybyahe://dev-ai` opens the diagnostics screen only in the benchmark build.

## Report back for each APK

File name, source commit, size in bytes, SHA-256, flavor, and the PASS/FAIL line from `check-bundle-clean.ts`. These go in `docs/evidence/native-artifacts.json` and `builds.md`. Only the release APK may appear in `physical-release.json`.

## Install

```powershell
adb devices                         # the phone must be listed as "device"
adb install -r D:\ab-out\alalaybyahe-0.1.0-<commit7>-release.apk
```

The release and benchmark builds share one database and model file and replace each other; the demo build uses its own database (`alalaybyahe-demo.db`) but the same package name, so installing it replaces the app. Record which build is installed before every test.
