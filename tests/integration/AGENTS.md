# INTEGRATION TESTS KNOWLEDGE BASE

## OVERVIEW

Integration tests validate cross-module contracts, failure scenarios, and HTML/runtime interaction boundaries that are broader than unit scope but lighter than full E2E.

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

## ANTI-PATTERNS

- Do not turn integration tests into full browser E2E flows.
- Do not rely on non-deterministic remote state.
- Do not hide flaky behavior with unconditional retries.
- Do not weaken failure-path checks when adding happy-path coverage.
