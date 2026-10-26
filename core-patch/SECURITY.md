# Security

## Scope

This repository changes the DeepSeek Harness Electron main/preload process only
when the user explicitly builds and installs a matching patch.

- No `postinstall` hook modifies `app.asar`.
- No prebuilt archive is committed or downloaded.
- The installer creates a timestamped backup before replacing files.
- Builds verify the source DSH version and the installed SHA-256.

## Reporting

Please report vulnerabilities privately through the repository's Security tab.
Do not include credentials, private page content or personal paths in public
issues.

## Trust boundary

A patched `app.asar` runs with the same privileges as DSH itself. Only install a
patch you built from your own installed archive. Do not trust a patched archive
from another machine or DSH version.
