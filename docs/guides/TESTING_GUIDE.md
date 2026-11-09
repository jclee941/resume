# Testing Guide

## Contents

- [Test entry points](#test-entry-points)
- [Workspace test commands](#workspace-test-commands)
- [Playwright browser tests](#playwright-browser-tests)
- [CI coverage](#ci-coverage)
- [Related documentation](#related-documentation)

## Test entry points

The root [`package.json`](../../package.json) defines the test commands.
`npm test` runs the configured Jest, dashboard, schemas, shared packages,
tools, CLI, Python, and Go suites. Playwright browser tests are separate.

Run the full root test sequence with:

```bash
npm test
```

## Workspace test commands

Run an individual configured test group when investigating a failure:

```bash
npm run test:jest
npm run test:dashboard
npm run test:schemas
npm run test:shared
npm run test:tools
npm run test:cli
npm run test:python
npm run test:go
```

Jest discovers `tests/unit` and `tests/integration`; other workspace tests
are colocated with their owning source. Check the root scripts before relying
on an additional runner option.

## Playwright browser tests

Run browser tests separately:

```bash
npm run test:e2e
```

The root Playwright configuration starts local Wrangler by default. To run
only the visual suite in Chromium:

```bash
npm run test:e2e -- \
  tests/e2e/visual.spec.js \
  --project=chromium
```

Visual baselines are ignored local captures. The first run creates missing
baselines; it does not compare them with a reviewed or committed baseline.

## CI coverage

GitHub Actions has one read-only `validate` job. It runs the checks listed in
the [current workflow](../../.github/workflows/ci.yml). Playwright E2E tests
and production deployment are not steps in that workflow; a passing CI run
does not indicate a production deployment.

## Related documentation

- [Playwright configuration](../../playwright.config.js)
- [Test ownership and runner conventions](../../tests/AGENTS.md)
- [E2E test and visual-baseline conventions](../../tests/e2e/AGENTS.md)
- [Content pack and CI fixtures](CONTENT_PACK.md)
