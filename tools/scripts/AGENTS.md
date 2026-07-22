# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Automation suite for build, deployment, verification, release, and enrichment. New operational scripts are Go-first. Existing JS-domain generators and deterministic validators are explicit exceptions.

## STRUCTURE

```text
scripts/
├── build/              # asset generation (PDF, PPTX, icons, screenshots, Docker)
├── deployment/         # deploy helpers and preflight checks
├── verification/      # deterministic validators and remote probes
├── release/           # version decisions and GitHub release publication
├── enrichment/        # resume data proposal generators
├── onepassword/       # secret-safe local operator wrappers
├── security/          # committed security guard scripts
├── monitoring/        # observability config helpers
├── sync/              # data sync and proposal application
├── utils/             # shared utilities and SSoT helpers
└── setup/             # environment setup
```

## CHILD GUIDES

- `build/AGENTS.md` — Asset generation pipeline guardrails for artifacts and snapshots.
- `deployment/AGENTS.md` — Deploy helper safety constraints and preflight checks.
- `verification/AGENTS.md` — Deterministic validators and remote probes.
- `release/AGENTS.md` — Version decisions and GitHub release publication.
- `enrichment/AGENTS.md` — Resume data proposal generators.

## CONVENTIONS

- Child scripts inherit root/`tools/` conventions: prefer root package scripts,
  respect Go module working directories, and prefer Go for operational behavior.
- Node scripts are acceptable for existing JS-specific data sync/build helpers; do not broaden that exception without documenting why.
- Generated-output ownership and tracking vary by child guide and `.gitignore`;
  do not assume every generated file is committed.
- Cloudflare Workers Builds owns production deploy authority; local helpers are emergency/operator tools only.

## ANTI-PATTERNS

- Never use absolute paths.
- Never add new `.sh` operational wrappers.
- Never print resolved secret values or session contents.
- Never treat local deployment helpers as production deploy authority.

---

Parent: [../AGENTS.md](../AGENTS.md)
