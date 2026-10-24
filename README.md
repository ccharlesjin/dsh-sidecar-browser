# DSH Sidecar Browser

A model-driven companion browser for the **DeepSeek Harness (DSH)** right
sidebar. It gives the model a real browser with token-efficient snapshots,
structured extraction, assertions, diagnostics, uploads, downloads, screenshots
and console/network inspection.

This repository is the reusable plugin package. It is intentionally separate
from any personal DSH installation or private core patch.

## Features

- Real Electron `<webview>` in the DSH right sidebar; no Playwright dependency
- Token budgets: `none` / `minimal` / `standard` / `full`
- `observe` delta and `UNCHANGED` (about 12 characters)
- `act` batches with per-step `expect` assertions and failure diagnostics
- Structured `extract`: CSS fields, tables, meta, JSON-LD, debug hints
- `NOT_FOUND` diagnostics with revision, page counts and visible candidates
- Console/JS error capture, including attachment to normal tool results
- Read-only network observations with URL redaction
- Upload (`<input type=file>`), drag/drop upload, controlled downloads
- Screenshot: viewport, target element and stitched full page
- Tabs, workspaces, recipes, tasks, dialogs, highlight and hover

## Requirements

- DeepSeek Harness desktop with the right-sidebar browser slot
- Node.js 20+ for development
- Windows is the primary tested platform (PowerShell installer)
- Optional: the DSH core patch for network/download/screenshot/focus features

## Install from DSH

Open **Plugins → Add plugin** and enter one of:

| Source | Value |
|---|---|
| npm (after publish) | `dsh-sidecar-browser` |
| GitHub | `https://github.com/ccharlesjin/dsh-sidecar-browser` |
| Local checkout | absolute path to this directory |

If the plugin installs but no browser tab appears, open the plugin manager and
enable/select the `dsh-sidecar-browser` bundle, then restart DSH.

### Install from a local checkout

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

The script creates a junction in the desktop profile and adds the package to the
profile bundle list. Restart DSH afterwards.

## Core patch is optional

Some features require a small DSH Electron main/preload patch:

- real focus/input for background clicks
- read-only network capture
- controlled downloads
- screenshots

Those capabilities live in the main process and cannot be installed as a normal
npm plugin. Without the patch the browser still works for navigation, DOM reads,
extraction, actions, assertions, upload/drop, console and workspaces. Tools that
need the missing core API return a clear error.

Do **not** install a patched `app.asar` from a different DSH version. Core
patches are version-specific and must be rebuilt after a DSH update.

## Security defaults

- Uploads and drag/drop are restricted by `policy.json → uploadRoots`
- Empty `uploadRoots` rejects all local file uploads until configured
- Network capture stores no headers, bodies or cookies
- URLs and console text redact token/JWT/Bearer-style parameters
- Downloads go to `Downloads/DSH Browser`, are name-sanitized and never auto-open

Edit `policy.json` in the installed plugin directory to change domain allowlists,
confirmation keywords or upload roots.

## Main tools

```text
native_browser_tabs        list or create tabs
native_browser_navigate    open a URL
native_browser_observe     full snapshot or revision delta
native_browser_extract     structured fields/table/meta/JSON-LD
native_browser_act         batched actions + expect + extract
native_browser_click       click an element
native_browser_type        type / submit
native_browser_hover       hover menus
native_browser_console     console and page errors
native_browser_network     read-only request log
native_browser_screenshot  viewport / target / full-page
native_browser_upload      file input upload
native_browser_drop        drag/drop upload
native_browser_downloads   controlled download history
native_browser_workspace   cross-tab scratch space
native_browser_highlight   visual audit outline
native_browser_task        declarative tasks
native_browser_recipe      saved repeatable flows
native_browser_policy      current safety policy
```

## Development

```powershell
npm run check
npm pack --dry-run
```

The plugin exposes itself through the `dsh` field in `package.json`:

- `dsh.bundle.patch` inserts the `sidecar-browser` bundle
- `dsh.client` injects the sidebar webview client

There is no build step; the JavaScript files are shipped directly.

## License

MIT. See [LICENSE](./LICENSE).
