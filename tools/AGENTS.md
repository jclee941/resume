# TOOLS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Bazel facade layer + npm script automation. CI validation, build scripts, deployment helpers.

## STRUCTURE

```text
tools/
├── ci/                   # CI helper scripts
│   ├── affected.sh       # change-impact detection
│   └── validate-cloudflare-native.sh  # config guards
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

| Task             | Location                            | Notes                 |
| ---------------- | ----------------------------------- | --------------------- |
| CI validation    | `ci/`                               | affected.sh, validate |
| Asset generation | `scripts/build/`                    | PDF, PPTX, icons      |
| Deploy helpers   | `scripts/deployment/`               | quick-deploy, grafana |
| Health checks    | `scripts/verification/`             | 7-point verify        |
| Data sync        | `scripts/utils/sync-resume-data.js` | SSoT propagation      |

## CONVENTIONS

- Run all scripts from project root.
- Shell scripts: `set -euo pipefail`.
- Scripts must be idempotent.
- Bazel is a facade — use npm scripts day-to-day.

## ANTI-PATTERNS

- Never run scripts from subdirectories.
- Never skip `affected.sh` in CI.
- Never deploy manually — CI/CD only.
- Never edit generated artifacts.
