# TESTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Centralized test hub for Jest, Node `--test`, Go checks, and Playwright E2E.
Root `npm test` chains the Jest, package Node-test, and Go verification suites.
Playwright discovers 39 E2E specs across one desktop and four mobile projects.

## STRUCTURE

```text
tests/
├── unit/                   # Jest + Node --test for apps/packages
├── integration/            # Jest cross-module contract suites (10 files)
├── e2e/                    # Playwright browser/API flows (39 specs)
│   ├── fixtures/           # shared helpers and mock sites
│   └── visual.spec.js-snapshots/
└── automation-webhook-test.go
```

## E2E CONFIGURATION

- Defaults to `http://localhost:8787`; production verification sets `SKIP_WEBSERVER=1` and `PLAYWRIGHT_BASE_URL=https://resume.jclee.me`.
- Five projects: desktop Chromium plus iPhone SE, iPhone 12 Pro, Pixel 5, and
  iPad profiles running on Chromium.
- Mobile specs match `mobile.spec.js` pattern; desktop specs run on Chromium.
- `maxDiffPixelRatio: 0.05` for visual snapshots; screenshots on failure; traces on first retry.
- Retries: 2 in CI, 0 locally.

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

## CRITICAL: E2E LOAD STATE

**Use `domcontentloaded` for portfolio pages — `networkidle` times out due to async widget loading and animations.**

## CONVENTIONS

- `*.test.js` = Jest/Node unit/integration tests.
- `*.spec.js` = Playwright E2E tests.
- Node `--test` at depth 5+ for isolated module tests (job-server, schemas, env, shared, tools, CLI).
- Root `npm test` runs its Jest, Node-test, and Go command chain sequentially.

## ANTI-PATTERNS

- Never use `networkidle` on portfolio pages.
- Never use `describe.skip` — use runtime `test.skip`.
- Never add arbitrary `sleep()` — use event-based waits.
- Never use brittle CSS selectors — use semantic locators.

---

Parent: [../AGENTS.md](../AGENTS.md)
