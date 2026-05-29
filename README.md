<think>
The user wants me to generate a comprehensive README.md for a repository. Let me analyze what I have:

1. **Project Structure** - A monorepo with:
   - `apps/portfolio/` - Cloudflare Worker portfolio
   - `apps/job-server/` - Job automation runtime
   - `apps/job-dashboard/` - Dashboard
   - `packages/cli/`, `packages/env/`, `packages/data/`, `packages/shared/`, `packages/types/`, `packages/schemas/`, `packages/contracts/`
   - `tools/` - CI, build, deploy scripts
   - `.github/workflows/` - 35+ GitHub Actions workflows

2. **Workflow Files** (35 total) - Various GitHub Actions for:
   - PR/branch management (01_branch-to-pr.yml, 02_issue-to-branch.yml, etc.)
   - Security (05_gitleaks.yml, 06_codeql.yml)
   - Dependency management (07_dependency-review.yml, 12_dependabot-auto-merge.yml)
   - Release automation (24_release-notes.yml, 25_release-publish.yml)
   - Health checks (29_downstream-health-check.yml)
   - CI healing (60_ci-auto-heal.yml)
   - And many more

3. **Existing README.md** - Already has some content with Korean/English bilingual sections

4. **package.json** - Shows:
   - Name: "resume"
   - Version: 1.40.11
   - Description: Resume portfolio monorepo
   - Workspaces for multiple packages
   - Various scripts for building, testing, syncing data

5. **Dockerfile** - Multi-stage build for job-server runtime

6. **docker-compose.yml** - Container setup for mcp-server

7. **AGENTS.md** - Project knowledge base with structure overview

I need to generate a comprehensive bilingual README.md in Korean and English that includes:
- Title with badges


- Project overview
- Key features
- Architecture diagram
- Complete automation inventory with all 35 workflow names and their purposes
- Quick start guide
- Local development setup
- Commands reference
- Contribution guidelines

From the provided data, I can see the available workflows include branching automation (01-03), security scanning (04-08), PR management (09-15), issue handling (18-21), documentation (20-21), releases (24-25), downstream monitoring (29), auto-healing (60), and sync utilities (auto-sync-data, provision-queues, release). I should organize these by category and describe what each workflow automates.

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
[![MonoRepo](https://img.shields.io/badge/monorepo-npm%20workspaces-60b488?logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
[![Test](https://github.com/jclee941/resume/actions/workflows/03_pr-checks.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/03_pr-checks.yml)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

</div>

---

## Overview / 개요

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

> **English:** This repository is a monorepo for a DevSecOps/SRE engineer's resume automation system. It generates multiple artifacts (portfolio, job automation, profile sync) from a single source of truth.

```text
                    ┌─────────────────────────────────────┐
                    │  packages/data/resumes/master/       │
                    │           resume_data.json           │  ← Single Source of Truth (SSoT)
                    └────────────┬────────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
   │  (CF Workers)   │  │  (job-server)   │  │ (Wanted CV +    │
   │  3 locales      │  │  MCP runtime    │  │   Social)       │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Features / 주요 기능

| 기능 / Feature | 설명 / Description |
|----------------|-------------------|
| **Cloudflare Workers Edge** | 3개 언어(KO/EN/JA) 포트폴리오,，全球 CDN 배포 |
| **Job Automation Pipeline** | Wanted/JobKorea 크롤링, 자동 지원, 제안서 검토 |
| **MCP Server Runtime** | Model Context Protocol 기반 구직 자동화 서버 |
| **SSoT Data Architecture** | `resume_data.json` 단일 소스, 모든 산출물 파생 |
| **Self-hosted Observability** | Prometheus metrics, Grafana dashboard, health endpoints |
| **CI/CD Automation** | 35개 GitHub Actions 워크플로우로 fully automated |
| **Type-safe Validation** | Zod schemas + JSDoc/TS types 이중 검증 |
| **Container Ready** | Docker multi-stage build, docker-compose 지원 |

---

## Architecture / 아키텍처

```
apps/
├── portfolio/         # Cloudflare Worker edge portfolio (KR/EN/JA)
├── job-server/        # MCP server + job automation runtime
├── job-dashboard/     # Dashboard API + workflows
packages/
├── cli/              # Resume CLI tool (@resume/cli)
├── env/              # Environment validation + type-safe secrets
├── data/             # SSoT resumes + JSON schemas
├── shared/           # Cross-package utilities (retry, crypto, auth, client)
├── types/            # Canonical JSDoc/TS types (zero deps)
├── schemas/          # Runtime Zod validation schemas
└── contracts/        # OpenAPI spec + Cloudflare Worker Env interface
tools/
├── ci/               # Build, deploy, verification scripts (Go + JS)
├── scripts/          # Sync, enrichment, generation utilities
tests/
├── unit/             # Jest unit tests
├── integration/      # Integration tests
└── e2e/              # Playwright E2E tests
.github/workflows/    # 35 GitHub Actions workflows
```

---

## Automation Inventory / 자동화 목록

### GitHub Actions Workflows (35 총 / Total)

#### Pull Request & Branch Automation

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Branch to PR | `01_branch-to-pr.yml` | 브랜치 생성 시 자동 PR 오픈 |
| Issue to Branch | `02_issue-to-branch.yml` | 이슈 기반 토픽 브랜치 생성 |
| PR Checks | `03_pr-checks.yml` | PR 검증 파이프라인 (lint/test/typecheck) |
| PR Review | `10_pr-review.yml` | 자동 PR 리뷰 요청 |
| PR Auto Merge | `13_pr-auto-merge.yml` | 조건 충족 시 자동 머지 |
| Bot Auto Fix | `14_bot-auto-fix.yml` | 자동 lint 수정 |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | 머지 후 브랜치 정리 |
| Semantic PR | `09_semantic-pr.yml` | Conventional commits 검증 |
| Auto Merge | `auto-merge.yml` | Dependabot/auto-merge 처리 |
| Labeler | `labeler.yml` | 자동 라벨링 |

#### Security & Compliance

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Actionlint | `04_actionlint.yml` | GitHub Actions YAML lint |
| Gitleaks | `05_gitleaks.yml` | Secrets/gitleaks 스캔 |
| CodeQL | `06_codeql.yml` | 정적 분석 |
| Dependency Review | `07_dependency-review.yml` | 의존성 보안 검토 |
| Scorecard | `08_scorecard.yml` | OpenSSF 보안 점수 |
| Labeler | `labeler.yml` | 보안 관련 라벨링 |

#### Dependency Management

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Dependabot Auto Merge | `12_dependabot-auto-merge.yml` | Dependabot PR 자동 머지 |
| Dependency Review | `07_dependency-review.yml` | 의존성 보안 검토 |

#### Release & Version Management

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Release Notes | `24_release-notes.yml` | 자동 릴리스 노트 생성 |
| Release Publish | `25_release-publish.yml` | 릴리스 게시 파이프라인 |
| Release | `release.yml` |Releases workflowtrigger |
| Version Bump | — | `npm run version:bump` (script) |

#### Documentation Automation

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| README Gen | `20_readme-gen.yml` | README 자동 생성 |
| Docs Sync | `21_docs-sync.yml` | 문서 동기화 |
| Reusable Docs Sync | `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |

#### Issue Management

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Issue Management | `18_issue-management.yml` | 이슈 자동 관리 |
| Issue Backfill | `19_issue-backfill.yml` | 이슈 백필/정리 |
| Reusable Issue Management | `43_reusable-issue-management.yml` | 재사용 가능한 이슈 관리 |
| CI Failure Issues | `37_ci-failure-issues.yml` | CI 실패 시 자동 이슈 생성 |
| Welcome | `welcome.yml` | 신규 기여자 환영 |

#### Health & Monitoring

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Downstream Health Check | `29_downstream-health-check.yml` | 하위 서비스 상태 확인 |
| CI Auto Heal | `60_ci-auto-heal.yml` | CI 실패 자동 복구 |
| Post Deploy Verify | `post-deploy-verify.yml` | 배포 후 검증 |
| Provision Queues | `provision-queues.yml` | 큐 프로비저닝 |

#### Data & Sync Automation

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Auto Sync Data | `auto-sync-data.yml` | 데이터 자동 동기화 |
| Delete Standalone Job Worker | `delete-standalone-job-worker.yml` | 워커 정리 |
| CI | `ci.yml` | 메인 CI 파이프라인 |

#### Reusable Workflows

| Workflow | 파일명 | 설명 / Description |
|----------|--------|---------------------|
| Reusable PR Checks | `44_reusable-pr-checks.yml` | 재사용 가능한 PR 체크 |
| Reusable Docs Sync | `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |
| Reusable Issue Management | `43_reusable-issue-management.yml` | 재사용 가능한 이슈 관리 |

---

## Quick Start / 빠른 시작

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 9
- **Docker** & **Docker Compose** (for containerized development)

### Installation

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install all workspace dependencies
npm install

# Verify installation
npm run build
```

### Automated SSoT Workflow

```bash
# Sync data + build + typecheck + test (recommended first run)
npm run automate:ssot

# Full automation: sync + lint + typecheck + test + build + validate
npm run automate:full
```

### Development

```bash
# Portfolio local dev (Miniflare)
npm run dev

# Job server local dev
npm run job-server:dev

# Run tests
npm test                    # All tests (Jest + Node)
npm run test:node          # Node native tests only
npm run test:e2e           # Playwright E2E

# Linting
npm run lint                # ESLint all packages
npm run lint:fix           # Auto-fix lint issues
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

---

## Commands Reference / 명령어 참조

### Build & Development

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio worker |
| `npm run build:full` | Build portfolio + CLI |
| `npm run dev` | Start Miniflare local development server |
| `npm run watch` | Watch mode for development |

### Data Synchronization

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX presentations (Python) |
| `npm run sync:all` | Sync data + PPTX |
| `npm run sync:proposals` | Sync job proposal reviews |
| `npm run enrich:github` | Enrich resume with GitHub data |
| `npm run enrich:skills` | Enrich with skills data |
| `npm run enrich:ai` | AI-based resume enrichment |
| `npm run enrich:all` | Run all enrichment scripts |

### Testing & Quality

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (Jest + Playwright) |
| `npm run test:node` | Node.js native tests only |
| `npm run test:e2e` | End-to-end Playwright tests |
| `npm run lint` | ESLint all packages |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | TypeScript type checking |
| `npm run strip-exif` | Remove EXIF data from images |

### Deployment & Release

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy (disabled - use CI) |
| `npm run version:bump` | Bump version (patch) |
| `npm run release` | Trigger release workflow |

### Automation Scripts

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | sync + build + typecheck + test |
| `npm run automate:full` | Full pipeline: sync + lint + typecheck + test + build + validate |

---

## Local Development / 로컬 개발

### Environment Variables

Create a `.env` file in the root:

```env
# Cloudflare
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token

# Wanted API
WANTED_API_KEY=your_wanted_key
WANTED_API_SECRET=your_wanted_secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/resume

# Observability
PROMETHEUS_ENABLED=true
GRAFANA_PASSWORD=your_grafana_password
```

### Package Development

Each package can be worked on independently:

```bash
# Work on a specific package
cd packages/cli
npm run watch

# Run tests for specific package
npm test --workspace=@resume/cli

# Link for local development
npm link
```

### Database Setup

```bash
# Start database (if using Supabase or external DB)
npm run db:migrate
npm run db:seed
```

---

## Project Structure Details / 프로젝트 구조 상세

```
resume/
├── apps/
│   ├── portfolio/            # Cloudflare Worker portfolio
│   │   ├── src/
│   │   ├── worker.js         # Generated - DO NOT EDIT
│   │   └── package.json
│   ├── job-server/           # MCP job automation server
│   │   ├── src/
│   │   │   ├── server/      # Express/MCP server
│   │   │   ├── sync/        # Data sync utilities
│   │   │   └── automation/  # Job automation logic
│   │   └── package.json
│   └── job-dashboard/        # Dashboard worker
│       └── package.json
├── packages/
│   ├── cli/                  # @resume/cli - CLI tool
│   │   ├── src/commands/    # db, deploy, verify commands
│   │   └── bin/run.js       # CLI entry point
│   ├── env/                  # @resume/env - Env validation
│   │   └── src/schemas/     # Zod schemas for env vars
│   ├── data/                 # @resume/data - SSoT data
│   │   └── resumes/master/  # Master resume JSON
│   ├── shared/               # @resume/shared - Utilities
│   │   └── src/
│   │       ├── errors/      # Custom error classes
│   │       ├── retry/       # Circuit breaker, HTTP retry
│   │       ├── crypto/      # Node.js & WebCrypto utils
│   │       ├── wanted-client/ # Wanted API client
│   │       └── ...
│   ├── types/                # @resume/types - JSDoc/TS types
│   │   └── src/
│   │       ├── application.js
│   │       ├── resume.js
│   │       ├── wanted.js
│   │       └── ...
│   ├── schemas/              # @resume/schemas - Zod schemas
│   │   └── src/
│   │       ├── application.js
│   │       ├── resume.js
│   │       └── auth.js
│   └── contracts/            # @resume/contracts - OpenAPI + Env
│      