# Resume Portfolio Monorepo

> **此 README 為雙語 (한국어/English) 版本**
> **This README is bilingual (Korean/English).**

[![CI](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml)
[![Release](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

**Version:** 1.40.11

---

# 한국어 (Korean)

## 개요

**Resume**는 Cloudflare Worker 기반 포트폴리오 사이트, 채용 자동화 워크플로우 (Wanted/JobKorea), 단일 진실 공급원(SSoT) 이력서 데이터, 그리고 자체 호스팅 감시 인프라를 통합한 모노레포입니다.

### 주요 구성 요소

| 구성 요소 | 설명 |
|-----------|------|
| **apps/portfolio** | Cloudflare Worker 기반의 엣지 최적화 포트폴리오 사이트 |
| **apps/job-server** | MCP 기반 채용 자동화 런타임 |
| **apps/job-dashboard** | 대시보드 API 및 워크플로우 핸들러 |
| **packages/data** | SSoT 이력서 데이터 (master resume_data.json) |
| **packages/shared** | 에러, 로거, 재시도, 서킷 브레이커, 암호화 유틸리티 |
| **packages/types** | JSDoc/TS 정규 타입 정의 |
| **packages/schemas** | Zod 런타임 검증 스키마 |
| **packages/cli** | 배포, 검증, DB操作的 CLI 도구 |

## 주요 기능

- **포트폴리오 Worker**: Cloudflare Workers로 구동되는 고성능 엣지 사이트
- **채용 자동화**: Wanted/JobKorea MCP 기반 자동 지원 시스템
- **SSoT 데이터**: packages/data의 정규화된 이력서 데이터
- **대시보드 API**: 워크플로우 핸들러 및 채용 관리 API
- **공유 패키지**: 타입 세이프 스키마, 재시도/서킷 브레이커, 암호화 유틸리티
- **CLI 도구**: 배포, 검증, DB 명령어 지원

## 아키텍처

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker 포트폴리오 사이트
│   ├── job-server/         # MCP/채용 자동화 런타임
│   └── job-dashboard/      # 대시보드 API Worker
├── packages/
│   ├── cli/                # resume CLI (deploy, verify, db)
│   ├── env/                # 환경 검증 + 타입 세이프 시크릿
│   ├── data/               # SSoT 이력서 및 JSON 스키마
│   ├── shared/             # 유틸리티: errors, logger, retry, crypto, rate-limit, auth, browser, clients
│   ├── types/              # 정규 JSDoc/TS 타입 정의 (런타임 의존성 없음)
│   ├── schemas/            # 런타임 Zod 검증 스키마
│   └── contracts/          # OpenAPI 스펙 + Cloudflare Worker Env 인터페이스
├── tools/                  # CI, 빌드, 배포, 검증 스크립트 (Go + JS)
├── tests/                  # Jest, 통합, Playwright E2E
├── infrastructure/         # Cloudflare, 모니터링, n8n, DB 설정
├── docs/                   # 가이드, ADR, 아키텍처, 컨벤션, 보안
├── supabase/               # Supabase Edge Functions
└── .github/                # CI/릴리스/유지보수 제어 영역
```

## 자동화 인벤토리

### GitHub Actions 워크플로우 (37개)

| 번호 | 워크플로우 파일 | 목적 |
|------|----------------|------|
| 01 | `01_branch-to-pr.yml` | 브랜치에서 PR로 자동 변환 |
| 02 | `02_issue-to-branch.yml` | 이슈에서 브랜치 자동 생성 |
| 03 | `03_pr-checks.yml` | PR 통합 검사 |
| 04 | `04_actionlint.yml` | GitHub Actions 린트 |
| 05 | `05_gitleaks.yml` | 시크릿 스캔 |
| 06 | `06_codeql.yml` | 코드 품질 분석 |
| 07 | `07_dependency-review.yml` | 의존성 보안 검토 |
| 08 | `08_scorecard.yml` | 보안 점수 카드 |
| 09 | `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| 10 | `10_pr-review.yml` | AI 기반 PR 리뷰 |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| 13 | `13_pr-auto-merge.yml` | PR 자동 병합 |
| 14 | `14_bot-auto-fix.yml` | 봇 자동 수정 |
| 15 | `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| 18 | `18_issue-management.yml` | 이슈 관리 |
| 19 | `19_issue-backfill.yml` | 이슈 백필 |
| 20 | `20_readme-gen.yml` | README 생성 |
| 21 | `21_docs-sync.yml` | 문서 동기화 |
| 24 | `24_release-notes.yml` | 릴리스 노트 생성 |
| 25 | `25_release-publish.yml` | 릴리스 게시 |
| 29 | `29_downstream-health-check.yml` | 다운스트림 상태 확인 |
| 37 | `37_ci-failure-issues.yml` | CI 실패 이슈 생성 |
| 42 | `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |
| 43 | `43_reusable-issue-management.yml` | 재사용 가능한 이슈 관리 |
| 44 | `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 |
| 45 | `45_reusable-gitleaks.yml` | 재사용 가능한 시크릿 스캔 |
| 60 | `60_ci-auto-heal.yml` | CI 자동 복구 |
| - | `auto-merge.yml` | 자동 병합 |
| - | `auto-sync-data.yml` | 데이터 자동 동기화 |
| - | `ci.yml` | 메인 CI 파이프라인 |
| - | `delete-standalone-job-worker.yml` | standalone job worker 삭제 |
| - | `labeler.yml` | 라벨 자동 관리 |
| - | `post-deploy-verify.yml` | 배포 후 검증 |
| - | `provision-queues.yml` | 큐 프로비저닝 |
| - | `release.yml` | 릴리스 워크플로우 |
| - | `welcome.yml` | 새 기여자 환영 |
| - | `security/11_pr-review.yml` | 보안 PR 리뷰 |

### Go 자동화 도구 (0개)

현재 Go 기반 자동화 도구는 없습니다. 모든 자동화는 GitHub Actions 워크플로우를 통해 관리됩니다.

## 빠른 시작

### 전제 조건

- **Node.js**: ≥22
- **Docker**: (선택사항, Docker Compose 사용 시)
- **npm**: Latest

### 설치

```bash
# 모노레포 의존성 설치
npm ci

# 또는 개발용 설치
npm install
```

### 환경 설정

```bash
# 환경 변수 복사
cp .env.example .env

# 필수 환경 변수 설정
# - CLOUDFLARE_API_TOKEN
# - DATABASE_URL
# - WANTED_API_KEY
```

### 빌드

```bash
# 데이터 동기화 + 포트폴리오 빌드
npm run build

# 전체 빌드 (CLI 포함)
npm run build:full

# 모든 앱/패키지 빌드
npm run build:all
```

### 실행

```bash
# Docker Compose로 MCP 서버 실행
docker-compose up -d

# 로컬 개발 서버 (각 앱별)
cd apps/portfolio && npm run dev
cd apps/job-server && npm run dev
cd apps/job-dashboard && npm run dev
```

## 로컬 개발

### 워크스페이스 구조

이 프로젝트는 npm workspaces를 사용합니다:

```bash
# 모든 워크스페이스 확인
npm workspaces list

# 특정 워크스페이스에서 명령 실행
npm run <script> --workspace=@resume/portfolio-worker
npm run <script> --workspace=@resume/job-server
npm run <script> --workspace=@resume/cli
```

### 데이터 동기화

```bash
# 이력서 데이터 동기화
npm run sync:data

# PPTX 생성 (Python 스크립트)
npm run sync:pptx

# 모든 동기화 실행
npm run sync:all

# 제안서 동기화
npm run sync:proposals
```

### 자동화 스크립트

```bash
# GitHub Enrique
npm run enrich:github

# 기술 스택 Enrique
npm run enrich:skills

# AI Enrique
npm run enrich:ai

# 모든 Enrique 실행
npm run enrich:all
```

### 테스트

```bash
# 모든 테스트 실행
npm test

# 노드 환경 테스트
npm run test:node

# 특정 패키지 테스트
npm test --workspace=@resume/schemas
```

### 린트 및 타입 체크

```bash
# 린트 실행
npm run lint

# 타입 체크
npm run typecheck

# 모두 실행 (sync, lint, typecheck, test, build)
npm run automate:full
```

## 명령어 참조

### 빌드 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run build` | 데이터 동기화 + 포트폴리오 빌드 |
| `npm run build:portfolio` | 포트폴리오만 빌드 |
| `npm run build:full` | CLI 포함 전체 빌드 |
| `npm run build:all` | 모든 앱/패키지 빌드 |

### 동기화 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 생성 |
| `npm run sync:all` | 모든 동기화 |
| `npm run sync:proposals` | 제안서 동기화 |

### 자동화 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run enrich:github` | GitHub 데이터 Enrique |
| `npm run enrich:skills` | 기술 데이터 Enrique |
| `npm run enrich:ai` | AI Enrique |
| `npm run enrich:all` | 모든 Enrique 실행 |
| `npm run automate:ssot` | SSoT 자동화 (sync + build + typecheck + test:node) |
| `npm run automate:full` | 전체 자동화 (sync:all + lint + typecheck + test + build + 검증) |

### CLI 명령어

```bash
# CLI 도구 사용
npx resume deploy
npx resume verify
npx resume db <subcommand>

# 또는 로컬 개발 시
cd packages/cli && npm run dev
```

## 기여 가이드

### 기여 방법

1. **이슈 생성**: 먼저 GitHub 이슈를 생성하여 작업 내용을 논의하세요.
2. **브랜치 생성**: `02_issue-to-branch.yml` 워크플로우를 사용하거나 수동으로 브랜치를 생성하세요.
3. **개발**: 코드 작성 및 테스트 실행
4. **PR 생성**: 시맨틱 커밋 메시지 사용 (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
5. **검토 대기**: 자동检查 통과 후 Maintainer 리뷰 대기

### 커밋 컨벤션

```
feat: 새로운 기능
fix: 버그 수정
docs: 문서 변경
style: 코드 스타일 변경 (기능 없음)
refactor: 리팩토링
test: 테스트 관련
chore: 빌드/패키지 매니저 변경
```

### 테스트 요구사항

- 모든 새로운 기능에는 단위 테스트 필요
- 테스트 커버리지 유지 또는 개선
- `npm test` 및 `npm run test:node` 통과 필수

### 코드 스타일

- ESLint 및 Prettier 규칙 준수
- TypeScript JSDoc 주석으로 타입 문서화
- 재사용 가능한ユーティリティは packages/에 배치

---

# English

## Overview

**Resume** is a monorepo powering a Cloudflare Worker-based portfolio site, automated job application workflows (Wanted/JobKorea), single source of truth (SSoT) resume data, and self-hosted observability infrastructure.

**Version:** 1.40.11  
**Runtime:** Node.js ≥22 (Cloudflare Workers compatible)

### Key Components

| Component | Description |
|-----------|-------------|
| **apps/portfolio** | Cloudflare Worker-based edge-optimized portfolio site |
| **apps/job-server** | MCP-based job automation runtime |
| **apps/job-dashboard** | Dashboard API and workflow handlers |
| **packages/data** | SSoT resume data (master resume_data.json) |
| **packages/shared** | Errors, logger, retry, circuit-breaker, crypto utilities |
| **packages/types** | Canonical JSDoc/TS type definitions |
| **packages/schemas** | Runtime Zod validation schemas |
| **packages/cli** | Deployment, verification, DB operations CLI |

## Key Features

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: MCP-based automatic application system for Wanted/JobKorea
- **SSoT Data**: Normalized resume data in packages/data
- **Dashboard API**: Workflow handlers and job management APIs
- **Shared Packages**: Type-safe schemas, retry/circuit-breaker, crypto utilities
- **CLI Tool**: Deployment, verification, DB commands

## Architecture

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker portfolio site
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # Dashboard API Worker
├── packages/
│   ├── cli/                # resume CLI (deploy, verify, db)
│   ├── env/                # Environment validation + type-safe secrets
│   ├── data/               # SSoT resumes and JSON schema
│   ├── shared/             # Utilities: errors, logger, retry, crypto, rate-limit, auth, browser, clients
│   ├── types/              # Canonical JSDoc/TS type definitions (zero runtime deps)
│   ├── schemas/            # Runtime Zod validation schemas
│   └── contracts/          # OpenAPI spec + Cloudflare Worker Env interface
├── tools/                  # CI, build, deploy, verification scripts (Go + JS)
├── tests/                  # Jest, integration, Playwright E2E
├── infrastructure/         # Cloudflare, monitoring, n8n, DB config
├── docs/                   # Guides, ADRs, architecture, conventions, security
├── supabase/               # Supabase Edge Functions
└── .github/                # CI/release/maintenance control plane
```

## Automation Inventory

### GitHub Actions Workflows (37 total)

| # | Workflow File | Purpose |
|---|---------------|---------|
| 01 | `01_branch-to-pr.yml` | Auto-convert branch to PR |
| 02 | `02_issue-to-branch.yml` | Auto-create branch from issue |
| 03 | `03_pr-checks.yml` | PR integration checks |
| 04 | `04_actionlint.yml` | GitHub Actions lint |
| 05 | `05_gitleaks.yml` | Secret scanning |
| 06 | `06_codeql.yml` | Code quality analysis |
| 07 | `07_dependency-review.yml` | Dependency security review |
| 08 | `08_scorecard.yml` | Security scorecard |
| 09 | `09_semantic-pr.yml` | Semantic PR validation |
| 10 | `10_pr-review.yml` | AI-powered PR review |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| 13 | `13_pr-auto-merge.yml` | PR auto-merge |
| 14 | `14_bot-auto-fix.yml` | Bot auto-fix |
| 15 | `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| 18 | `18_issue-management.yml` | Issue management |
| 19 | `19_issue-backfill.yml` | Issue backfill |
| 20 | `20_readme-gen.yml` | README generation |
| 21 | `21_docs-sync.yml` | Documentation sync |
| 24 | `24_release-notes.yml` | Release notes generation |
| 25 | `25_release-publish.yml` | Release publishing |
| 29 | `29_downstream-health-check.yml` | Downstream health check |
| 37 | `37_ci-failure-issues.yml` | CI failure issue creation |
| 42 | `42_reusable-docs-sync.yml` | Reusable docs sync |
| 43 | `43_reusable-issue-management.yml` | Reusable issue management |
| 44 | `44_reusable-pr-checks.yml` | Reusable PR checks |
| 45 | `45_reusable-gitleaks.yml` | Reusable secret scanning |
| 60 | `60_ci-auto-heal.yml` | CI auto-heal |
| - | `auto-merge.yml` | Auto-merge |
| - | `auto-sync-data.yml` | Auto data sync |
| - | `ci.yml` | Main CI pipeline |
| - | `delete-standalone-job-worker.yml` | Delete standalone job worker |
| - | `labeler.yml` | Auto-label management |
| - | `post-deploy-verify.yml` | Post-deploy verification |
| - | `provision-queues.yml` | Queue provisioning |
| - | `release.yml` | Release workflow |
| - | `welcome.yml` | New contributor welcome |
| - | `security/11_pr-review.yml` | Security PR review |

### Go Automation Tools (0 total)

Currently, there are no Go-based automation tools. All automation is managed through GitHub Actions workflows.

## Quick Start

### Prerequisites

- **Node.js**: ≥22
- **Docker**: (optional, for Docker Compose)
- **npm**: Latest

### Installation

```bash
# Install monorepo dependencies
npm ci

# Or for development
npm install
```

### Environment Setup

```bash
# Copy environment variables
cp .env.example .env

# Set required environment variables
# - CLOUDFLARE_API_TOKEN
# - DATABASE_URL
# - WANTED_API_KEY
```

### Build

```bash
# Data sync + portfolio build
npm run build

# Full build (includes CLI)
npm run build:full

# Build all apps/packages
npm run build:all
```

### Run

```bash
# Run MCP server with Docker Compose
docker-compose up -d

# Local development servers (per app)
cd apps/portfolio && npm run dev
cd apps/job-server && npm run dev
cd apps/job-dashboard && npm run dev
```

## Local Development

### Workspace Structure

This project uses npm workspaces:

```bash
# List all workspaces
npm workspaces list

# Run command in specific workspace
npm run <script> --workspace=@resume/portfolio-worker
npm run <script> --workspace=@resume/job-server
npm run <script> --workspace=@resume/cli
```

### Data Sync

```bash
# Sync resume data
npm run sync:data

# Generate PPTX (Python script)
npm run sync:pptx

# Run all sync
npm run sync:all

# Sync proposals
npm run sync:proposals
```

### Enrichment Scripts

```bash
# GitHub enrichment
npm run enrich:github

# Skills enrichment
npm run enrich:skills

# AI enrichment
npm run enrich:ai

# Run all enrichment
npm run enrich:all
```

### Testing

```bash
# Run all tests
npm test

# Node environment tests
npm run test:node

# Specific package tests
npm test --workspace=@resume/schemas
```

### Lint and Type Check

```bash
# Run lint
npm run lint

# Type check
npm run typecheck

# Run everything (sync, lint, typecheck, test, build)
npm run automate:full
```

## Commands Reference

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Data sync + portfolio build |
| `npm run build:portfolio` | Build portfolio only |
| `npm run build:full` | Full build with CLI |
| `npm run build:all` | Build all apps/packages |

### Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data |
| `npm run sync:pptx` | Generate PPTX |
| `npm run sync:all` | Run all sync |
| `npm run sync:proposals` | Sync proposals |

### Automation Commands

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Skills data enrichment |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | Run all enrichment |
| `npm run automate:ssot` | SSoT automation (sync + build + typecheck + test:node) |
| `npm run automate:full` | Full automation (sync:all + lint + typecheck + test + build + validation) |

### CLI Commands

```bash
# Use CLI tool
npx resume deploy
npx resume verify
npx resume db <subcommand>

# Or for local development
cd packages/cli && npm run dev
```

## Contributing Guide

### How to Contribute

1. **Create Issue**: First, create a GitHub issue to discuss the work
2. **Create Branch**: Use `02_issue-to-branch.yml` workflow or create branch manually
3. **Develop**: Write code and run tests
4. **Create PR**: Use semantic commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
5. **Wait for Review**: Pass automated checks and await maintainer review

### Commit Convention

```
feat: new feature
fix: bug fix
docs: documentation changes
style: code style changes (no functionality)
refactor: refactoring
test: test related
chore: build/package manager changes
```

### Testing Requirements

- Unit tests required for all new features
- Maintain or improve test coverage
- Must pass `npm test` and `npm run test:node`

### Code Style

- Follow ESLint and Prettier rules
- Document types with TypeScript JSDoc comments
- Place reusable utilities in packages/

---

## Additional Resources

- **AGENTS.md**: Detailed agent/infrastructure knowledge base
- **CHANGELOG.md**: Release history and changes
- **CONTRIBUTING.md**: Detailed contribution guidelines
- **docs/**: Architecture Decision Records (ADRs), guides, security policies

---

## License

MIT License - See [LICENSE](LICENSE) file for details.