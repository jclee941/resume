# TOOLS KNOWLEDGE BASE

**Generated:** 2026-04-14
**Commit:** `c2629c9`
**Branch:** `master`

## OVERVIEW

Bazel facade layer + npm script automation. CI validation, build scripts, deployment helpers.

## STRUCTURE

```text
tools/
├── ci/                   # CI helper scripts
│   ├── affected.go       # change-impact detection
│   └── validate-cloudflare-native.go  # config guards
├── scripts/              # automation suite
│   ├── build/            # asset generation
│   ├── deployment/       # deploy helpers
│   ├── monitoring/       # observability
│   ├── setup/            # environment setup
│   ├── utils/            # shared utilities
│   └── verification/     # post-deploy checks
└── BUILD.bazel           # Bazel aliases
```

## WHERE TO LOOK

| Task | Location | Notes |
| ---------------- | ----------------------------------- | --------------------- |
| CI validation | `ci/` | affected.go, validate |
| Asset generation | `scripts/build/` | PDF, PPTX, icons |
| Deploy helpers | `scripts/deployment/` | quick-deploy, grafana |
| Health checks | `scripts/verification/` | 7-point verify |
| Data sync | `scripts/utils/sync-resume-data.js` | SSoT propagation |

## CONVENTIONS

- Run all scripts from project root.
- Operational scripts are Go (.go); Node (.mjs) only for hooks/linters.
- Scripts must be idempotent.
- Bazel is a facade — use npm scripts day-to-day.

## ANTI-PATTERNS

- Never use .sh for new operational scripts — use Go.
- Never run scripts from subdirectories.
- Never skip `affected.go` in CI.
- Never deploy manually — CI/CD only.
