# Contributing

Open an issue or a focused pull request. Include reproduction steps and your browser version. **Do not merge, enable auto-merge, or bypass protections without @aytekaksu's explicit approval.** GitHub does not allow self-approval.

No build is needed. Load the folder as an unpacked extension. With Node.js 20+:

```sh
node scripts/check.cjs
node tests/behavior.cjs
```

For UI checks and the README screenshot:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/popup.cjs --screenshots
```

Tests use simulated browser state; they do not measure data savings. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing test browser.

Package a ready-to-load ZIP with `python3 scripts/package.py`. Export icons from the SVG with `node scripts/icons.cjs` after installing `sharp`.

Keep changes small, refresh screenshots after UI changes, and never commit private data. Original code contributions use the MIT license; see [NOTICE.md](NOTICE.md) for artwork rights.
