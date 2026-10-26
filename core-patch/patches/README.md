# Patches

Each directory is a DSH version. The builder refuses a version mismatch.

## 0.2.1-rc.3

- `main.patch`: IPC channels + `DesktopBrowserGuests` input/network/downloads/
  screenshot methods, session configure changes, IPC handlers
- `preload.patch`: `dshDesktop.browser.input/network/downloads/screenshot`
- Applied with `git apply -p1` against extracted `lib/main.js` and
  `lib/preload-app.cjs`

To add another DSH version, copy the directory, regenerate the diffs against the
new official `app.asar`, and test `git apply --check` before publishing.
