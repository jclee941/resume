<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the project structure and create a bilingual (Korean and English) README.md.

Key information from the project:
1. **Project Name**: resume.jclee.me
2. **Description**: DevSecOps / SRE 이력서 자동화 모노레포
3. **Tech Stack**: Cloudflare Workers, Node.js ≥22, Jest, Playwright, n8n
4. **Structure**: Monorepo with apps/portfolio, apps/job-server, apps/job-dashboard, packages/cli, packages/data, packages/shared, packages/types, packages/schemas, packages/contracts, packages/env
5. **GitHub Workflows**: 34 workflow files listed
6. **Key Features**: Single Source of Truth (SSoT) resume data, Cloudflare Worker edge deployment, job automation (Wanted/JobKorea), self-hosted observability

Let me create a comprehensive README.md that includes:
- Title and badges
- Overview
- Features
- Architecture
- Automation inventory (workflows + tools)
- Quick start
- Local development
- Commands reference
- Contribution guide

All in Korean and English (bilingual).
</think>

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-34_workflows-2088FF?logo=github-actions&logoColor=white)](.github/workflows/)
[![Monorepo](https://img.shields.io/badge/monorepo-workspace-ff69b4)](package.json)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

# resume.jclee.me

## DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability

---

## Overview | 개요

**Korean:**

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

**English:**

Jaecheol Lee — DevSecOps/SRE Engineer. 8 years, financial/public security infrastructure.

This repository is a monorepo for **multiple outputs derived from a Single Source of Truth (SSoT) resume data**, not a single portfolio site.

---

## Architecture | 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                 packages/data/resumes/master/resume_data.json   │
│                         ← Single Source of Truth (SSoT)         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Edge Portfolio│      │Job Automation │      │ Profile Sync  │
│  (CF Workers) │      │ (n8n/MCP)     │      │ (Wanted CV +  │
└───────────────┘      └───────────────┘      │  Social)      │
                                              └───────────────┘
```

### Applications | 애플리케이션

| App | Path | Description |
|-----|------|-------------|
| **portfolio** | `apps/portfolio/` | Cloudflare Worker edge bundle; serves portfolio in 3 languages |
| **job-server** | `apps/job-server/` | MCP/job automation runtime; Wanted/JobKorea API clients |
| **job-dashboard** | `apps/job-dashboard/` | Dashboard worker + API workflows |

### Packages | 패키지

| Package | Path | Description |
|---------|------|-------------|
| **data** | `packages/data/` | SSoT resumes + JSON schema |
| **types** | `packages/types/` | Canonical JSDoc/TS types (zero runtime deps) |
| **schemas** | `packages/schemas/` | Runtime Zod validation schemas |
| **contracts** | `packages/contracts/` | OpenAPI spec + Worker Env interface |
| **shared** | `packages/shared/` | Errors, logger, retry, crypto, rate-limit, auth, browser, clients |
| **env** | `packages/env/` | Environment validation + type-safe secrets |
| **cli** | `packages/cli/` | Resume CLI tools |

---

## Features | 주요 기능

### Korean:

- **단일 진실원 (SSoT)**: `packages/data/resumes/master/resume_data.json`이 모든 이력서 데이터의 유일한 출처
- **Cloudflare Workers 에지 배포**: 한국어/영어/일본어 3개 언어 포트폴리오
- **구직 자동화**: Wanted, JobKorea 등 채용 플랫폼 자동 지원
- **셀프호스팅 옵저버빌리티**: Prometheus + Grafana + n8n 모니터링
- **GitHub Actions CI/CD**: 34개 워크플로우로 완전 자동화된 개발 파이프라인
- **모노레포 구조**: npm workspaces 기반 10개 패키지 관리

### English:

- **Single Source of Truth (SSoT)**: `packages/data/resumes/master/resume_data.json` is the sole source for all resume data
- **Cloudflare Workers Edge Deployment**: Portfolio in 3 languages (KO/EN/JA)
- **Job Automation**: Auto-apply to Wanted, JobKorea, and other platforms
- **Self-Hosted Observability**: Prometheus + Grafana + n8n monitoring
- **GitHub Actions CI/CD**: 34 workflows for fully automated development pipeline
- **Monorepo Structure**: 10 packages managed via npm workspaces

---

## Automation Inventory | 자동화 인벤토리

### GitHub Actions Workflows (34 Total) | GitHub Actions 워크플로우 (34개)

#### Branch & PR Management | 브랜치 및 PR 관리

| Workflow | Path | Description |
|----------|------|-------------|
| `01_branch-to-pr.yml` | `.github/workflows/01_branch-to-pr.yml` | Create PR from branch |
| `02_issue-to-branch.yml` | `.github/workflows/02_issue-to-branch.yml` | Create branch from issue |
| `09_semantic-pr.yml` | `.github/workflows/09_semantic-pr.yml` | Enforce semantic PR conventions |
| `10_pr-review.yml` | `.github/workflows/10_pr-review.yml` | Automated PR review |
| `13_pr-auto-merge.yml` | `.github/workflows/13_pr-auto-merge.yml` | Auto-merge approved PRs |
| `15_merged-pr-cleanup.yml` | `.github/workflows/15_merged-pr-cleanup.yml` | Cleanup after PR merge |

#### Code Quality & Security | 코드 품질 및 보안

| Workflow | Path | Description |
|----------|------|-------------|
| `03_pr-checks.yml` | `.github/workflows/03_pr-checks.yml` | PR validation checks (lint, typecheck, test) |
| `04_actionlint.yml` | `.github/workflows/04_actionlint.yml` | GitHub Actions YAML linting |
| `05_gitleaks.yml` | `.github/workflows/05_gitleaks.yml` | Secrets scanning |
| `06_codeql.yml` | `.github/workflows/06_codeql.yml` | CodeQL static analysis |
| `07_dependency-review.yml` | `.github/workflows/07_dependency-review.yml` | Dependency vulnerability review |
| `08_scorecard.yml` | `.github/workflows/08_scorecard.yml` | OpenSSF Scorecard |
| `44_reusable-pr-checks.yml` | `.github/workflows/44_reusable-pr-checks.yml` | Reusable PR check workflow |

#### Dependency Management | 의존성 관리

| Workflow | Path | Description |
|----------|------|-------------|
| `12_dependabot-auto-merge.yml` | `.github/workflows/12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| `auto-merge.yml` | `.github/workflows/auto-merge.yml` | Generic auto-merge logic |

#### Issue Management | 이슈 관리

| Workflow | Path | Description |
|----------|------|-------------|
| `18_issue-management.yml` | `.github/workflows/18_issue-management.yml` | Issue lifecycle automation |
| `19_issue-backfill.yml` | `.github/workflows/19_issue-backfill.yml` | Backfill issues from data |
| `37_ci-failure-issues.yml` | `.github/workflows/37_ci-failure-issues.yml` | Create issues from CI failures |
| `43_reusable-issue-management.yml` | `.github/workflows/43_reusable-issue-management.yml` | Reusable issue management |

#### Documentation | 문서화

| Workflow | Path | Description |
|----------|------|-------------|
| `20_readme-gen.yml` | `.github/workflows/20_readme-gen.yml` | Auto-generate README |
| `21_docs-sync.yml` | `.github/workflows/21_docs-sync.yml` | Sync documentation |
| `24_release-notes.yml` | `.github/workflows/24_release-notes.yml` | Generate release notes |
| `42_reusable-docs-sync.yml` | `.github/workflows/42_reusable-docs-sync.yml` | Reusable docs sync |

#### Release & Deployment | 릴리스 및 배포

| Workflow | Path | Description |
|----------|------|-------------|
| `25_release-publish.yml` | `.github/workflows/25_release-publish.yml` | Publish releases |
| `29_downstream-health-check.yml` | `.github/workflows/29_downstream-health-check.yml` | Health check downstream services |
| `ci.yml` | `.github/workflows/ci.yml` | Main CI pipeline |
| `release.yml` | `.github/workflows/release.yml` | Release workflow |
| `auto-sync-data.yml` | `.github/workflows/auto-sync-data.yml` | Auto-sync SSoT data |
| `delete-standalone-job-worker.yml` | `.github/workflows/delete-standalone-job-worker.yml` | Cleanup standalone workers |

#### Automation & Bots | 자동화 및 봇

| Workflow | Path | Description |
|----------|------|-------------|
| `14_bot-auto-fix.yml` | `.github/workflows/14_bot-auto-fix.yml` | Bot auto-fix workflow |
| `60_ci-auto-heal.yml` | `.github/workflows/60_ci-auto-heal.yml` | Auto-heal CI failures |
| `welcome.yml` | `.github/workflows/welcome.yml` | Welcome workflow for contributors |

#### Infrastructure | 인프라

| Workflow | Path | Description |
|----------|------|-------------|
| `labeler.yml` | `.github/workflows/labeler.yml` | Auto-label PRs/issues |
| `provision-queues.yml` | `.github/workflows/provision-queues.yml` | Provision queue infrastructure |

### Tools | 도구

| Tool | Type | Description |
|------|------|-------------|
| **Miniflare** | Dev Server | Cloudflare Workers local development |
| **Jest** | Test Runner | Unit and integration testing |
| **Playwright** | E2E Testing | End-to-end browser testing |
| **ESLint** | Linter | Code linting (eslint.config.cjs) |
| **TypeScript** | Type Checker | Type-safe development |
| **Zod** | Validator | Runtime schema validation |
| **Wrangler** | Deployment | Cloudflare Workers CLI |
| **n8n** | Automation | Workflow orchestration |
| **Docker** | Container | Containerized job-server runtime |
| **Go** | Scripts | CI/validation scripts |

---

## Quick Start | 빠른 시작

### Prerequisites | 사전 요구사항

- Node.js ≥ 22
- npm ≥ 10
- Docker (optional, for job-server)

### Installation | 설치

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install
```

### Development | 개발

```bash
# Full SSoT automation (sync + build + typecheck + test)
npm run automate:ssot

# Run all checks
npm run automate:full

# Local development with Miniflare
npm run dev

# Run tests
npm test
```

### Deployment | 배포

```bash
# Cloudflare Workers deployment via git push
git push origin main

# Manual deploy (disabled - use git push)
npm run deploy
```

---

## Local Development | 로컬 개발

### Environment Variables | 환경 변수

Create `.env` file based on `.env.example`:

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Wanted API
WANTED_CLIENT_ID=your_client_id
WANTED_CLIENT_SECRET=your_client_secret

# JobKorea API
JOBKOREA_API_KEY=your_api_key

# Others
NODE_ENV=development
```

### Docker Compose | Docker Compose

```bash
# Start job-server with MCP
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Build | 빌드

```bash
# Build portfolio worker
npm run build

# Build CLI
npm run cli:build

# Full build
npm run build:full
```

---

## Commands Reference | 명령어 참조

### Build & Development | 빌드 및 개발

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio worker bundle |
| `npm run build:full` | Build portfolio + CLI |
| `npm run dev` | Start Miniflare local dev server |

### Data Sync | 데이터 동기화

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX from resume data |
| `npm run sync:all` | Sync all data (data + PPTX) |
| `npm run sync:proposals` | Sync job proposals |

### Enrichment | 데이터 enrichment

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | Enrich with GitHub data |
| `npm run enrich:skills` | Enrich with skills data |
| `npm run enrich:ai` | AI-powered enrichment |
| `npm run enrich:all` | Run all enrichment |

### Automation | 자동화

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | Sync + build + typecheck + test |
| `npm run automate:full` | Full pipeline (sync + lint + typecheck + test + build) |

### Testing | 테스트

| Command | Description |
|---------|-------------|
| `npm test` | Run Jest + Node native tests |
| `npm run test:node` | Run Node.js native tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:integration` | Run integration tests |

### Linting & Type Checking | 린팅 및 타입 체크

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |

### Version & Release | 버전 및 릴리스

| Command | Description |
|---------|-------------|
| `npm run version:bump` | Bump patch version |
| `npm run strip-exif` | Strip EXIF from images |

---

## Project Structure | 프로젝트 구조

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker edge bundle
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # Dashboard worker + workflows
├── packages/
│   ├── cli/                # Resume CLI
│   ├── data/               # SSoT resumes + JSON schema
│   ├── env/                # Environment validation
│   ├── shared/             # Cross-package utilities
│   ├── types/              # Canonical JSDoc/TS types
│   ├── schemas/            # Runtime Zod schemas
│   └── contracts/          # OpenAPI spec + Env interface
├── tools/
│   ├── scripts/            # Build, deploy, sync utilities
│   ├── ci/                 # CI validation scripts
│   └── enrichment/         # Data enrichment tools
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # Playwright E2E tests
├── infrastructure/
│   ├── monitoring/         # Prometheus, Grafana configs
│   └── n8n/                # n8n workflow automations
├── docs/
│   ├── guides/             # User guides
│   ├── architecture/       # Architecture decision records
│   ├── security/           # Security documentation
│   └── adr/                # Architecture Decision Records
├── .github/
│   └── workflows/          # 34 GitHub Actions workflows
├── Dockerfile              # Job-server container
├── docker-compose.yml      # Docker composition
├── package.json            # Workspace root
└── wrangler.jsonc          # Cloudflare Workers config
```

---

## Current Models | 현재 모델

| Model | Provider | Purpose |
|-------|----------|---------|
| **minimax-m2.7** | MiniMax | Primary AI model |
| **gpt-5.5** | OpenAI (via CLIProxyAPI) | Secondary AI model |

---

## Contributing | 기여하기

### Korean:

1. **이슈 생성**: 버그的报告 또는 기능 요청은 먼저 이슈로 등록해주세요.
2. **브랜치 생성**: `02_issue-to-branch.yml` 워크플로우를 사용하거나 수동으로 생성