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

### 주요 구성 요소

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
- **SSoT 데이터**: `packages/data`의 정규화된 이력서 데이터

### 공유 인프라

- **공유 유틸리티**: 에러 핸들링, 재시도 로직, 서킷 브레이커, 암호화
- **타입 시스템**: 런타임 의존성 없는 JSDoc/TS 타입 정의
- **스키마 검증**: Zod 기반 런타임 검증
- **CLI 도구**: 배포, 검증, 마이그레이션 위한 커맨드라인 인터페이스

---

# English

## Overview

**Resume** is a monorepo combining a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), a Single Source of Truth (SSoT) resume data layer, and self-hosted observability infrastructure.

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-based edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Error, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | JSDoc/TS canonical type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/cli** | `packages/cli/` | Deploy, verify, DB operation CLI tools |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized resume data in `packages/data`

### Shared Infrastructure

- **Shared Utilities**: Error handling, retry logic, circuit breakers, encryption
- **Type System**: JSDoc/TS type definitions with zero runtime dependency
- **Schema Validation**: Zod-based runtime validation
- **CLI Tools**: Command-line interface for deployment, verification, migration

---

# Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Resume Monorepo                             │
├─────────────────────────────────────────────────────────────────┤
│  Apps                                                          │
│  ├── portfolio/        → Cloudflare Worker (edge site)          │
│  ├── job-server/       → MCP runtime (job automation)          │
│  └── job-dashboard/    → Dashboard API + workflows             │
├─────────────────────────────────────────────────────────────────┤
│  Packages                                                      │
│  ├── cli/              → CLI tools (deploy, verify, db)         │
│  ├── data/             → SSoT resume data + JSON schema         │
│  ├── env/              → Environment validation + secrets       │
│  ├── schemas/          → Zod validation schemas                │
│  ├── shared/           → Utilities (errors, retry, crypto)      │
│  ├── types/            → JSDoc/TS canonical types               │
│  └── contracts/        → OpenAPI spec + Env interfaces         │
├─────────────────────────────────────────────────────────────────┤
│  Tools & Infrastructure                                         │
│  ├── tools/scripts/    → Build, deploy, sync utilities (Go/JS) │
│  ├── infrastructure/   → Cloudflare, monitoring, n8n configs   │
│  └── .github/workflows/ → GitHub Actions automation (37 files) │
└─────────────────────────────────────────────────────────────────┘
```

---

# Automation Inventory

## GitHub Actions Workflows (37 total)

### PR & Merge Automation

| Workflow | Description |
|----------|-------------|
| `01_branch-to-pr.yml` | Branch to PR conversion automation |
| `02_issue-to-branch.yml` | Issue to branch creation |
| `03_pr-checks.yml` | PR validation checks |
| `09_semantic-pr.yml` | Semantic PR title enforcement |
| `10_pr-review.yml` | PR review automation |
| `11_pr-review.yml` (security/) | Security-focused PR review |
| `12_dependabot-auto-merge.yml` | Dependabot PR auto-merge |
| `13_pr-auto-merge.yml` | General PR auto-merge |
| `14_bot-auto-fix.yml` | Bot-triggered auto-fixes |
| `15_merged-pr-cleanup.yml` | Post-merge cleanup |

### Release & Version Management

| Workflow | Description |
|----------|-------------|
| `24_release-notes.yml` | Automated release notes generation |
| `25_release-publish.yml` | Release publishing workflow |
| `release.yml` | Main release workflow |

### Documentation & Sync

| Workflow | Description |
|----------|-------------|
| `20_readme-gen.yml` | README generation |
| `21_docs-sync.yml` | Documentation synchronization |
| `42_reusable-docs-sync.yml` | Reusable docs sync workflow |
| `auto-sync-data.yml` | Data synchronization automation |

### Security & Compliance

| Workflow | Description |
|----------|-------------|
| `04_actionlint.yml` | GitHub Actions linting |
| `05_gitleaks.yml` | Secrets scanning |
| `06_codeql.yml` | CodeQL security analysis |
| `07_dependency-review.yml` | Dependency vulnerability review |
| `08_scorecard.yml` | Security scorecard |
| `45_reusable-gitleaks.yml` | Reusable secrets scan workflow |

### Issue Management

| Workflow | Description |
|----------|-------------|
| `18_issue-management.yml` | Issue automation |
| `19_issue-backfill.yml` | Issue backfill process |
| `37_ci-failure-issues.yml` | CI failure issue creation |
| `43_reusable-issue-management.yml` | Reusable issue management |

### CI/CD & Health

| Workflow | Description |
|----------|-------------|
| `ci.yml` | Main CI workflow |
| `29_downstream-health-check.yml` | Downstream dependency health |
| `60_ci-auto-heal.yml` | CI self-healing automation |
| `auto-merge.yml` | Auto-merge orchestration |
| `post-deploy-verify.yml` | Post-deployment verification |
| `labeler.yml` | PR/issue label automation |
| `welcome.yml` | New contributor welcome |

### Infrastructure & Workers

| Workflow | Description |
|----------|-------------|
| `delete-standalone-job-worker.yml` | Standalone worker cleanup |
| `provision-queues.yml` | Queue provisioning |

### Reusable Workflows (Shared)

| Workflow | Description |
|----------|-------------|
| `44_reusable-pr-checks.yml` | Reusable PR checks |
| `42_reusable-docs-sync.yml` | Reusable documentation sync |
| `43_reusable-issue-management.yml` | Reusable issue management |
| `45_reusable-gitleaks.yml` | Reusable secrets scanning |

## Build & Sync Scripts (Node.js)

| Script | Description |
|--------|-------------|
| `sync:data` | Synchronize resume data from SSoT |
| `sync:pptx` | Generate Shinhan PPTX presentations |
| `sync:all` | Run all sync operations |
| `sync:proposals` | Sync proposal reviews |
| `enrich:github` | GitHub data enrichment (Go) |
| `enrich:skills` | Skills data enrichment (Go) |
| `enrich:ai` | AI-based data enrichment (Go) |
| `enrich:all` | Run all enrichment scripts |
| `automate:ssot` | SSoT automation (sync, build, typecheck, test) |
| `automate:full` | Full automation pipeline |

## CLI Commands (`packages/cli`)

| Command | Description |
|---------|-------------|
| `resume deploy` | Deploy to Cloudflare Workers |
| `resume verify` | Verify deployment integrity |
| `resume db` | Database operations |

---

# Quick Start

## Prerequisites

- Node.js ≥ 22
- npm ≥ 10
- Docker & Docker Compose (for local MCP server)
- Go ≥ 1.21 (for enrichment scripts)

## Installation

```bash
# Clone the repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install workspace dependencies
npm install

# Build all packages
npm run build
```

## Local Development

### Portfolio Worker

```bash
# Navigate to portfolio app
cd apps/portfolio

# Development with watch mode
npm run dev

# Build for production
npm run build
```

### Job Server (MCP Runtime)

```bash
# Using Docker Compose
docker-compose up -d

# Or run directly
cd apps/job-server
npm run dev
```

### Job Dashboard

```bash
cd apps/job-dashboard
npm run dev
```

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:node

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e
```

---

# Commands Reference

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build portfolio worker with data sync |
| `npm run build:portfolio` | Build portfolio specifically |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Full build of all packages |

## Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX presentations |
| `npm run sync:all` | Run all sync operations |
| `npm run sync:proposals` | Sync proposal reviews |
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Skills data enrichment |
| `npm run enrich:ai` | AI data enrichment |
| `npm run enrich:all` | Run all enrichments |

## Automation Commands

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | SSoT automation (sync, build, typecheck, test) |
| `npm run automate:full` | Full automation pipeline |

## Deployment Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to Cloudflare (disabled - use CI) |

## Other Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run strip-exif` | Remove EXIF data from images |
| `npm run version:bump` | Bump version (patch) |

---

# Contribution Guide

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### 1. Make Changes

```bash
# Create your branch from master
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"
```

### 2. Run Checks Locally

```bash
# Run all validation
npm run lint
npm run typecheck
npm run test:node
```

### 3. Push and Create PR

```bash
git push origin feature/my-feature
```

The CI pipeline will automatically:
- Run linting and type checks
- Execute unit and integration tests
- Perform security scanning (Gitleaks, CodeQL)
- Validate dependency updates

## Code Style

- Use ESLint for JavaScript/TypeScript
- Follow existing patterns in each package
- Write tests for new functionality
- Update documentation as needed

## Commit Convention

This project uses semantic PR titles. Please use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance tasks

## Pull Request Process

1. Ensure all CI checks pass
2. Update CHANGELOG.md if applicable
3. Request review from maintainers
4. Once approved, the auto-merge workflow will handle integration

## Reporting Issues

Use issue templates for:
- Bug reports
- Feature requests
- Documentation improvements

---

# License

MIT License - see [LICENSE](LICENSE) file for details.

---

# Maintainers

See [OWNERS](OWNERS) file for list of maintainers.

---

# Links

- **Documentation**: [docs/](docs/)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Agents Guide**: [AGENTS.md](AGENTS.md)