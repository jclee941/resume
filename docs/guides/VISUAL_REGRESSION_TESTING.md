# Visual Regression Testing Guide

This guide describes the visual assertions and local snapshot behavior defined
by the current Playwright test and configuration.

## Contents

- [Run visual tests](#run-visual-tests)
- [What the suite captures](#what-the-suite-captures)
- [Snapshot ownership](#snapshot-ownership)
- [Review a visual difference](#review-a-visual-difference)
- [Related files](#related-files)

## Run visual tests

Run the visual suite with the repository's Playwright script:

```bash
npm run test:e2e -- \
  tests/e2e/visual.spec.js \
  --project=chromium
```

The root Playwright configuration starts local Wrangler by default. Visual
assertions use fixed desktop, mobile, tablet, dark-mode, and component
viewports; the suite and `visual-helpers.js` define their exact sizes and
stability steps.

## What the suite captures

`tests/e2e/visual.spec.js` covers page and component screenshots, including
desktop and mobile views. The configured screenshot comparison allows the
suite's specified pixel difference tolerance. See the test file for the
individual assertions rather than relying on historical test totals.

## Snapshot ownership

The baseline directory
`tests/e2e/visual.spec.js-snapshots/` is ignored and contains local,
materialized captures of the current content. The Playwright configuration
uses `updateSnapshots: 'missing'`: absent baselines are created, while existing
baselines are left in place for comparison. Baselines are not reviewed,
versioned project artifacts and should not be staged or committed.

## Review a visual difference

When an existing baseline differs, inspect the actual and expected screenshots
and confirm whether the change is intentional. To regenerate the local
baseline after that review, run:

```bash
npm run test:e2e -- \
  tests/e2e/visual.spec.js \
  --project=chromium \
  --update-snapshots
```

This updates local ignored captures; it does not publish or commit them.

## Related files

- [Visual test suite](../../tests/e2e/visual.spec.js)
- [Visual helpers](../../tests/e2e/visual-helpers.js)
- [Playwright configuration](../../playwright.config.js)
- [E2E test ownership](../../tests/e2e/AGENTS.md)
