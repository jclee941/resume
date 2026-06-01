# Resume Portfolio Monorepo

> **此 README 為雙語 (한국어/English) 版本**
> **This README is bilingual (Korean/English).**

[![CI](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml)
[![Release](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)
[![Biweekly Release](https://img.shields.io/badge/Release-Biweekly-blue.svg)](https://github.com/qodo-ai/pr-agent/blob/master/CHANGELOG.md)

**Version:** 1.40.11

---

# 한국어 (Korean)

## 개요

**Resume**는 Cloudflare Worker 기반 포트폴리오 사이트, 채용 자동화 워크플로우 (Wanted/JobKorea), 단일 진실 공급원(SSoT) 이력서 데이터, 그리고 자체 호스팅 감시 인프라를 통합한 모노레포입니다.

## 주요 구성 요소

| 구성 요소 | 경로 | 설명 |
|-----------|------|------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker 기반의 엣지 최적화 포트폴리오 사이트 |
| **apps/job-server** | `apps/job-server/` | MCP 기반 채용 자동화 런타임 |
| **apps/job-dashboard** | `apps/job-dashboard/` | 대시보드 API 및 워크플로우 핸들러 |
| **packages/data** | `packages/data/` | SSoT 이력서 데이터 (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | 에러, 로거, 재시도, 서킷 브레이커, 암호화 유틸리티 |
| **packages/types** | `packages/types/` | JSDoc/TS 정규 타입 정의 (런타임 의존성 없음) |
| **packages/schemas** | `packages/schemas/` | Zod 런타임 검증 스키마 |
| **packages/cli** | `packages/cli/` | 배포, 검증, DB操作的 CLI 도구 |
| **packages/env** | `packages/env/` | 환경 검증 + 타입 세이프 시크릿 |
| **packages/contracts** | `packages/contracts/` | OpenAPI 스펙 + Cloudflare Worker Env 인터페이스 |

## 주요 기능

### 포트폴리오 및 채용 자동화

- **포트폴리오 Worker**: Cloudflare Workers로 구동되는 고성능 엣지 사이트
- **채용 자동화**: Wanted/JobKorea MCP 기반 자동 지원 시스템
- **SSoT 데이터**: `packages/data`의 정규화 이력서 데이터 관리

### 공유 인프라

- **공유 유틸리티**: 에러 처리, 재시도 로직, 서킷 브레이커, 암호화
- **타입 시스템**: 런타임 의존성 없는 JSDoc/TS 정의
- **스키마 검증**: Zod 기반 런타임 검증
- **CLI 도구**: 배포, 검증, DB操作的命令行界面

---

# English

## Overview

**Resume** is a monorepo integrating a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), Single Source of Truth (SSoT) resume data, and self-hosted observability infrastructure.

## Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-powered edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Error, logger, retry, circuit-breaker, crypto utilities |
| **packages/types** | `packages/types/` | JSDoc/TS canonical type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/cli** | `packages/cli/` | Deploy, verify, DB operation CLI tools |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized resume data management in `packages/data`

### Shared Infrastructure

- **Shared Utilities**: Error handling, retry logic, circuit breakers, cryptography
- **Type System**: JSDoc/TS definitions with zero runtime dependencies
- **Schema Validation**: Zod-based runtime validation
- **CLI Tools**: Deploy, verify, database operations command-line interface

---

# Architecture

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker portfolio site
│   ├── job-server/         # MCP job automation runtime
│   └── job-dashboard/      # Dashboard API & workflows
├── packages/
│   ├── cli/                # CLI tools (deploy, verify, db)
│   ├── contracts/          # OpenAPI spec + Worker Env interfaces
│   ├── data/               # SSoT resume data
│   ├── env/                # Environment validation
│   ├── schemas/            # Zod validation schemas
│   ├── shared/             # Cross-package utilities
│   └── types/              # Canonical type definitions
├── tools/                  # CI, build, deployment scripts
├── tests/                  # Jest, Playwright E2E
├── infrastructure/         # Cloudflare, monitoring, n8n configs
├── docs/                   # Architecture docs, ADRs
└── .github/                # GitHub Actions workflows
```

---

# Automation Inventory ( workflows & tools )

## GitHub Actions Workflows (37 total)

### PR & Merge Automation

| Workflow | File | Description |
|----------|------|-------------|
| Branch to PR | `01_branch-to-pr.yml` | Auto-create PR from branch |
| PR Checks | `03_pr-checks.yml` | Run tests, lint, typecheck on PR |
| PR Review | `10_pr-review.yml` | Automated PR review |
| PR Review (Security) | `security/11_pr-review.yml` | Security-focused PR review |
| Semantic PR | `09_semantic-pr.yml` | Enforce semantic commit format |
| Auto Merge | `13_pr-auto-merge.yml` | Auto-merge approved PRs |
| Bot Auto Fix | `14_bot-auto-fix.yml` | Auto-fix linting/code issues |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | Cleanup after PR merge |

### Dependency Management

| Workflow | File | Description |
|----------|------|-------------|
| Dependabot Auto Merge | `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| Dependency Review | `07_dependency-review.yml` | Security review of dependencies |
| Scorecard | `08_scorecard.yml` | OpenSSF scorecard analysis |

### Issue Management

| Workflow | File | Description |
|----------|------|-------------|
| Issue to Branch | `02_issue-to-branch.yml` | Create branch from issue |
| Issue Management | `18_issue-management.yml` | Issue triage and routing |
| Issue Backfill | `19_issue-backfill.yml` | Backfill issue metadata |
| Reusable Issue Management | `43_reusable-issue-management.yml` | Reusable issue workflow |

### Documentation & Release

| Workflow | File | Description |
|----------|------|-------------|
| README Gen | `20_readme-gen.yml` | Auto-generate README |
| Docs Sync | `21_docs-sync.yml` | Sync documentation |
| Reusable Docs Sync | `42_reusable-docs-sync.yml` | Reusable docs sync |
| Release Notes | `24_release-notes.yml` | Generate release notes |
| Release Publish | `25_release-publish.yml` | Publish releases |
| Release | `release.yml` | Main release workflow |

### CI/CD & Health

| Workflow | File | Description |
|----------|------|-------------|
| CI | `ci.yml` | Main CI pipeline |
| CI Auto Heal | `60_ci-auto-heal.yml` | Auto-heal failing CI |
| CI Failure Issues | `37_ci-failure-issues.yml` | Create issues for CI failures |
| Downstream Health Check | `29_downstream-health-check.yml` | Check downstream dependencies |
| Post Deploy Verify | `post-deploy-verify.yml` | Post-deployment verification |
| Labeler | `labeler.yml` | Auto-label PRs/issues |
| Auto Merge | `auto-merge.yml` | General auto-merge |
| Auto Sync Data | `auto-sync-data.yml` | Auto-sync data files |
| Delete Standalone Job Worker | `delete-standalone-job-worker.yml` | Cleanup workflow |
| Provision Queues | `provision-queues.yml` | Provision queue resources |

### Security & Compliance

| Workflow | File | Description |
|----------|------|-------------|
| Actionlint | `04_actionlint.yml` | Lint GitHub Actions |
| Gitleaks | `05_gitleaks.yml` | Scan for secrets |
| Reusable Gitleaks | `45_reusable-gitleaks.yml` | Reusable secret scanning |
| CodeQL | `06_codeql.yml` | Code quality analysis |
| Reusable PR Checks | `44_reusable-pr-checks.yml` | Reusable PR validation |

### Welcome & Onboarding

| Workflow | File | Description |
|----------|------|-------------|
| Welcome | `welcome.yml` | Welcome new contributors |

---

## README Generation Models

| Model | Provider | Notes |
|-------|----------|-------|
| **minimax-m2.7** | MiniMax | Primary model for README generation |
| **gpt-5.5** | OpenAI | Fallback via CLIProxyAPI (`cliproxy.jclee.me`) |

---

## Node.js Package Scripts (npm run)

### Data Synchronization

| Command | Description |
|---------|-------------|
| `sync:data` | Sync resume data from SSoT source |
| `sync:pptx` | Generate Shinhan PPTX presentation |
| `sync:all` | Run all sync operations (data + pptx) |
| `sync:proposals` | Sync job proposals via CLI and Go scripts |

### Data Enrichment

| Command | Description |
|---------|-------------|
| `enrich:github` | Enrich data with GitHub metrics (Go) |
| `enrich:skills` | Enrich data with skills analysis (Go) |
| `enrich:ai` | AI-based data enrichment (Go) |
| `enrich:all` | Run all enrichment scripts |

### Build & Deployment

| Command | Description |
|---------|-------------|
| `build` | Build portfolio worker |
| `build:portfolio` | Build portfolio with data sync |
| `build:full` | Full build (portfolio + CLI) |
| `build:all` | Build all packages |
| `deploy` | Manual deploy (disabled) |

### Automation

| Command | Description |
|---------|-------------|
| `automate:ssot` | Sync data → build → typecheck → test |
| `automate:full` | Full automation pipeline |

### Version Management

| Command | Description |
|---------|-------------|
| `version:bump` | Bump patch version (no git tag) |

---

## Docker Infrastructure

| Service | Image | Description |
|---------|-------|-------------|
| **mcp-server** | `resume-mcp-server` | MCP job automation server |
| Port | `3000` | Exposed port |
| Health Check | `/health` | Health endpoint |
| Volume | `job_automation_data` | Persistent data |

---

# Quick Start

## Prerequisites

- Node.js ≥ 22
- Docker & Docker Compose
- npm or yarn

## Installation

```bash
# Clone repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install dependencies
npm install

# Sync SSoT data
npm run sync:data

# Build portfolio
npm run build
```

## Running with Docker

```bash
# Build and start MCP server
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f mcp-server
```

## Local Development

```bash
# Run all tests
npm test

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build all packages
npm run build:all

# Full automation pipeline
npm run automate:full
```

---

# Commands Reference

## Workspace Commands

| Command | Workspace | Description |
|---------|-----------|-------------|
| `npm run sync:data` | root | Sync SSoT resume data |
| `npm run sync:pptx` | root | Generate PPTX |
| `npm run enrich:github` | root | GitHub enrichment |
| `npm run build` | root | Build portfolio |
| `npm run deploy` | root | Deploy (disabled) |
| `npm run test` | root | Run all tests |
| `npm run lint` | root | Lint all packages |
| `npm run typecheck` | root | Type check all packages |

## CLI Commands (packages/cli)

```bash
# Deploy
resume deploy

# Verify
resume verify

# Database operations
resume db <subcommand>
```

## Package-specific Commands

| Package | Key Scripts |
|---------|-------------|
| `packages/shared` | Retry, circuit-breaker, crypto utilities |
| `packages/types` | Type definitions (no build) |
| `packages/schemas` | Zod validation schemas |
| `packages/env` | Environment validation |
| `packages/contracts` | OpenAPI spec generation |

---

# Contribution Guide

## Workflow Overview

1. **Create Issue** → Issue triage via `18_issue-management.yml`
2. **Create Branch** → `02_issue-to-branch.yml` or manual
3. **Develop** → Write code, add tests
4. **Submit PR** → Auto-checks via `03_pr-checks.yml`
5. **Review** → `10_pr-review.yml` + human review
6. **Merge** → Auto-merge via `13_pr-auto-merge.yml`
7. **Cleanup** → `15_merged-pr-cleanup.yml`

## Commit Convention

Use semantic commits per `09_semantic-pr.yml`:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Maintenance

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# Watch mode
npm test -- --watch
```

## Security

- Secrets scanned via `05_gitleaks.yml`
- Dependencies reviewed via `07_dependency-review.yml`
- Code quality via `06_codeql.yml`
- Actions lint via `04_actionlint.yml`

---

# Links

| Resource | URL |
|----------|-----|
| Documentation | [bot.jclee.me](https://bot.jclee.me) |
| MCP Server | [cliproxy.jclee.me](https://cliproxy.jclee.me) |
| PR Agent | [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) |
| Changelog | [CHANGELOG.md](./CHANGELOG.md) |
| Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) |

---

# License

MIT License - See [LICENSE](./LICENSE)