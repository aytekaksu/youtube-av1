# Repository instructions

- Keep this a small, local-only browser extension. No analytics or backend service.
- Follow CONTRIBUTING.md and preserve the simple popup: title, AV1 switch, reload button.
- Run `node scripts/check.cjs` and `node tests/behavior.cjs`. Run the popup checks for UI changes.
- Be precise about AV1 benefits: lower data use, higher quality, smoother playback, and low battery impact are not guaranteed.
- All changes after the initial import require a pull request.
- Never merge, enable auto-merge, submit an approval as the owner, or bypass/relax protections without @aytekaksu's explicit approval for that action. Requests to build, fix, publish a branch, or open a PR do not authorize a merge.
- Keep work unmerged for owner review. Do not manufacture another approver or use alternate credentials.
- Keep private paths, local databases, browser data, and credentials out of commits.
