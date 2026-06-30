# TESTS KNOWLEDGE BASE

**Generated:** 2026-06-28
**Commit:** `4bd11dd2`
**Branch:** `master`

## OVERVIEW

Centralized test hub for Jest, Node `--test`, Go checks, and Playwright E2E.

## STRUCTURE

```text
tests/
├── unit/                   # Jest unit suites for apps/packages
├── integration/            # Jest cross-module contract suites
├── e2e/                    # Playwright browser/API flows
│   ├── fixtures/           # shared helpers and mock sites
│   └── visual.spec.js-snapshots/
└── automation-webhook-test.go
```

## E2E CONFIGURATION

- Defaults to `http://localhost:8787`; production verification sets
  `PLAYWRIGHT_BASE_URL=https://resume.jclee.me`.
- 5 device projects: chromium + 4 mobile.
- `maxDiffPixelRatio: 0.05` for visual snapshots.
- Screenshots are `only-on-failure`; traces are `on-first-retry`.

## CHILD GUIDES

- `e2e/AGENTS.md` owns Playwright-specific runtime, fixture, and snapshot
  constraints.
- `unit/AGENTS.md` owns deterministic module-test conventions and unit boundary
  rules.
- `integration/AGENTS.md` owns cross-module contract and boundary-failure test
  rules.

## NAMING CONVENTION

- `*.test.js` = unit/integration tests (Jest).
- `*.spec.js` = E2E tests (Playwright).

## CRITICAL: E2E GOTCHA

**Use `domcontentloaded` for portfolio pages — `networkidle` timeouts due to
terminal animations.**

## CONVENTIONS

- `node:test` at depth 5+ for isolated module tests.
- Root `npm test` fans out across Jest, job-server node tests, schema/env
  tests, tools tests, and CLI tests.
- Handle flaky tests via `retries` in `playwright.config.js` (2 in CI, 0
  locally).

## ANTI-PATTERNS

- Never use `networkidle` on portfolio pages.
- Never use `describe.skip` — use runtime `test.skip`.
- Never add arbitrary `sleep()` — use event-based waits.
- Never use brittle CSS selectors — use semantic locators.

---

Parent: [../AGENTS.md](../AGENTS.md)
