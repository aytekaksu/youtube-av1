# Contributing

Open an issue or a focused pull request. Include reproduction steps and your browser version. **External contributions need @aytekaksu's approval before merging.** Owner-requested changes may be merged and released after checks pass.

With Node.js 24+ and Python 3:

```sh
npm ci
npm test
npm run package
```

TypeScript 7.0.2 is pinned. The build generates browser-ready `.js` files beside the `.ts` source; only TypeScript is committed. Load this folder after building, or use the ready ZIP in `work/packages/`.

For browser tests (CI runs these too):

```sh
npx playwright install chromium
npm run test:ui
```

Tests use simulated browser state; they do not measure data savings. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing test browser.

Add `--screenshots` to `node tests/popup.cjs` to refresh the screenshot. Original code contributions use MIT; see [NOTICE.md](NOTICE.md) for artwork rights.
