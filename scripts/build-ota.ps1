param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')]
  [string]$Version
)

$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$mobileDirectory = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'dist-mobile'))
$otaDirectory = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'ota'))
$bundleDirectory = [System.IO.Path]::GetFullPath((Join-Path $otaDirectory 'bundles'))
$bundleName = "campus-pulse-$Version.zip"
$bundlePath = [System.IO.Path]::GetFullPath((Join-Path $bundleDirectory $bundleName))
$manifestPath = [System.IO.Path]::GetFullPath((Join-Path $otaDirectory 'manifest.json'))

foreach ($target in @($mobileDirectory, $otaDirectory, $bundleDirectory, $bundlePath, $manifestPath)) {
  if (-not $target.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Update path escapes the project directory: $target"
  }
}

$previousVersion = $env:VITE_APP_VERSION
$env:VITE_APP_VERSION = $Version

Push-Location $projectRoot
try {
  & npm.cmd run build:mobile
  if ($LASTEXITCODE -ne 0) { throw 'Mobile web bundle build failed.' }

  if (-not (Test-Path -LiteralPath (Join-Path $mobileDirectory 'index.html'))) {
    throw 'dist-mobile does not contain index.html.'
  }

  New-Item -ItemType Directory -Path $bundleDirectory -Force | Out-Null
  if (Test-Path -LiteralPath $bundlePath) {
    Remove-Item -LiteralPath $bundlePath -Force
  }

  Compress-Archive -Path (Join-Path $mobileDirectory '*') -DestinationPath $bundlePath -CompressionLevel Optimal
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $bundleStream = [System.IO.File]::OpenRead($bundlePath)
  try {
    $checksum = [System.BitConverter]::ToString($sha256.ComputeHash($bundleStream)).Replace('-', '').ToLowerInvariant()
  } finally {
    $bundleStream.Dispose()
    $sha256.Dispose()
  }

  $manifest = [ordered]@{
    version = $Version
    file = "bundles/$bundleName"
    checksum = $checksum
    publishedAt = [DateTimeOffset]::UtcNow.ToString('o')
  }
  $manifestJson = $manifest | ConvertTo-Json
  [System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

  Write-Output "OTA bundle ready: $bundlePath"
  Write-Output "Manifest: $manifestPath"
  Write-Output "SHA256: $checksum"
} finally {
  Pop-Location
  if ($null -eq $previousVersion) {
    Remove-Item Env:VITE_APP_VERSION -ErrorAction SilentlyContinue
  } else {
    $env:VITE_APP_VERSION = $previousVersion
  }
}
