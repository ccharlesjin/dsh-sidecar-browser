param(
  [string]$InstallRoot = 'E:\Tools\Deepseek_Harness',
  [string]$BackupAsar = ''
)

$ErrorActionPreference = 'Stop'
$processName = 'DeepSeek Harness'
$resources = Join-Path $InstallRoot 'resources'
$target = Join-Path $resources 'app.asar'
$exe = Join-Path $InstallRoot 'DeepSeek Harness.exe'

if ([string]::IsNullOrWhiteSpace($BackupAsar)) {
  $BackupAsar = Get-ChildItem $resources -Filter 'app.asar.backup-*' -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $BackupAsar -or -not (Test-Path -LiteralPath $BackupAsar)) {
  throw 'No app.asar backup found.'
}

$left = @(Get-Process -Name $processName -ErrorAction SilentlyContinue)
if ($left.Count -gt 0) { throw 'Close DeepSeek Harness before restoring.' }

Copy-Item -LiteralPath $BackupAsar -Destination $target -Force
$backupUnpacked = "$BackupAsar.unpacked"
$targetUnpacked = "$target.unpacked"
if (Test-Path -LiteralPath $backupUnpacked) {
  if (Test-Path -LiteralPath $targetUnpacked) { Remove-Item -LiteralPath $targetUnpacked -Recurse -Force }
  Copy-Item -LiteralPath $backupUnpacked -Destination $targetUnpacked -Recurse -Force
}
Write-Host "Restored: $BackupAsar"
Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe)
