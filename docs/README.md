# Documentation Index

> Parent: [AGENTS.md](AGENTS.md)

This index separates current guidance from superseded decisions and historical
context. ADR files stay in place so their decision history remains intact.

## Accepted

- [ADR 0001: Monorepo Structure](adr/0001-monorepo-structure.md) — accepted;
  its former Bazel facade portion is superseded by ADR 0008.
- [ADR 0002: Zero-Runtime I/O](adr/0002-zero-runtime-io.md)
- [ADR 0003: Resume Data Single Source of Truth](adr/0003-single-source-of-truth.md)
- [ADR 0004: Stealth-First Crawling](adr/0004-stealth-crawling.md)
- [ADR 0005: Cloudflare Workers](adr/0005-cloudflare-workers.md)
- [ADR 0008: Drop the Bazel Facade](adr/0008-drop-bazel-facade.md)
- [ADR 0009: Single-Worker Consolidation](adr/0009-single-worker-consolidation.md)

## Superseded

- [ADR 0006: Single-Worker Architecture](adr/0006-single-worker-architecture.md) —
  superseded by ADR 0007.
- [ADR 0007: MSA Service Split](adr/0007-msa-service-split.md) — superseded by
  ADR 0009.

## Current Architecture

- [Architecture](ARCHITECTURE.md) — canonical current-state overview.
- [System Overview](architecture/system-overview.md)
- [Component Inventory](architecture/component-inventory.md)
- [Deployment Pipeline](architecture/DEPLOYMENT_PIPELINE.md)
- [KV Ownership](architecture/kv-ownership.md)
- [Job Platform Implementation](architecture/JOB_JCLEE_ME_IMPLEMENTATION.md)
- [Project Context](architecture/project-context.md)

## Guides/Runbooks

- [Quick Start](guides/QUICK_START.md)
- [Local Debugging](guides/LOCAL_DEBUGGING.md)
- [Project Structure Map](guides/PROJECT_STRUCTURE_MAP.md)
- [Manual Deployment](guides/MANUAL_DEPLOYMENT_GUIDE.md)
- [Production Deployment](guides/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Cloudflare GitHub Auto Deploy](guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md)
- [CI/CD Automation](guides/CI_CD_AUTOMATION.md)
- [Final Deployment Checklist](guides/FINAL_DEPLOYMENT_CHECKLIST.md)
- [Monitoring Setup](guides/MONITORING_SETUP.md)
- [Monitoring](guides/MONITORING_GUIDE.md)
- [Dashboard Endpoints](guides/DASHBOARD_ENDPOINTS.md)
- [Infrastructure](guides/INFRASTRUCTURE.md)
- [Cloudflare API Token Setup](guides/CF_API_TOKEN_SETUP.md)
- [Cloudflare Authentication](guides/CLOUDFLARE_AUTH_METHODS.md)
- [Slack Integration](guides/SLACK_INTEGRATION.md)
- [Troubleshooting](guides/TROUBLESHOOTING.md)
- [Canonical Job URL Migration](guides/CANONICAL_JOB_URL_MIGRATION.md)
- [Fetch Error Guide](guides/FETCH_ERROR_GUIDE.md)
- [TypeScript Session Troubleshooting](guides/TS_SESSION_TROUBLESHOOTING.md)
- [API Reference](api/README.md)

## Historical/Planning

Time-bound audits, session reviews, implementation plans, and retired guidance
remain in their existing paths where tracked. Treat them as context rather than
current architecture. The previously removed `docs/reports/` (36 session
reports), `docs/analysis/` (8 analyses), `docs/planning/` (9 roadmaps),
`docs/testing/` (2 ULW artifacts), and `docs/thoughts/ledgers/` (3 continuity
ledgers) remain recoverable through Git history. No history is relocated by this
index.

## Document Standards

- Use ADRs for durable decisions that need a stable record.
- Use architecture docs for current system shape, guides for operator runbooks,
  and reports or analysis only for historical context.
- Create a new doc only when an existing canonical doc cannot absorb the change
  cleanly.
- Follow the `docs/AGENTS.md` hierarchy for docs-specific context, and check
  child `AGENTS.md` files in runtime areas when a doc points at a live
  subsystem.
