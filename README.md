<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the information provided:

1. **Project**: This is a resume/portfolio monorepo for a DevSecOps/SRE engineer (Jaecheol Lee)
2. **Tech Stack**: Node.js 22+, Cloudflare Workers, n8n, npm workspaces monorepo
3. **Structure**: Apps (portfolio, job-server, job-dashboard), Packages (cli, data, shared, types, schemas, contracts, env), tools (Go + JS)
4. **GitHub Actions**: 34 workflow files listed
5. **Key Features**: 
   - Cloudflare Workers portfolio site (edge)
   - Job automation (Wanted/JobKorea)
   - SSoT (Single Source of Truth) data
   - Self-hosted observability

Let me create a comprehensive bilingual README in Korean and English with:
- Badges
- Overview
- Features
- Architecture
- Automation inventory (workflows + tools)
- Quick start
- Local development
- Commands reference
- Contribution guide

I need to list out the specific workflow names and tool names from the provided data.
</think>

# README.md

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-cyan?logo=npm)](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
[![Artifact HUB](https://img.shields.io/badge/Artifact%20Hub-approved-2b3a90)](https://artifacthub.io)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## Overview

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

```text
                    ┌─────────────────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └────────────────────────┬──────────────────────┘
                                             │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
               ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
               │  Edge Portfolio  │  │  Job Automation │  │  Profile Sync   │
               │  (CF Workers)    │  │  (n8n/MCP)      │  │  (Wanted CV +   │
               │                  │  │                  │  │   Social)       │
               └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Architecture Highlights

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| **Edge Runtime** | Cloudflare Workers | Low-latency portfolio serving at 300+ PoPs |
| **Job Automation** | MCP Server + n8n | Wanted/JobKorea application workflow orchestration |
| **Data Layer** | npm workspaces monorepo | SSoT JSON → multi-format derivation |
| **Observability** | Self-hosted monitoring | Metrics, health checks, alerting pipeline |
| **CI/CD** | GitHub Actions | 34 workflows for automation, security, release |

---

## Features

### Core Capabilities

- **SSoT Data Architecture**: `packages/data/resumes/master/resume_data.json`를 단일 진실원으로 모든 산출물 파생
- **Cloudflare Workers Edge**: HTML/CSS/JS 번들을 300+ 글로벌 PoP에서 Serve
- **Job Application Automation**: Wanted, JobKorea 등 구직 플랫폼 자동 지원
- **Multi-language Portfolio**: 한국어, 영어, 일본어 버전 자동 생성
- **Profile Synchronization**: Wanted CV, GitHub, Social Links 자동 동기화
- **Comprehensive CI/CD**: 34개의 GitHub Actions 워크플로우

### Technical Features

| Feature | Implementation |
| ------- | --------------- |
| Type Safety | TypeScript + Zod runtime validation + JSDoc types |
| Security | Gitleaks, CodeQL, Dependency Review, Secret Scanning |
| Observability | Self-hosted metrics + health endpoints |
| Testing | Jest (unit) + Playwright (E2E) |
| Linting | ESLint + TypeScript strict mode |
| Deployment | Cloudflare Workers via Wrangler |

---

## Automation Inventory

### GitHub Actions Workflows

#### Pull Request & Branch Automation (9 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| Branch to PR | `01_branch-to-pr.yml` | 자동 PR 생성 |
| Issue to Branch | `02_issue-to-branch.yml` | 이슈 기반 브랜치 생성 |
| PR Checks | `03_pr-checks.yml` | 통합 CI 검사 |
| Actionlint | `04_actionlint.yml` | GitHub Actions YAML lint |
| Gitleaks | `05_gitleaks.yml` | secrets scanning |
| CodeQL | `06_codeql.yml` | 정적 분석 |
| Dependency Review | `07_dependency-review.yml` | 의존성 취약점 검사 |
| Scorecard | `08_scorecard.yml` | OpenSSF 보안 점수 |
| Semantic PR | `09_semantic-pr.yml` | conventional commit 검증 |

#### Review & Merge Automation (6 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| PR Review | `10_pr-review.yml` | 자동 리뷰 요청 |
| Dependabot Auto-merge | `12_dependabot-auto-merge.yml` | Dependabot PR 자동 병합 |
| PR Auto-merge | `13_pr-auto-merge.yml` | 자동 병합 트리거 |
| Bot Auto-fix | `14_bot-auto-fix.yml` | 자동 버그 수정 |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| CI Auto-heal | `60_ci-auto-heal.yml` | CI 실패 자동 복구 |

#### Documentation & Release (6 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| Issue Management | `18_issue-management.yml` | 이슈 생명주기 관리 |
| Issue Backfill | `19_issue-backfill.yml` | 이슈 메타데이터 보강 |
| README Generator | `20_readme-gen.yml` | 문서 자동 생성 |
| Docs Sync | `21_docs-sync.yml` | 문서 동기화 |
| Release Notes | `24_release-notes.yml` | 릴리스 노트 생성 |
| Release Publish | `25_release-publish.yml` | 배포 자동화 |

#### Health & Downstream (2 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| Downstream Health | `29_downstream-health-check.yml` | 하류 서비스 상태 확인 |
| CI Failure Issues | `37_ci-failure-issues.yml` | CI 실패 이슈 생성 |

#### Reusable Workflows (4 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| Docs Sync Reusable | `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |
| Issue Management Reusable | `43_reusable-issue-management.yml` | 재사용 가능한 이슈 관리 |
| PR Checks Reusable | `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 |
| Labeler | `labeler.yml` | 자동 라벨링 |

#### Core CI/CD (2 workflows)

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| CI | `ci.yml` | 메인 CI 파이프라인 |
| Auto-sync Data | `auto-sync-data.yml` | 데이터 자동 동기화 |

#### Other Workflows

| Workflow | File | Purpose |
| -------- | ---- | ------- |
| Auto-merge | `auto-merge.yml` | 자동 병합 |
| Provision Queues | `provision-queues.yml` | 큐 프로비저닝 |
| Release | `release.yml` | 릴리스 관리 |
| Welcome | `welcome.yml` | 신규 기여자 환영 |

### Build & Script Tools

#### Node.js Scripts (package.json)

| Script | Purpose |
| ------ | ------- |
| `sync:data` | SSoT resume data 동기화 |
| `sync:pptx` | Shinhan PPTX 생성 (Python) |
| `sync:all` | 모든 동기화 실행 |
| `sync:proposals` | 제안 동기화 (CLI + Go) |
| `enrich:github` | GitHub 데이터 보강 (Go) |
| `enrich:skills` | 스킬 데이터 보강 |
| `enrich:ai` | AI 매칭 데이터 보강 |
| `automate:ssot` | SSoT 자동화 (sync + build + typecheck + test) |
| `automate:full` | 전체 자동화 (sync + lint + typecheck + test + build + validate) |
| `build` | Cloudflare Worker 번들 생성 |
| `deploy` | 배포 (현재 git push to master 사용) |
| `lint` | ESLint 실행 |
| `typecheck` | TypeScript 타입 검사 |
| `test` | Jest + Playwright 테스트 |
| `test:node` | Node.js 네이티브 테스트 |

#### Go Tools

| Tool | Location | Purpose |
| ---- | -------- | ------- |
| sync-resume-data | `tools/scripts/utils/` | 데이터 동기화 유틸리티 |
| apply-proposals | `tools/scripts/sync/` | 제안 적용 |
| enrichment/github | `tools/scripts/enrichment/github/` | GitHub 데이터 보강 |
| enrichment/skills | `tools/scripts/enrichment/skills/` | 스킬 데이터 보강 |
| enrichment/ai | `tools/scripts/enrichment/ai/` | AI 매칭 보강 |
| validate-cloudflare-native | `tools/ci/` | Cloudflare 네이티브 검증 |
| n8n binaries | `infrastructure/` | n8n 모니터링 워크플로우 |

---

## Quick Start

### Prerequisites

- **Node.js**: ≥ 22
- **npm**: workspaces 지원 버전
- **Docker**: (optional) local MCP server 실행 시
- **Python3**: PPTX 생성 시
- **exiftool**: 이미지 메타데이터 제거 시 (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies (npm workspaces)
npm install
```

### First Run

```bash
# SSoT 자동화 (sync + build + typecheck + test)
npm run automate:ssot

# 개발 서버 실행 (Miniflare)
npm run dev
```

### Deployment

> **Note**: Manual deployment is disabled. Use `git push to master` for Cloudflare Workers automatic deployment.

```bash
# Full automation pipeline
npm run automate:full
```

---

## Local Development

### Development Server

```bash
# Portfolio development (Miniflare)
npm run dev

# Build and watch mode
npm run build -- --watch

# Job server (Docker)
docker-compose up -d mcp-server
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern="unit|integration|e2e"

# Run with coverage
npm test -- --coverage

# Node native tests only
npm run test:node

# E2E tests (Playwright)
npx playwright test
```

### Code Quality

```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Fix auto-fixable issues
npm run lint -- --fix
```

### Data Synchronization

```bash
# Sync resume data
npm run sync:data

# Sync all (data + PPTX)
npm run sync:all

# Enrich data
npm run enrich:all
```

---

## Commands Reference

### Build Commands

| Command | Description |
| ------- | ----------- |
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Portfolio Worker 번들 생성 |
| `npm run build:full` | Full build (portfolio + CLI) |
| `npm run build:all` | 전체 빌드 |
| `npm run strip-exif` | PNG/WebP 이미지 EXIF 제거 |

### Development Commands

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Miniflare local development server |
| `npm run lint` | ESLint checking |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Jest + Playwright tests |
| `npm run test:node` | Node.js native tests only |

### Automation Commands

| Command | Description |
| ------- | ----------- |
| `npm run sync:data` | SSoT resume data 동기화 |
| `npm run sync:pptx` | Shinhan PPTX 생성 |
| `npm run sync:all` | 모든 동기화 실행 |
| `npm run sync:proposals` | 제안 동기화 |
| `npm run enrich:github` | GitHub 데이터 보강 |
| `npm run enrich:skills` | 스킬 데이터 보강 |
| `npm run enrich:ai` | AI 데이터 보강 |
| `npm run enrich:all` | 모든 보강 실행 |
| `npm run automate:ssot` | SSoT 자동화 (sync+build+typecheck+test) |
| `npm run automate:full` | 전체 자동화 |

### Version & Release Commands

| Command | Description |
| ------- | ----------- |
| `npm run version:bump` | Patch version bump |

### Workspace Scripts

| Workspace | Path | Description |
| --------- | ---- | ----------- |
| Portfolio | `apps/portfolio/` | Cloudflare Worker edge site |
| Job Server | `apps/job-server/` | MCP/job automation runtime |
| Job Dashboard | `apps/job-dashboard/` | Dashboard worker + workflows |
| CLI | `packages/cli/` | resume CLI |
| Data | `packages/data/` | SSoT data + JSON schema |
| Shared | `packages/shared/` | cross-package utilities |
| Types | `packages/types/` | canonical type definitions |
| Schemas | `packages/schemas/` | runtime Zod validation |
| Contracts | `packages/contracts/` | OpenAPI spec + Env interface |
| Env | `packages/env/` | env validation + type-safe secrets |

---

## Docker

### MCP Server (Job Automation Runtime)

```bash
# Build and run
docker-compose up -d mcp-server

# View logs
docker-compose logs -f mcp-server

# Stop
docker-compose down
```

### Manual Docker Build

```bash
docker build -t resume-mcp-server .
docker run -p 3000:3000 --env-file .env resume-mcp-server
```

---

## Project Structure

```text
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker + generated edge bundle
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # Dashboard worker + workflows
├── packages/
│   ├── cli/                # Resume CLI
│   ├── data/                # SSoT resumes + JSON schema
│   ├── shared/              # Cross-package utilities
│   ├── types/               # Canonical JSDoc/TS types
│   ├── schemas/             # Runtime Zod validation
│   ├── contracts/           # OpenAPI spec + Cloudflare Env
│   └── env/                 # Environment validation
├── tools/
│   ├── scripts/             # Build, sync, enrichment (Go + JS)
│   └── ci/                  # CI validation scripts
├── tests/                   # Jest + Playwright
├── infrastructure/          # Cloudflare, monitoring, n8n
├── docs/                    # Guides, ADRs, architecture docs
├── .github/
│   └── workflows/           # 34 GitHub Actions workflows
├── package.json             # Workspace root
├── Dockerfile
└── docker-compose.yml
```

---

## Contributing

### Workflow

1. **Fork** the repository
2. **Create** a feature branch: `feat/your-feature`
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
4. **Run** automation before PR:
   ```bash
   npm run automate:ssot
   ```
5. **Open** a Pull Request with description

### Code Standards

| Rule | Tool | Config |
| ---- | ---- | ------ |
| TypeScript | `tsc --noEmit` | `tsconfig.base.json` |
| Linting | ESLint | `eslint.config.cjs` |
| Testing | Jest + Playwright | `jest.config.cjs`, `playwright.config.js` |
| Formatting | Prettier (implied) | ESLint config |

### Security

- **Secrets Scanning**: Gitleaks + CodeQL on every PR
- **Dependency Review**: Automated vulnerability scanning
- **Secret Rotation**: See `docs/security/SECRET_ROTATION_PLAYBOOK.md`

### Documentation

- Update `docs/` when modifying architecture
- Use ADRs (`docs/adr/`) for architectural decisions
- Sync docs with `21_docs-sync.yml` workflow

---

## License

MIT License. See [LICENSE](LICENSE).

---

## Links

| Resource | URL |
| -------- | --- |
| Portfolio | https://resume.jclee.me |
| English Version | https://resume.jclee.me/en |
| Japanese Version | https://resume.jclee.me/ja |
| Health Check | https://resume.jclee.me/health |
| Metrics