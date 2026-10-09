$ErrorActionPreference = 'Stop'
if (-not $env:ANDROID_HOME) { throw 'Set ANDROID_HOME to your Android SDK. On this host use D:\AlalaySdk.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
# Paths containing spaces caused Windows CMake link/regeneration failures on the
# observed host. Use a short physical checkout; a junction was insufficient.
if ($projectRoot.Contains(' ')) {
  throw 'Use a short project path without spaces. See README: Android build on Windows.'
}
$buildTemp = Join-Path $projectRoot '.tmp'
New-Item -ItemType Directory -Path $buildTemp -Force | Out-Null
$env:TEMP = $buildTemp
$env:TMP = $buildTemp
$env:NODE_ENV = 'production'
$env:NODE_OPTIONS = '--preserve-symlinks'
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=$buildTemp"
Push-Location $projectRoot
try {
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & '.\android\gradlew.bat' -p android --no-daemon --max-workers=4 :app:assembleRelease --console=plain
  exit $LASTEXITCODE
} finally { Pop-Location }
