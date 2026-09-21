$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sdkRoot = if ($env:ANDROID_HOME) {
  $env:ANDROID_HOME
} else {
  Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

$jdkCandidates = @(@(
  $env:JAVA_HOME
  'C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
  'C:\Program Files\Java\jdk-21'
  (Join-Path $env:USERPROFILE '.jdks\ms-21.0.10')
) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) })

if (-not $jdkCandidates) {
  throw 'JDK 21 was not found. Install JDK 21 or set JAVA_HOME.'
}

if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36\android.jar'))) {
  throw "Android SDK 36 was not found: $sdkRoot"
}

$env:JAVA_HOME = $jdkCandidates[0]
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$(Join-Path $env:JAVA_HOME 'bin');$(Join-Path $sdkRoot 'platform-tools');$env:Path"

Push-Location $projectRoot
try {
  & npm.cmd run cap:sync
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }

  Push-Location (Join-Path $projectRoot 'android')
  try {
    & .\gradlew.bat --no-daemon assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed.' }
  } finally {
    Pop-Location
  }

  $sourceApk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
  $releaseDirectory = Join-Path $projectRoot 'releases'
  $appVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
  $releaseApk = Join-Path $releaseDirectory "Campus-Pulse-KI13-v$appVersion-debug.apk"
  New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
  Copy-Item -LiteralPath $sourceApk -Destination $releaseApk -Force

  Write-Output "APK ready: $releaseApk"
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $apkStream = [System.IO.File]::OpenRead($releaseApk)
  try {
    $hash = [System.BitConverter]::ToString($sha256.ComputeHash($apkStream)).Replace('-', '')
  } finally {
    $apkStream.Dispose()
    $sha256.Dispose()
  }
  Write-Output "SHA256: $hash"
} finally {
  Pop-Location
}
