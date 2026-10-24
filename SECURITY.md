# Security

## Reporting

Please report vulnerabilities privately through the repository's Security tab or
by contacting the maintainers. Do not include real credentials, cookies or
private page content in public issues.

## Design boundaries

- Uploads and drag/drop are restricted by `policy.json → uploadRoots`.
- Network capture is read-only and stores no headers, bodies or cookies.
- URLs and console text redact common token/JWT/Bearer parameters before output.
- Downloads are written only under `Downloads/DSH Browser`, with sanitized names
  and no auto-open.
- The optional core patch is intentionally not installed by npm. It modifies the
  DSH Electron main/preload files and is version-specific.

## Supported versions

Security fixes target the latest released version on npm and the `main` branch.
