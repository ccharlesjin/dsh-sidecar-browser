param(
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [string]$Profile = 'desktop'
)

$ErrorActionPreference = 'Stop'
$packageName = 'dsh-sidecar-browser'
$root = $PSScriptRoot
$profileDir = Join-Path $DshHome "profiles\$Profile"
$packagePath = Join-Path $profileDir 'package.json'
$linkPath = Join-Path $profileDir "node_modules\$packageName"

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "DSH profile not found: $packagePath (set -DshHome/-Profile)"
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'native-bridge.cjs'))) {
  throw "Plugin files are incomplete: $root"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $linkPath) | Out-Null
if (Test-Path -LiteralPath $linkPath) {
  Remove-Item -LiteralPath $linkPath -Recurse -Force
}
New-Item -ItemType Junction -Path $linkPath -Target $root | Out-Null

$backup = "$packagePath.bak-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
Copy-Item -LiteralPath $packagePath -Destination $backup -Force

$pkg = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($null -eq $pkg.dependencies) {
  $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force
}
$depValue = 'file:' + ($root -replace '\\', '/')
$pkg.dependencies | Add-Member -NotePropertyName $packageName -NotePropertyValue $depValue -Force

$bundles = @($pkg.dsh.profile.bundles)
if ($bundles -notcontains $packageName) {
  $pkg.dsh.profile.bundles = @($bundles + $packageName)
}

$json = $pkg | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($packagePath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Installed $packageName"
Write-Host "  package : $root"
Write-Host "  profile : $profileDir"
Write-Host "  backup  : $backup"
Write-Host ''
Write-Host 'Restart DeepSeek Harness to load the plugin.'
