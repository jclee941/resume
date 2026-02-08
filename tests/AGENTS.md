# TEST SUITE (tests/)

**Reason:** Shared test suite
**Generated:** 2026-02-09
**Commit:** 29d46c2

## OVERVIEW

Centralized verification hub for the project. Provides shared validation logic across apps, browser-based E2E stability checks, and integration tests for cross-service connectivity (n8n, Grafana, Cloudflare).

## STRUCTURE

```
tests/
├── unit/               # JEST: Shared logic & worker generation
│   └── lib/            # Mirror of typescript/portfolio-worker/lib/
├── e2e/                # PLAYWRIGHT: Browser-based validation
│   └── visual.spec.js-snapshots/  # Visual regression baselines
├── integration/        # INTEGRATION: Cross-service flow tests
└── n8n-webhook-test.sh # N8N: Connectivity verification script
```

## WHERE TO LOOK

| Task              | Location                       | Notes                                  |
| ----------------- | ------------------------------ | -------------------------------------- |
| **Core Logic**    | `unit/lib/`                    | Logic shared across portfolio workers  |
| **Worker Gen**    | `unit/generate-worker.test.js` | Validates HTML-to-Worker pipeline      |
| **Browser Tests** | `e2e/`                         | Run against production URLs by default |
| **Snapshots**     | `e2e/*.snapshots/`             | Device-specific visual baselines       |
| **Integrations**  | `integration/`                 | n8n and service-level verification     |

## CONVENTIONS

- **Coverage Floor**: 90% floor for shared libs; 100% for `generate-worker.js`.
- **E2E Environment**: Defaults to production; use `BASE_URL` env to override.
- **Visual Threshold**: Snapshot tolerance `maxDiffPixelRatio: 0.05`.
- **Naming Patterns**: `*.test.js` (Unit), `*.spec.js` (E2E).
- **Data Integrity**: Expectations must derive from `typescript/data/` source of truth.
- **Test Framework**: Jest for unit tests; `node:test` used at depth 5 for some modules.
- **Device Projects**: Playwright configured for Desktop Chrome, Mobile Safari (see playwright.config.js).

## E2E WAIT STRATEGY (IMPORTANT)

**Current Strategy**: Use `domcontentloaded` for portfolio pages.

```javascript
await page.goto('/', { waitUntil: 'domcontentloaded' });
```

**Why Not `networkidle`**: The portfolio's terminal animations and interactive CLI cause continuous network activity that prevents `networkidle` from settling. Using `domcontentloaded` ensures tests don't timeout while waiting for animations.

**When to Use Each**:
| Strategy | Use Case |
|----------|----------|
| `domcontentloaded` | Portfolio pages (index.html, index-en.html) |
| `networkidle` | API-heavy pages, dashboard, static pages |
| `load` | Pages with many external resources |

## ANTI-PATTERNS

- **Brittle Selectors**: Use `aria-label` or semantic classes over raw XPath/CSS.
- **Using `networkidle` on Portfolio**: Will timeout due to terminal animations.
- **Arbitrary Sleeps**: Use `domcontentloaded` or `waitForSelector` for stability.
- **Global Pollution**: Integration tests must be idempotent and cleanup state.
- **Blind Snapshots**: Verify diffs in UI mode before updating baselines.
- **Side Effects**: Tests should not modify production data without explicit intent.
- **Using `describe.skip` for Env-Dependent Tests**: Use runtime `test.skip()` with condition check instead (e.g., Sentry tests skip when `SENTRY_DSN` is unset).

## COMMANDS

```bash
# Run all unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run E2E with UI (debug mode)
npm run test:e2e:ui

# Update visual snapshots
npx playwright test --update-snapshots

# Run specific test file
npx playwright test tests/e2e/portfolio.spec.js
```
