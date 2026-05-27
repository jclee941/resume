<think>
The user wants me to generate a comprehensive README.md for the repository. Let me analyze all the provided information:

1. **Project Structure** - Shows it's a monorepo with apps, packages, tools, tests, infrastructure, docs, etc.
2. **Workflow Files** - 34 GitHub Actions workflow files
3. **package.json** - Shows workspaces, scripts, etc.
4. **Dockerfile** - Node.js based
5. **docker-compose.yml** - MCP server setup
6. **Existing README.md** - Shows portfolio site, DevSecOps focus
7. **AGENTS.md** - Knowledge base with detailed structure

Key aspects to cover:
- Title and badges
- Overview (SSoT concept, modules)
- Features
- Architecture
- Automation inventory (workflows + tools)
- Quick start
- Local development
- Commands reference
- Contribution guide

Models mentioned: minimax-m2.7 and gpt-5.5 (via CLIProxyAPI)

Let me create a comprehensive bilingual README (Korean + English) that covers all these areas with specific details about the workflows and tools present.

Key data from the files:
- 34 workflow files listed
- Workspaces include: portfolio, job-server, job-dashboard, cli, data, shared, types, schemas, contracts, env
- Scripts include: sync:data, sync:pptx, build, deploy, automate:ssot, automate:full, etc.
- Workflow names: 01_branch-to-pr.yml, 02_issue-to-branch.yml, 03_pr-checks.yml, etc.
- CI tools: Gitleaks, CodeQL, ESLint, Jest, Playwright
- Go tools mentioned but marked as 0 total

Let me structure this properly with all the automation details provided.

</think>

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

# resume.jclee.me

## DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

[Portfolio →](https://resume.jcelee.me) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## Overview / 개요

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

** Jaecheol Lee** — DevSecOps/SRE Engineer. 8 years, financial/public sector security infrastructure.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

This repository is NOT a simple portfolio site — it's a **monorepo that derives multiple outputs from a Single Source of Truth (SSoT) resume data**.

```text
                    ┌─────────────────────────────────┐
                    │  packages/data/resumes/master/   │  ← Single Source of Truth
                    │          resume_data.json        │
                    └────────────┬────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
   │  (CF Workers)   │  │  (n8n/hybrid)   │  │ (Wanted CV +    │
   └─────────────────┘  └─────────────────┘  │   Social)       │
                                               └─────────────────┘
```

---

## Features / 주요 기능

### Core Applications / 핵심 애플리케이션

| Application | Description | Tech Stack |
|-------------|-------------|------------|
| **Portfolio** (`apps/portfolio/`) | Multi-language edge portfolio site | Cloudflare Workers, TypeScript |
| **Job Server** (`apps/job-server/`) | MCP runtime for job automation | Node.js, MCP protocol |
| **Job Dashboard** (`apps/job-dashboard/`) | Dashboard APIs + workflows | Cloudflare Workers |

### Shared Packages / 공통 패키지

| Package | Purpose | Key Dependencies |
|---------|---------|------------------|
| **`data`** | SSoT resume data + JSON schema | JSON Schema |
| **`types`** | Canonical JSDoc/TS type definitions (zero runtime deps) | None |
| **`schemas`** | Runtime Zod validation schemas | Zod |
| **`contracts`** | OpenAPI spec + Cloudflare Env interface | OpenAPI |
| **`shared`** | Cross-package utilities (errors, logger, retry, crypto, rate-limit, auth, browser, clients) | Various |
| **`env`** | Environment validation + type-safe secrets | Zod |
| **`cli`** | Resume CLI tools | Node.js |

### Automation Capabilities / 자동화 기능

- **Resume Data Sync** — Automatic sync from SSoT to all consumers
- **Job Platform Integration** — Wanted/JobKorea automated job applications
- **Profile Synchronization** — CV and social media profile sync
- **AI Enrichment** — GitHub stats, skills, AI-powered matching
- **PPTX Generation** — Automated presentation generation
- **EXIF Stripping** — Privacy-preserving image processing

---

## Architecture /아키텍처

```text
./
├── apps/
│   ├── portfolio/           # Cloudflare Worker edge bundle (public)
│   ├── job-server/           # MCP/job automation runtime
│   └── job-dashboard/        # Dashboard Worker + workflows
├── packages/
│   ├── cli/                  # Resume CLI
│   ├── env/                  # Environment validation + type-safe secrets
│   ├── data/                 # SSoT resumes and JSON schema
│   ├── types/                # Canonical JSDoc/TS types (zero runtime deps)
│   ├── schemas/              # Runtime Zod validation schemas
│   ├── contracts/            # OpenAPI spec + Cloudflare Env interface
│   └── shared/               # Cross-package utilities
├── tools/
│   ├── scripts/              # Build, deployment, sync utilities
│   ├── ci/                   # CI validation scripts (Go + JS)
│   └── enrichment/           # AI/data enrichment tools
├── infrastructure/
│   ├── n8n/                  # Self-hosted workflow automation (Go binaries)
│   └── wrangler.jsonc        # Cloudflare Workers config
├── tests/
│   ├── unit/                 # Jest unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # Playwright E2E tests
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── guides/               # Operational guides
│   └── architecture/         # Detailed architecture docs
└── .github/
    └── workflows/            # 34 GitHub Actions workflows
```

### Data Flow / 데이터 흐름

```
resume_data.json (SSoT)
        │
        ├──► Portfolio Build ──► Cloudflare Workers Edge
        ├──► Job Server ──► MCP Tools ──► Wanted/JobKorea APIs
        ├──► Profile Sync ──► Wanted CV + Social Media
        └──► Dashboard ──► Monitoring + Observability
```

### Technology Stack / 기술 스택

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js ≥22, Cloudflare Workers |
| **Language** | TypeScript (primary), JavaScript, Go (CI scripts) |
| **Validation** | Zod, JSON Schema |
| **Testing** | Jest, Playwright |
| **CI/CD** | GitHub Actions |
| **Infrastructure** | Cloudflare Workers/KV, Docker, n8n |
| **Container** | Docker, docker-compose |

---

## Automation Inventory /자동화 인벤토리

### GitHub Actions Workflows (34 Total) / 깃헙 액션 워크플로우 (34개)

#### Branch & PR Management / 브랜치 및 PR 관리

| Workflow | File | Description |
|----------|------|-------------|
| **Branch to PR** | `01_branch-to-pr.yml` | Auto-create PR from feature branch |
| **Issue to Branch** | `02_issue-to-branch.yml` | Auto-create branch from issue |
| **Semantic PR** | `09_semantic-pr.yml` | Enforce semantic PR titles |
| **PR Auto-merge** | `13_pr-auto-merge.yml` | Auto-merge PRs with passing checks |
| **Bot Auto-fix** | `14_bot-auto-fix.yml` | Bot-triggered auto-fixes |
| **Merged PR Cleanup** | `15_merged-pr-cleanup.yml` | Cleanup after PR merge |
| **Labeler** | `labeler.yml` | Auto-label PRs/issues |

#### Code Quality & Security / 코드 품질 및 보안

| Workflow | File | Description |
|----------|------|-------------|
| **PR Checks** | `03_pr-checks.yml` | Comprehensive PR validation suite |
| **Actionlint** | `04_actionlint.yml` | GitHub Actions YAML linting |
| **Gitleaks** | `05_gitleaks.yml` | Secrets detection in code |
| **CodeQL** | `06_codeql.yml` | GitHub code scanning |
| **Dependency Review** | `07_dependency-review.yml` | Dependency vulnerability review |
| **Scorecard** | `08_scorecard.yml` | OpenSSF security scorecard |
| **ESLint Config** | Reusable via `44_reusable-pr-checks.yml` | Linting and formatting |

#### Review & Management / 리뷰 및 관리

| Workflow | File | Description |
|----------|------|-------------|
| **PR Review** | `10_pr-review.yml` | Automated PR review assignment |
| **Dependabot Auto-merge** | `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| **Issue Management** | `18_issue-management.yml` | Issue lifecycle automation |
| **Issue Backfill** | `19_issue-backfill.yml` | Issue metadata enrichment |
| **Welcome** | `welcome.yml` | New contributor welcome |

#### Documentation / 문서화

| Workflow | File | Description |
|----------|------|-------------|
| **README Gen** | `20_readme-gen.yml` | Auto-generate README updates |
| **Docs Sync** | `21_docs-sync.yml` | Sync documentation |
| **Reusable Docs Sync** | `42_reusable-docs-sync.yml` | Reusable docs sync workflow |
| **ADR Sync** | Implicit via docs-sync | Architecture Decision Records sync |

#### Release & Deployment /リリース 및 배포

| Workflow | File | Description |
|----------|------|-------------|
| **Release Notes** | `24_release-notes.yml` | Auto-generate release notes |
| **Release Publish** | `25_release-publish.yml` | Publish release artifacts |
| **Release** | `release.yml` | Release workflow orchestration |
| **CI** | `ci.yml` | Main CI pipeline |
| **Cloudflare Auto-deploy** | `CLOUDFLARE_GITHUB_AUTO_DEPLOY.md` | Cloudflare auto-deployment |

#### Automation & Operational / 운영 자동화

| Workflow | File | Description |
|----------|------|-------------|
| **Auto Merge** | `auto-merge.yml` | Generic auto-merge logic |
| **Auto Sync Data** | `auto-sync-data.yml` | Periodic data synchronization |
| **Provision Queues** | `provision-queues.yml` | Queue provisioning |
| **CI Failure Issues** | `37_ci-failure-issues.yml` | Auto-create issues from CI failures |
| **CI Auto-heal** | `60_ci-auto-heal.yml` | Automatic CI healing |
| **Downstream Health Check** | `29_downstream-health-check.yml` | Monitor downstream services |

#### Reusable Workflows / 재사용 가능한 워크플로우

| Workflow | File | Description |
|----------|------|-------------|
| **PR Checks (Reusable)** | `44_reusable-pr-checks.yml` | Reusable PR check workflow |
| **Issue Management (Reusable)** | `43_reusable-issue-management.yml` | Reusable issue management |
| **Delete Standalone Worker** | `delete-standalone-job-worker.yml` | Worker cleanup |

### Tools & Runtime / 도구 및 런타임

#### npm Scripts / npm 스크립트

| Category | Script | Description |
|----------|--------|-------------|
| **Sync** | `sync:data` | Sync resume data from SSoT |
| | `sync:pptx` | Generate PPTX presentations |
| | `sync:all` | Sync all data sources |
| | `sync:proposals` | Sync job proposals |
| **Enrichment** | `enrich:github` | Enrich GitHub stats |
| | `enrich:skills` | Enrich skills data |
| | `enrich:ai` | AI-powered enrichment |
| | `enrich:all` | Run all enrichment |
| **Automation** | `automate:ssot` | sync + build + typecheck + test |
| | `automate:full` | Full pipeline (sync + lint + typecheck + test + build + validate) |
| **Build** | `build` | Generate worker.js from templates |
| | `build:full` | Build portfolio + CLI |
| | `build:all` | Build all workspaces |
| **Image** | `strip-exif` | Strip EXIF data from images |
| **Version** | `version:bump` | Bump version |
| **Deploy** | `deploy` | Manual deploy (disabled - use git push) |

#### Go Tools / Go 도구

| Tool | Location | Purpose |
|------|----------|---------|
| Cloudflare Validator | `tools/ci/validate-cloudflare-native.go` | Validate Cloudflare native features |

#### Test Frameworks / 테스트 프레임워크

| Framework | Config | Purpose |
|-----------|--------|---------|
| **Jest** | `jest.config.cjs` | Unit and integration testing |
| **Playwright** | `playwright.config.js` | E2E testing |
| **ESLint** | `eslint.config.cjs` | Code linting |
| **TypeScript** | `tsconfig.json`, `tsconfig.base.json` | Type checking |

#### Container / 컨테이너

| Image | Dockerfile | Description |
|-------|------------|-------------|
| **Job Server** | `Dockerfile` | Node.js 22 Alpine-based MCP server |
| **MCP Server** | `docker-compose.yml` | Docker Compose setup for MCP server |

---

## Quick Start /빠른 시작

### Prerequisites / 사전 요구사항

- Node.js ≥22
- npm ≥10
- Docker & Docker Compose (for job-server)
- Git

### Installation / 설치

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install
```

### Basic Commands /기본 명령어

```bash
# Run the SSoT automation pipeline
npm run automate:ssot

# Full automation including lint and validation
npm run automate:full

# Local development
npm run dev

# Testing
npm test

# Build
npm run build
```

---

## Local Development / 로컬 개발

### Development Server / 개발 서버

```bash
# Portfolio (Miniflare)
npm run dev

# Or run all packages
npm run build:all
```

### Job Server (Docker) / 잡 서버 (Docker)

```bash
# Start MCP server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Container Build / 수동 컨테이너 빌드

```bash
# Build image
docker build -t resume-mcp-server .

# Run with env file
docker run -d --env-file .env -p 3000:3000 resume-mcp-server
```

### Environment Variables / 환경 변수

```bash
# Copy environment template
cp .env.example .env

# Edit in your editor
nano .env
```

**Note:** See [docs/guides/CLOUDFLARE_TOKEN_SETUP.md](docs/guides/CLOUDFLARE_TOKEN_SETUP.md) for Cloudflare token configuration.

---

## Commands Reference /명령어 참조

### Build Commands / 빌드 명령어

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio worker only |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Build all workspaces |

### Sync Commands / 동기화 명령어

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX presentations |
| `npm run sync:all` | Run all sync operations |
| `npm run sync:proposals` | Sync job proposals |
| `npm run strip-exif` | Strip EXIF from images |

### Enrichment Commands / 데이터 enrichment 명령어

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | Enrich GitHub stats |
| `npm run enrich:skills` | Enrich