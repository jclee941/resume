# Resume Portfolio Monorepo

> **이 README는双语 (한국어/English) 버전입니다.**
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
| **packages/cli** | `packages/cli/` | 배포, 검증, DB 조작 CLI 도구 |
| **packages/env** | `packages/env/` | 환경 검증 + 타입 세이프 시크릿 |
| **packages/data** | `packages/data/` | SSoT 이력서 데이터 (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | 에러, 로거, 재시도, 서킷 브레이커, 암호화 유틸리티 |
| **packages/types** | `packages/types/` | JSDoc/TS 정규 타입 정의 (런타임 의존성 없음) |
| **packages/schemas** | `packages/schemas/` | Zod 런타임 검증 스키마 |
| **packages/contracts** | `packages/contracts/` | OpenAPI 스펙 + Cloudflare Worker Env 인터페이스 |

## 주요 기능

### 포트폴리오 및 채용 자동화

- **포트폴리오 Worker**: Cloudflare Workers로 구동되는 고성능 엣지 사이트
- **채용 자동화**: Wanted/JobKorea MCP 기반 자동 지원 시스템
- **SSoT 데이터**: `packages/data`의 정규화된 이력서 데이터 중심
- **자체 호스팅 감시**: n8n 워크플로우 + Cloudflare 대시보드

### 공유 인프라

- **공유 타입**: 런타임 의존성 없는 JSDoc/TS 타입 정의
- **런타임 검증**: Zod 스키마로 API 페이로드 및 이력서 검증
- **교차 패키지 유틸리티**: 에러 처리, 재시도 로직, 서킷 브레이커, 암호화

## 자동화 인벤토리

### GitHub Actions 워크플로우 (37개)

| 카테고리 | 워크플로우 파일 | 설명 |
|----------|----------------|------|
| **PR/Lifecycle** | `01_branch-to-pr.yml`, `13_pr-auto-merge.yml`, `14_bot-auto-fix.yml`, `15_merged-pr-cleanup.yml` | PR 생성, 자동 병합, 봇 수정, 병합 후 정리 |
| **코드 품질** | `03_pr-checks.yml`, `04_actionlint.yml`, `05_gitleaks.yml`, `06_codeql.yml`, `07_dependency-review.yml`, `08_scorecard.yml` | Lint, 시크릿 스캔, 코드 분석, 의존성 검토 |
| **릴리스** | `24_release-notes.yml`, `25_release-publish.yml`, `release.yml` | 바이위클리 릴리스 노트 생성 및 게시 |
| **이슈 관리** | `18_issue-management.yml`, `19_issue-backfill.yml`, `43_reusable-issue-management.yml` | 이슈 자동 라벨링, 백필 |
| **문서화** | `20_readme-gen.yml`, `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | README 생성, 문서 동기화 |
| **CI/CD** | `ci.yml`, `60_ci-auto-heal.yml`, `auto-sync-data.yml` | 빌드, 테스트, CI 자동 복구, 데이터 동기화 |
| **배포** | `post-deploy-verify.yml`, `delete-standalone-job-worker.yml`, `provision-queues.yml` | 배포 후 검증, 워커 정리, 큐 프로비저닝 |
| **기타** | `09_semantic-pr.yml`, `10_pr-review.yml`, `12_dependabot-auto-merge.yml`, `29_downstream-health-check.yml`, `37_ci-failure-issues.yml`, `labeler.yml`, `welcome.yml` | 시맨틱 PR, PR 리뷰, Dependabot, 하위 스트림 상태 확인, CI 실패 이슈, 라벨러, 환영 메시지 |

### README 생성 도구

- **현재 모델**: `minimax-m2.7` (프라이머리), `gpt-5.5` (폴백 via CLIProxyAPI)
- **호출 체인**: GitHub Actions → CLIProxyAPI → 외부 AI 모델
- **외부 링크**: [cliproxy.jclee.me](https://cliproxy.jclee.me), [bot.jclee.me](https://bot.jclee.me)

## 빠른 시작

### 전제 조건

- Node.js ≥ 22
- Docker & Docker Compose
- Cloudflare Wrangler (deploy 시)
- Go 1.21+ (일부 빌드 도구)

### 설치

```bash
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent
npm install
```

### 환경 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 시크릿을 설정
```

### 개발 실행

```bash
# 모든 워크스페이스 빌드
npm run build:all

# portfolio Worker 개발 서버
npm run dev --workspace=@resume/portfolio-worker

# job-server 시작 (Docker)
docker-compose up -d

# 테스트 실행
npm run test
```

## 로컬 개발

### 모노레포 구조

```
pr-agent/
├── apps/
│   ├── portfolio/        # 포트폴리오 Worker (Cloudflare Workers)
│   ├── job-server/       # MCP 채용 자동화 서버
│   └── job-dashboard/    # 대시보드 API
├── packages/
│   ├── cli/              # resume CLI 도구
│   ├── env/              # 환경 검증
│   ├── data/             # SSoT 이력서 데이터
│   ├── shared/           # 공유 유틸리티
│   ├── types/            # 타입 정의
│   ├── schemas/          # Zod 스키마
│   └── contracts/        # OpenAPI 스펙
├── tools/
│   └── scripts/          # CI, 빌드, 배포 스크립트
└── .github/
    └── workflows/        # GitHub Actions
```

### 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | SSoT 이력서 데이터 동기화 |
| `npm run sync:pdf` | PDF 생성 (Go) |
| `npm run sync:pptx` | PPTX 생성 (Python) |
| `npm run enrich:github` | GitHub 데이터 Enrichment |
| `npm run enrich:skills` | 스킬 데이터 Enrichment |
| `npm run enrich:ai` | AI 기반 Enrichment |
| `npm run enrich:all` | 모든 Enrichment 실행 |
| `npm run build` | 데이터 동기화 + Worker 빌드 |
| `npm run automate:ssot` | SSoT 전체 자동화 |
| `npm run automate:full` | 전체 빌드/테스트/검증 |

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Resume Monorepo                          │
├─────────────────────────────────────────────────────────────┤
│  apps/               │  packages/         │  tools/          │
│  ├── portfolio       │  ├── cli           │  ├── scripts/    │
│  │   (Worker)        │  ├── env           │  │   ├── build/ │
│  ├── job-server      │  ├── data          │  │   ├── sync/  │
│  │   (MCP Runtime)   │  ├── shared        │  │   └── enrich/│
│  └── job-dashboard   │  ├── types         │  └── ci/        │
│                      │  ├── schemas       │                 │
│                      │  └── contracts     │                 │
├─────────────────────────────────────────────────────────────┤
│              .github/workflows (37 워크플로우)                │
│  PR/Lifecycle │ Code Quality │ Release │ Docs │ CI/CD       │
└─────────────────────────────────────────────────────────────┘
```

## 명령어 참고

### npm 스크립트 (package.json)

| 스크립트 | 설명 |
|----------|------|
| `build` | 데이터 동기화 후 portfolio Worker 빌드 |
| `build:all` | portfolio + CLI 전체 빌드 |
| `lint` | ESLint 실행 |
| `typecheck` | TypeScript 타입检查 |
| `test` | Jest 테스트 실행 |
| `test:node` | Node 환경 테스트 |
| `sync:all` | 데이터 + PDF + PPTX 동기화 |
| `sync:proposals` | 제안서 동기화 (CLI + Go) |
| `automate:ssot` | 동기화 + 빌드 + 타입检查 + 테스트 |
| `automate:full` | 전체 자동화 (sync + lint + test + build + 검증) |

### CLI 명령어

```bash
# 배포
resume deploy

# 검증
resume verify

# DB 조작
resume db <command>
```

## 기여 가이드

Contributing 가이드를 확인해주세요: [CONTRIBUTING.md](./CONTRIBUTING.md)

1. Fork 후 브랜치 생성 (`feat/...`, `fix/...`, `docs/...`)
2. 변경 사항 작성
3. 테스트 실행 (`npm run test`)
4. PR 생성 (시맨틱 커밋 메시지 사용)
5. 워크플로우 통과 대기

---

# English

## Overview

**Resume** is a monorepo integrating a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), Single Source of Truth (SSoT) resume data, and self-hosted observability infrastructure.

## Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-based edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/cli** | `packages/cli/` | Deployment, verification, DB manipulation CLI |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Error, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | JSDoc/TS canonical type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized resume data centered in `packages/data`
- **Self-hosted Observability**: n8n workflows + Cloudflare dashboards

### Shared Infrastructure

- **Shared Types**: JSDoc/TS type definitions with zero runtime dependencies
- **Runtime Validation**: Zod schemas for API payloads and resume validation
- **Cross-package Utilities**: Error handling, retry logic, circuit breakers, encryption

## Automation Inventory

### GitHub Actions Workflows (37 total)

| Category | Workflow Files | Description |
|----------|----------------|-------------|
| **PR/Lifecycle** | `01_branch-to-pr.yml`, `13_pr-auto-merge.yml`, `14_bot-auto-fix.yml`, `15_merged-pr-cleanup.yml` | PR creation, auto-merge, bot fixes, post-merge cleanup |
| **Code Quality** | `03_pr-checks.yml`, `04_actionlint.yml`, `05_gitleaks.yml`, `06_codeql.yml`, `07_dependency-review.yml`, `08_scorecard.yml` | Lint, secret scan, code analysis, dependency review |
| **Release** | `24_release-notes.yml`, `25_release-publish.yml`, `release.yml` | Biweekly release notes generation and publishing |
| **Issue Management** | `18_issue-management.yml`, `19_issue-backfill.yml`, `43_reusable-issue-management.yml` | Auto-labeling, backfill |
| **Documentation** | `20_readme-gen.yml`, `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | README generation, doc sync |
| **CI/CD** | `ci.yml`, `60_ci-auto-heal.yml`, `auto-sync-data.yml` | Build, test, CI auto-heal, data sync |
| **Deployment** | `post-deploy-verify.yml`, `delete-standalone-job-worker.yml`, `provision-queues.yml` | Post-deploy verification, worker cleanup, queue provisioning |
| **Miscellaneous** | `09_semantic-pr.yml`, `10_pr-review.yml`, `12_dependabot-auto-merge.yml`, `29_downstream-health-check.yml`, `37_ci-failure-issues.yml`, `labeler.yml`, `welcome.yml` | Semantic PR, PR review, Dependabot, downstream health check, CI failure issues, labeler, welcome message |

### README Generation Tool

- **Current Model**: `minimax-m2.7` (primary), `gpt-5.5` (fallback via CLIProxyAPI)
- **Invocation Chain**: GitHub Actions → CLIProxyAPI → External AI model
- **External Links**: [cliproxy.jclee.me](https://cliproxy.jclee.me), [bot.jclee.me](https://bot.jclee.me)

## Quick Start

### Prerequisites

- Node.js ≥ 22
- Docker & Docker Compose
- Cloudflare Wrangler (for deploy)
- Go 1.21+ (for some build tools)

### Installation

```bash
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with required secrets
```

### Development

```bash
# Build all workspaces
npm run build:all

# Portfolio Worker dev server
npm run dev --workspace=@resume/portfolio-worker

# Start job-server (Docker)
docker-compose up -d

# Run tests
npm run test
```

## Local Development

### Monorepo Structure

```
pr-agent/
├── apps/
│   ├── portfolio/        # Portfolio Worker (Cloudflare Workers)
│   ├── job-server/       # MCP job automation server
│   └── job-dashboard/    # Dashboard API
├── packages/
│   ├── cli/              # resume CLI tools
│   ├── env/              # Environment validation
│   ├── data/             # SSoT resume data
│   ├── shared/           # Shared utilities
│   ├── types/            # Type definitions
│   ├── schemas/          # Zod schemas
│   └── contracts/        # OpenAPI spec
├── tools/
│   └── scripts/          # CI, build, deploy scripts
└── .github/
    └── workflows/        # GitHub Actions
```

### Key Scripts

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync SSoT resume data |
| `npm run sync:pdf` | Generate PDF (Go) |
| `npm run sync:pptx` | Generate PPTX (Python) |
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Skills data enrichment |
| `npm run enrich:ai` | AI-based enrichment |
| `npm run enrich:all` | Run all enrichment tasks |
| `npm run build` | Sync data + Worker build |
| `npm run automate:ssot` | Full SSoT automation |
| `npm run automate:full` | Complete automation (sync + lint + test + build + validate) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Resume Monorepo                          │
├─────────────────────────────────────────────────────────────┤
│  apps/               │  packages/         │  tools/          │
│  ├── portfolio       │  ├── cli           │  ├── scripts/    │
│  │   (Worker)        │  ├── env           │  │   ├── build/ │
│  ├── job-server      │  ├── data          │  │   ├── sync/  │
│  │   (MCP Runtime)   │  ├── shared        │  │   └── enrich/│
│  └── job-dashboard   │  ├── types         │  └── ci/         │
│                      │  ├── schemas       │                  │
│                      │  └── contracts     │                  │
├─────────────────────────────────────────────────────────────┤
│              .github/workflows (37 workflows)               │
│  PR/Lifecycle │ Code Quality │ Release │ Docs │ CI/CD       │
└─────────────────────────────────────────────────────────────┘
```

## Command Reference

### npm Scripts (package.json)

| Script | Description |
|--------|-------------|
| `build` | Sync data + build portfolio Worker |
| `build:all` | Build portfolio + CLI |
| `lint` | Run ESLint |
| `typecheck` | TypeScript type checking |
| `test` | Run Jest tests |
| `test:node` | Node environment tests |
| `sync:all` | Sync data + PDF + PPTX |
| `sync:proposals` | Sync proposals (CLI + Go) |
| `automate:ssot` | Sync + build + typecheck + test |
| `automate:full` | Full automation (sync + lint + test + build + validate) |

### CLI Commands

```bash
# Deploy
resume deploy

# Verify
resume verify

# DB manipulation
resume db <command>
```

## Contributing

Please see the Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

1. Fork and create a branch (`feat/...`, `fix/...`, `docs/...`)
2. Make your changes
3. Run tests (`npm run test`)
4. Create a PR (use semantic commit messages)
5. Wait for workflow passing

---

## Badges Reference

| Badge | Source |
|-------|--------|
| CI | [`ci.yml`](.github/workflows/ci.yml) |
| Release | [`release.yml`](.github/workflows/release.yml) |
| License | [`LICENSE`](LICENSE) |
| Node.js | [nodejs.org](https://nodejs.org) |
| Cloudflare Workers | [workers.cloudflare.com](https://workers.cloudflare.com) |
| Biweekly Release | [`CHANGELOG.md`](CHANGELOG.md) |

---

*Generated by [minimax-m2.7](https://cliproxy.jclee.me) with [gpt-5.5](https://bot.jclee.me) fallback*