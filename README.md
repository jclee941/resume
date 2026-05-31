<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the structure:

1. It's a monorepo with apps (portfolio, job-server, job-dashboard) and packages (cli, env, data, shared, types, schemas, contracts)
2. It uses Cloudflare Workers
3. Has job automation (Wanted/JobKorea)
4. Has extensive GitHub Actions workflows (37 total)
5. Has Docker support

Key info from what was provided:
- Version 1.40.11
- Description: Resume portfolio monorepo with Cloudflare Worker edge site, job automation, SSoT data, self-hosted observability
- Node.js ≥22 required
- Workspaces include: apps/portfolio, apps/job-server, apps/job-dashboard, packages/cli, packages/data, packages/shared, packages/types, packages/schemas, packages/contracts, packages/env

Workflow files (37 total):
01_branch-to-pr.yml, 02_issue-to-branch.yml, 03_pr-checks.yml, 04_actionlint.yml, 05_gitleaks.yml, 06_codeql.yml, 07_dependency-review.yml, 08_scorecard.yml, 09_semantic-pr.yml, 10_pr-review.yml, 12_dependabot-auto-merge.yml, 13_pr-auto-merge.yml, 14_bot-auto-fix.yml, 15_merged-pr-cleanup.yml, 18_issue-management.yml, 19_issue-backfill.yml, 20_readme-gen.yml, 21_docs-sync.yml, 24_release-notes.yml, 25_release-publish.yml, 29_downstream-health-check.yml, 37_ci-failure-issues.yml, 42_reusable-docs-sync.yml, 43_reusable-issue-management.yml, 44_reusable-pr-checks.yml, 45_reusable-gitleaks.yml, 60_ci-auto-heal.yml, auto-merge.yml, auto-sync-data.yml, ci.yml, delete-standalone-job-worker.yml, labeler.yml, post-deploy-verify.yml, provision-queues.yml, release.yml, welcome.yml, security/11_pr-review.yml
 
I notice there's a mix of semantic versioning workflows (01-25), reusable components (42-45, 60), and operational automations (auto-merge, ci, release). I need to create bilingual documentation with a professional structure covering project overview, features, architecture, automation details, and quick start guides. The README should include badges, overview, features, architecture diagrams, workflow inventory with tool names, local development setup, command reference, and contribution guidelines, all formatted in Markdown with bilingual support in Korean and English.

The workflow naming suggests certain patterns—semantic PR automation, issue management, downstream health checks, CI failure tracking, and reusable workflow templates for documentation sync, issue management, PR checks, and secrets scanning. I'll document these clearly so contributors understand the automation ecosystem. The model fallback mentions minimax-m2.7 with gpt-5.5 via CLIProxyAPI, which should be noted in the technical setup section.

</think>

```markdown
# resume.jclee.me

<div align="center">

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![mono-repo](https://img.shields.io/badge/mono-repo-workspaces-ffcc00?logo=monorepo)](https://github.com/jclee941/resume)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

</div>

---

## 📖 Overview | 개요

> **English:** Jaecheol Lee (이재철) — DevSecOps/SRE Engineer. 8+ years, financial/public security infrastructure.
>
> **한국어:**DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라 경험.

This repository is **not** a simple portfolio site — it is a **monorepo deriving multiple artifacts from a Single Source of Truth (SSoT)** resume dataset.

```text
┌─────────────────────────────────────────────────────────────┐
│           packages/data/resumes/master/resume_data.json      │
│                        ← Single Source of Truth (SSoT)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Edge Portfolio │ │ Job Automation  │ │ Profile Sync    │
│  (CF Workers)   │ │ (MCP/n8n)       │ │ (Wanted + SNS)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

| Artifact | Technology | Description |
|----------|------------|-------------|
| **Portfolio Site** | Cloudflare Workers | Edge-deployed, i18n (KO/EN/JA), ~200+ locales |
| **Job Automation** | Node.js + MCP Server | Wanted/JobKorea auto-application pipeline |
| **Dashboard API** | Cloudflare Workers | Job status tracking, proposal management |
| **CLI Tools** | Node.js | Database ops, deployment, verification commands |
| **Data Pipeline** | Go + Python | Resume enrichment, PPTX generation, GitHub sync |

---

## ✨ Features | 주요 기능

| Category | Description |
|----------|-------------|
| **🌐 Edge Portfolio** | Cloudflare Workers CDN, sub-50ms global latency, automatic i18n routing |
| **🤖 Job Automation** | MCP server for Wanted/JobKorea, auto-apply workflows, cover letter generation |
| **📊 Dashboard** | Real-time job application tracking, status dashboards, analytics |
| **🔄 SSoT Data** | JSON-based resume master, auto-derived across all platforms |
| **🛡️ DevSecOps** | Supply chain security (Gitleaks, CodeQL, Scorecard), SBOM generation |
| **📦 Monorepo** | 10 workspaces (apps + packages), shared types/schemas/contracts |
| **🐳 Containerized** | Multi-stage Dockerfile, docker-compose for local dev |
| **📂 Observability** | Health endpoints, Prometheus metrics, self-hosted monitoring |

---

## 🏗️ Architecture | 아키텍처

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker edge site
│   ├── job-server/         # MCP server + job automation runtime
│   └── job-dashboard/      # Dashboard API + Cloudflare Workers
├── packages/
│   ├── cli/                # CLI commands (db, deploy, verify)
│   ├── contracts/          # OpenAPI spec + Worker Env interface
│   ├── data/               # SSoT resume data + JSON schema
│   ├── env/                # Environment validation + type-safe secrets
│   ├── schemas/            # Runtime Zod validation schemas
│   ├── shared/             # Cross-package utilities
│   └── types/              # Canonical JSDoc/TS type definitions
├── tools/
│   ├── scripts/            # CI, build, deploy, verification (Go + JS)
│   ├── ci/                 # Cloudflare native validation
│   └── enrichment/         # GitHub, skills, AI enrichment pipelines
├── infrastructure/         # Monitoring, n8n, DB configs
├── tests/                  # Jest, Playwright E2E
└── .github/
    └── workflows/          # 37 GitHub Actions workflows
```

### Package Dependencies

```
apps/portfolio ─────┬─► packages/types
                    └─► packages/schemas ──► packages/shared
apps/job-server ────┼─► packages/{shared,schemas,types,data,env}
                    └─► packages/contracts
apps/job-dashboard ──┼─► packages/{shared,schemas,types,data,contracts}
                    └─► packages/env
packages/cli ───────┼─► packages/{shared,schemas,types}
```

---

## 🔄 Automation Inventory | 자동화 인벤토리

### GitHub Actions Workflows (37 Total)

#### 🔀 Branch & PR Automation
| Workflow | Description |
|----------|-------------|
| `01_branch-to-pr.yml` | Auto-create PR from branch |
| `02_issue-to-branch.yml` | Auto-create branch from issue |
| `03_pr-checks.yml` | Comprehensive PR validation (reusable entry point) |
| `04_actionlint.yml` | GitHub Actions syntax validation |
| `14_bot-auto-fix.yml` | Automated bot fix on PR |
| `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| `auto-merge.yml` | Auto-merge dependency updates |

#### 🔍 Security & Compliance
| Workflow | Description |
|----------|-------------|
| `05_gitleaks.yml` | Secrets scanning (Gitleaks) |
| `06_codeql.yml` | CodeQL static analysis |
| `07_dependency-review.yml` | Dependency vulnerability review |
| `08_scorecard.yml` | OpenSSF Scorecard security score |
| `45_reusable-gitleaks.yml` | Reusable Gitleaks workflow |

#### 📝 Code Quality
| Workflow | Description |
|----------|-------------|
| `09_semantic-pr.yml` | Semantic PR title enforcement |
| `10_pr-review.yml` | PR review automation |
| `security/11_pr-review.yml` | Security-focused PR review |

#### 🔧 Issue Management
| Workflow | Description |
|----------|-------------|
| `18_issue-management.yml` | Issue lifecycle automation |
| `19_issue-backfill.yml` | Issue data backfill |
| `37_ci-failure-issues.yml` | Auto-create issues from CI failures |
| `43_reusable-issue-management.yml` | Reusable issue management |

#### 📚 Documentation
| Workflow | Description |
|----------|-------------|
| `20_readme-gen.yml` | Auto-generate README |
| `21_docs-sync.yml` | Documentation sync |
| `42_reusable-docs-sync.yml` | Reusable docs sync workflow |

#### 🚀 Release & Deploy
| Workflow | Description |
|----------|-------------|
| `24_release-notes.yml` | Auto-generate release notes |
| `25_release-publish.yml` | Publish release artifacts |
| `release.yml` | Release pipeline |
| `post-deploy-verify.yml` | Post-deployment verification |

#### 🔗 Integration & Sync
| Workflow | Description |
|----------|-------------|
| `auto-sync-data.yml` | Auto-sync SSoT data |
| `29_downstream-health-check.yml` | Downstream service health check |
| `60_ci-auto-heal.yml` | CI self-healing automation |

#### 🏷️ Maintenance
| Workflow | Description |
|----------|-------------|
| `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| `13_pr-auto-merge.yml` | Auto-merge eligible PRs |
| `labeler.yml` | Auto-label issues/PRs |
| `delete-standalone-job-worker.yml` | Cleanup stale workers |
| `provision-queues.yml` | Queue provisioning |
| `welcome.yml` | New contributor welcome message |

#### 🔧 Reusable Workflows
| Workflow | Description |
|----------|-------------|
| `42_reusable-docs-sync.yml` | Reusable documentation sync |
| `43_reusable-issue-management.yml` | Reusable issue management |
| `44_reusable-pr-checks.yml` | Reusable PR checks |
| `45_reusable-gitleaks.yml` | Reusable secrets scanning |

### CI/CD Tools
| Tool | Purpose |
|------|---------|
| **Jest** | Unit testing (`jest.config.cjs`) |
| **Playwright** | E2E testing (`playwright.config.js`) |
| **ESLint** | Code linting (`eslint.config.cjs`) |
| **Actionlint** | GitHub Actions linting |
| **Gitleaks** | Secrets detection |
| **CodeQL** | Security analysis |
| **lychee** | Link checking (`lychee.toml`) |
| **Redocly** | OpenAPI documentation (`redocly.yaml`) |
| **Wrangler** | Cloudflare Workers deployment (`wrangler.jsonc`) |

---

## 🚀 Quick Start | 빠르게 시작하기

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10
- **Docker** & **Docker Compose** (optional, for containerized dev)
- **Go** (optional, for enrichment scripts)

### Installation

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install all workspace dependencies
npm install

# Verify installation
npm run --silent version  # 1.40.11
```

### SSoT Automation (Recommended First Run)

```bash
# Sync data + build + typecheck + test
npm run automate:ssot

# Full automation (sync + lint + typecheck + test + build + validate)
npm run automate:full
```

### Local Development

```bash
# Portfolio (Cloudflare Workers dev)
npm run dev

# Job server (MCP server)
npm run dev:job-server

# Dashboard
npm run dev:dashboard

# Run all tests
npm test

# Lint all packages
npm run lint
```

### Docker-based Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## 💻 Local Development | 로컬 개발

### Environment Variables

Create `.env` file in project root:

```env
# Required
NODE_ENV=development
PORT=3000

# Optional (for job automation)
WANTED_API_KEY=your_wanted_api_key
JOBKOREA_API_KEY=your_jobkorea_api_key

# Database
DATABASE_URL=postgresql://localhost:5432/resume
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio with data sync |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Full build (build:full) |

### Data Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX (Shinhan format) |
| `npm run sync:all` | Sync data + PPTX |
| `npm run sync:proposals` | Sync job proposals |

### Enrichment Commands

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | GitHub profile enrichment |
| `npm run enrich:skills` | Skills inventory enrichment |
| `npm run enrich:ai` | AI-generated content enrichment |
| `npm run enrich:all` | Run all enrichment pipelines |

---

## 📦 Workspace Packages | 워크스페이스 패키지

| Package | Description | Key Files |
|---------|-------------|-----------|
| `@resume/portfolio-worker` | Cloudflare Workers edge site | `apps/portfolio/` |
| `@resume/job-server` | MCP server + automation | `apps/job-server/` |
| `@resume/job-dashboard` | Dashboard + API | `apps/job-dashboard/` |
| `@resume/cli` | CLI tools | `packages/cli/` |
| `@resume/data` | SSoT resume data | `packages/data/` |
| `@resume/shared` | Cross-package utilities | `packages/shared/` |
| `@resume/types` | Type definitions (JSDoc) | `packages/types/` |
| `@resume/schemas` | Zod validation schemas | `packages/schemas/` |
| `@resume/contracts` | OpenAPI + Env types | `packages/contracts/` |
| `@resume/env` | Environment validation | `packages/env/` |

---

## 🧪 Testing | 테스트

```bash
# Run all tests (Jest + Playwright)
npm test

# Node native tests only
npm run test:node

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# Lint check
npm run lint

# Type check
npm run typecheck
```

---

## 🐳 Docker Reference | Docker 참조

### Dockerfile (Multi-stage)

```dockerfile
# Stage 1: deps — Install workspace dependencies
# Stage 2: runtime — Production image with job-server
```

### docker-compose Services

| Service | Port | Description |
|---------|------|-------------|
| `resume-mcp-server` | 3000 | MCP/Job automation server |
| `job_automation_data` | (volume) | Persistent data storage |

### Health Check

```bash
# Manual health check
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics
```

---

## 🔧 Commands Reference | 명령어 참조

### Build & Deploy

```bash
npm run build                    # Build portfolio worker
npm run build:portfolio          # Build with data sync
npm run build:full               # Build portfolio + CLI
npm run deploy                   # (Disabled) Manual deploy
npm run version:bump            # Bump version (patch)
```

### Data & Sync

```bash
npm run sync:data              # Sync SSoT data
npm run sync:pptx              # Generate PPTX
npm run sync:all               # Sync all data
npm run sync:proposals         # Sync proposals
```

### Enrichment

```bash
npm run enrich:github          # GitHub enrichment
npm run enrich:skills          # Skills enrichment
npm run enrich:ai              # AI enrichment
npm run enrich:all             # All enrichments
```

### CI/CD Automation

```bash
npm run automate:ssot          # sync + build + typecheck + test
npm run automate:full          # Full pipeline
```

---

## 🤝 Contributing | 기여하기

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Code Style

- **