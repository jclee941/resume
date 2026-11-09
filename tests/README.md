# Testing Infrastructure

This directory holds the automated test suites for the resume project.

## Commands

```bash
npm test
npm run test:e2e:smoke
```

`npm test` runs the repository test chain. E2E runs separately; see the
[browser test guide](e2e/AGENTS.md) for project and environment details.

## Test layout

- [Unit test ownership](unit/AGENTS.md) covers module regressions and runner
  selection.
- [Integration test ownership](integration/AGENTS.md) covers cross-module
  contracts.
- [E2E test ownership](e2e/AGENTS.md) covers Playwright browser flows.
- Root [`jest.config.cjs`](../jest.config.cjs) and
  [`playwright.config.js`](../playwright.config.js) define discovery and browser
  projects.

## Notes

- Keep E2E waits explicit, especially on portfolio pages.
- Use the smallest test command that proves the change.
- Historical test counts are not current verification results; use the command
  output from the run being reviewed.
