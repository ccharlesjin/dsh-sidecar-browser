param(
  [string]$PatchedAsar = (Join-Path (Split-Path -Parent $PSScriptRoot) 'dist\app.asar.patched'),
  [string]$InstallRoot = 'E:\Tools\Deepseek_Harness',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$processName = 'DeepSeek Harness'
$target = Join-Path $InstallRoot 'resources\app.asar'
$targetUnpacked = "$target.unpacked"
$patchedUnpacked = "$PatchedAsar.unpacked"
$exe = Join-Path $InstallRoot 'DeepSeek Harness.exe'

if (-not (Test-Path -LiteralPath $PatchedAsar)) { throw "Patched asar not found: $PatchedAsar" }
if (-not (Test-Path -LiteralPath $PatchedUnpacked)) { throw "Patched unpacked directory not found: $patchedUnpacked" }
if (-not (Test-Path -LiteralPath $target)) { throw "Installed app.asar not found: $target" }
if (-not (Test-Path -LiteralPath $exe)) { throw "DSH executable not found: $exe" }

$patchedHash = (Get-FileHash -LiteralPath $PatchedAsar -Algorithm SHA256).Hash
$targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
Write-Host "patched : $PatchedAsar ($patchedHash)"
Write-Host "target  : $target ($targetHash)"

if ($targetHash -eq $patchedHash) {
  Write-Host 'Target already has the patched hash.'
  if (-not $DryRun) { Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) }
  exit 0
}

if ($DryRun) {
  Write-Host 'DryRun: would close DSH, back up target, install patched asar + unpacked, and relaunch.'
  exit 0
}

$running = @(Get-Process -Name $processName -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  Write-Host "Closing $($running.Count) DSH process(es)."
  foreach ($process in $running) { try { [void]$process.CloseMainWindow() } catch {} }
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    if (@(Get-Process -Name $processName -ErrorAction SilentlyContinue).Count -eq 0) { break }
    Start-Sleep -Milliseconds 250
  }
  $left = @(Get-Process -Name $processName -ErrorAction SilentlyContinue)
  if ($left.Count -gt 0) {
    Write-Host "Force-stopping $($left.Count) remaining process(es)."
    $left | Stop-Process -Force
    Start-Sleep -Seconds 2
  }
}
if (@(Get-Process -Name $processName -ErrorAction SilentlyContinue).Count -gt 0) {
  throw 'DSH is still running; refusing to replace app.asar.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$target.backup-$stamp"
Copy-Item -LiteralPath $target -Destination $backup -Force
if (Test-Path -LiteralPath $targetUnpacked) {
  Copy-Item -LiteralPath $targetUnpacked -Destination "$backup.unpacked" -Recurse -Force
}
Write-Host "backup  : $backup"

Copy-Item -LiteralPath $PatchedAsar -Destination $target -Force
if (Test-Path -LiteralPath $targetUnpacked) { Remove-Item -LiteralPath $targetUnpacked -Recurse -Force }
Copy-Item -LiteralPath $patchedUnpacked -Destination $targetUnpacked -Recurse -Force

$installedHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
if ($installedHash -ne $patchedHash) { throw "Installed hash mismatch: $installedHash" }
Write-Host "installed: $installedHash"

Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe)
Write-Host 'Done. DSH was relaunched.'
