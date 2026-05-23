<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the provided information:

1. **Project Type**: Resume portfolio monorepo - Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability
2. **Key technologies**: Node.js 22+, Cloudflare Workers, Docker, TypeScript, Jest, Playwright
3. **Structure**: Monorepo with workspaces (apps/portfolio, apps/job-server, apps/job-dashboard, packages/*)
4. **34 GitHub Workflow files** - I need to list them
5. **No Go automation tools** - but package.json has Go scripts mentioned
6. **Models mentioned**: minimax-m2.7 and gpt-5.5 via CLIProxyAPI

Let me create a bilingual README (Korean and English) with:
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

I need to be specific about workflow names and tool names. Let me compile the workflow list:
1. 01_branch-to-pr.yml
2. 02_issue-to-branch.yml
3. 03_pr-checks.yml
4. 04_actionlint.yml
5. 05_gitleaks.yml
6. 06_codeql.yml
7. 07_dependency-review.yml
8. 08_scorecard.yml
9. 09_semantic-pr.yml
10. 10_pr-review.yml
11. 12_dependabot-auto-merge.yml
12. 13_pr-auto-merge.yml
13. 14_bot-auto-fix.yml
14. 15_merged-pr-cleanup.yml


15. 18_issue-management.yml
16. 19_issue-backfill.yml
17. 20_readme-gen.yml
18. 21_docs-sync.yml
19. 24_release-notes.yml
20. 25_release-publish.yml
21. 29_downstream-health-check.yml
22. 37_ci-failure-issues.yml
23. 42_reusable-docs-sync.yml
24. 43_reusable-issue-management.yml
25. 44_reusable-pr-checks.yml
26. 60_ci-auto-heal.yml
27. auto-merge.yml
28. auto

-sync-data.yml
29. ci.yml
30. delete-standalone-job-worker.yml
31. labeler.yml
32. provision-queues.yml
33. release.yml
34. welcome.yml

The build system relies on npm scripts and Make for orchestration. Key scripts handle automation workflows like `automate:ssot` and `automate:full`, data synchronization through `sync:data`, and enrichment operations across GitHub and skills. Build processes generate worker artifacts and handle version bumps, while deployment is currently manual but being migrated to git push triggers.

</think>

# README.md Generation

I'll create a comprehensive bilingual README.md for this repository.

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

## DevSecOps / SRE 이력서 자동화 모노레포 | DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability  
Cloudflare Workers Portfolio · Job Automation Pipeline · Self-hosted Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## Table of Contents | 목차

- [Overview](#overview--개요)
- [Features](#features--기능)
- [Architecture](#architecture--아키텍처)
- [Automation Inventory](#automation-inventory--자동화-인벤토리)
  - [GitHub Actions Workflows](#github-actions-workflows)
  - [CLI Tools & Scripts](#cli-tools--scripts)
- [Quick Start](#quick-start--빠른-시작)
- [Local Development](#local-development--로컬-개발)
- [Commands Reference](#commands-reference--명령어-참조)
- [Contribution](#contribution--기여)

---

## Overview | 개요

<!-- ENGLISH -->
This repository is a **DevSecOps/SRE resume automation monorepo** that transforms a Single Source of Truth (SSoT) resume data file into multiple derived artifacts:

- **Edge Portfolio**: Cloudflare Workers site (EN/JP/KR)
- **Job Automation**: Wanted/JobKorea application pipeline via n8n
- **Profile Sync**: Automatic CV and social profile synchronization

The system is designed for a 8-year DevSecOps/SRE engineer specializing in financial/public security infrastructure.

<!-- KOREAN -->
이 저장소는 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**을 생성하는 DevSecOps/SRE 이력서 자동화 모노레포입니다:

- **엣지 포트폴리오**: Cloudflare Workers 사이트 (EN/JP/KR)
- **구직 자동화**: n8n 기반 Wanted/JobKorea 지원 파이프라인
- **프로필 동기화**: 자동 CV 및 소셜 프로필 동기화

금융·공공 보안 인프라를 전문으로 하는 8년차 DevSecOps/SRE 엔지니어용으로 설계되었습니다.

---

## Features | 기능

| Feature | Description |
|---------|-------------|
| **SSoT Architecture** | Single `resume_data.json` drives all outputs |
| **Multi-language Portfolio** | English, Japanese, Korean locale support |
| **Edge Runtime** | Cloudflare Workers for global low-latency delivery |
| **Job Automation** | Wanted/JobKorea application with n8n orchestrator |
| **Observability** | Self-hosted monitoring with health/metrics endpoints |
| **CI/CD Automation** | 34 GitHub Actions workflows for automated quality gates |
| **Type Safety** | TypeScript + Zod validation schemas |
| **Docker Ready** | Containerized MCP/job server runtime |

---

## Architecture | 아키텍처

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Single Source of Truth                       │
│         packages/data/resumes/master/resume_data.json           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
│  (CF Workers)   │  │  (n8n / MCP)    │  │ (Wanted CV)    │
│  resume.jclee.me│  │  job-server     │  │ Social同步     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
           ┌─────────────────┐     ┌─────────────────┐
           │   job-server    │     │  job-dashboard  │
           │  (MCP Runtime)  │     │  (API Server)   │
           └─────────────────┘     └─────────────────┘
```

### Workspace Structure | 워크스페이스 구조

```
resume/
├── apps/
│   ├── portfolio/        # Cloudflare Worker edge bundle
│   ├── job-server/        # MCP/job automation runtime
│   └── job-dashboard/     # Dashboard API + workflows
├── packages/
│   ├── cli/               # Resume CLI tools
│   ├── data/              # SSoT resumes + JSON schemas
│   ├── env/               # Environment validation
│   ├── schemas/           # Zod runtime validation
│   ├── shared/            # Cross-package utilities
│   ├── types/             # Canonical TypeScript types
│   └── contracts/         # OpenAPI spec + Env interfaces
├── tools/                 # CI/build/deploy scripts (Go + JS)
├── tests/                 # Jest, Integration, Playwright E2E
├── infrastructure/        # Cloudflare, n8n, monitoring configs
└── docs/                  # ADRs, architecture guides, security
```

---

## Automation Inventory | 자동화 인벤토리

### GitHub Actions Workflows | GitHub Actions 워크플로우

| # | Workflow | Purpose |
|---|----------|---------|
| 1 | `01_branch-to-pr.yml` | Branch creation → PR automation |
| 2 | `02_issue-to-branch.yml` | Issue → branch automation |
| 3 | `03_pr-checks.yml` | PR quality gates (lint, test, build) |
| 4 | `04_actionlint.yml` | GitHub Actions YAML linting |
| 5 | `05_gitleaks.yml` | Secret scanning |
| 6 | `06_codeql.yml` | CodeQL security analysis |
| 7 | `07_dependency-review.yml` | Dependency vulnerability review |
| 8 | `08_scorecard.yml` | OpenSSF Scorecard evaluation |
| 9 | `09_semantic-pr.yml` | Semantic PR title validation |
| 10 | `10_pr-review.yml` | Automated PR review |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot PR auto-merge |
| 13 | `13_pr-auto-merge.yml` | PR auto-merge logic |
| 14 | `14_bot-auto-fix.yml` | Bot-powered auto-fixes |
| 15 | `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| 18 | `18_issue-management.yml` | Issue lifecycle management |
| 19 | `19_issue-backfill.yml` | Issue backfill operations |
| 20 | `20_readme-gen.yml` | README generation |
| 21 | `21_docs-sync.yml` | Documentation sync |
| 24 | `24_release-notes.yml` | Release notes generation |
| 25 | `25_release-publish.yml` | Release publishing |
| 29 | `29_downstream-health-check.yml` | Downstream service health |
| 37 | `37_ci-failure-issues.yml` | CI failure → issue creation |
| 42 | `42_reusable-docs-sync.yml` | Reusable docs sync workflow |
| 43 | `43_reusable-issue-management.yml` | Reusable issue management |
| 44 | `44_reusable-pr-checks.yml` | Reusable PR checks |
| 60 | `60_ci-auto-heal.yml` | CI self-healing automation |
| — | `auto-merge.yml` | General auto-merge |
| — | `auto-sync-data.yml` | Data synchronization |
| — | `ci.yml` | Primary CI pipeline |
| — | `delete-standalone-job-worker.yml` | Worker cleanup |
| — | `labeler.yml` | PR/issue label automation |
| — | `provision-queues.yml` | Queue provisioning |
| — | `release.yml` | Release workflow |
| — | `welcome.yml` | New contributor welcome |

**Total: 34 workflows**

### CLI Tools & Scripts | CLI 도구 및 스크립트

#### Node.js Scripts (npm)

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | Full SSoT sync: sync + build + typecheck + test |
| `npm run automate:full` | Complete automation: sync + lint + typecheck + test + build + CF validation |
| `npm run sync:data` | Sync resume data from SSoT source |
| `npm run sync:pptx` | Generate PPTX presentations |
| `npm run enrich:github` | GitHub profile enrichment |
| `npm run enrich:skills` | Skills data enrichment |
| `npm run enrich:ai` | AI-powered enrichment |
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm test` | Jest unit + Node native tests |
| `npm run test:e2e` | Playwright E2E tests |

#### Go Tools

| Tool | Location | Purpose |
|------|----------|---------|
| `sync/apply-proposals.go` | `tools/scripts/sync/` | Apply proposals automation |
| `validate-cloudflare-native.go` | `tools/ci/` | Cloudflare native validation |

---

## Quick Start | 빠른 시작

### Prerequisites | 사전 요구사항

- Node.js ≥ 22
- Docker & Docker Compose
- Cloudflare account (for deployment)

### Installation | 설치

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install
```

### Basic Commands | 기본 명령어

```bash
# SSoT automation (sync + build + typecheck + test)
npm run automate:ssot

# Full automation pipeline
npm run automate:full

# Start local development
npm run dev

# Run tests
npm test
```

---

## Local Development | 로컬 개발

### Docker Compose (MCP Server)

```bash
# Start MCP server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloudflare Workers (Local)

```bash
# Navigate to portfolio app
cd apps/portfolio

# Start Miniflare dev server
npm run dev

# Or use wrangler
npx wrangler dev
```

### Environment Variables | 환경 변수

Create `.env` file:

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account

# Wanted/JobKorea
WANTED_CLIENT_ID=your_id
WANTED_CLIENT_SECRET=your_secret

# Supabase
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key

# App
PORT=3000
NODE_ENV=development
```

See [`.env.example`](apps/job-server/.env.example) for full variable list.

---

## Commands Reference | 명령어 참조

### Build & Development | 빌드 및 개발

| Script | Description |
|--------|-------------|
| `npm run build` | Generate `worker.js` from templates |
| `npm run build:portfolio` | Build portfolio worker bundle |
| `npm run build:full` | Build portfolio + CLI |
| `npm run dev` | Start Miniflare local dev server |
| `npm run typecheck` | TypeScript type checking |

### Data Synchronization | 데이터 동기화

| Script | Description |
|--------|-------------|
| `npm run sync:data` | Sync resume data (SSoT) |
| `npm run sync:pptx` | Generate PPTX presentations |
| `npm run sync:all` | Sync all data sources |
| `npm run sync:proposals` | Sync proposal reviews |

### Enrichment | 데이터 Enrichment

| Script | Description |
|--------|-------------|
| `npm run enrich:github` | GitHub profile enrichment |
| `npm run enrich:skills` | Skills data enrichment |
| `npm run enrich:ai` | AI-powered data enrichment |
| `npm run enrich:all` | Run all enrichment scripts |

### Testing | 테스트

| Script | Description |
|--------|-------------|
| `npm test` | Jest unit tests |
| `npm run test:node` | Node.js native tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:integration` | Integration tests |

### CI/CD | 지속적 통합/배포

| Script | Description |
|--------|-------------|
| `npm run lint` | ESLint linting |
| `npm run lint:ratchet` | Lint ratchet enforcement |
| `npm run format` | Code formatting |
| `npm run version:bump` | Version bump (patch) |

### Deployment | 배포

```bash
# Manual deploy (disabled - use git push to master)
npm run deploy

# Docker deployment
docker-compose up -d --build
```

---

## Contribution | 기여

Please read our contributing guide before submitting PRs:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/CODE_STYLE.md](./docs/CODE_STYLE.md)

### Workflow | 작업 흐름

```text
Issue → Branch → PR → Reviews → Auto-merge → Cleanup
  │                      │
  └──────────────────────┴──→ 03_pr-checks.yml (CI gates)
                                ├── 04_actionlint.yml
                                ├── 05_gitleaks.yml
                                ├── 06_codeql.yml
                                ├── 09_semantic-pr.yml
                                └── npm test
```

### Key Conventions | 주요 규칙

- **Branch naming**: `{type}/{issue-number}-{description}`
- **PR titles**: Semantic format enforced by `09_semantic-pr.yml`
- **Commits**: Conventional Commits specification
- **Types**: Zero-runtime-dependency TypeScript in `packages/types/`
- **Validation**: Zod schemas in `packages/schemas/`
- **SSoT**: Resume data lives in `packages/data/resumes/master/resume_data.json`

---

## Documentation | 문서

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | AI agent knowledge base |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [DEPLOYMENT.md](./docs/GITHUB_ACTIONS_DEPLOYMENT_GUIDE.md) | Deployment guide |
| [ADR/](docs/adr/) | Architecture Decision Records |
| [SECURITY_WARNING.md](./docs/SECURITY_WARNING.md) | Security notices |

---

## License | 라이선스

MIT License - See [LICENSE](./LICENSE)

---

## Contact | 연락처

- **Author**: Jaecheol Lee (이재철)
- **Email**: jclee@resume.jclee.me
-