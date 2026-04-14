# Documentation Index

> Parent: [AGENTS.md](AGENTS.md)

This is the main entry point for the docs tree. Start with the maintained sections below, then use the archived sections for historical context only.

## Active Documentation (maintained, accurate)

### Architecture Decision Records (`docs/adr/`)

- [0001-monorepo-structure.md](adr/0001-monorepo-structure.md), monorepo layout and ownership boundaries.
- [0002-zero-runtime-io.md](adr/0002-zero-runtime-io.md), runtime code should avoid unexpected I/O.
- [0003-single-source-of-truth.md](adr/0003-single-source-of-truth.md), canonical resume data lives in one place.
- [0004-stealth-crawling.md](adr/0004-stealth-crawling.md), crawler behavior and anti-detection constraints.
- [0005-cloudflare-workers.md](adr/0005-cloudflare-workers.md), Cloudflare Workers as the primary runtime.
- [0006-single-worker-architecture.md](adr/0006-single-worker-architecture.md), worker boundary and deployment shape.
- [0007-msa-service-split.md](adr/0007-msa-service-split.md), service split guidance for the job automation stack.

### Architecture (`docs/architecture/`)

- [ARCHITECTURE.md](ARCHITECTURE.md), top-level architecture overview.
- [system-overview.md](architecture/system-overview.md), current system map and major components.
- [DEPLOYMENT_PIPELINE.md](architecture/DEPLOYMENT_PIPELINE.md), build and deployment flow.
- [component-inventory.md](architecture/component-inventory.md), inventory of major runtime pieces.
- [JOB_JCLEE_ME_IMPLEMENTATION.md](architecture/JOB_JCLEE_ME_IMPLEMENTATION.md), job platform sync implementation notes.
- [JOB_JCLEE_ME_IMPLEMENTATION.md](architecture/JOB_JCLEE_ME_IMPLEMENTATION.md), job platform sync implementation notes.
- [project-context.md](architecture/project-context.md), repo and runtime context for the current system.

### Guides (`docs/guides/`)

#### Getting Started

- [QUICK_START.md](guides/QUICK_START.md)
- [LOCAL_DEBUGGING.md](guides/LOCAL_DEBUGGING.md)
- [PROJECT_STRUCTURE_MAP.md](guides/PROJECT_STRUCTURE_MAP.md)

#### Deployment

- [MANUAL_DEPLOYMENT_GUIDE.md](guides/MANUAL_DEPLOYMENT_GUIDE.md)
- [PRODUCTION_DEPLOYMENT_GUIDE.md](guides/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [CLOUDFLARE_GITHUB_AUTO_DEPLOY.md](guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md)
- [CI_CD_AUTOMATION.md](guides/CI_CD_AUTOMATION.md)
- [FINAL_DEPLOYMENT_CHECKLIST.md](guides/FINAL_DEPLOYMENT_CHECKLIST.md)

#### Monitoring

- [MONITORING_SETUP.md](guides/MONITORING_SETUP.md)
- [MONITORING_GUIDE.md](guides/MONITORING_GUIDE.md)
- [DASHBOARD_ENDPOINTS.md](guides/DASHBOARD_ENDPOINTS.md)

#### Platform-Specific

- [INFRASTRUCTURE.md](guides/INFRASTRUCTURE.md)
- [CF_API_TOKEN_SETUP.md](guides/CF_API_TOKEN_SETUP.md)
- [CLOUDFLARE_AUTH_METHODS.md](guides/CLOUDFLARE_AUTH_METHODS.md)
- [N8N_TELEGRAM_SETUP.md](guides/N8N_TELEGRAM_SETUP.md)
- [SLACK_INTEGRATION.md](guides/SLACK_INTEGRATION.md)

#### Troubleshooting

- [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)
- [FETCH_ERROR_GUIDE.md](guides/FETCH_ERROR_GUIDE.md)
- [TS_SESSION_TROUBLESHOOTING.md](guides/TS_SESSION_TROUBLESHOOTING.md)
- [TS_SESSION_TROUBLESHOOTING.md](guides/TS_SESSION_TROUBLESHOOTING.md)

### API (`docs/api/`)

- [API README](api/README.md)

## Deleted Directories (removed 2026-04-14)

The following directories were purged as historical-only content with no active references:
- `docs/reports/` - 36 session reports
- `docs/analysis/` - 8 codebase analyses
- `docs/planning/` - 9 archived roadmaps
- `docs/testing/` - 2 ULW test artifacts
- `docs/thoughts/ledgers/` - 3 continuity ledgers

All content remains recoverable via `git log --diff-filter=D -- docs/reports/`.

## Document Standards

- Use ADRs for durable decisions that need a stable record.
- Use architecture docs for current system shape, guides for operator runbooks, and reports or analysis only for historical context.
- Create a new doc only when an existing canonical doc cannot absorb the change cleanly.
- Follow the `docs/AGENTS.md` hierarchy for docs-specific context, and check child `AGENTS.md` files in runtime areas when a doc points at a live subsystem.
