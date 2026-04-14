# Testing Infrastructure

This directory holds the automated test suites for the resume project.

## Current status

- 782 node tests pass
- 27 E2E tests pass, with 4 skipped
- Jest suite total: 1165 tests
- Visual regression is partially implemented, not fully rolled out

## Commands

```bash
npm test
npm run test:node
npm run test:e2e:smoke
```

## What changed recently

- `deploy-verification` now skips job health checks when the job endpoint returns 500

## Test layout

- `unit/` for Jest unit coverage
- `e2e/` for Playwright browser flows
- `integration/` for cross-module coverage

## Notes

- Keep E2E waits explicit, especially on portfolio pages.
- Use the smallest test command that proves the change.
