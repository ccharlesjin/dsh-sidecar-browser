# Publishing

The package is ready to publish as `dsh-sidecar-browser`.

## 1. Create the GitHub repository

```powershell
gh auth login
gh repo create dsh-sidecar-browser --public --source . --push
```

If the repository already exists:

```powershell
git remote add origin https://github.com/ccharlesjin/dsh-sidecar-browser.git
git push -u origin main
```

## 2. Install from DSH

Open **Plugins → Add plugin** and enter either:

```text
https://github.com/ccharlesjin/dsh-sidecar-browser
```

or, after npm publish:

```text
dsh-sidecar-browser
```

## 3. Publish to npm

```powershell
npm login
npm publish --access public
```

Then DSH can install it by package name.

## 4. Release checklist

```powershell
npm run check
npm pack --dry-run
git tag v1.1.1
git push origin main --tags
```

Update `version` in `package.json` before publishing a new release.

## Core patch

The npm/GitHub package intentionally does **not** install or modify
`app.asar`. Network capture, controlled downloads, screenshots and focus input
need an optional, version-specific core patch. Do not publish an old patched
`app.asar` for a new DSH release.
