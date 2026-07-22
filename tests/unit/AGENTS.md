# UNIT TESTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Unit tests validate module-level behavior with deterministic inputs/outputs for portfolio worker, job-server automation, CLI helpers, and data utilities. Jest runs portfolio/job-dashboard suites;
Node `--test` runs job-server, schemas, env, shared, tools, and CLI tests.

## STRUCTURE

```text
unit/
├── portfolio-worker/      # worker/lib Jest suites
├── job-dashboard/        # job-dashboard Jest suites
├── job-server/           # job-server Node --test suites
├── job-automation/       # automation module Node --test
├── shared/               # shared utilities Node --test
├── data/                 # resume data/schema Node --test
├── generate-worker.test.js
├── security-headers.test.js
├── worker-preamble.test.js
└── worker-routes.test.js
```

## CONVENTIONS

- Keep tests deterministic; no external network calls or wall-clock sleeps.
- Assert behavior at module boundaries, not implementation details.
- Mirror source paths for discoverability (e.g., `src/foo.js` → `unit/foo.test.js`).
- Use focused fixtures/mocks with explicit setup and cleanup.
- Jest for portfolio/job-dashboard; Node `--test` for job-server and shared packages.

## ANTI-PATTERNS

- Do not depend on wall-clock sleeps for unit assertions.
- Do not hit real third-party services (Wanted, LinkedIn, etc.) in unit tests.
- Do not couple tests to unstable generated output formatting.
- Do not mute failures with broad skips; isolate and fix root causes.
- Do not use `describe.skip` or `.only` in shared suites.

---

Parent: [../AGENTS.md](../AGENTS.md)
