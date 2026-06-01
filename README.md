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
- **대시보드 API**: 워크플로우 핸들러 및 채용 관리 API

### 공유 인프라

- **공유 패키지**: 타입 세이프 스키마, 재시도/서킷 브레이커, 암호화 유틸리티
- **CLI 도구**: 배포, 검증, DB 명령어 지원
- **계약/스키마**: OpenAPI 스펙, Zod 검증, TypeScript 타입

## 아키텍처

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker 포트폴리오 사이트
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # dashboard worker + workflows
├── packages/
│   ├── cli/                # resume CLI (deploy, verify, db)
│   ├── env/                # 환경 검증 + 타입 세이프 시크릿
│   ├── data/               # SSoT 이력서 및 JSON 스키마
│   ├── shared/             # cross-package utilities
│   │   ├── errors/         # 커스텀 에러 클래스
│   │   ├── retry/         # 재시도 로직 + 서킷 브레이커
│   │   └── crypto/        # Node.js + WebCrypto 암호화
│   ├── types/              # JSDoc/TS 정규 타입 정의
│   ├── schemas/            # Zod 런타임 검증 스키마
│   └── contracts/           # OpenAPI 스펙 + Env 인터페이스
├── tools/                   # CI, build, deploy, verification scripts (Go + JS)
├── tests/                   # Jest, integration, Playwright E2E
├── infrastructure/          # Cloudflare, monitoring, n8n, DB config
├── docs/                    # guides, ADRs, architecture, conventions, security
├── supabase/               # Supabase edge functions
└── .github/                # CI/release/maintenance control plane
```

---

# English

## Overview

**Resume** is a monorepo integrating a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), a Single Source of Truth (SSoT) resume data system, and self-hosted observability infrastructure.

### Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-powered edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Errors, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | Canonical JSDoc/TS type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/cli** | `packages/cli/` | Deploy, verify, DB operational CLI tools |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized resume data in `packages/data`
- **Dashboard API**: Workflow handlers and recruitment management API

### Shared Infrastructure

- **Shared Packages**: Type-safe schemas, retry/circuit breaker, encryption utilities
- **CLI Tools**: Deploy, verify, and database commands
- **Contracts/Schemas**: OpenAPI specs, Zod validation, TypeScript types

## Architecture

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker portfolio site
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # dashboard worker + workflows
├── packages/
│   ├── cli/                # resume CLI (deploy, verify, db)
│   ├── env/                # environment validation + type-safe secrets
│   ├── data/               # SSoT resumes and JSON schema
│   ├── shared/             # cross-package utilities
│   │   ├── errors/         # custom error classes
│   │   ├── retry/          # retry logic + circuit breaker
│   │   └── crypto/        # Node.js + WebCrypto encryption
│   ├── types/              # canonical JSDoc/TS type definitions
│   ├── schemas/            # Zod runtime validation schemas
│   └── contracts/          # OpenAPI spec + Env interface
├── tools/                  # CI, build, deploy, verification scripts (Go + JS)
├── tests/                  # Jest, integration, Playwright E2E
├── infrastructure/         # Cloudflare, monitoring, n8n, DB config
├── docs/                   # guides, ADRs, architecture, conventions, security
├── supabase/              # Supabase edge functions
└── .github/               # CI/release/maintenance control plane
```

---

# Automation Inventory

## GitHub Actions Workflows

### Pull Request & Code Quality (12 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| PR Checks | `44_reusable-pr-checks.yml` | Reusable workflow for PR validation (lint, typecheck, test) |
| Gitleaks | `45_reusable-gitleaks.yml` | Secret scanning in reusable format |
| Actionlint | `04_actionlint.yml` | GitHub Actions YAML linting |
| CodeQL | `06_codeql.yml` | CodeQL security analysis |
| Dependency Review | `07_dependency-review.yml` | Dependency vulnerability scanning |
| Scorecard | `08_scorecard.yml` | OpenSSF security scorecard |
| Semantic PR | `09_semantic-pr.yml` | Enforce semantic PR title convention |
| PR Review | `10_pr-review.yml`, `security/11_pr-review.yml` | Automated PR review using AI |
| Bot Auto Fix | `14_bot-auto-fix.yml` | Auto-fix linter/formatter issues |
| CI Auto Heal | `60_ci-auto-heal.yml` | Automatic CI failure recovery |

### Merge & Release Automation (6 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| Auto Merge | `auto-merge.yml`, `13_pr-auto-merge.yml` | Automatic PR merge on approval |
| Dependabot Auto Merge | `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | Post-merge cleanup (branch, labels) |
| Release | `release.yml` | Release pipeline with changelog |
| Release Notes | `24_release-notes.yml` | Auto-generate release notes |
| Release Publish | `25_release-publish.yml` | Publish release artifacts |

### Issue Management (4 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| Issue Management | `43_reusable-issue-management.yml` | Reusable issue management workflow |
| Issue to Branch | `02_issue-to-branch.yml` | Create branch from issue |
| Issue Backfill | `19_issue-backfill.yml` | Sync/backfill issues |
| CI Failure Issues | `37_ci-failure-issues.yml` | Create issues from CI failures |

### Documentation (2 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| README Gen | `20_readme-gen.yml` | Auto-generate README updates |
| Docs Sync | `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | Synchronize documentation |

### Branch & Sync Automation (5 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| Branch to PR | `01_branch-to-pr.yml` | Auto-create PR from branch |
| Auto Sync Data | `auto-sync-data.yml` | Sync resume data automatically |
| Downstream Health Check | `29_downstream-health-check.yml` | Check downstream service health |
| Provision Queues | `provision-queues.yml` | Provision message queues |
| Delete Standalone Worker | `delete-standalone-job-worker.yml` | Cleanup standalone workers |

### Deployment & Verification (5 workflows)

| Workflow | File | Description |
|----------|------|-------------|
| CI | `ci.yml` | Main continuous integration pipeline |
| Labeler | `labeler.yml` | Auto-label PRs/issues |
| Post Deploy Verify | `post-deploy-verify.yml` | Post-deployment smoke testing |
| Welcome | `welcome.yml` | Welcome message for contributors |

### Core Workflows

| Workflow | File | Description |
|----------|------|-------------|
| Semantic PR | `09_semantic-pr.yml` | Validates PR titles follow conventional commits |
| Gitleaks | `05_gitleaks.yml` | Scans for leaked secrets |
| Branch to PR | `01_branch-to-pr.yml` | Converts branches to PRs automatically |

---

# Quick Start

## Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10
- **Docker** & **Docker Compose** (for local runtime)
- **Go** ≥ 1.21 (for Go-based tools)

## Installation

```bash
# Clone the repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install all workspace dependencies
npm ci
```

## Development

```bash
# Start local development server (portfolio + job-server)
npm run dev

# Or start job-server via Docker
docker compose up -d

# Run all tests
npm test

# Type check all packages
npm run typecheck
```

---

# Local Development

## Docker Runtime

```bash
# Build and start the MCP server container
docker compose up -d

# View logs
docker compose logs -f mcp-server

# Stop services
docker compose down
```

## Manual Build

```bash
# Build portfolio worker
npm run build:portfolio

# Build CLI tools
npm run cli:build

# Full build (data sync + portfolio + CLI)
npm run build:full
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your configuration
```

Key environment variables:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Runtime environment (`development`, `production`) |
| `PORT` | Server port (default: `3000`) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for deployment |
| `WANTED_API_KEY` | Wanted API authentication |
| `DATABASE_URL` | PostgreSQL connection string |

---

# Commands Reference

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build portfolio worker with data sync |
| `npm run build:portfolio` | Build portfolio worker only |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Full build (portfolio + CLI) |

## Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX presentations |
| `npm run sync:all` | Sync data + PPTX |
| `npm run sync:proposals` | Sync job proposals |

## Enrichment Commands

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | Enrich data with GitHub metrics |
| `npm run enrich:skills` | Enrich with skills data |
| `npm run enrich:ai` | AI-powered enrichment |
| `npm run enrich:all` | Run all enrichment jobs |

## Automation Commands

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | Sync + build + typecheck + test |
| `npm run automate:full` | Full automation pipeline |

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:node` | Node.js environment tests |
| `npm run test:e2e` | Playwright E2E tests |

## Deployment Commands (CLI)

```bash
# Deploy portfolio
resume deploy

# Verify deployment
resume verify

# Database operations
resume db:migrate
resume db:seed
```

---

# Contribution Guide

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/pr-agent.git
   cd pr-agent
   ```

3. **Create a branch** from an issue:

   ```bash
   git checkout -b issue/123-description
   ```

4. **Install dependencies**:

   ```bash
   npm ci
   ```

## Workflow

1. Make your changes
2. Run validation:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

3. Commit using **conventional commits**:

   ```bash
   git commit -m "fix: resolve issue with job sync"
   ```

4. Push and create a PR

## PR Requirements

- ✅ Follows conventional commit format
- ✅ Passes all CI checks
- ✅ Has appropriate labels
- ✅ Linked to an issue

## Code Style

- **ESLint** configuration provided (`.eslint.config.cjs`)
- **Prettier** for code formatting
- **TypeScript** with JSDoc comments for types

## Documentation

- Update `AGENTS.md` files when changing package logic
- Keep `CHANGELOG.md` updated for significant changes
- Synchronize docs with `npm run sync:docs`

---

# License

MIT License - see [LICENSE](LICENSE) file for details.

---

# Support

- **Documentation**: [docs/](docs/)
- **Issue Tracker**: [GitHub Issues](https://github.com/qodo-ai/pr-agent/issues)
- **Workflows**: [.github/workflows/](.github/workflows/)

```

---

**Generated:** 2026-04-29 | **Commit:** `e02e53d` | **Branch:** `master`