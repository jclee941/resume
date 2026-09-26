# Architecture

Personal resume management system with multi-format output. Layer-based npm
workspaces monorepo hosting deployable services and shared packages. Serves a
cyberpunk terminal portfolio and automates Korean job platform workflows.

## Overview

The resume monorepo is a personal portfolio and job automation system built on
Cloudflare Workers edge computing. It consists of three deployable applications:
a cyberpunk-themed terminal portfolio, a job automation server with MCP tools,
and a dashboard API. The system uses npm workspaces for package management and
follows a layered architecture where `apps/` contains deployables and
`packages/` contains shared libraries.

## Tech Stack

| Layer          | Technology         | Version/Notes            |
| -------------- | ------------------ | ------------------------ |
| Runtime        | Node.js            | >=22 required (`.nvmrc`) |
| Runtime        | Cloudflare Workers | Edge-deployed            |
| Build          | npm workspaces     | Monorepo management      |
| Languages      | JavaScript         | Primary (.js)            |
| Languages      | TypeScript         | Types only (.ts)         |
| Frameworks     | Fastify            | ESM, job-server          |
| Frameworks     | Commander.js       | CLI tooling              |
| Frameworks     | Playwright         | E2E testing              |
| Frameworks     | Jest               | Unit testing             |
| Infrastructure | Cloudflare D1      | SQLite databases         |
| Infrastructure | Cloudflare KV      | Key-value storage        |
| Infrastructure | Cloudflare Queues  | Job queue                |
| Infrastructure | Cloudflare Workers | Edge compute             |
| Infrastructure | Terraform          | IaC for Cloudflare       |
| Infrastructure | Docker             | Job server container     |
| CI/CD          | GitHub Actions     | Validation pipeline      |
| CI/CD          | CF Workers Builds  | Deploy authority         |
| Monitoring     | Grafana            | Metrics visualization    |
| Monitoring     | Loki               | Log aggregation          |
| Monitoring     | Prometheus         | Metrics collection       |

## System Architecture

```text
git push (master)
        │
        ├─────────────────────────────────┐
        ▼                                 ▼
Cloudflare Workers Builds          GitHub Actions ci.yml
(npm run build, deploy)            (validate: lint, typecheck,
        │                           tests, contracts, bundle)
        ▼
resume Worker (apps/portfolio/entry.js)
  ├── portfolio routes (resume.jclee.me)
  ├── /job/* → apps/job-dashboard (in-process module)
  └── scheduled() ← Cron Triggers (0 21, 0 23 UTC)
        │
        ▼
Workflows · Queues · D1 (DB, JOB_DB) · KV (SESSIONS, RATE_LIMIT_KV, NONCE_KV)

apps/job-server   local/Docker MCP server, crawlers, profile sync
packages/data     resume SSoT, inlined into the Worker by npm run build
```

## Directory Structure

```text
./
├── apps/
│   ├── portfolio/              # CF Worker: cyberpunk terminal portfolio
│   ├── job-server/             # MCP Server + Fastify for job platform automation
│   └── job-dashboard/          # Dashboard API module (imported into portfolio worker)
├── packages/
│   ├── cli/                    # Commander.js CLI for resume operations
│   ├── env/                    # Environment validation + type-safe secrets
│   ├── data/                   # SSoT for resume variants (master JSON)
│   ├── shared/                 # @resume/shared: cross-worker utilities (logger, errors, ES client, etc.)
│   ├── types/                  # Canonical JSDoc/TS type definitions (zero runtime deps)
│   ├── schemas/                # Runtime Zod validation schemas
│   └── contracts/              # OpenAPI spec + Worker Env interface
├── infrastructure/
│   ├── cloudflare/             # Terraform (Cloudflare resources)
│   ├── configs/                # Alertmanager, Grafana, Prometheus, Tempo configs
│   ├── database/               # D1 migrations and seeds
│   ├── docker/                 # Monitoring and session-broker compose files
│   ├── mocks/                  # Cloudflare binding mocks
│   └── monitoring/             # Grafana dashboards, SLOs, logging, tracing
├── tools/
│   ├── scripts/                # Build, deploy, monitoring, setup, utils
│   └── ci/                     # CI helper scripts
├── tests/
│   ├── unit/                   # Jest unit suites
│   ├── e2e/                    # Playwright end-to-end tests
│   └── integration/            # Integration tests
├── docs/                       # Architecture, guides, analysis, reports
├── ta/                         # Python PPTX analysis scripts
├── third_party/                # Vendored external dependencies (npm-managed)
├── .github/
│   └── workflows/ci.yml        # Validation-only CI (never deploys)
├── package.json                # Root workspace config
├── wrangler.jsonc              # Merged resume Worker config (bindings, crons)
├── tsconfig.base.json          # TypeScript base checking config
├── eslint.config.cjs           # ESLint flat config
├── jest.config.cjs             # Jest test config
├── playwright.config.js        # Playwright E2E config
└── Dockerfile                  # Job server container
```

## Data Flow

### 1. Resume Data Flow

```text
packages/data/resumes/ (master JSON)
           │
           ▼ npm run sync:data
apps/portfolio/data.json
           │
           ▼ node generate-worker.js
apps/portfolio/worker.js (build-time inline)
           │
           ▼ CF Workers Builds
Cloudflare Edge (resume.jclee.me)
```

The resume data originates from `packages/data/resumes/` as the single source of
truth. The `sync:data` script propagates changes to `apps/portfolio/data.json`.
During build, `generate-worker.js` inlines the HTML, CSS, and data into
`worker.js` at build-time, resulting in zero runtime I/O for the portfolio.

### 2. Job Automation Flow

```text
Cron Triggers (0 21, 0 23 UTC) or /job/api/* request
           │
           ▼
resume Worker scheduled()/fetch() → apps/job-dashboard handlers
           │
           ▼ Workflows + Queues
Korean job platforms + cliproxy LLM job discovery and scoring
           │
           ▼ store results
D1 JOB_DB (applications, job cache, sync logs) · KV SESSIONS
```

Scheduled job automation runs inside the merged `resume` Worker: Cron Triggers
invoke `scheduled()`, which routes through
`apps/job-dashboard/src/handlers/scheduled/` into Cloudflare Workflows and
Queues. `0 21 * * *` refreshes the Wanted session and starts
`ResumeSyncWorkflow`; `0 23 * * *` runs cliproxy auto-apply. Both default to
dry-run. The dashboard API is served by the job-dashboard module imported
directly into the portfolio worker — no Service Binding, no separate
deployment. `apps/job-server` remains the local MCP server, crawler, and
profile-sync runtime.

### 3. CI/CD Flow

```text
git push (master)
           │
           ├──────────────────────────────┐
           ▼                              ▼
Cloudflare Workers Builds          GitHub Actions ci.yml (validate)
(npm run build, deploy)            lint, typecheck, tests, contracts,
                                   Wrangler bundle dry-run
```

Cloudflare Workers Builds is the only deploy path: it runs `npm run build` and
deploys the merged `resume` Worker on every push to `master`. GitHub Actions
runs one `validate` job (`.github/workflows/ci.yml`) on pushes and pull
requests and never deploys.

## Deployment

| App              | Domain                  | Platform           | Deploy Method                |
| ---------------- | ----------------------- | ------------------ | ---------------------------- |
| Portfolio Worker | `resume.jclee.me`       | Cloudflare Workers | CF Workers Builds (git push) |
| Job Dashboard    | `resume.jclee.me/job/*` | Cloudflare Workers | CF Workers Builds (git push) |
| Job Server       | Local / Docker          | Node.js + Fastify  | Docker / manual              |

**Deploy authority**: Cloudflare Workers Builds deploys the merged `resume`
worker on push to `master`. GitHub Actions is CI only and never deploys. The
portfolio worker imports the job-dashboard worker module in-process (no Service
Binding) and routes `/job/*` requests via `jobWorker.fetch(request, env, ctx)`.
See [ADR 0009](adr/0009-single-worker-consolidation.md) (supersedes ADR 0007).

## Storage Bindings

| Binding         | Type  | Used By                    | Purpose                                   |
| --------------- | ----- | -------------------------- | ----------------------------------------- |
| `DB`            | D1    | Merged Worker (resume)     | Portfolio data (resume-prod-db)           |
| `JOB_DB`        | D1    | Merged Worker (resume)     | Applications, job data (job-dashboard-db) |
| `SESSIONS`      | KV    | Both (shared, intentional) | Session storage                           |
| `RATE_LIMIT_KV` | KV    | Both (shared, intentional) | Domain-wide rate limiting                 |
| `NONCE_KV`      | KV    | Both (shared, intentional) | CSRF nonce validation                     |
| `crawl-tasks`   | Queue | Merged Worker (resume)     | Crawl job queue                           |
| `notifications` | Queue | Merged Worker (resume)     | Notification delivery                     |

## Workspaces

| Package                        | Path                  | Type    | Description                                           |
| ------------------------------ | --------------------- | ------- | ----------------------------------------------------- |
| `@resume/portfolio-worker`     | `apps/portfolio/`     | App     | CF Worker: cyberpunk portfolio                        |
| `@resume/job-automation`       | `apps/job-server/`    | App     | MCP Server + Fastify (ESM)                            |
| `@resume/job-dashboard-worker` | `apps/job-dashboard/` | Module  | Dashboard API module (imported into portfolio worker) |
| `@resume/shared`               | `packages/shared/`    | Package | Cross-worker shared kernel                            |
| `@resume/cli`                  | `packages/cli/`       | Package | Commander.js CLI (ESM)                                |
| `@resume/data`                 | `packages/data/`      | Package | Resume data SSoT                                      |
| `@resume/env`                  | `packages/env/`       | Package | Runtime environment validation                        |
| `@resume/types`                | `packages/types/`     | Package | Canonical JSDoc/TS domain types                       |
| `@resume/schemas`              | `packages/schemas/`   | Package | Zod runtime schemas                                   |
| `@resume/contracts`            | `packages/contracts/` | Package | OpenAPI spec + Worker env contract                    |

## Key Design Decisions

### Layer-based Monorepo

The project uses npm workspaces to organize code into two logical layers:
`apps/` contains deployable applications (portfolio worker, job-server,
job-dashboard) while `packages/` contains shared libraries (CLI, data). This
separation enforces clean boundaries between deployables and reusable code.

### Build-time Asset Inlining

The portfolio worker embeds all assets (HTML, CSS, data) at build-time rather
than fetching them at runtime. The `generate-worker.js` script escapes template
literals, computes CSP hashes, and inlines content into `worker.js`. This
approach eliminates runtime I/O and ensures consistent content delivery from the
edge.

### Hexagonal Architecture (Job Server)

The job-server application follows hexagonal architecture principles. Business
logic lives in `services/` (domain), while external integrations reside in
`clients/` (adapters). Dependencies point inward: clients implement interfaces
defined by services. This isolation enables testing without real API calls and
simplifies swapping implementations.

### Single-Worker Architecture (Post-Consolidation)

The portfolio worker (`apps/portfolio/entry.js`) imports the job-dashboard
worker module in-process: `import jobWorker from
'../job-dashboard/src/index.js'`. `/job/*` requests are routed via direct
function call `jobWorker.fetch(request, env, ctx)` — no Service Binding
round-trip. The merged `resume` worker registers all 7 Workflow classes and the
`BrowserSessionDO` Durable Object directly. A single `wrangler deploy` per push
to `master` updates the entire system. Shared concerns (Elasticsearch client,
Logger, error types, user-agent parsing, phone formatting, job categories,
browser automation, Wanted API client) live in `@resume/shared`. See [ADR
0009](adr/0009-single-worker-consolidation.md) for the full architecture
rationale (supersedes ADR 0007).

### Stealth Crawling

Job automation uses anti-detection measures including User-Agent rotation,
random jitter (1s+ delay between requests), and rebrowser-puppeteer for browser
fingerprinting evasion. These techniques reduce the likelihood of being blocked
by Korean job platforms during automated data collection.

## Related Documentation

- [Deployment Pipeline](architecture/DEPLOYMENT_PIPELINE.md) - CI/CD
  architecture details
- [System Overview](architecture/system-overview.md) - Legacy overview (may be
  outdated)
- [Component Inventory](architecture/component-inventory.md) - Legacy component
  list (may be outdated)
- [Infrastructure Guide](guides/INFRASTRUCTURE.md) - Complete system topology
- [Monitoring Setup](guides/MONITORING_SETUP.md) - Prometheus, Grafana, Loki
  configuration
