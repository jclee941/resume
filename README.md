# Resume Portfolio Monorepo - README

I'll generate a comprehensive bilingual README.md based on the provided project structure and automation inventory.

```markdown
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
| **packages/env** | 환경 검증 + 타입 세이프 시크릿 |
| **packages/contracts** | OpenAPI 스펙 + Cloudflare Worker Env 인터페이스 |

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
│   ├── shared/             # 에러, 로거, 재시도, 암호화 유틸리티
│   ├── types/              # JSDoc/TS 정규 타입 정의
│   ├── schemas/            # Zod 런타임 검증 스키마
│   └── contracts/          # OpenAPI 스펙 + Env 인터페이스
├── tools/                  # CI, 빌드, 배포, 검증 스크립트 (Go + JS)
├── tests/                  # Jest, 통합, Playwright E2E
├── infrastructure/          # Cloudflare, 모니터링, n8n, DB 설정
└── .github/                # CI/릴리스/유지보수 제어 평면

```

---

## 자동화 인벤토리 (Automation Inventory)

### GitHub Actions 워크플로우 (37개)

#### Pull Request 워크플로우

| 워크플로우 파일 | 설명 |
|----------------|------|
| `01_branch-to-pr.yml` | 브랜치에서 PR로 자동 전환 |
| `02_issue-to-branch.yml` | 이슈에서 브랜치 자동 생성 |
| `03_pr-checks.yml` | PR 필수 체크스 (Reusable Workflow) |
| `04_actionlint.yml` | GitHub Actions YAML 린트 |
| `05_gitleaks.yml` | secrets 스캐닝 (Reusable Workflow) |
| `06_codeql.yml` | 코드 품질 분석 |
| `07_dependency-review.yml` | 의존성 보안 리뷰 |
| `08_scorecard.yml` | OpenSSF 보안 점수 |
| `09_semantic-pr.yml` |语义化 PR 커밋 검증 |
| `10_pr-review.yml` | AI 기반 PR 리뷰 (qodo-ai/pr-agent) |
| `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| `13_pr-auto-merge.yml` | PR 자동 병합 |
| `14_bot-auto-fix.yml` | Bot 자동 수정 |
| `15_merged-pr-cleanup.yml` | 병합 후 브랜치 정리 |
| `44_reusable-pr-checks.yml` | 재사용 가능 PR 체크스 |
| `45_reusable-gitleaks.yml` | 재사용 가능 gitleaks |

#### Release & Deployment 워크플로우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `24_release-notes.yml` | 자동 릴리스 노트 생성 |
| `25_release-publish.yml` | 릴리스 게시 |
| `release.yml` | 릴리스 프로세스 |

#### Issue Management 워크플로우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `18_issue-management.yml` | 이슈 생명주기 관리 |
| `19_issue-backfill.yml` | 이슈 백필 처리 |
| `37_ci-failure-issues.yml` | CI 실패 시 이슈 자동 생성 |
| `43_reusable-issue-management.yml` | 재사용 가능 이슈 관리 |

#### Documentation 워크플로우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `20_readme-gen.yml` | README 자동 생성 |
| `21_docs-sync.yml` | 문서 동기화 |
| `42_reusable-docs-sync.yml` | 재사용 가능 문서 동기화 |

#### CI/CD 워크플로우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `ci.yml` | 주 CI 파이프라인 |
| `60_ci-auto-heal.yml` | CI 자동 복구 |
| `auto-merge.yml` | 자동 병합 워크플로우 |
| `auto-sync-data.yml` | 데이터 자동 동기화 |
| `labeler.yml` | PR 라벨 자동 부여 |
| `post-deploy-verify.yml` | 배포 후 검증 |
| `provision-queues.yml` | 큐 프로비저닝 |
| `delete-standalone-job-worker.yml` | 독립 job worker 삭제 |
| `29_downstream-health-check.yml` | 다운스트림 상태 확인 |

#### 보안 워크플러우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `security/11_pr-review.yml` | 보안 리뷰 (qodo-ai/pr-agent) |

#### 기타 워크플러우

| 워크플러우 파일 | 설명 |
|----------------|------|
| `welcome.yml` |新規 기여자 환영 메시지 |

### 자동화 도구

#### Python 스크립트
- `tools/scripts/build/generate_shinhan_pptx.py` - PPTX 생성
- `tools/scripts/sync/apply-proposals.go` - 제안 동기화 (Go)

#### Go 도구
- `tools/scripts/enrichment/github/main.go` - GitHub 데이터 enrichment
- `tools/scripts/enrichment/skills/main.go` - 스킬 데이터 enrichment
- `tools/scripts/enrichment/ai/main.go` - AI 기반 enrichment
- `tools/ci/validate-cloudflare-native.go` - Cloudflare 네이티브 검증

#### Node.js 스크립트
- `tools/scripts/utils/sync-resume-data.js` - 이력서 데이터 동기화
- `apps/job-server/src/sync/proposal-review-cli.js` - 제안 검토 CLI

### AI 리뷰 도구

| 도구 | 용도 | 참조 |
|------|------|------|
| **qodo-ai/pr-agent** | AI 기반 PR 리뷰, 자동 수정 | [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) |

---

## 빠른 시작 (Quick Start)

### 필수 조건

- **Node.js** >= 22
- **npm** >= 10
- **Docker** (optional, for containerized run)

### 설치

```bash
# 의존성 설치
npm install

# 전체 워크스페이스 설치
npm ci
```

### 개발 시작

```bash
# 데이터 동기화 + 빌드
npm run build

# 타입 체크
npm run typecheck

# 테스트 실행
npm run test

# 전체 자동화 파이프라인
npm run automate:ssot
```

### Docker 실행

```bash
# Docker Compose로 MCP 서버 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f mcp-server
```

---

## 로컬 개발 (Local Development)

### 환경 변수

```bash
# .env 파일 생성 (필요한 시크릿 포함)
cp .env.example .env
```

### 주요 명령어 참조

| 명령어 | 설명 |
|--------|------|
| `npm run build` | 포트폴리오 빌드 + 데이터 동기화 |
| `npm run build:full` | 전체 빌드 (CLI 포함) |
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:all` | 모든 데이터 동기화 |
| `npm run sync:proposals` | 제안 동기화 |
| `npm run enrich:github` | GitHub enrichment |
| `npm run enrich:skills` | 스킬 enrichment |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | 모든 enrichment 실행 |
| `npm run lint` | ESLint 실행 |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm run test` | 전체 테스트 실행 |
| `npm run test:node` | Node.js 환경 테스트 |
| `npm run automate:ssot` | SSoT 자동화 파이프라인 |
| `npm run automate:full` | 전체 자동화 파이프라인 |
| `npm run deploy` | 배포 (비활성화됨) |

### CLI 도구 사용

```bash
# CLI 빌드
npm run cli:build

# 배포 명령어
npm run deploy --workspace=@resume/cli

# 검증 명령어
npm run verify --workspace=@resume/cli

# DB 명령어
npm run db --workspace=@resume/cli
```

### 테스트

```bash
# 단위 테스트
npm run test --workspace=@resume/shared

# 통합 테스트
npm run test:integration

# E2E 테스트 (Playwright)
npx playwright test

# 특정 패키지 테스트
npm run test --workspace=@resume/schemas
```

---

## 기여 가이드 (Contribution Guide)

### 브랜치 전략

1. **이슈 생성**: 작업 시작 전 이슈를 생성하세요
2. **브랜치 생성**: `02_issue-to-branch.yml` 워크플로우를 이용하거나 수동으로 생성
3. **개발**: 기능 개발 및 테스트 작성
4. **PR 생성**: `01_branch-to-pr.yml` 워크플로우가 자동으로 PR을 생성
5. **리뷰**: `10_pr-review.yml` 및 `security/11_pr-review.yml` 워크플로우가 AI 리뷰를 수행
6. **병합**: `13_pr-auto-merge.yml` 또는 `15_merged-pr-cleanup.yml` 워크플로우가 자동으로 처리

### 커밋 메시지 규칙

- **语义化 커밋** 사용 (`09_semantic-pr.yml` 참조)
- `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:` 접두사 사용

### 코드 스타일

```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint:fix
```

### 테스트 커버리지

- 새로운 기능에는 반드시 테스트를 추가하세요
- 최소 80% 커버리지 유지 권장

### 문서화

- API 변경 시 `packages/contracts/openapi.yaml` 업데이트
- 타입 변경 시 `packages/types/` 업데이트
- 스키마 변경 시 `packages/schemas/` 업데이트

---

## 추가 리소스

| 리소스 | 설명 |
|--------|------|
| [AGENTS.md](./AGENTS.md) | 프로젝트 지식 베이스 |
| [CHANGELOG.md](./CHANGELOG.md) | 변경 로그 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 기여 가이드 |
| [packages/*/AGENTS.md](./packages/) | 각 패키지의 상세 문서 |

---

# English

## Overview

**Resume** is a monorepo integrating a Cloudflare Worker-based portfolio site, job automation workflows (Wanted/JobKorea), single source of truth (SSoT) resume data, and self-hosted observability infrastructure.

### Key Components

| Component | Description |
|-----------|-------------|
| **apps/portfolio** | Cloudflare Worker-based edge-optimized portfolio site |
| **apps/job-server** | MCP-based job automation runtime |
| **apps/job-dashboard** | Dashboard API and workflow handlers |
| **packages/data** | SSoT resume data (master resume_data.json) |
| **packages/shared** | Error, logger, retry, circuit breaker, crypto utilities |
| **packages/types** | JSDoc/TS canonical type definitions |
| **packages/schemas** | Zod runtime validation schemas |
| **packages/cli** | Deployment, verification, DB operation CLI tools |
| **packages/env** | Environment validation + type-safe secrets |
| **packages/contracts** | OpenAPI spec + Cloudflare Worker Env interface |

## Key Features

- **Portfolio Worker**: High-performance edge site powered by Cloudflare Workers
- **Job Automation**: Wanted/JobKorea MCP-based auto-application system
- **SSoT Data**: Normalized resume data in packages/data
- **Dashboard API**: Workflow handlers and recruitment management API
- **Shared Packages**: Type-safe schemas, retry/circuit breaker, crypto utilities
- **CLI Tools**: Deployment, verification, DB commands support

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
│   ├── shared/             # Error, logger, retry, crypto utilities
│   ├── types/              # JSDoc/TS canonical type definitions
│   ├── schemas/            # Zod runtime validation schemas
│   └── contracts/          # OpenAPI spec + Env interface
├── tools/                  # CI, build, deploy, verification scripts (Go + JS)
├── tests/                  # Jest, integration, Playwright E2E
├── infrastructure/          # Cloudflare, monitoring, n8n, DB config
└── .github/                # CI/release/maintenance control plane
```

---

## Automation Inventory

### GitHub Actions Workflows (37 total)

#### Pull Request Workflows

| Workflow File | Description |
|---------------|-------------|
| `01_branch-to-pr.yml` | Auto-convert branch to PR |
| `02_issue-to-branch.yml` | Auto-create branch from issue |
| `03_pr-checks.yml` | PR required checks (Reusable Workflow) |
| `04_actionlint.yml` | GitHub Actions YAML lint |
| `05_gitleaks.yml` | Secrets scanning (Reusable Workflow) |
| `06_codeql.yml` | Code quality analysis |
| `07_dependency-review.yml` | Dependency security review |
| `08_scorecard.yml` | OpenSSF security score |
| `09_semantic-pr.yml` | Semantic PR commit validation |
| `10_pr-review.yml` | AI-based PR review (qodo-ai/pr-agent) |
| `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| `13_pr-auto-merge.yml` | PR auto-merge |
| `14_bot-auto-fix.yml` | Bot auto-fix |
| `15_merged-pr-cleanup.yml` | Post-merge branch cleanup |
| `44_reusable-pr-checks.yml` | Reusable PR checks |
| `45_reusable-gitleaks.yml` | Reusable gitleaks |

#### Release & Deployment Workflows

| Workflow File | Description |
|---------------|-------------|
| `24_release-notes.yml` | Auto-generate release notes |
| `25_release-publish.yml` | Release publishing |
| `release.yml` | Release process |

#### Issue Management Workflows

| Workflow File | Description |
|---------------|-------------|
| `18_issue-management.yml` | Issue lifecycle management |
| `19_issue-backfill.yml` | Issue backfill processing |
| `37_ci-failure-issues.yml` | Auto-create issue on CI failure |
| `43_reusable-issue-management.yml` | Reusable issue management |

#### Documentation Workflows

| Workflow File | Description |
|---------------|-------------|
| `20_readme-gen.yml` | README auto-generation |
| `21_docs-sync.yml` | Documentation sync |
| `42_reusable-docs-sync.yml` | Reusable documentation sync |

#### CI/CD Workflows

| Workflow File | Description |
|---------------|-------------|
| `ci.yml` | Main CI pipeline |
| `60_ci-auto-heal.yml` | CI auto-healing |
| `auto-merge.yml` | Auto-merge workflow |
| `auto-sync-data.yml` | Data auto-sync |
| `labeler.yml` | PR label auto-assignment |
| `post-deploy-verify.yml` | Post-deploy verification |
| `provision-queues.yml` | Queue provisioning |
| `delete-standalone-job-worker.yml` | Delete standalone job worker |
| `29_downstream-health-check.yml` | Downstream health check |

#### Security Workflows

| Workflow File | Description |
|---------------|-------------|
| `security/11_pr-review.yml` | Security review (qodo-ai/pr-agent) |

#### Miscellaneous Workflows

| Workflow File | Description |
|---------------|-------------|
| `welcome.yml` | New contributor welcome message |

### Automation Tools

#### Python Scripts
- `tools/scripts/build/generate_shinhan_pptx.py` - PPTX generation
- `tools/scripts/sync/apply-proposals.go` - Proposal sync (Go)

#### Go Tools
- `tools/scripts/enrichment/github/main.go` - GitHub data enrichment
- `tools/scripts/enrichment/skills/main.go` - Skills data enrichment
- `tools/scripts/enrichment/ai/main.go` - AI-based enrichment
- `tools/ci/validate-cloudflare-native.go` - Cloudflare native validation

#### Node.js Scripts
- `tools/scripts/utils/sync-resume-data.js` - Resume data sync
- `apps/job-server/src/sync/proposal-review-cli.js` - Proposal review CLI

### AI Review Tools

| Tool | Purpose | Reference |
|------|---------|-----------|
| **qodo-ai/pr-agent** | AI-powered PR review, auto-fix | [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) |

---

## Quick Start

### Prerequisites

- **Node.js** >= 22
- **npm** >= 10
- **Docker** (optional, for containerized run)

### Installation

```bash
# Install dependencies
npm install

# Install all workspaces
npm ci
```

### Development Start

```bash
# Sync data + build
npm run build

# Type check
npm run typecheck

# Run tests
npm run test

# Full SSoT automation pipeline
npm run automate:ssot
```

### Docker Run

```bash
# Run MCP server via Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f mcp-server
```

---

## Local Development

### Environment Variables

```bash
# Create .env file with required secrets
cp .env.example .env
```

### Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Portfolio build + data sync |
| `npm run build:full` | Full build (includes CLI) |
| `npm run sync:data` | Resume data sync |
| `npm run sync:all` | All data sync |
| `npm run sync:proposals` | Proposal sync |
| `npm run enrich:github` | GitHub enrichment |
| `npm run enrich:skills` | Skills enrichment |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | Run all enrichment |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run test` | Run all tests |
| `npm run test:node` | Node.js environment tests |
| `npm run automate:ssot` | SSoT automation pipeline |
| `npm run automate:full` | Full automation pipeline |
| `npm run deploy` | Deploy (disabled) |

### CLI Tool Usage

```bash
# Build CLI
npm run cli:build

# Deploy command
npm run deploy --workspace=@resume/cli

# Verify command
npm run verify --workspace=@resume/cli

# DB command
npm run db --workspace=@resume/cli
```

### Testing

```bash
# Unit tests
npm run test --workspace=@resume/shared

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npx playwright test

# Specific package tests
npm run test --workspace=@resume/schemas
```

---

## Contribution Guide

### Branch Strategy

1. **Create Issue**: Create an issue before starting work
2. **Create Branch**: Use `02_issue-to-branch.yml` workflow or create manually
3. **Develop**: Implement features and write tests
4. **Create PR**: `01_branch-to-pr.yml` workflow automatically creates PR
5. **Review**: `10_pr-review.yml` and `security/11_pr-review.yml` workflows perform AI review
6. **Merge**: `13_pr-auto-merge.yml` or `15_merged-pr-cleanup.yml` workflows handle automatically

### Commit Message Rules

- Use **Semantic Commits** (see `09_semantic-pr.yml`)
- Use prefixes: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

### Code Style

```bash
# Run ESLint
npm run lint

# Auto-fix
npm run lint:fix
```

### Test Coverage

- Always add tests for new features
- Maintain minimum 80% coverage recommended

### Documentation

- Update `packages/contracts/openapi.yaml` for API changes
- Update `packages/types/` for type changes
- Update `packages/schemas/` for schema changes

---

## Additional Resources

| Resource | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Project knowledge base |
| [CHANGELOG.md](./CHANGELOG.md) | Changelog |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guide |
| [packages/*/AGENTS.md](./packages/) | Detailed docs for each package |

---

*Generated by `20_readme-gen.yml` workflow using minimax-m2.7 model (fallback: gpt-5.5 via CLIProxyAPI)*

```

---

## 생성 결과 요약 (Generation Summary)

이 README는 다음을 포함합니다:

### 한국어 섹션
- 개요 및 주요 구성 요소
- 아키텍처 다이어그램
- **37개 GitHub Actions 워크플로우** 상세 목록
- **자동화 도구** (Python, Go, Node.js 스크립트)
- **AI 리뷰 도구** (qodo-ai/pr-agent)
- 빠른 시작 가이드
- 로컬 개발 명령어 참조
- 기여 가이드

### English 섹션
- 동일한 구조의 영어 버전
- 모든 워크플로우 파일명 정확히 기재
- 모든 명령어와 도구 설명 포함

### 외부 링크 정책 준수
- `qodo-ai/pr-agent`만 사용 (다른 외부 링크 없음)
- invented repository URLs 없음