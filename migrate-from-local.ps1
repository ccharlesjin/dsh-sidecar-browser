param(
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [string]$Profile = 'desktop',
  [string]$OldPluginRoot = 'C:\Users\Charles\DSH-Plugins\ai-browser',
  [switch]$Force,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$packageName = '@local/dsh-browser-live'
$profileDir = Join-Path $DshHome "profiles\$Profile"
$profilePackage = Join-Path $profileDir 'package.json'
$linkPath = Join-Path $profileDir "node_modules\@local\dsh-browser-live"
$dataDir = Join-Path $DshHome 'ai-browser'
$backupDir = Join-Path $dataDir "migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (-not (Test-Path -LiteralPath $profilePackage)) {
  throw "DSH profile not found: $profilePackage"
}

if (-not $DryRun) {
  $running = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue
  if ($running -and -not $Force) {
    throw 'DSH is running. Close it completely before migrating (or pass -Force only after the app is closed).'
  }
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# 1. Preserve old user data
if (Test-Path -LiteralPath $OldPluginRoot) {
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  foreach ($name in @('policy.json', 'recipes.json')) {
    $source = Join-Path $OldPluginRoot $name
    if (Test-Path -LiteralPath $source) {
      Copy-Item -LiteralPath $source -Destination (Join-Path $backupDir $name) -Force
      $target = Join-Path $dataDir $name
      if (-not (Test-Path -LiteralPath $target) -or $Force) {
        Copy-Item -LiteralPath $source -Destination $target -Force
      }
    }
  }
  Write-Host "DATA_BACKUP=$backupDir"
} else {
  Write-Host "OLD_PLUGIN=missing ($OldPluginRoot)"
}

# 2. Remove old dependency + bundle from the profile
$pkg = Get-Content -LiteralPath $profilePackage -Raw | ConvertFrom-Json
$backup = "$profilePackage.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if ($DryRun) {
  Write-Host "DRY_RUN profile=$profilePackage"
} else {
  Copy-Item -LiteralPath $profilePackage -Destination $backup -Force
  if ($pkg.dependencies) {
    $pkg.dependencies.PSObject.Properties.Remove($packageName)
  }
  $bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ -ne $packageName })
  $pkg.dsh.profile.bundles = $bundles
  $json = $pkg | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($profilePackage, $json, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "PROFILE_BACKUP=$backup"
}

# 3. Remove only the old @local junction
if (Test-Path -LiteralPath $linkPath) {
  $target = $null
  try { $target = (Get-Item -LiteralPath $linkPath -Force).Target } catch {}
  $targets = @($target)
  if ($targets | Where-Object { $_ -eq $OldPluginRoot }) {
    if (-not $DryRun) {
      Remove-Item -LiteralPath $linkPath -Recurse -Force
      Write-Host 'JUNCTION=removed'
    } else {
      Write-Host 'JUNCTION=would-remove'
    }
  } else {
    Write-Host "JUNCTION=kept (points to $($targets -join ', '))"
  }
} else {
  Write-Host 'JUNCTION=absent'
}

Write-Host ''
Write-Host 'Next:'
Write-Host '1. Restart DSH and confirm the old AI browser tab is gone.'
Write-Host '2. Plugins -> Add plugin -> https://github.com/ccharlesjin/dsh-sidecar-browser'
Write-Host '3. Enable the dsh-sidecar-browser bundle.'
Write-Host "4. User config is now at $dataDir"
Write-Host '5. The old plugin directory was preserved as a backup.'
