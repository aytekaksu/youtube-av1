# Repository instructions

- Keep the extension local-only and the popup simple.
- Follow CONTRIBUTING.md. Run source/behavior checks and popup checks for UI changes.
- Do not promise data savings, better playback, or low battery impact.
- Every change requires a PR. Owner-requested work may be merged and released after checks pass. External contributions require @aytekaksu's approval; never approve on the owner's behalf or bypass that review.
- Keep runtime, tests, and build tools in strict TypeScript. Run `npm test`; browser checks run in CI. Keep generated JavaScript out of commits and include it in release ZIPs.
- Keep private files and credentials out of commits.
