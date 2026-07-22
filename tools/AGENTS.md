# TOOLS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

CI validation, build automation, deployment helpers, and operational scripts.
Organized by domain: CI (validation), build (asset generation), scripts (automation suite).

## STRUCTURE

```text
tools/
├── ci/                   # CI validation scripts
│   ├── affected.go       # change-impact detection
│   ├── validate-cloudflare-native.go  # wrangler config guards
│   ├── check-env-schema-drift.go      # env contract validation
│   └── validate-migrations.go         # D1 migration safety
└── scripts/              # automation suite (build, deploy, verify, enrich, release)
    ├── build/            # asset generation (PDF, PPTX, icons, screenshots)
    ├── deployment/       # deploy helpers and preflight checks
    ├── verification/     # deterministic validators and remote probes
    ├── release/          # version decisions and GitHub release publication
    ├── enrichment/       # resume data proposal generators
    ├── onepassword/      # secret-safe local operator wrappers
    ├── security/         # committed security guard scripts
    ├── monitoring/       # observability config helpers
    ├── sync/             # data sync and proposal application
    ├── utils/            # shared utilities and SSoT helpers
    └── setup/            # environment setup
```

## WHERE TO LOOK

| Task               | Location                | Notes                                                |
| ------------------ | ----------------------- | ---------------------------------------------------- |
| CI validation      | `ci/`                   | affected.go, wrangler config, env schema, migrations |
| Asset generation   | `scripts/build/`        | PDF, PPTX, icons, screenshots, Docker images         |
| Deploy helpers     | `scripts/deployment/`   | quick-deploy, staged deploy, monitoring hooks        |
| Verification       | `scripts/verification/` | validators, remote probes, Lighthouse, smoke tests   |
| Release automation | `scripts/release/`      | version decisions, GitHub release publication        |
| Data enrichment    | `scripts/enrichment/`   | GitHub/skills/LLM proposal generators                |
| Secret management  | `scripts/onepassword/`  | 1Password-safe local operator wrappers               |
| Data sync          | `scripts/utils/`        | SSoT propagation and shared helpers                  |

## CHILD GUIDES

- `ci/AGENTS.md` — CI validation scripts and change-impact detection.
- `scripts/AGENTS.md` — Automation suite parent; links to build, deployment, verification, release, enrichment.
- `scripts/build/AGENTS.md` — Asset generation pipeline guardrails.
- `scripts/deployment/AGENTS.md` — Deploy helper safety constraints and preflight checks.
- `scripts/verification/AGENTS.md` — Deterministic validators and remote probes.
- `scripts/release/AGENTS.md` — Version decisions and GitHub release publication.
- `scripts/enrichment/AGENTS.md` — Resume data proposal generators.

## CONVENTIONS

- Prefer root `npm` scripts; direct Go commands must use the owning module's
  documented working directory.
- Operational scripts are Go (.go); Node (.mjs) only for hooks/linters/validators.
- Validators stay deterministic and read-only; mutating helpers must expose
  preflight, dry-run, or safe-rerun behavior appropriate to the operation.
- CI is validation-only; Cloudflare Workers Builds owns production deploy authority.
- Artifact tracking is output-specific: application PDFs are tracked, while
  generated master/variant PDFs and temporary reports are ignored.

## ANTI-PATTERNS

- Never use .sh for new operational scripts — use Go.
- Never run a module-scoped Go command from the wrong module directory.
- Never skip `affected.go` in CI.
- Never treat local deployment helpers as production deploy authority.
- Never commit secrets, session files, or API tokens.

---

Parent: [../AGENTS.md](../AGENTS.md)
