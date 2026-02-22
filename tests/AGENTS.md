# TESTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Centralized test hub. Jest (unit/integration) + Playwright (E2E).

## STRUCTURE

```text
tests/
├── unit/                   # Jest, mirrors portfolio-worker/lib
│   └── portfolio-worker/
│       └── lib/            # 18 .test.js files
├── e2e/                    # Playwright, 23 .spec.js files
│   ├── fixtures/           # helpers.js (shared utilities)
│   └── snapshots/          # visual regression baselines
├── integration/            # 3 integration test files
├── config/                 # quarantine.js
└── n8n-webhook-test.sh     # webhook testing
```

## COVERAGE TARGETS

- 90% floor for shared libraries.
- 100% for `generate-worker.js`.

## E2E CONFIGURATION

- Defaults to production URL.
- 5 device projects: chromium + 4 mobile.
- `maxDiffPixelRatio: 0.05` for visual snapshots.
- Fixtures: `executeCliCommand`, `navigateToSection`, `validateLinks`, `waitForAnimation`.

## NAMING CONVENTION

- `*.test.js` = unit/integration tests (Jest).
- `*.spec.js` = E2E tests (Playwright).

## CRITICAL: E2E GOTCHA

**Use `domcontentloaded` for portfolio pages — `networkidle` timeouts due to terminal animations.**

## CONVENTIONS

- `node:test` at depth 5+ for isolated module tests.
- Quarantine flaky tests via `tests/config/quarantine.js`.

## ANTI-PATTERNS

- Never use `networkidle` on portfolio pages.
- Never use `describe.skip` — use runtime `test.skip`.
- Never add arbitrary `sleep()` — use event-based waits.
- Never use brittle CSS selectors — use semantic locators.
