# INTEGRATION TESTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Jest suites cover sync/schema contracts, network failures, and Worker HTML boundaries without full browser flows.

Boundary: retained cross-module contract domain between unit and E2E coverage.

## WHERE TO LOOK

| Task                     | Location                              | Notes                            |
| ------------------------ | ------------------------------------- | -------------------------------- |
| Network failure handling | `network-failure-scenarios.test.js`   | Controlled failure cases         |
| Resume validation        | `resume-sync-validation.test.js`      | Data-validation interactions     |
| Validation fixtures      | `resume-sync-validation-fixtures.js`  | Reusable non-test fixture module |
| Schema keywords          | `resume-sync-schema-keywords.test.js` | Keyword/shape contract coverage  |
| Rendered Worker HTML     | `worker-html.test.js`                 | HTML/runtime integration         |

## CONVENTIONS

- All suites in this directory use the root Jest configuration.
- Run this layer with `npm run test:jest -- tests/integration`.
- Keep fixture helpers outside the `*.test.js` suffix so discovery does not treat them as suites.
- Exercise realistic adapter boundaries with controlled inputs rather than remote platform state.
- Keep error and success scenarios next to the contract they exercise.
- HTML tests belong here when they validate returned markup without browser interaction.

## ANTI-PATTERNS

- Do not turn these tests into Playwright sessions; use the sibling E2E layer.
- Do not require real Wanted or LinkedIn sessions for boundary assertions.
- Do not mock both sides of an interaction so thoroughly that the contract cannot fail.
- Do not conflate fixture-construction failures with expected adapter errors.

---

Parent: [../AGENTS.md](../AGENTS.md)
