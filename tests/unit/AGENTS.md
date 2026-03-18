# UNIT TESTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Unit tests validate module-level behavior with deterministic inputs/outputs for portfolio worker, job automation modules, CLI helpers, and data utilities.

## STRUCTURE

```text
unit/
├── portfolio/            # worker/lib unit tests
├── job-server/           # automation module unit tests
├── cli/                  # CLI unit tests
├── data/                 # resume data/schema unit tests
├── generate-worker.test.js
├── security-headers.test.js
├── worker-preamble.test.js
└── worker-routes.test.js
```

## CONVENTIONS

- Keep tests deterministic; avoid external network dependencies.
- Assert behavior at module boundaries, not implementation trivia.
- Mirror source paths where practical for discoverability.
- Use focused fixtures/mocks with explicit setup and cleanup.

## ANTI-PATTERNS

- Do not depend on wall-clock sleeps for unit assertions.
- Do not hit real third-party services in unit tests.
- Do not couple tests to unstable generated output formatting.
- Do not mute failures with broad skips; isolate and fix root causes.
