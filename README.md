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
- **SSoT 데이터**: `packages/data`의 정규화된 이력서 데이터 (master `resume_data.json`)
- **자체 호스팅 감시**: 자체 운영 가능한 감시 및 알림 인프라

### 공유 패키지

- **types**: 런타임 의존성 없는 JSDoc/TS 타입 정의 (Application, Resume, WantedJob, WorkerEnv 등)
- **schemas**: Zod 기반 런타임 검증 스키마
- **shared**: 에러 핸들링, 재시도 로직, 서킷 브레이커, 암호화 유틸리티
- **contracts**: OpenAPI 스펙 및 Cloudflare Worker Env 인터페이스

### CLI 도구

```bash
# 배포
resume deploy

# 검증
resume verify

# DB 조작
resume db
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare Workers                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│   portfolio     │   job-server    │      job-dashboard       │
│   (Edge Worker) │   (MCP Runtime) │    (Dashboard API)       │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      packages/                               │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│   types  │  schemas │  shared  │ contracts│       env       │
│  (types) │  (zod)   │ (utils)  │ (openapi)│ (env+secrets)   │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    packages/data/                            │
│                  (SSoT resume_data.json)                     │
└─────────────────────────────────────────────────────────────┘
```

## 자동화 인벤토리 (Automation Inventory)

### GitHub Actions 워크플로우 (37개)

#### PR 및 코드 품질

| 워크플로우 파일 | 설명 |
|----------------|------|
| `01_branch-to-pr.yml` | 브랜치에서 PR로 자동 변환 |
| `02_issue-to-branch.yml` | 이슈에서 브랜치 자동 생성 |
| `03_pr-checks.yml` | PR 검사 (ESLint, 타입 체크, 테스트) |
| `04_actionlint.yml` | GitHub Actions 워크플로우 린트 |
| `05_gitleaks.yml` | 시크릿/민감 정보 스캔 |
| `06_codeql.yml` | CodeQL 정적 분석 |
| `07_dependency-review.yml` | 의존성 보안 검토 |
| `08_scorecard.yml` | OpenSSF Scorecard 평가 |
| `09_semantic-pr.yml` | Semantic PR 검증 |
| `10_pr-review.yml` | 자동 PR 리뷰 |
| `11_pr-review.yml` (security/) | 보안 리뷰 워크플로우 |
| `14_bot-auto-fix.yml` | 봇 자동 수정 |

#### PR 병합 및 정리

| 워크플로우 파일 | 설명 |
|----------------|------|
| `12_dependabot-auto-merge.yml` | Dependabot PR 자동 병합 |
| `13_pr-auto-merge.yml` | 일반 PR 자동 병합 |
| `15_merged-pr-cleanup.yml` | 병합 후 정리 작업 |

#### 이슈 관리

| 워크플로우 파일 | 설명 |
|----------------|------|
| `18_issue-management.yml` | 이슈 관리 |
| `19_issue-backfill.yml` | 이슈 백필 |
| `37_ci-failure-issues.yml` | CI 실패 시 이슈 생성 |
| `43_reusable-issue-management.yml` | 재사용可能な 이슈 관리 |

#### 문서 및 릴리스

| 워크플로우 파일 | 설명 |
|----------------|------|
| `20_readme-gen.yml` | README 자동 생성 |
| `21_docs-sync.yml` | 문서 동기화 |
| `24_release-notes.yml` | 릴리스 노트 생성 |
| `25_release-publish.yml` | 릴리스 게시 |
| `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |

#### 배포 및 검증

| 워크플로우 파일 | 설명 |
|----------------|------|
| `29_downstream-health-check.yml` | 다운스트림 헬스 체크 |
| `auto-merge.yml` | 자동 병합 워크플로우 |
| `auto-sync-data.yml` | 데이터 자동 동기화 |
| `ci.yml` | CI 파이프라인 |
| `delete-standalone-job-worker.yml` | 독립 job Worker 삭제 |
| `labeler.yml` | PR/이슈 라벨러 |
| `post-deploy-verify.yml` | 배포 후 검증 |
| `provision-queues.yml` | 큐 프로비저닝 |
| `release.yml` | 릴리스 워크플로우 |
| `welcome.yml` | 환영 메시지 |
| `45_reusable-gitleaks.yml` | 재사용 가능한 Gitleaks |
| `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 |
| `60_ci-auto-heal.yml` | CI 자동 복구 |

### 주요 도구

| 도구 | 용도 |
|------|------|
| **Cloudflare Workers** | 엣지 런타임 (포트폴리오, job-server, job-dashboard) |
| **Zod** | 런타임 스키마 검증 |
| **TypeScript/JSDoc** | 타입 정의 (런타임 의존성 없음) |
| **Docker** | 컨테이너 런타임 |
| **Playwright** | E2E 테스트 |
| **Jest** | 단위 및 통합 테스트 |
| **ESLint** | 코드 린트 |
| **Gitleaks** | 시크릿 스캔 |
| **CodeQL** | 정적 분석 |
| **OpenSSF Scorecard** | 보안 점수 평가 |

## 빠른 시작 (Quick Start)

### Prerequisites

- Node.js ≥ 22
- Docker & Docker Compose (optional)
- Wrangler CLI (`npm install -g wrangler`)

### 로컬 개발 환경 설정

```bash
# 의존성 설치
npm install

# 데이터 동기화
npm run sync:data

# 빌드
npm run build

# 타입 체크
npm run typecheck

# 테스트 실행
npm run test
```

### Docker Compose로 실행

```bash
# 컨테이너 빌드 및 실행
docker-compose up --build

# 또는 백그라운드 실행
docker-compose up -d
```

### 환경 변수 설정

```bash
# .env 파일 생성 (필요한 시크릿 설정)
cp .env.example .env
#エディ터で編集
```

## 로컬 개발

### 워크스페이스 명령어 참고

| 명령어 | 설명 |
|--------|------|
| `npm run sync:data` | SSoT 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 생성 (Python) |
| `npm run sync:all` | 모든 데이터 동기화 |
| `npm run build` | 포트폴리오 Worker 빌드 |
| `npm run build:all` | 전체 빌드 (포트폴리오 + CLI) |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | 타입 체크 |
| `npm run test` | 전체 테스트 실행 |
| `npm run test:node` | Node.js 환경 테스트 |
| `npm run automate:ssot` | SSoT 자동화 (sync + build + typecheck + test) |
| `npm run automate:full` | 전체 자동화 (sync + lint + typecheck + test + build + 검증) |
| `npm run enrich:github` | GitHub 데이터_enrichment |
| `npm run enrich:skills` | 기술 스택_enrichment |
| `npm run enrich:ai` | AI 기반_enrichment |
| `npm run enrich:all` | 모든_enrichment 실행 |

### 테스트

```bash
# 단위 테스트
npm run test

# Playwright E2E 테스트
npx playwright test

# 특정 워크스페이스 테스트
npm run test --workspace=@resume/shared
```

## 기여 가이드 (Contribution Guide)

### 기여 방법

1. **이슈 생성**: 버그 보고 또는 기능 요청은 먼저 이슈로 등록해주세요.
2. **브랜치 생성**: `02_issue-to-branch.yml` 또는 수동으로 브랜치를 생성해주세요.
   - feature: `feature/issue-번호-설명`
   - fix: `fix/issue-번호-설명`
   - docs: `docs/issue-번호-설명`
3. **개발**: 코드 작성 및 테스트 실행
4. **PR 제출**: `09_semantic-pr.yml` 규칙에 맞춰 커밋 메시지를 작성해주세요.
5. **검증**: 자동 검사를 통과해야 합니다 (ESLint, 타입 체크, 테스트).

### 커밋 메시지 규칙

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 코드 품질 표준

- ESLint 규칙 준수
- TypeScript/JSDoc 타입 정의 추가
- Zod 스키마로 런타임 검증
- 새 기능에 대한 테스트 작성
- CHANGELOG.md 업데이트 (해당 시)

### 워크플로우 자동화 활용

- **Dependabot**: 의존성 업데이트 자동 생성
- **auto-merge**: 조건 충족 시 자동 병합
- **CI 자동 복구**: 실패한 CI 자동 복구 시도

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
| **packages/cli** | `packages/cli/` | Deployment, verification, DB operation CLI tools |
| **packages/env** | `packages/env/` | Environment validation + type-safe secrets |
| **packages/data** | `packages/data/` | SSoT resume data (master `resume_data.json`) |
| **packages/shared** | `packages/shared/` | Error, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | `packages/types/` | JSDoc/TS canonical type definitions (zero runtime deps) |
| **packages/schemas** | `packages/schemas/` | Zod runtime validation schemas |
| **packages/contracts** | `packages/contracts/` | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

### Portfolio & Job Automation

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based automated application system
- **SSoT Data**: Normalized resume data in `packages/data` (master `resume_data.json`)
- **Self-hosted Observability**: Self-operable monitoring and alerting infrastructure

### Shared Packages

- **types**: JSDoc/TS type definitions with zero runtime dependencies (Application, Resume, WantedJob, WorkerEnv, etc.)
- **schemas**: Zod-based runtime validation schemas
- **shared**: Error handling, retry logic, circuit breaker, encryption utilities
- **contracts**: OpenAPI spec and Cloudflare Worker Env interface

### CLI Tools

```bash
# Deploy
resume deploy

# Verify
resume verify

# DB operations
resume db
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare Workers                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│   portfolio     │   job-server    │      job-dashboard       │
│   (Edge Worker) │   (MCP Runtime) │    (Dashboard API)       │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      packages/                               │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│   types  │  schemas │  shared  │ contracts│       env       │
│  (types) │  (zod)   │ (utils)  │ (openapi)│ (env+secrets)   │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    packages/data/                            │
│                  (SSoT resume_data.json)                     │
└─────────────────────────────────────────────────────────────┘
```

## Automation Inventory

### GitHub Actions Workflows (37 total)

#### PR and Code Quality

| Workflow File | Description |
|---------------|-------------|
| `01_branch-to-pr.yml` | Auto-convert branch to PR |
| `02_issue-to-branch.yml` | Auto-create branch from issue |
| `03_pr-checks.yml` | PR checks (ESLint, type check, tests) |
| `04_actionlint.yml` | GitHub Actions workflow lint |
| `05_gitleaks.yml` | Secret/sensitive data scan |
| `06_codeql.yml` | CodeQL static analysis |
| `07_dependency-review.yml` | Dependency security review |
| `08_scorecard.yml` | OpenSSF Scorecard assessment |
| `09_semantic-pr.yml` | Semantic PR validation |
| `10_pr-review.yml` | Auto PR review |
| `11_pr-review.yml` (security/) | Security review workflow |
| `14_bot-auto-fix.yml` | Bot auto-fix |

#### PR Merge and Cleanup

| Workflow File | Description |
|---------------|-------------|
| `12_dependabot-auto-merge.yml` | Dependabot PR auto-merge |
| `13_pr-auto-merge.yml` | General PR auto-merge |
| `15_merged-pr-cleanup.yml` | Post-merge cleanup |

#### Issue Management

| Workflow File | Description |
|---------------|-------------|
| `18_issue-management.yml` | Issue management |
| `19_issue-backfill.yml` | Issue backfill |
| `37_ci-failure-issues.yml` | Create issue on CI failure |
| `43_reusable-issue-management.yml` | Reusable issue management |

#### Documentation and Release

| Workflow File | Description |
|---------------|-------------|
| `20_readme-gen.yml` | Auto-generate README |
| `21_docs-sync.yml` | Documentation sync |
| `24_release-notes.yml` | Release notes generation |
| `25_release-publish.yml` | Release publishing |
| `42_reusable-docs-sync.yml` | Reusable documentation sync |

#### Deployment and Verification

| Workflow File | Description |
|---------------|-------------|
| `29_downstream-health-check.yml` | Downstream health check |
| `auto-merge.yml` | Auto-merge workflow |
| `auto-sync-data.yml` | Data auto-sync |
| `ci.yml` | CI pipeline |
| `delete-standalone-job-worker.yml` | Delete standalone job worker |
| `labeler.yml` | PR/Issue labeler |
| `post-deploy-verify.yml` | Post-deploy verification |
| `provision-queues.yml` | Queue provisioning |
| `release.yml` | Release workflow |
| `welcome.yml` | Welcome message |
| `45_reusable-gitleaks.yml` | Reusable Gitleaks |
| `44_reusable-pr-checks.yml` | Reusable PR checks |
| `60_ci-auto-heal.yml` | CI auto-heal |

### Key Tools

| Tool | Purpose |
|------|---------|
| **Cloudflare Workers** | Edge runtime (portfolio, job-server, job-dashboard) |
| **Zod** | Runtime schema validation |
| **TypeScript/JSDoc** | Type definitions (zero runtime deps) |
| **Docker** | Container runtime |
| **Playwright** | E2E testing |
| **Jest** | Unit and integration testing |
| **ESLint** | Code linting |
| **Gitleaks** | Secret scanning |
| **CodeQL** | Static analysis |
| **OpenSSF Scorecard** | Security score assessment |

## Quick Start

### Prerequisites

- Node.js ≥ 22
- Docker & Docker Compose (optional)
- Wrangler CLI (`npm install -g wrangler`)

### Setup

```bash
# Install dependencies
npm install

# Sync SSoT resume data
npm run sync:data

# Build
npm run build

# Type check
npm run typecheck

# Run tests
npm run test
```

### Run with Docker Compose

```bash
# Build and start containers
docker-compose up --build

# Or run in background
docker-compose up -d
```

### Environment Variables

```bash
# Create .env file with required secrets
cp .env.example .env
# Edit with your configuration
```

## Local Development

### Workspace Commands Reference

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync SSoT resume data |
| `npm run sync:pptx` | Generate PPTX (Python) |
| `npm run sync:all` | Sync all data |
| `npm run build` | Build portfolio Worker |
| `npm run build:all` | Full build (portfolio + CLI) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type check |
| `npm run test` | Run all tests |
| `npm run test:node` | Node.js environment tests |
| `npm run automate:ssot` | SSoT automation (sync + build + typecheck + test) |
| `npm run automate:full` | Full automation (sync + lint + typecheck + test + build + validate) |
| `npm run enrich:github` | GitHub data enrichment |
| `npm run enrich:skills` | Skills stack enrichment |
| `npm run enrich:ai` | AI-based enrichment |
| `npm run enrich:all` | Run all enrichment |

### Testing

```bash
# Unit tests
npm run test

# Playwright E2E tests
npx playwright test

# Test specific workspace
npm run test --workspace=@resume/shared
```

## Contribution Guide

### How to Contribute

1. **Open an Issue**: Report bugs or request features via issues first.
2. **Create a Branch**: Use `02_issue-to-branch.yml` or create manually.
   - feature: `feature/issue-number-description`
   - fix: `fix/issue-number-description`
   - docs: `docs/issue-number-description`
3. **Develop**: Write code and run tests.
4. **Submit PR**: Write commit messages following `09_semantic-pr.yml` rules.
5. **Verify**: Pass all automated checks (ESLint, type check, tests).

### Commit Message Rules

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Quality Standards

- Follow ESLint rules
- Add TypeScript/JSDoc type definitions
- Validate with Zod schemas at runtime
- Write tests for new features
- Update CHANGELOG.md when applicable

### Leverage Workflow Automation

- **Dependabot**: Auto-generate dependency updates
- **auto-merge**: Auto-merge when conditions are met
- **CI Auto-heal**: Automatically attempt to fix failing CI

---

## Links

- **Documentation**: [https://bot.jclee.me](https://bot.jclee.me)
- **API Reference**: [https://cliproxy.jclee.me](https://cliproxy.jclee.me)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT License - see [LICENSE](./LICENSE) for details.