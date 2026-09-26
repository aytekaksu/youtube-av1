# Contributing

Bug reports and small, focused pull requests are welcome. Explain what happened, what you expected, and how to reproduce it. Include the browser version and operating system. Avoid posting private browsing details or account information.

## Owner approval is required

Every change after the initial repository import must use a pull request. Do not merge, enable auto-merge, approve on the owner's behalf, or bypass branch protections without explicit approval from **@aytekaksu**. An instruction to implement a change is not permission to merge it.

The `main` branch requires a code-owner review from @aytekaksu. New commits dismiss stale approvals. These rules also apply to administrators; force pushes and branch deletion are blocked. Automatic merging is disabled.

GitHub does not let an author approve their own pull request. If a pull request is opened using @aytekaksu's account, leave it unmerged for the owner to decide how to handle it. Do not weaken the rules to get it through.

## Run locally

Load this folder as an unpacked extension in the browser. There is no build step and no runtime dependency to install. After changing files, reload the extension and then reload a test YouTube tab.

Use Node.js 20 or newer for the basic checks:

```sh
node scripts/check.cjs
node tests/behavior.cjs
```

For UI checks, install the optional development tool and its test browser:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/popup.cjs
```

The UI test uses simulated browser APIs. It does not open your personal browser or access your watch history. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if you want to use an existing Chromium test binary.

## Screenshots and icons

Regenerate screenshots from the actual popup with controlled sample state:

```sh
node tests/popup.cjs --screenshots
```

This writes the dark, light, and pending-change images to `docs/screenshots/`. Inspect the images after generation.

The editable logo is `assets/logo.svg`. To export the toolbar PNGs, install the optional `sharp` tool and run:

```sh
npm install --no-save --package-lock=false sharp
node scripts/icons.cjs
```

Keep the SVG and PNGs in sync. See `NOTICE.md` for the third-party artwork and trademark attribution.

## Pull requests

Keep changes focused and describe the user-visible result. Run the checks above. For UI changes, include updated screenshots and test keyboard focus, both appearances, and the disabled reload state. For playback changes, distinguish fixture tests from observations on a real YouTube video.

Do not claim a fixed percentage of data savings or battery impact unless the claim is backed by a clearly described measurement. Do not upload personal files, local databases, browser profiles, or credentials.

Contributions to the project's original code and documentation are made under its MIT license. Third-party assets retain their own rights.
