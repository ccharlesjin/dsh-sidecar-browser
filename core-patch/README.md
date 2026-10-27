# DSH Sidecar Core

Version-specific optional **core patch** for
[DSH Sidecar Browser](https://github.com/ccharlesjin/dsh-sidecar-browser).

This directory is part of the main plugin repository and is intentionally
excluded from the npm package. It contains patch files, a builder, and explicit
install/restore scripts. It does **not** contain a prebuilt `app.asar` and does
not download DSH source code. The patch is applied to the `app.asar` already
installed on your own machine.

> [!WARNING]
> This patch modifies the DeepSeek Harness Electron main/preload code. It is
> version-specific and can break DSH startup. Read the whole README, keep the
> backup, and only use the version that matches your installed DSH.

## What it unlocks

The plugin works without this patch for navigation, DOM reading, extraction,
actions, assertions, upload/drop, console and workspaces.

The optional core patch adds:

- native focus/input for reliable background clicks
- read-only network capture (summaries; explicit detail returns redacted
  request/response headers, not response bodies)
- controlled downloads
- screenshots

Without it, those tools return a clear "current core does not provide ..." error.

## Why it is separate

`app.asar` is the Electron application archive. Patching it:

- changes main-process code
- is tied to one DSH release
- must be rebuilt after every DSH update
- can prevent DSH from starting if the wrong archive is installed

So it is deliberately **not** installed by the npm plugin, not run from
`postinstall`, and never published as a binary in this repository.

## Get it

```powershell
git clone https://github.com/ccharlesjin/dsh-sidecar-browser.git
cd dsh-sidecar-browser\core-patch
npm install
```

## Supported versions

| DSH version | Patch |
|---|---|
| `0.2.1-rc.3` | `patches/0.2.1-rc.3/` |

More versions can be added as the official DSH main/preload code changes.

## Requirements

- Windows (the scripts are PowerShell)
- Node.js 20+ to **build** the core patch
- Git for Windows (`git apply` is used to apply the diffs)
- DSH installed and closed while installing

> The normal `dsh-sidecar-browser` plugin does **not** require system Node; DSH
> ships its own runtime. Node is only needed for this optional core patch.

```powershell
npm install
```

## Version matching

Each directory under `patches/` is one exact DSH version. `patches/manifest.json`
marks which versions are tested.

The builder reads the installed archive's `package.json`, selects the matching
directory automatically, and refuses unsupported or untested versions:

```text
patches/
├── manifest.json
└── 0.2.1-rc.3/
    ├── main.patch
    └── preload.patch
```

## Build

Point `--app-asar` at the installed DSH archive. Version detection is automatic:

```powershell
node scripts/build.mjs `
  --app-asar "E:\Tools\Deepseek_Harness\resources\app.asar"
```

You can still force a version for testing with `--version 0.2.1-rc.3`; a
mismatch is rejected.

Output:

```text
dist/
├── app.asar.patched
├── app.asar.patched.unpacked/
└── BUILD.json
```

`BUILD.json` records the source archive, SHA-256, size and applied patches.

## One-command update

Pull the latest patch repository, detect the installed DSH version, build the
matching patch, and install it:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1
```

Use `-NoPull` to build and install without pulling. The script closes DSH and
creates a timestamped backup before installing.

## Install

Close DSH first. The installer also tries a graceful close and then a forced
stop, and creates a timestamped backup before touching anything.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 `
  -PatchedAsar .\dist\app.asar.patched
```

It installs both `app.asar` and `app.asar.unpacked`, verifies the SHA-256, and
relaunches DSH.

Preview only:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 `
  -PatchedAsar .\dist\app.asar.patched -DryRun
```

## Restore

If DSH does not start, use the newest backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1
```

Or choose a specific one:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1 `
  -BackupAsar "E:\Tools\Deepseek_Harness\resources\app.asar.backup-20261026-101500"
```

## Verify

```powershell
Get-FileHash .\dist\app.asar.patched -Algorithm SHA256
Get-FileHash "E:\Tools\Deepseek_Harness\resources\app.asar" -Algorithm SHA256
```

Both hashes should match after installation.

## After a DSH update

1. Do not install an old patched `app.asar`.
2. Rebuild from the new installed archive with a matching patch directory.
3. Reinstall, or continue without core features.

If a new DSH version has no patch yet, the plugin still works with reduced
capabilities.

## License

The scripts and patch files in this repository are MIT. The DSH application code
they modify remains the property of its respective owners.
