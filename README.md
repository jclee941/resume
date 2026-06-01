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
- **SSoT 데이터**: `packages/data`의 정규화 이력서 데이터 (master `resume_data.json`)

### 공유 유틸리티 및 검증

- **공유 패키지**: 에러 핸들링, 로깅, 재시도 메커니즘, 서킷 브레이커, 암호화
- **타입 시스템**: JSDoc/TypeScript 정규 타입 정의 (런타임 의존성 없음)
- **스키마 검증**: Zod 기반 런타임 검증 스키마
- **CLI 도구**: 배포, 검증, DB操作的 명령줄 인터페이스

### 자체 호스팅 인프라

- **Docker 지원**: `Dockerfile` 및 `docker-compose.yml` 제공
- **MCP 서버**: 자체 호스팅 Model Context Protocol 서버
- **감시 인프라**: 자체 호스팅 감시 및 자동화 설정

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     Resume Monorepo                             │
├─────────────────────────────────────────────────────────────────┤
│  apps/                                                          │
│  ├── portfolio/      → Cloudflare Worker Edge Site              │
│  ├── job-server/     → MCP Job Automation Runtime               │
│  └── job-dashboard/  → Dashboard API + Workflows                │
├─────────────────────────────────────────────────────────────────┤
│  packages/                                                     │
│  ├── cli/            → Deployment/Verify CLI                     │
│  ├── data/           → SSoT Resume Data                         │
│  ├── env/            → Environment Validation + Type-safe Secrets│
│  ├── schemas/        → Zod Runtime Validation                    │
│  ├── shared/         → Errors, Logger, Retry, Crypto, UA        │
│  ├── types/          → Canonical JSDoc/TS Types (zero deps)     │
│  └── contracts/      → OpenAPI Spec + Worker Env Interface      │
├─────────────────────────────────────────────────────────────────┤
│  tools/             → CI, Build, Deploy, Verification Scripts   │
│  infrastructure/    → Cloudflare, Monitoring, n8n Config        │
│  .github/workflows/ → 37 GitHub Actions Workflows               │
└─────────────────────────────────────────────────────────────────┘
```

## 자동화 인벤토리 (Automation Inventory)

### GitHub Actions 워크플로우 (37개)

#### Pull Request 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **PR Checks** | `03_pr-checks.yml`, `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 (lint, test, build) |
| **PR Review** | `10_pr-review.yml`, `security/11_pr-review.yml` | 자동 PR 리뷰 (AI 기반) |
| **Bot Auto-Fix** | `14_bot-auto-fix.yml` | 봇 자동 수정 |
| **Auto-Merge** | `13_pr-auto-merge.yml`, `auto-merge.yml` | 자동 병합 |
| **Semantic PR** | `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| **Merged PR Cleanup** | `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| **Gitleaks** | `05_gitleaks.yml`, `45_reusable-gitleaks.yml` | 시크릿 스캐닝 |

#### Issue 및 Branch 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **Issue to Branch** | `02_issue-to-branch.yml` | 이슈 기반 브랜치 생성 |
| **Branch to PR** | `01_branch-to-pr.yml` | 브랜치 → PR 변환 |
| **Issue Management** | `18_issue-management.yml`, `43_reusable-issue-management.yml` | 이슈 관리 |
| **Issue Backfill** | `19_issue-backfill.yml` | 이슈 백필 |
| **Welcome** | `welcome.yml` | 신규 기여자 환영 |

#### Release 및 배포 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **Release** | `release.yml` | 메인 릴리스 워크플로우 |
| **Release Notes** | `24_release-notes.yml` | 자동 릴리스 노트 생성 |
| **Release Publish** | `25_release-publish.yml` | 릴리스 게시 |
| **Post-Deploy Verify** | `post-deploy-verify.yml` | 배포 후 검증 |

#### 문서 및 동기화 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **README Gen** | `20_readme-gen.yml` | 자동 README 생성 |
| **Docs Sync** | `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | 문서 동기화 |
| **Auto-Sync Data** | `auto-sync-data.yml` | 데이터 자동 동기화 |

#### 보안 및 규정 준수 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **CodeQL** | `06_codeql.yml` | 코드 보안 분석 |
| **Dependency Review** | `07_dependency-review.yml` | 의존성 검토 |
| **Scorecard** | `08_scorecard.yml` | OSS 보안 점수 |

#### CI/CD 및 유지보수 워크플로우

| 워크플로우 | 파일 | 설명 |
|-----------|------|------|
| **CI** | `ci.yml` | 메인 CI 파이프라인 |
| **CI Auto-Heal** | `60_ci-auto-heal.yml` | CI 자동 복구 |
| **CI Failure Issues** | `37_ci-failure-issues.yml` | CI 실패 시 이슈 생성 |
| **Actionlint** | `04_actionlint.yml` | 워크플로우 lint |
| **Dependabot Auto-Merge** | `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| **Provision Queues** | `provision-queues.yml` | 큐 프로비저닝 |
| **Downstream Health Check** | `29_downstream-health-check.yml` | 하위 서비스 상태 확인 |
| **Delete Standalone Job Worker** | `delete-standalone-job-worker.yml` |standalone Worker 삭제 |
| **Labeler** | `labeler.yml` | 자동 라벨링 |

### 인프라 도구

| 도구 | 위치 | 설명 |
|------|------|------|
| **Go 스크립트** | `tools/scripts/` | 데이터 동기화, 제안 적용, AI/US/기술 자동화 |
| **Python 스크립트** | `tools/scripts/build/` | PPTX 생성 (신한은행) |
| **Validate Cloudflare Native** | `tools/ci/validate-cloudflare-native.go` | Cloudflare 네이티브 검증 |

### npm 스크립트 (Workspace Commands)

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 생성 |
| `npm run sync:all` | 모든 동기화 실행 |
| `npm run enrich:github` | GitHub 데이터 enrichment |
| `npm run enrich:skills` | 기술 스택 enrichment |
| `npm run enrich:ai` | AI 기반 enrichment |
| `npm run automate:ssot` | SSoT 자동화 (sync + build + typecheck + test) |
| `npm run automate:full` | 전체 자동화 (sync + lint + typecheck + test + build + 검증) |
| `npm run build` | 포트폴리오 빌드 |
| `npm run deploy` | 배포 (비활성화됨 - CLI 사용 필요) |

## 빠른 시작 (Quick Start)

### 전제 조건

- **Node.js** ≥ 22
- **npm** ≥ 10.x
- **Docker** (선택, 자체 호스팅용)
- **Wrangler** (`npm install -g wrangler`)

### 설치

```bash
# 저장소 클론
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# 의존성 설치
npm install

# 데이터 동기화
npm run sync:data
```

### 개발

```bash
# 전체 개발 모드 (lint + typecheck + test)
npm run test

# 빌드
npm run build

# Cloudflare Workers 로컬 개발
cd apps/portfolio
wrangler dev
```

### Docker로 실행

```bash
# Docker Compose로 MCP 서버 실행
docker-compose up -d

# 상태 확인
docker-compose ps
```

## 로컬 개발

### 환경 변수

`.env` 파일 생성:

```bash
cp .env.example .env
# 편집기에 따라 내용을 채우세요
```

### 유닛 테스트

```bash
# 모든 테스트 실행
npm run test

# Jest 유닛 테스트만
npm run test:node

# 특정 패키지 테스트
npm run test --workspace=@resume/schemas
```

### Lint 및 타입 체크

```bash
# Lint
npm run lint

# 타입 체크
npm run typecheck
```

### CLI 사용

```bash
# CLI 도움말
npm run cli -- --help

# 배포 검증
npm run cli -- deploy --env production

# DB 작업
npm run cli -- db --help
```

## 명령어 참조 (Commands Reference)

### Workspace 루트 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | SSoT 이력서 데이터를 `packages/data`로 동기화 |
| `npm run sync:pptx` | Python 스크립트로 PPTX 생성 |
| `npm run sync:all` | 데이터 + PPTX 동기화 |
| `npm run sync:proposals` | 제안 동기화 (CLI + Go) |
| `npm run enrich:github` | GitHub enrichment (Go) |
| `npm run enrich:skills` | 기술 스택 enrichment (Go) |
| `npm run enrich:ai` | AI enrichment (Go) |
| `npm run enrich:all` | 모든 enrichment 실행 |
| `npm run automate:ssot` | SSoT 자동화 파이프라인 |
| `npm run automate:full` | 전체 자동화 파이프라인 |
| `npm run build` | 포트폴리오 Worker 빌드 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm run test` | Jest + Playwright 테스트 |
| `npm run test:node` | Jest Node 테스트만 |
| `npm run version:bump` | 버전 패치 업데이트 |

### Docker 명령어

```bash
# 이미지 빌드
docker build -t resume-mcp-server .

# 컨테이너 실행
docker run -p 3000:3000 --env-file .env resume-mcp-server

# Docker Compose
docker-compose up -d
docker-compose down
docker-compose logs -f
```

## 기여 가이드 (Contribution Guide)

### 브랜치 전략

1. **issue에서 브랜치 생성**: `02_issue-to-branch.yml` 워크플로우가 자동 생성
2. **PR 작성**: `01_branch-to-pr.yml`이 브랜치를 PR로 변환
3. **리뷰 후 병합**: `13_pr-auto-merge.yml` 또는 수동 병합
4. **정리**: `15_merged-pr-cleanup.yml`이 브랜치 정리

### 커밋 메시지 규칙

- **[SemVer](https://semver.org/)** 형식 사용
- `09_semantic-pr.yml`이 시맨틱 커밋 검증
- 권장 형식: `type(scope): description`

  ```
  feat(job-server): add Wanted API client
  fix(portfolio): resolve edge rendering issue
  docs(readme): update architecture diagram
  ```

### PR 리뷰 프로세스

1. **자동 검사**: `03_pr-checks.yml` (lint, test, build)
2. **보안 검사**: `06_codeql.yml`, `05_gitleaks.yml`
3. **AI 리뷰**: `10_pr-review.yml` (pr-agent 기반)
4. **수동 리뷰**: 유지보수 담당자 검토
5. **자동 병합**: 조건 충족 시 `13_pr-auto-merge.yml`

### 테스트 작성

```bash
# 유닛 테스트
# 위치: packages/*/src/__tests__/
npm run test --workspace=@resume/schemas

# 통합 테스트
# 위치: tests/integration/
npm run test:integration

# E2E 테스트
# 위치: tests/e2e/
npx playwright test
```

자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md) 및 [AGENTS.md](./AGENTS.md)를 참조하세요.

---

# English

## Overview

**Resume** is a monorepo combining a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), Single Source of Truth (SSoT) resume data, and self-hosted observability infrastructure.

## Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-powered edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Errors, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | JSDoc/TS canonical type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/cli** | `packages/cli/` | Deployment, verification, DB operation CLI tools |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio and Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based automated application system
- **SSoT Data**: Normalized resume data in `packages/data`

### Shared Utilities and Validation

- **Shared Packages**: Error handling, logging, retry mechanisms, circuit breakers, encryption
- **Type System**: JSDoc/TypeScript canonical type definitions (no runtime dependencies)
- **Schema Validation**: Zod-based runtime validation schemas
- **CLI Tools**: Deployment, verification, database operation command-line interface

### Self-Hosted Infrastructure

- **Docker Support**: `Dockerfile` and `docker-compose.yml` provided
- **MCP Server**: Self-hosted Model Context Protocol server
- **Observability Infrastructure**: Self-hosted monitoring and automation configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Resume Monorepo                             │
├─────────────────────────────────────────────────────────────────┤
│  apps/                                                          │
│  ├── portfolio/      → Cloudflare Worker Edge Site              │
│  ├── job-server/     → MCP Job Automation Runtime               │
│  └── job-dashboard/  → Dashboard API + Workflows                │
├─────────────────────────────────────────────────────────────────┤
│  packages/                                                     │
│  ├── cli/            → Deployment/Verify CLI                     │
│  ├── data/           → SSoT Resume Data                         │
│  ├── env/            → Environment Validation + Type-safe Secrets│
│  ├── schemas/        → Zod Runtime Validation                    │
│  ├── shared/         → Errors, Logger, Retry, Crypto, UA        │
│  ├── types/          → Canonical JSDoc/TS Types (zero deps)     │
│  └── contracts/      → OpenAPI Spec + Worker Env Interface      │
├─────────────────────────────────────────────────────────────────┤
│  tools/             → CI, Build, Deploy, Verification Scripts   │
│  infrastructure/    → Cloudflare, Monitoring, n8n Config        │
│  .github/workflows/ → 37 GitHub Actions Workflows               │
└─────────────────────────────────────────────────────────────────┘
```

## Automation Inventory

### GitHub Actions Workflows (37 Total)

#### Pull Request Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **PR Checks** | `03_pr-checks.yml`, `44_reusable-pr-checks.yml` | Reusable PR checks (lint, test, build) |
| **PR Review** | `10_pr-review.yml`, `security/11_pr-review.yml` | Automated PR review (AI-powered) |
| **Bot Auto-Fix** | `14_bot-auto-fix.yml` | Bot automatic fixes |
| **Auto-Merge** | `13_pr-auto-merge.yml`, `auto-merge.yml` | Automatic merging |
| **Semantic PR** | `09_semantic-pr.yml` | Semantic PR validation |
| **Merged PR Cleanup** | `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| **Gitleaks** | `05_gitleaks.yml`, `45_reusable-gitleaks.yml` | Secret scanning |

#### Issue and Branch Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **Issue to Branch** | `02_issue-to-branch.yml` | Issue-based branch creation |
| **Branch to PR** | `01_branch-to-pr.yml` | Branch to PR conversion |
| **Issue Management** | `18_issue-management.yml`, `43_reusable-issue-management.yml` | Issue management |
| **Issue Backfill** | `19_issue-backfill.yml` | Issue backfilling |
| **Welcome** | `welcome.yml` | New contributor welcome |

#### Release and Deploy Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **Release** | `release.yml` | Main release workflow |
| **Release Notes** | `24_release-notes.yml` | Automated release notes generation |
| **Release Publish** | `25_release-publish.yml` | Release publishing |
| **Post-Deploy Verify** | `post-deploy-verify.yml` | Post-deployment verification |

#### Documentation and Sync Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **README Gen** | `20_readme-gen.yml` | Automated README generation |
| **Docs Sync** | `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | Documentation synchronization |
| **Auto-Sync Data** | `auto-sync-data.yml` | Automatic data synchronization |

#### Security and Compliance Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **CodeQL** | `06_codeql.yml` | Code security analysis |
| **Dependency Review** | `07_dependency-review.yml` | Dependency review |
| **Scorecard** | `08_scorecard.yml` | OSS security scoring |

#### CI/CD and Maintenance Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **CI** | `ci.yml` | Main CI pipeline |
| **CI Auto-Heal** | `60_ci-auto-heal.yml` | CI automatic healing |
| **CI Failure Issues** | `37_ci-failure-issues.yml` | CI failure issue creation |
| **Actionlint** | `04_actionlint.yml` | Workflow linting |
| **Dependabot Auto-Merge** | `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| **Provision Queues** | `provision-queues.yml` | Queue provisioning |
| **Downstream Health Check** | `29_downstream-health-check.yml` | Downstream service health check |
| **Delete Standalone Job Worker** | `delete-standalone-job-worker.yml` | Standalone Worker deletion |
| **Labeler** | `labeler.yml` | Automatic labeling |

### Infrastructure Tools

| Tool | Location | Description |
|------|----------|-------------|
| **Go Scripts** | `tools/scripts/` | Data sync, proposal apply, AI/Skills/GitHub enrichment |
| **Python Scripts** | `tools/scripts/build/` | PPTX generation (Shinhan Bank) |
| **Validate Cloudflare Native** | `tools/ci/validate-cloudflare-native.go` | Cloudflare native validation |

### npm Scripts (Workspace Commands)

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data to `packages/data` |
| `npm run sync:pptx` | Generate PPTX via Python script |
| `npm run sync:all` | Run all sync operations |
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Tech stack enrichment |
| `npm run enrich:ai` | AI-based enrichment |
| `npm run automate:ssot` | SSoT automation pipeline (sync + build + typecheck + test) |
| `npm run automate:full` | Full automation pipeline (sync + lint + typecheck + test + build + validation) |
| `npm run build` | Build portfolio Worker |
| `npm run deploy` | Deploy (disabled - use CLI) |

## Quick Start

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10.x
- **Docker** (optional, for self-hosting)
- **Wrangler** (`npm install -g wrangler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install dependencies
npm install

# Sync data
npm run sync:data
```

### Development

```bash
# Full development mode (lint + typecheck + test)
npm run test

# Build
npm run build

# Cloudflare Workers local development
cd apps/portfolio
wrangler dev
```

### Docker

```bash
# Run MCP server via Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

## Local Development

### Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
# Fill in your values
```

### Unit Tests

```bash
# Run all tests
npm run test

# Jest unit tests only
npm run test:node

# Specific package tests
npm run test --workspace=@resume/schemas
```

### Lint and Type Check

```bash
# Lint
npm run lint

# Type check
npm run typecheck
```

### CLI Usage

```bash
# CLI help
npm run cli -- --help

# Deploy verification
npm run cli -- deploy --env production

# DB operations
npm run cli -- db --help
```

## Commands Reference

### Workspace Root Scripts

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync SSoT resume data to `packages/data` |
| `npm run sync:pptx` | Generate PPTX via Python script |
| `npm run sync:all` | Data + PPTX sync |
| `npm run sync:proposals` | Proposal sync (CLI + Go) |
| `npm run enrich:github` | GitHub enrichment (Go) |
| `npm run enrich:skills` | Tech stack enrichment (Go) |
| `npm run enrich:ai` | AI enrichment (Go) |
| `npm run enrich:all` | Run all enrichment |
| `npm run automate:ssot` | SSoT automation pipeline |
| `npm run automate:full` | Full automation pipeline |
| `npm run build` | Build portfolio Worker |
| `npm run build:full` | Build portfolio + CLI |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run test` | Jest + Playwright tests |
| `npm run test:node` | Jest Node tests only |
| `npm run version:bump` | Version patch bump |

### Docker Commands

```bash
# Build image
docker build -t resume-mcp-server .

# Run container
docker run -p 3000:3000 --env-file .env resume-mcp-server

# Docker Compose
docker-compose up -d
docker-compose down
docker-compose logs -f
```

## Contribution Guide

### Branch Strategy

1. **Create branch from issue**: `02_issue-to-branch.yml` workflow auto-creates
2. **Create PR**: `01_branch-to-pr.yml` converts branch to PR
3. **Merge after review**: `13_pr-auto-merge.yml` or manual merge
4. **Cleanup**: `15_merged-pr-cleanup.yml` cleans up branches

### Commit Message Rules

- Use **[SemVer](https://semver.org/)** format
- `09_semantic-pr.yml` validates semantic commits
- Recommended format: `type(scope): description`

  ```
  feat(job-server): add Wanted API client
  fix(portfolio): resolve edge rendering issue
  docs(readme): update architecture diagram
  ```

### PR Review Process

1. **Automated checks**: `03_pr-checks.yml` (lint, test, build)
2. **Security checks**: `06_codeql.yml`, `05_gitleaks.yml`
3. **AI review**: `10_pr-review.yml` (pr-agent powered)
4. **Manual review**: Maintainer review
5. **Auto-merge**: `13_pr-auto-merge.yml` when conditions are met

### Writing Tests

```bash
# Unit tests
# Location: packages/*/src/__tests__/
npm run test --workspace=@resume/schemas

# Integration tests
# Location: tests/integration/
npm run test:integration

# E2E tests
# Location: tests/e2e/
npx playwright test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md) for details.

---

## External Links

- **pr-agent Documentation**: [https://qodo-ai/pr-agent](https://qodo-ai/pr-agent)
- **CLI Proxy API**: [https://cliproxy.jclee.me](https://cliproxy.jclee.me)
- **Bot Documentation**: [https://bot.jclee.me](https://bot.jclee.me)

## License

MIT License - see [LICENSE](./LICENSE) file for details.