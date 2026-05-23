<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the provided information:

1. **Project Type**: A monorepo for a DevSecOps/SRE engineer's resume portfolio
2. **Key Components**:
   - Cloudflare Workers portfolio site
   - Job automation (Wanted/JobKorea)
   - SSoT (Single Source of Truth) data
   - Self-hosted observability
   - n8n workflows

3. **Structure**: npm workspaces with multiple apps and packages
   - apps/portfolio, apps/job-server, apps/job-dashboard
   - packages/cli, data, shared, types, schemas, contracts, env

4. **Workflow Files** (34 total): Various GitHub Actions workflows for CI/CD, PR management, releases, etc.

5. **No Go automation tools** - but the package.json references Go scripts

6. **Docker setup**: Dockerfile and docker-compose.yml for job-server/mcp-server

7. **Current models**: minimax-m2.7 and gpt-5.5 via CLIProxyAPI

I need to generate a bilingual (Korean/English) README.md with:
- Title
- Badges
- Overview
- Features
- Architecture
- Automation inventory (workflows + tools)
- Quick start
- Local development
- Commands reference
- Contribution guide

Let me structure this comprehensively based on the provided data.
</think>

# README.md

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

<div align="center">

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-cyan)](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
[![DeepSource](https://img.shields.io/badge/DeepSource-.enabled-2F4F4F?logo=deepsource&logoColor=white)](https://deepsource.io)
[![Snyk](https://img.shields.io/badge/Snyk-monitored-4E47F0?logo=snyk&logoColor=white)](https://snyk.io)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

</div>

---

## Overview / 개요

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

**A monorepo for a DevSecOps/SRE engineer's resume — a multi-output system derived from a Single Source of Truth (SSoT) resume data.**

```text
                    ┌──────────────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └─────────────────────┬────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
           ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
           │  Edge Portfolio │   │  Job Automation │   │  Profile Sync   │
           │  (CF Workers)   │   │  (n8n/orchest.) │   │ (Wanted CV +    │
           └─────────────────┘   └─────────────────┘   │  Social Sync)   │
                                                      └─────────────────┘
```

---

## Features / 주요 기능

| 기능 Feature | 설명 Description |
|-------------|------------------|
| **Edge Portfolio** | Cloudflare Workers 기반 다국어 포트폴리오 사이트 (KO/EN/JA) |
| **Job Automation** | Wanted, JobKorea 등 구직 플랫폼 자동화 (n8n 오케스트레이션) |
| **SSoT Data** | JSON 기반 단일 진실원 이력서 데이터 |
| **Profile Sync** | Wanted CV, 소셜 미디어 프로필 자동 동기화 |
| **Observability** | 셀프호스팅 모니터링 및 알리미 (n8n workflows) |
| **MCP Server** | Model Context Protocol 기반 job automation runtime |
| **CLI Tools** | 커맨드라인 이력서 관리 및 동기화 도구 |

---

## Architecture / 아키텍처

### Workspace Structure / 워크스페이스 구조

```
resume/
├── apps/
│   ├── portfolio/        # Cloudflare Worker + edge bundle
│   ├── job-server/       # MCP/job automation runtime
│   └── job-dashboard/    # Dashboard worker + workflows
├── packages/
│   ├── cli/              # Resume CLI tools
│   ├── data/             # SSoT resumes + JSON schema
│   ├── env/              # Environment validation + type-safe secrets
│   ├── types/            # Canonical JSDoc/TS types (zero runtime deps)
│   ├── schemas/          # Runtime Zod validation schemas
│   ├── shared/           # Cross-package utilities
│   └── contracts/        # OpenAPI spec + Worker Env interface
├── tools/
│   ├── scripts/          # CI, build, deployment, verification
│   │   ├── enrichment/   # GitHub, skills, AI enrichment (Go)
│   │   ├── sync/         # Data sync scripts (Go)
│   │   └── build/        # Build utilities (Python)
│   └── ci/               # CI validation scripts (Go)
├── tests/
│   ├── unit/             # Jest unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # Playwright E2E tests
├── infrastructure/
│   ├── n8n/              # n8n workflows + binaries
│   └── monitoring/       # Grafana, alerting configs
├── docs/                 # ADRs, architecture, guides, security
└── .github/
    └── workflows/        # 34 GitHub Actions workflows
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers, Node.js 22+ |
| Language | TypeScript 5, Go 1.21+ |
| Package Manager | npm workspaces |
| Validation | Zod (runtime), TypeScript (compile-time) |
| Orchestration | n8n |
| CI/CD | GitHub Actions |
| Container | Docker, docker-compose |
| Observability | Prometheus, Grafana, n8n |

---

## Automation Inventory / 자동화 인벤토리

### GitHub Actions Workflows (34 Total)

#### Pull Request & Branch Automation

| Workflow | File | Description |
|----------|------|-------------|
| Branch to PR | `01_branch-to-pr.yml` | Auto-create PR from branch |
| Issue to Branch | `02_issue-to-branch.yml` | Create branch from issue |
| PR Checks | `03_pr-checks.yml` | Run tests, lint, build on PR |
| Actionlint | `04_actionlint.yml` | Lint GitHub Actions YAML |
| PR Auto Merge | `13_pr-auto-merge.yml` | Auto-merge when conditions met |
| Bot Auto Fix | `14_bot-auto-fix.yml` | Auto-fix linting/formating issues |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | Cleanup after PR merge |

#### Security & Code Quality

| Workflow | File | Description |
|----------|------|-------------|
| Gitleaks | `05_gitleaks.yml` | Detect secrets in code |
| CodeQL | `06_codeql.yml` | GitHub code scanning |
| Dependency Review | `07_dependency-review.yml` | Review dependency changes |
| Scorecard | `08_scorecard.yml` | OpenSSF security scorecard |
| Semantic PR | `09_semantic-pr.yml` | Enforce semantic commit messages |

#### Code Review & Issue Management

| Workflow | File | Description |
|----------|------|-------------|
| PR Review | `10_pr-review.yml` | Auto-request reviews |
| Issue Management | `18_issue-management.yml` | Manage issue lifecycle |
| Issue Backfill | `19_issue-backfill.yml` | Backfill issues from commits |
| Issue Creation | `37_ci-failure-issues.yml` | Create issues from CI failures |

#### Release & Documentation

| Workflow | File | Description |
|----------|------|-------------|
| Release Notes | `24_release-notes.yml` | Generate release notes |
| Release Publish | `25_release-publish.yml` | Publish release artifacts |
| README Gen | `20_readme-gen.yml` | Auto-generate README |
| Docs Sync | `21_docs-sync.yml` | Sync documentation |
| Reusable Docs Sync | `42_reusable-docs-sync.yml` | Reusable doc sync workflow |

#### Dependency Management

| Workflow | File | Description |
|----------|------|-------------|
| Dependabot Auto Merge | `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| Auto Merge | `auto-merge.yml` | Generic auto-merge workflow |

#### Deployment & Health Check

| Workflow | File | Description |
|----------|------|-------------|
| CI | `ci.yml` | Main CI pipeline |
| Downstream Health Check | `29_downstream-health-check.yml` | Check downstream services |
| Cloudflare Auto Deploy | `CLOUDFLARE_GITHUB_AUTO_DEPLOY.md` | Auto-deploy to Cloudflare |
| Provision Queues | `provision-queues.yml` | Provision queue resources |
| Delete Standalone Worker | `delete-standalone-job-worker.yml` | Clean up worker deployments |

#### Utility Workflows

| Workflow | File | Description |
|----------|------|-------------|
| Welcome | `welcome.yml` | Welcome message for contributors |
| Labeler | `labeler.yml` | Auto-label issues/PRs |
| Auto Sync Data | `auto-sync-data.yml` | Sync data from external sources |
| CI Auto Heal | `60_ci-auto-heal.yml` | Auto-heal CI failures |
| Reusable Issue Management | `43_reusable-issue-management.yml` | Reusable issue workflow |
| Reusable PR Checks | `44_reusable-pr-checks.yml` | Reusable PR check workflow |

### CLI Proxy Models

| Model | Provider | Use Case |
|-------|----------|----------|
| `minimax-m2.7` | MiniMax | CLI proxy automation |
| `gpt-5.5` | OpenAI | CLI proxy automation |

### Go Automation Tools

> **Note:** This project uses Go for automation scripts but **no standalone Go binaries** are published as separate tools. All Go code is executed via `go run`.

| Script | Path | Purpose |
|--------|------|---------|
| `sync-resume-data.js` | `tools/scripts/utils/` | Data synchronization |
| `apply-proposals.go` | `tools/scripts/sync/` | Apply proposals |
| `enrichment/github` | `tools/scripts/enrichment/` | GitHub data enrichment |
| `enrichment/skills` | `tools/scripts/enrichment/` | Skills enrichment |
| `enrichment/ai` | `tools/scripts/enrichment/` | AI-based enrichment |
| `validate-cloudflare-native.go` | `tools/ci/` | Cloudflare validation |
| `generate_shinhan_pptx.py` | `tools/scripts/build/` | PPTX generation |

### npm Scripts

#### Core Automation

| Script | Description |
|--------|-------------|
| `automate:ssot` | Sync data + build + typecheck + test |
| `automate:full` | Full automation: sync + lint + typecheck + test + build + validate |
| `sync:data` | Sync resume data from SSoT |
| `sync:all` | Sync all data sources |
| `sync:pptx` | Generate PPTX presentation |
| `enrich:all` | Run all enrichment scripts |

#### Build & Deploy

| Script | Description |
|--------|-------------|
| `build` | Generate `worker.js` from templates |
| `build:full` | Build portfolio + CLI |
| `deploy` | Manual deploy (disabled — use git push) |
| `version:bump` | Bump version patch |

#### Development

| Script | Description |
|--------|-------------|
| `dev` | Start Miniflare local dev |
| `lint` | Run ESLint |
| `typecheck` | Run TypeScript type checking |
| `test` | Run all tests |
| `test:node` | Run Node.js tests |

#### Package-specific

| Script | Description |
|--------|-------------|
| `cli:build` | Build CLI tools |
| `strip-exif` | Strip EXIF data from images |
| `sync:proposals` | Sync proposal reviews |
| `enrich:github` | Enrich GitHub data |
| `enrich:skills` | Enrich skills data |
| `enrich:ai` | AI-based enrichment |

---

## Quick Start / 빠른 시작

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10 (with workspaces support)
- **Docker** & **docker-compose** (for MCP server)
- **Go** ≥ 1.21 (for Go-based tools)
- **Python** ≥ 3.9 (for PPTX generation)

### Installation

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install
```

### Run Full Automation

```bash
# SSoT automation: sync + build + typecheck + test
npm run automate:ssot

# Full automation: sync + lint + typecheck + test + build + validate
npm run automate:full
```

### Local Development

```bash
# Start all services
npm run dev

# Or use Docker Compose for MCP server
docker-compose up --build

# Run specific test suite
npm test                    # All tests
npm run test:node          # Node.js tests only
npx playwright test        # E2E tests
```

---

## Local Development / 로컬 개발

### Development Servers

```bash
# Portfolio (Miniflare)
npm run dev

# Job server (MCP)
node apps/job-server/src/server/index.js

# Dashboard
npm run dev --workspace=apps/job-dashboard
```

### Docker Services

```bash
# Start MCP server
docker-compose up --build

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

### Environment Variables

Create `.env` file based on `.env.example`:

```bash
# Required
CLOUDFLARE_API_TOKEN=your_token
WANTED_CLIENT_ID=your_id
WANTED_CLIENT_SECRET=your_secret

# Optional
NODE_ENV=development
PORT=3000
```

### Code Quality

```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Format
npm run format
```

---

## Commands Reference / 명령어 참조

### Build Commands

| Command | Workspace | Description |
|---------|-----------|-------------|
| `npm run build` | root | Generate `worker.js` from templates |
| `npm run build:portfolio` | apps/portfolio | Build portfolio worker |
| `npm run build:full` | root | Build portfolio + CLI |
| `npm run build:all` | root | Build all packages |

### Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync from SSoT JSON |
| `npm run sync:pptx` | Generate PPTX |
| `npm run sync:all` | Sync all data sources |
| `npm run sync:proposals` | Sync proposal reviews |
| `npm run enrich:github` | Enrich GitHub data |
| `npm run enrich:skills` | Enrich skills data |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | Run all enrichments |

### Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:node` | Node.js unit tests |
| `npx playwright test` | E2E tests |
| `npm run test:e2e` | E2E test runner |

### Deployment Commands

> ⚠️ **Manual deploy is disabled.** Use `git push to master` for Cloudflare Workers auto-deploy.

```bash
# Disabled - use git push instead
npm run deploy

# Version bump (patch)
npm run version:bump
```

---

## Contribution Guide / 기여 가이드

### Workflow

1. **Create issue** describing the change
2. **Create branch** from issue (`02_issue-to-branch.yml`)
3. **Make changes** with tests
4. **Submit PR** (`01_branch-to-branch.yml`)
5. **Pass checks** (`03_pr-checks.yml`)
6. **Merge** after approval

### Commit Convention

This project uses **Semantic PR** with enforced commit messages:

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scopes: portfolio, job-server, cli, data, shared, types, etc.
```

Examples:
- `feat(portfolio): add dark mode support`
- `fix(job-server): correct Wanted API rate limit`
- `docs(types): update Resume type JSDoc`

### Pull Request Checklist

- [ ] Tests pass (`03_pr-checks.yml`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] No secrets detected (`05_gitleaks.yml`)
- [ ] Security scan passes (`06_codeql.yml`)
- [ ] Semantic commit format (`09_semantic-pr.yml`)

### Code Style

See [docs/CODE_STYLE.md](./docs/CODE