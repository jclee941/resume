# Architecture

Personal resume management system with multi-format output. Layer-based npm workspaces monorepo hosting deployable services and shared packages. Serves a cyberpunk terminal portfolio and automates Korean job platform workflows.

## Overview

The resume monorepo is a personal portfolio and job automation system built on Cloudflare Workers edge computing. It consists of three deployable applications: a cyberpunk-themed terminal portfolio, a job automation server with MCP tools, and a dashboard API. The system uses npm workspaces for package management and follows a layered architecture where `apps/` contains deployables and `packages/` contains shared libraries.

## Tech Stack

| Layer          | Technology         | Version/Notes                    |
| -------------- | ------------------ | -------------------------------- |
| Runtime        | Node.js            | >=22 required (`.nvmrc`)         |
| Runtime        | Cloudflare Workers | Edge-deployed                    |
| Build          | npm workspaces     | Monorepo management              |
| Build          | Bazel              | Facade only, npm scripts primary |
| Languages      | JavaScript         | Primary (.js)                    |
| Languages      | TypeScript         | Types only (.ts)                 |
| Frameworks     | Fastify            | ESM, job-server                  |
| Frameworks     | Commander.js       | CLI tooling                      |
| Frameworks     | Playwright         | E2E testing                      |
| Frameworks     | Jest               | Unit testing                     |
| Infrastructure | Cloudflare D1      | SQLite databases                 |
| Infrastructure | Cloudflare KV      | Key-value storage                |
| Infrastructure | Cloudflare Queues  | Job queue                        |
| Infrastructure | Cloudflare Workers | Edge compute                     |
| Infrastructure | Terraform          | IaC for Cloudflare               |
| Infrastructure | Docker             | Job server container             |
| CI/CD          | GitHub Actions     | Validation pipeline              |
| CI/CD          | CF Workers Builds  | Deploy authority                 |
| Monitoring     | Grafana            | Metrics visualization            |
| Monitoring     | Loki               | Log aggregation                  |
| Monitoring     | Prometheus         | Metrics collection               |
| Monitoring     | GlitchTip          | Error tracking                   |

## System Architecture

```
                        ┌─────────────────────────────────────────┐
                        │           GitHub Repository            │
                        │         (push to master)               │
                        └─────────────────┬───────────────────────┘
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │         CI Pipeline (ci.yml)            │
                        │  analyze → validate-cf → lint →        │
                        │  typecheck → test-unit → test-e2e →    │
                        │  security-scan → build                 │
                        └─────────────────┬───────────────────────┘
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │      Release Pipeline (release.yml)     │
                        │         Auto-release + ELK ingest        │
                        └───────────┬─────────────────┬───────────┘
                                    │                 │
                    ┌───────────────▼───┐   ┌─────────▼─────────┐
                    │  CF Workers Builds │   │  verify.yml      │
                    │    (deploys)       │   │  (health checks) │
                    └────────┬───────────┘   └──────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   apps/portfolio│  │ apps/job-server │  │ apps/job-dash  │
│   (CF Worker)   │  │  (Docker/MCP)   │  │  (unified)     │
│                 │  │                 │  │                 │
│ resume.jclee.me │  │  Local/Docker   │  │  /job/* routes │
│   + /job/*      │  │  MCP+Fastify    │  │  via portfolio  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   packages/data  │  │    D1: JOB_DB   │  │    D1: DB       │
│   (SSoT sync)    │  │  (Job cache,    │  │ (Applications,  │
│                 │  │   sync logs)    │  │  portfolio data)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Directory Structure

```
./
├── apps/
│   ├── portfolio/              # CF Worker: cyberpunk terminal portfolio
│   ├── job-server/             # MCP Server + Fastify for job platform automation
│   └── job-dashboard/          # Dashboard API source (routed via portfolio)
├── packages/
│   ├── cli/                    # Commander.js CLI for resume operations
│   └── data/                   # SSoT for resume variants (master JSON)
├── infrastructure/
│   ├── cloudflare/             # Terraform (Cloudflare resources)
│   ├── monitoring/             # Grafana, Loki, Prometheus configs
│   ├── database/               # D1 migration scripts
│   ├── nginx/                  # Reverse proxy configs
│   └── n8n/                    # Workflow automation
├── tools/
│   ├── scripts/                # Build, deploy, monitoring, setup, utils
│   ├── ci/                     # CI helper scripts
│   └── BUILD.bazel             # Bazel facade
├── tests/
│   ├── unit/                   # Jest test suites (33 suites, 712 tests)
│   ├── e2e/                    # Playwright end-to-end tests (24 files)
│   └── integration/            # Integration tests (3 files)
├── docs/                       # Architecture, guides, analysis, reports
├── ta/                         # Python PPTX analysis scripts (orphaned)
├── third_party/                # Bazel dependency coordination
├── .github/
│   ├── workflows/              # 19 CI/CD workflows
│   └── actions/setup/          # Composite setup action
├── package.json                # Root workspace config (v1.0.128)
├── wrangler.jsonc              # Unified worker config
├── jsconfig.json               # TypeScript checking config
├── eslint.config.cjs           # ESLint flat config
├── jest.config.cjs             # Jest test config
├── playwright.config.js        # Playwright E2E config
└── Dockerfile                  # Job server container
```

## Data Flow

### 1. Resume Data Flow

```
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

The resume data originates from `packages/data/resumes/` as the single source of truth. The `sync:data` script propagates changes to `apps/portfolio/data.json`. During build, `generate-worker.js` inlines the HTML, CSS, and data into `worker.js` at build-time, resulting in zero runtime I/O for the portfolio.

### 2. Job Automation Flow

```
apps/job-server/ (crawlers, services)
           │
           ▼ API calls
Korean job platforms (Wanted, JobKorea)
           │
           ▼ store results
D1: JOB_DB (job cache, sync logs)
           │
           ▼ API routes
apps/job-dashboard/ (dashboard API)
           │
           ▼ routed via
apps/portfolio/entry.js (/job/* routes)
```

Job automation runs in the job-server application, which crawls Korean job platforms using stealth techniques (UA rotation, jitter, rebrowser-puppeteer). Results are stored in the JOB_DB D1 database. The dashboard API is served through the unified worker at `/job/*` routes.

### 3. CI/CD Flow

```
git push (master)
           │
           ▼
GitHub Actions (ci.yml) - 8 validation jobs
           │
           ▼ on success
release.yml (auto-release)
           │
           ├──────────────────┤
           ▼                  ▼
CF Workers Builds    verify.yml
   (deploy)        (health checks)
```

The CI pipeline runs eight validation jobs: analyze, validate-cf, lint, typecheck, test-unit, test-e2e, security-scan, and build. On success, release.yml triggers Cloudflare Workers Builds for deployment and verify.yml for health checks.

## Deployment

| App           | Domain                       | Platform           | Deploy Method                |
| ------------- | ---------------------------- | ------------------ | ---------------------------- |
| Resume Worker | `resume.jclee.me` + `/job/*` | Cloudflare Workers | CF Workers Builds (git push) |
| Job Server    | Local / Docker               | Node.js + Fastify  | Docker / manual              |

**Deploy authority**: Cloudflare Workers Builds deploys on push to `master`. GitHub Actions is CI only and never deploys. Manual `npm run deploy` is blocked.

## Storage Bindings

| Binding         | Type  | Used By       | Purpose                      |
| --------------- | ----- | ------------- | ---------------------------- |
| `DB`            | D1    | Resume Worker | Applications, portfolio data |
| `JOB_DB`        | D1    | Resume Worker | Job cache, sync logs         |
| `SESSIONS`      | KV    | Resume Worker | Session storage              |
| `RATE_LIMIT_KV` | KV    | Resume Worker | Rate limiting                |
| `NONCE_KV`      | KV    | Resume Worker | CSP nonce tracking           |
| `crawl-tasks`   | Queue | Resume Worker | Crawl job queue              |

## Workspaces

| Package                        | Path                  | Type    | Description                           |
| ------------------------------ | --------------------- | ------- | ------------------------------------- |
| `@resume/portfolio-worker`     | `apps/portfolio/`     | App     | CF Worker: cyberpunk portfolio        |
| `@resume/job-automation`       | `apps/job-server/`    | App     | MCP Server + Fastify (ESM)            |
| `@resume/job-dashboard-worker` | `apps/job-dashboard/` | App     | Dashboard API source (unified worker) |
| `@resume/cli`                  | `packages/cli/`       | Package | Commander.js CLI (ESM)                |
| `@resume/data`                 | `packages/data/`      | Package | Resume data SSoT                      |

## Key Design Decisions

### Layer-based Monorepo

The project uses npm workspaces to organize code into two logical layers: `apps/` contains deployable applications (portfolio worker, job-server, job-dashboard) while `packages/` contains shared libraries (CLI, data). This separation enforces clean boundaries between deployables and reusable code.

### Build-time Asset Inlining

The portfolio worker embeds all assets (HTML, CSS, data) at build-time rather than fetching them at runtime. The `generate-worker.js` script escapes template literals, computes CSP hashes, and inlines content into `worker.js`. This approach eliminates runtime I/O and ensures consistent content delivery from the edge.

### Hexagonal Architecture (Job Server)

The job-server application follows hexagonal architecture principles. Business logic lives in `services/` (domain), while external integrations reside in `clients/` (adapters). Dependencies point inward: clients implement interfaces defined by services. This isolation enables testing without real API calls and simplifies swapping implementations.

### Unified Worker Entry

The `apps/portfolio/entry.js` file serves as the unified entry point routing both portfolio and job-dashboard functionality. It exports workflow classes and handles queue consumption for crawl tasks. This consolidation reduces deployment complexity by running both features from a single worker.

### Stealth Crawling

Job automation uses anti-detection measures including User-Agent rotation, random jitter (1s+ delay between requests), and rebrowser-puppeteer for browser fingerprinting evasion. These techniques reduce the likelihood of being blocked by Korean job platforms during automated data collection.

## Related Documentation

- [Deployment Pipeline](architecture/DEPLOYMENT_PIPELINE.md) - CI/CD architecture details
- [System Overview](architecture/system-overview.md) - Legacy overview (may be outdated)
- [Component Inventory](architecture/component-inventory.md) - Legacy component list (may be outdated)
- [Infrastructure Guide](guides/INFRASTRUCTURE.md) - Complete system topology
- [Monitoring Setup](guides/MONITORING_SETUP.md) - Prometheus, Grafana, Loki configuration
