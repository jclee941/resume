# E2E FIXTURES KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Browser-test support modules provide mock services, owner-derived copy, and public-copy ledger extraction.

Boundary: score 9; distinct reusable mock-server and capture-contract domain.

## WHERE TO LOOK

| Task                  | Location                                                               | Notes                                            |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Dashboard environment | `dashboard-environment.cjs`                                            | Mock versus external selection                   |
| Dashboard mock server | `mock-dashboard-server.cjs`, `mock-data.js`                            | API/UI behavior for local tests                  |
| Job application mock  | `mock-job-site.js`, `mock-job-site-*.js`                               | State, markup, runtime split                     |
| Owner-dependent copy  | `owner-copy.js`                                                        | Uses central owner-data helper                   |
| Login stubs           | `auth-login.js`                                                        | Valid/expired token payloads and token-info mock |
| Ledger capture        | `public-copy-ledger-extractor*.js`                                     | DOM, accessible, non-DOM, state extraction       |
| Ledger format         | `public-copy-ledger-serializer.js`, `public-copy-ledger-validation.js` | Serialization and validation                     |
| Source audit          | `public-copy-source-audit*.js`, `public-copy-source-map.json`          | Pointer and schema validation                    |

## CONVENTIONS

- Dashboard fixtures default to local mocks; `RUN_EXTERNAL_E2E` switches to external availability probes.
- Mock dashboard ports use `9494 + workerIndex` so workers do not share one mutable server instance.
- The external dashboard base comes from `PLAYWRIGHT_BASE_URL`, falling back to the local Worker.
- `owner-copy.js` derives expected copy rather than embedding the owner's identity in tests.
- Most modules use CommonJS; `auth-login.js` uses ESM exports.
- Ledger extraction separates browser-visible occurrences from repository-source auditing.
- Some unit tests import ledger helpers; keep their module contract usable outside Playwright fixtures.

## ANTI-PATTERNS

- Do not route a mock application flow to a real job platform.
- Do not make mock service state leak across independent browser workers.
- Do not assume an available dashboard API proves the dashboard UI is available.
- Do not replace source-pointer validation with raw prose matching.

---

Parent: [../AGENTS.md](../AGENTS.md)
