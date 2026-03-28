# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Automation suite for build, deployment, monitoring, and verification.

## STRUCTURE

```text
scripts/
├── build/              # asset generation (PDF, PPTX, icons, screenshots)
├── deployment/         # quick-deploy.go, grafana helpers
├── monitoring/         # observability scripts
├── setup/              # gitlab-ci setup
├── utils/              # sync-resume-data.js, shared helpers
└── verification/       # verify-deployment.go (7-point check)
```

## CHILD GUIDES

- `build/AGENTS.md` owns generation pipeline guardrails for artifacts and snapshots.
- `utils/AGENTS.md` owns shared utility conventions and SSoT-safe helper patterns.
- `deployment/AGENTS.md` owns deploy helper safety constraints and preflight checks.
- `bazel/AGENTS.md` owns Bazel facade shell entrypoints and script boundaries.

## CONVENTIONS

- Child scripts inherit root/`tools/` conventions (project root context, `set -euo pipefail`, idempotency).

## ANTI-PATTERNS

- Never use absolute paths.
