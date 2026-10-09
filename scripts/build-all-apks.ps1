# Builds the three Android APKs (release, benchmark, demo) from the current commit, one after another.
# Each build starts from a clean state because Metro caches the build flag.
# Run from a clean SHORT-PATH clone (for example C:\ab). Set JAVA_HOME / ANDROID_HOME first (see
# docs/evidence/android-build-runbook.md). Output: <OutDir>\alalaybyahe-0.1.0-<commit7>-<flavor>.apk,
# check-<flavor>.txt and status.txt. APKs are never committed.
param([string]$OutDir = "$PWD\..\ab-out")
$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$status = Join-Path $OutDir 'status.txt'
function Note($m) { ("{0}  {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) | Add-Content $status }

$c7 = (git rev-parse HEAD).Trim().Substring(0, 7)
Note "START commit $c7"
foreach ($flavor in @('release', 'benchmark', 'demo')) {
  Remove-Item Env:EXPO_PUBLIC_AI_DIAGNOSTICS, Env:EXPO_PUBLIC_DEMO_BUILD -ErrorAction SilentlyContinue
  if ($flavor -eq 'benchmark') { $env:EXPO_PUBLIC_AI_DIAGNOSTICS = '1' }
  if ($flavor -eq 'demo') { $env:EXPO_PUBLIC_DEMO_BUILD = '1' }
  $apk = Join-Path $PWD 'android\app\build\outputs\apk\release\app-release.apk'
  $built = $false
  foreach ($attempt in 1, 2) {
    Remove-Item -Recurse -Force android, .tmp, node_modules\.cache -ErrorAction SilentlyContinue
    Note "$flavor attempt ${attempt}: building"
    $log = Join-Path $OutDir "build-$flavor-$attempt.log"
    npm run build:android:foundation *> $log
    if ($LASTEXITCODE -eq 0 -and (Test-Path $apk)) { $built = $true; break }
    Note "$flavor attempt ${attempt} FAILED (exit $LASTEXITCODE)"
  }
  if (-not $built) { Note "$flavor GAVE UP"; continue }
  $out = Join-Path $OutDir "alalaybyahe-0.1.0-$c7-$flavor.apk"
  Copy-Item $apk $out -Force
  $hash = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()
  Note "$flavor BUILT $out size=$((Get-Item $out).Length) sha256=$hash"
  $expect = if ($flavor -eq 'demo') { 'demo' } else { 'release' }
  $check = (npx tsx scripts\check-bundle-clean.ts $out --expect $expect 2>&1 | Out-String).Trim()
  $check | Set-Content (Join-Path $OutDir "check-$flavor.txt")
  Note "$flavor bundle check (--expect $expect): $(($check -split "`n")[-1].Trim())"
}
Remove-Item Env:EXPO_PUBLIC_AI_DIAGNOSTICS, Env:EXPO_PUBLIC_DEMO_BUILD -ErrorAction SilentlyContinue
Note "DONE"
