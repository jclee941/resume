# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-06-30
**Commit:** `766d220c`
**Branch:** `master`

## OVERVIEW

Automation suite for build, sync, deployment helpers, monitoring, security, and
verification. New operational scripts are Go-first.

## STRUCTURE

```text
scripts/
├── build/              # asset generation (PDF, PPTX, icons, screenshots)
├── deployment/         # deploy helper and observability config helpers
├── deploy/             # deploy-adjacent helpers
├── enrichment/         # resume data proposal generators
├── monitoring/         # observability scripts
├── onepassword/        # secret-safe local operator wrappers
├── security/           # secret/config guard scripts
├── setup/              # gitlab-ci setup
├── sync/               # proposal/data sync helpers
├── utils/              # sync-resume-data.js, shared helpers
└── verification/       # verify-deployment.go (7-point check)
```

## CHILD GUIDES

- `build/AGENTS.md` owns generation pipeline guardrails for artifacts and
  snapshots.
- `utils/AGENTS.md` owns shared utility conventions and SSoT-safe helper
  patterns.
- `deployment/AGENTS.md` owns deploy helper safety constraints and preflight
  checks.
- `onepassword/AGENTS.md` owns secret-safe local operator wrappers.
- `security/AGENTS.md` owns committed security guard scripts such as Wrangler
  vars-vs-secrets validation.

## CONVENTIONS

- Child scripts inherit root/`tools/` conventions: run from the project root,
  stay idempotent, and prefer Go for operational behavior.
- Node scripts are acceptable for existing JS-specific data sync/build helpers;
  do not broaden that exception without documenting why.

## ANTI-PATTERNS

- Never use absolute paths.
- Never add new `.sh` operational wrappers.
- Never print resolved secret values or session contents.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
