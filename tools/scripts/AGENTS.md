# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Automation suite for build, deployment, monitoring, and verification.

## STRUCTURE

```text
scripts/
├── build/              # asset generation (PDF, PPTX, icons, screenshots)
├── deployment/         # quick-deploy.sh, grafana helpers
├── monitoring/         # observability scripts
├── setup/              # gitlab-ci setup
├── utils/              # sync-resume-data.js, shared helpers
└── verification/       # verify-deployment.sh (7-point check)
```

## CHILD GUIDES

- `build/AGENTS.md` owns generation pipeline guardrails for artifacts and snapshots.
- `utils/AGENTS.md` owns shared utility conventions and SSoT-safe helper patterns.
- `deployment/AGENTS.md` owns deploy helper safety constraints and preflight checks.
- `bazel/AGENTS.md` owns Bazel facade shell entrypoints and script boundaries.

## CONVENTIONS

- Run from project root context.
- `set -euo pipefail` in all shell scripts.
- Idempotent — safe to re-run.

## ANTI-PATTERNS

- Never hardcode secrets in scripts.
- Never bypass verification steps.
- Never edit generated artifacts manually.
- Never use absolute paths.
