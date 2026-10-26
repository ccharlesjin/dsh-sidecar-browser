param(
  [string]$InstallRoot = 'E:\Tools\Deepseek_Harness',
  [switch]$NoPull
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js 20+ is required to build the core patch. Install Node or use a portable bundle.'
}
$appAsar = Join-Path $InstallRoot 'resources\app.asar'

if (-not $NoPull) {
  Write-Host 'Updating patch repository...'
  git -C $root pull --ff-only
}

Write-Host 'Detecting installed DSH version and building the matching patch...'
Push-Location $root
try {
  & $node.Source scripts/build.mjs --app-asar $appAsar
  if ($LASTEXITCODE -ne 0) { throw 'patch build failed' }
  $patched = Join-Path $root 'dist\app.asar.patched'
  powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install.ps1') `
    -PatchedAsar $patched -InstallRoot $InstallRoot
} finally {
  Pop-Location
}
