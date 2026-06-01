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
| **packages/cli** | `packages/cli/` | 배포, 검증, DB操作的 CLI 도구 |
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
- **SSoT 데이터**: `packages/data`의 정규화된 단일 진실 공급원 이력서
- **CLI 도구**: 배포, 검증, DB操作을 위한 命令行 인터페이스
- **Docker 지원**: `docker-compose.yml`로 로컬 개발 및 프로덕션 런타임 지원

### 자동화 인프라

| 카테고리 | 도구 | 설명 |
|---------|------|------|
| **GitHub Actions 워크플로우** | 37개 워크플로우 파일 | CI/CD, PR 관리, 릴리스, 보안 스캐닝 |
| **재사용 가능한 워크플로우** | `44_reusable-pr-checks.yml`, `45_reusable-gitleaks.yml`, `42_reusable-docs-sync.yml`, `43_reusable-issue-management.yml` | PR 체크, 시크릿 스캐닝, 문서 동기화, 이슈 관리 |
| **Go CI 도구** | `tools/ci/validate-cloudflare-native.go` | Cloudflare Workers 네이티브 검증 |
| **Enrichment 스크립트** | `enrich:github`, `enrich:skills`, `enrich:ai` | GitHub 데이터, 스킬, AI 기반 이력서 보강 |

## 아키텍처

```text
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker 포트폴리오
│   ├── job-server/         # MCP 채용 자동화 런타임
│   └── job-dashboard/      # 대시보드 API
├── packages/
│   ├── cli/               # CLI 도구 (OClif 기반)
│   ├── env/               # 환경 변수 검증
│   ├── data/              # SSoT 이력서 데이터
│   ├── shared/            # 크로스 패키지 유틸리티
│   ├── types/             # 정규 타입 정의
│   ├── schemas/           # Zod 검증 스키마
│   └── contracts/         # OpenAPI/Env 인터페이스
├── tools/
│   ├── scripts/           # 빌드, 배포, 동기화 스크립트
│   ├── ci/                # CI 검증 도구
│   └── scripts/enrichment/ # 데이터 보강 도구
├── infrastructure/        # Cloudflare, 모니터링, n8n 설정
├── tests/                 # Jest, Playwright E2E
└── .github/workflows/     # 37개 GitHub Actions 워크플로우
```

## 자동화 인벤토리

### GitHub Actions 워크플로우 (37개)

| 번호 | 워크플로우 파일 | 용도 |
|------|----------------|------|
| 01 | `01_branch-to-pr.yml` | 브랜치 → PR 자동 생성 |
| 02 | `02_issue-to-branch.yml` | 이슈 → 브랜치 자동 생성 |
| 03 | `03_pr-checks.yml` | PR 체크 (공통) |
| 04 | `04_actionlint.yml` | GitHub Actions DSL린팅 |
| 05 | `05_gitleaks.yml` | 시크릿 스캐닝 |
| 06 | `06_codeql.yml` | CodeQL 정적 분석 |
| 07 | `07_dependency-review.yml` | 의존성 보안 검토 |
| 08 | `08_scorecard.yml` | OSSF Scorecard |
| 09 | `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| 10 | `10_pr-review.yml` | PR 자동 리뷰 |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot 자동 머지 |
| 13 | `13_pr-auto-merge.yml` | PR 자동 머지 |
| 14 | `14_bot-auto-fix.yml` | 봇 자동 수정 |
| 15 | `15_merged-pr-cleanup.yml` | 머지 후 정리 |
| 18 | `18_issue-management.yml` | 이슈 관리 |
| 19 | `19_issue-backfill.yml` | 이슈 백필 |
| 20 | `20_readme-gen.yml` | README 생성 |
| 21 | `21_docs-sync.yml` | 문서 동기화 |
| 24 | `24_release-notes.yml` | 릴리스 노트 생성 |
| 25 | `25_release-publish.yml` | 릴리스 게시 |
| 29 | `29_downstream-health-check.yml` | 다운스트림 헬스 체크 |
| 37 | `37_ci-failure-issues.yml` | CI 실패 이슈 생성 |
| 42 | `42_reusable-docs-sync.yml` | 문서 동기화 (재사용) |
| 43 | `43_reusable-issue-management.yml` | 이슈 관리 (재사용) |
| 44 | `44_reusable-pr-checks.yml` | PR 체크 (재사용) |
| 45 | `45_reusable-gitleaks.yml` | 시크릿 스캐닝 (재사용) |
| 60 | `60_ci-auto-heal.yml` | CI 자동 복구 |
| - | `auto-merge.yml` | 자동 머지 |
| - | `auto-sync-data.yml` | 데이터 자동 동기화 |
| - | `ci.yml` | 기본 CI |
| - | `delete-standalone-job-worker.yml` | Standalone Worker 삭제 |
| - | `labeler.yml` | 라벨러 |
| - | `post-deploy-verify.yml` | 배포 후 검증 |
| - | `provision-queues.yml` | 큐 프로비저닝 |
| - | `release.yml` | 릴리스 |
| - | `welcome.yml` | 웰컴 메시지 |
| - | `security/11_pr-review.yml` | 보안 PR 리뷰 |

### CI/CD 도구

| 도구 | 언어 | 용도 |
|------|------|------|
| `validate-cloudflare-native.go` | Go | Cloudflare Workers 네이티브 검증 |

### Enrichment 스크립트

| 스크립트 | 언어 | 용도 |
|---------|------|------|
| `enrich/github/` | Go | GitHub 데이터 보강 |
| `enrich/skills/` | Go | 스킬 기반 데이터 보강 |
| `enrich/ai/` | Go | AI 기반 데이터 보강 |

## 빠른 시작

### 환경 요구사항

- **Node.js**: ≥22
- **Go**: 최신 (CI 도구용)
- **Docker**: 선택 (컨테이너 런타임용)
- **Python3**: 선택 (PPTX 생성용)

### 설치

```bash
# 의존성 설치
npm install

# 데이터 동기화 + 빌드
npm run build

# 타입 체크
npm run typecheck

# 단위 테스트
npm run test:node
```

### Docker 런타임

```bash
# 프로덕션 런타임 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f mcp-server
```

## 로컬 개발

### 워크스페이스 구조

```bash
# 모든 워크스페이스 빌드
npm run build:all

# 특정 워크스페이스 개발
cd apps/portfolio
npm run dev

# 패키지 개발
cd packages/shared
npm run watch
```

### 테스트

```bash
# 모든 테스트
npm run test

# Jest 단위 테스트
npm run test:node

:# Playwright E2E 테스트
npm run test:e2e

# 특정 패키지 테스트
cd packages/schemas && npm test
```

## 명령어 레퍼런스

### 동기화 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | Shinhan PPTX 생성 (Python) |
| `npm run sync:all` | 모든 동기화 실행 |
| `npm run sync:proposals` | 제안 동기화 |

### 보강 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run enrich:github` | GitHub 데이터 보강 |
| `npm run enrich:skills` | 스킬 기반 보강 |
| `npm run enrich:ai` | AI 기반 보강 |
| `npm run enrich:all` | 모든 보강 실행 |

### 자동화 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run automate:ssot` | SSoT 동기화 + 빌드 + 테스트 |
| `npm run automate:full` | 전체 자동화 파이프라인 |

### 빌드 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run build` | 포트폴리오 빌드 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run build:all` | 전체 빌드 |
| `npm run cli:build` | CLI 빌드 |

### 기타 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm run version:bump` | 버전 밸프 (patch) |

## 기여 가이드라인

Contributing을 읽어주세요: [CONTRIBUTING.md](./CONTRIBUTING.md)

### Pull Request 프로세스

1. **브랜치 생성**: `02_issue-to-branch.yml`이 이슈 기반으로 자동 생성
2. **PR 체크**: `03_pr-checks.yml` + `44_reusable-pr-checks.yml` 실행
3. **시크릿 스캐닝**: `05_gitleaks.yml` 또는 `45_reusable-gitleaks.yml` 실행
4. **자동 머지**: 조건 충족 시 `13_pr-auto-merge.yml` 또는 `12_dependabot-auto-merge.yml` 적용
5. **머지 후 정리**: `15_merged-pr-cleanup.yml` 실행

### 코드 컨벤션

- **ESLint**: `eslint.config.cjs` 사용
- **TypeScript**: `tsconfig.base.json` 기반
- **테스트**: Jest (`jest.config.cjs`) + Playwright (`playwright.config.js`)
- **API 스펙**: OpenAPI 3.0 (`packages/contracts/openapi.yaml`)

---

# English

## Overview

**Resume** is a monorepo that integrates a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), single source of truth (SSoT) resume data, and self-hosted observability infrastructure.

## Key Components

| Component | Path | Description |
|-----------|------|-------------|
| **apps/portfolio** | `apps/portfolio/` | Cloudflare Worker-powered edge-optimized portfolio site |
| **apps/job-server** | `apps/job-server/` | MCP-based job automation runtime |
| **apps/job-dashboard** | `apps/job-dashboard/` | Dashboard API and workflow handlers |
| **packages/cli** | `packages/cli/` | CLI tools for deployment, verification, DB operations |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Errors, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | Canonical JSDoc/TS type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized single source of truth resumes in `packages/data`
- **CLI Tools**: Command-line interface for deployment, verification, DB operations
- **Docker Support**: Local development and production runtime via `docker-compose.yml`

### Automation Infrastructure

| Category | Tools | Description |
|----------|-------|-------------|
| **GitHub Actions Workflows** | 37 workflow files | CI/CD, PR management, releases, security scanning |
| **Reusable Workflows** | `44_reusable-pr-checks.yml`, `45_reusable-gitleaks.yml`, `42_reusable-docs-sync.yml`, `43_reusable-issue-management.yml` | PR checks, secret scanning, docs sync, issue management |
| **Go CI Tools** | `tools/ci/validate-cloudflare-native.go` | Cloudflare Workers native validation |
| **Enrichment Scripts** | `enrich:github`, `enrich:skills`, `enrich:ai` | GitHub data, skills, AI-based resume enrichment |

## Architecture

```text
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker portfolio
│   ├── job-server/         # MCP job automation runtime
│   └── job-dashboard/      # Dashboard API
├── packages/
│   ├── cli/               # CLI tools (OClif-based)
│   ├── env/               # Environment variable validation
│   ├── data/              # SSoT resume data
│   ├── shared/            # Cross-package utilities
│   ├── types/             # Canonical type definitions
│   ├── schemas/           # Zod validation schemas
│   └── contracts/         # OpenAPI/Env interface
├── tools/
│   ├── scripts/           # Build, deploy, sync scripts
│   ├── ci/                # CI validation tools
│   └── scripts/enrichment/ # Data enrichment tools
├── infrastructure/        # Cloudflare, monitoring, n8n config
├── tests/                 # Jest, Playwright E2E
└── .github/workflows/     # 37 GitHub Actions workflows
```

## Automation Inventory

### GitHub Actions Workflows (37 total)

| # | Workflow File | Purpose |
|---|---------------|---------|
| 01 | `01_branch-to-pr.yml` | Branch → PR auto-creation |
| 02 | `02_issue-to-branch.yml` | Issue → Branch auto-creation |
| 03 | `03_pr-checks.yml` | PR checks (common) |
| 04 | `04_actionlint.yml` | GitHub Actions DSL linting |
| 05 | `05_gitleaks.yml` | Secret scanning |
| 06 | `06_codeql.yml` | CodeQL static analysis |
| 07 | `07_dependency-review.yml` | Dependency security review |
| 08 | `08_scorecard.yml` | OSSF Scorecard |
| 09 | `09_semantic-pr.yml` | Semantic PR validation |
| 10 | `10_pr-review.yml` | PR auto-review |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| 13 | `13_pr-auto-merge.yml` | PR auto-merge |
| 14 | `14_bot-auto-fix.yml` | Bot auto-fix |
| 15 | `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| 18 | `18_issue-management.yml` | Issue management |
| 19 | `19_issue-backfill.yml` | Issue backfill |
| 20 | `20_readme-gen.yml` | README generation |
| 21 | `21_docs-sync.yml` | Docs sync |
| 24 | `24_release-notes.yml` | Release notes generation |
| 25 | `25_release-publish.yml` | Release publish |
| 29 | `29_downstream-health-check.yml` | Downstream health check |
| 37 | `37_ci-failure-issues.yml` | CI failure issue creation |
| 42 | `42_reusable-docs-sync.yml` | Docs sync (reusable) |
| 43 | `43_reusable-issue-management.yml` | Issue management (reusable) |
| 44 | `44_reusable-pr-checks.yml` | PR checks (reusable) |
| 45 | `45_reusable-gitleaks.yml` | Secret scanning (reusable) |
| 60 | `60_ci-auto-heal.yml` | CI auto-heal |
| - | `auto-merge.yml` | Auto-merge |
| - | `auto-sync-data.yml` | Auto data sync |
| - | `ci.yml` | Base CI |
| - | `delete-standalone-job-worker.yml` | Standalone Worker deletion |
| - | `labeler.yml` | Labeler |
| - | `post-deploy-verify.yml` | Post-deploy verification |
| - | `provision-queues.yml` | Queue provisioning |
| - | `release.yml` | Release |
| - | `welcome.yml` | Welcome message |
| - | `security/11_pr-review.yml` | Security PR review |

### CI/CD Tools

| Tool | Language | Purpose |
|------|----------|---------|
| `validate-cloudflare-native.go` | Go | Cloudflare Workers native validation |

### Enrichment Scripts

| Script | Language | Purpose |
|--------|----------|---------|
| `enrich/github/` | Go | GitHub data enrichment |
| `enrich/skills/` | Go | Skills-based data enrichment |
| `enrich/ai/` | Go | AI-based data enrichment |

## Quick Start

### Requirements

- **Node.js**: ≥22
- **Go**: Latest (for CI tools)
- **Docker**: Optional (container runtime)
- **Python3**: Optional (PPTX generation)

### Installation

```bash
# Install dependencies
npm install

# Sync data + build
npm run build

# Type check
npm run typecheck

# Unit tests
npm run test:node
```

### Docker Runtime

```bash
# Start production runtime
docker-compose up -d

# View logs
docker-compose logs -f mcp-server
```

## Local Development

### Workspace Structure

```bash
# Build all workspaces
npm run build:all

# Develop specific app
cd apps/portfolio
npm run dev

# Develop package
cd packages/shared
npm run watch
```

### Testing

```bash
# Run all tests
npm run test

# Jest unit tests
npm run test:node

# Playwright E2E tests
npm run test:e2e

# Test specific package
cd packages/schemas && npm test
```

## Commands Reference

### Sync Commands

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data |
| `npm run sync:pptx` | Generate Shinhan PPTX (Python) |
| `npm run sync:all` | Run all sync operations |
| `npm run sync:proposals` | Sync proposals |

### Enrichment Commands

| Command | Description |
|---------|-------------|
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Skills-based enrichment |
| `npm run enrich:ai` | AI-based enrichment |
| `npm run enrich:all` | Run all enrichment |

### Automation Commands

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | SSoT sync + build + test |
| `npm run automate:full` | Full automation pipeline |

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build portfolio |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Build everything |
| `npm run cli:build` | Build CLI |

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run version:bump` | Bump version (patch) |

## Contribution Guidelines

Please read: [CONTRIBUTING.md](./CONTRIBUTING.md)

### Pull Request Process

1. **Branch Creation**: `02_issue-to-branch.yml` auto-creates from issues
2. **PR Checks**: `03_pr-checks.yml` + `44_reusable-pr-checks.yml` run
3. **Secret Scanning**: `05_gitleaks.yml` or `45_reusable-gitleaks.yml` runs
4. **Auto-Merge**: `13_pr-auto-merge.yml` or `12_dependabot-auto-merge.yml` applies if conditions met
5. **Post-Merge Cleanup**: `15_merged-pr-cleanup.yml` runs

### Code Conventions

- **ESLint**: Uses `eslint.config.cjs`
- **TypeScript**: Based on `tsconfig.base.json`
- **Testing**: Jest (`jest.config.cjs`) + Playwright (`playwright.config.js`)
- **API Spec**: OpenAPI 3.0 (`packages/contracts/openapi.yaml`)

---

## Additional Resources

- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Architecture Details**: See `docs/` directory
- **API Documentation**: [cliproxy.jclee.me](https://cliproxy.jclee.me)
- **Bot Interface**: [bot.jclee.me](https://bot.jclee.me)

## License

MIT License - See [LICENSE](./LICENSE) file for details.