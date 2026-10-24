# Contributing

Thanks for helping improve DSH Browser Live.

## Development checks

```powershell
npm run check
npm pack --dry-run
```

There is no build step; `index.js`, `client.js` and `native-bridge.cjs` are the
shipped runtime.

## Pull requests

- Keep the plugin installable as a plain npm package.
- Do not add a personal absolute path or a committed `host.log`/`recipes.json`.
- Do not add automatic `app.asar` modification in `postinstall`; core patching is
  an explicit, version-specific operation.
- Update README/tool descriptions when adding or changing a model-facing tool.
- Test the affected flow manually in DSH and include the commands/output.

## Tool design

Prefer one clear tool over several overlapping tools. Use an `action` enum for
low-frequency CRUD-style tools; keep high-frequency primitives (`click`, `type`,
`navigate`) separate.
