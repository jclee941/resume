# UNIT TESTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Module regressions for portfolio generation/runtime, dashboard automation, shared helpers, and locale data.

Boundary: retained module-test domain with mixed legacy test imports and shared fixture conventions.

## WHERE TO LOOK

| Task                      | Location                                           | Notes                                                    |
| ------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Portfolio modules         | `portfolio-worker/`, `portfolio-worker/lib/`       | Builder, cards, runtime contracts                        |
| Dashboard behavior        | `job-dashboard/`                                   | Routes, auth, application gates, migration/SQL contracts |
| Shared utilities          | `shared/`                                          | Jest-discovered shared package tests                     |
| Locale and data contracts | `data/`                                            | Jest-discovered parity/variant assertions                |
| Notification logic        | `job-automation/telegram-notification.test.js`     | Notification regressions                                 |
| Worker composition        | `generate-worker.test.js`, `worker-routes.test.js` | Generated entry/routing contracts                        |
| Scheduled wiring          | `scheduled-cron-wiring.test.js`                    | Cron composition contract                                |
| Shared content values     | `../helpers/owner-data.js`                         | Expected values from materialized data                   |

## CONVENTIONS

- Every `*.test.js` here matches root Jest discovery, including `data/` and `shared/`.
- Some dashboard files import `node:test`; preserve their existing runner contract and check invocation explicitly.
- `npm run test:dashboard` targets app-colocated tests, not `tests/unit/job-dashboard/`.
- Tests are predominantly CommonJS; keep `require`/`__dirname` compatibility with the Node 22 Jest lane.
- Browser modules use dynamic import or VM harnesses where the suite already does so.
- Dashboard migration contracts replay SQLite schemas rather than replacing SQL behavior with canned results.
- Shared fixture modules use `*-fixtures.js`; cleanup restores mocks and fake timers after each case.
- A generated Worker must exist for build-dependent assertions; an absent artifact is not a passing runtime check.

## ANTI-PATTERNS

- Do not infer Node test-runner ownership from a directory named `data` or `shared`.
- Do not use `import.meta` in CommonJS Jest tests.
- Do not hit live third-party job services from module tests.
- Do not pin incidental generated formatting instead of observable behavior or parsed contracts.

---

Parent: [../AGENTS.md](../AGENTS.md)
