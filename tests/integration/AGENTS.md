# INTEGRATION TESTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Integration tests validate cross-module contracts, failure scenarios, and
HTML/runtime interaction boundaries that are broader than unit scope but lighter
than full E2E. Jest discovers the resume sync validation, network failure paths, and Worker HTML rendering.

## STRUCTURE

```text
integration/
├── network-failure-scenarios.test.js
├── resume-sync-validation.test.js
└── worker-html.test.js
```

## CONVENTIONS

- Cover realistic boundary interactions across modules and adapters.
- Keep assertions focused on externally visible contract behavior.
- Prefer controlled fixtures over live environment dependencies.
- Preserve reproducibility in CI and local runs.
- Use Jest for all integration suites.

## ANTI-PATTERNS

- Do not turn integration tests into full browser E2E flows.
- Do not rely on non-deterministic remote state (real Wanted/LinkedIn sessions).
- Do not hide flaky behavior with unconditional retries.
- Do not weaken failure-path checks when adding happy-path coverage.
- Do not skip error scenarios to force green pipelines.

---

Parent: [../AGENTS.md](../AGENTS.md)
