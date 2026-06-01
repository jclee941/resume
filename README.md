# Resume Portfolio Monorepo

# 이력서 포트폴리오 모노레포

---

[![CI](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml)
[![Release](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)
[![Biweekly Release](https://img.shields.io/badge/Release-Biweekly-blue.svg)](https://github.com/qodo-ai/pr-agent/blob/master/CHANGELOG.md)

**Version:** 1.40.11

> **English below** (한국어 버전 이후)

---

# 한국어 (Korean)

## 개요

**Resume**는 Cloudflare Worker 기반 포트폴리오 사이트, Wanted/JobKorea 채용 자동화, 단일 진실 공급원(SSoT) 이력서 데이터, 자체 호스팅 감시 인프라를 통합한 모노레포입니다.

**Architecture:**

```
apps/
├── portfolio/          # Cloudflare Worker 기반 엣지 포트폴리오
├── job-server/        # MCP 기반 채용 자동화 런타임
└── job-dashboard/     # 대시보드 API 및 워크플로우 핸들러

packages/
├── cli/               # CLI 배포/검증 도구
├── env/               # 환경 검증 + 타입 세이프 시크릿
├── data/              # SSoT 이력서 데이터 (master resume_data.json)
├── shared/            # 에러, 로거, 재시도, 서킷 브레이커, 암호화 유틸리티
├── types/             # JSDoc/TS 정규 타입 정의 (런타임 의존성 없음)
├── schemas/           # Zod 런타임 검증 스키마
└── contracts/         # OpenAPI 스펙 + Cloudflare Worker Env 인터페이스

tools/                 # CI, 빌드, 배포, 검증 스크립트 (Go + JS)
.github/workflows/     # 37개 GitHub Actions 워크플로우
```

## 주요 기능

### 포트폴리오 및 채용 자동화

| 기능 | 설명 |
|------|------|
| **포트폴리오 Worker** | Cloudflare Workers로 구동되는 고성능 엣지 사이트 |
| **채용 자동화** | Wanted/JobKorea MCP 기반 자동 지원 시스템 |
| **SSoT 데이터** | `packages/data`의 정형화된 이력서 데이터 |
| **자체 호스팅 감시** | Cloudflare 대시보드 + 자체 감시 인프라 |

### 기술 스택

- **Runtime:** Node.js 22+, Cloudflare Workers
- **언어:** JavaScript/TypeScript (JSDoc 주석), Go (스크립트)
- **검증:** Zod (런타임), JSDoc/TS (정적)
- **컨테이너:** Docker, docker-compose
- **CI/CD:** GitHub Actions (37개 워크플로우)

## 자동화 인벤토리 (Automation Inventory)

### GitHub Actions 워크플로우 (37개)

#### Pull Request 자동화

| 워크플로우 | 설명 |
|-----------|------|
| `01_branch-to-pr.yml` | 브랜치 → PR 변환 |
| `02_issue-to-branch.yml` | 이슈 → 브랜치 생성 |
| `03_pr-checks.yml` | PR 기본 검사의 |
| `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| `10_pr-review.yml` | AI 코드 리뷰 (qodo-ai/pr-agent) |
| `13_pr-auto-merge.yml` | 자동 병합 |
| `14_bot-auto-fix.yml` | 봇 자동 수정 |
| `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 |

#### 보안 및 품질

| 워크플로우 | 설명 |
|-----------|------|
| `04_actionlint.yml` | GitHub Actions lint |
| `05_gitleaks.yml` | 시크릿 스캔 |
| `06_codeql.yml` | 코드 품질 분석 |
| `07_dependency-review.yml` | 의존성 보안 검토 |
| `08_scorecard.yml` | 오픈소스 보안 점수 |
| `45_reusable-gitleaks.yml` | 재사용 가능한 Gitleaks |

#### 이슈 관리

| 워크플로우 | 설명 |
|-----------|------|
| `18_issue-management.yml` | 이슈 관리 |
| `19_issue-backfill.yml` | 이슈 백필 |
| `37_ci-failure-issues.yml` | CI 실패 시 이슈 생성 |
| `43_reusable-issue-management.yml` | 재사용 가능한 이슈 관리 |

#### 릴리스 및 배포

| 워크플로우 | 설명 |
|-----------|------|
| `24_release-notes.yml` | 릴리스 노트 생성 |
| `25_release-publish.yml` | 릴리스 게시 |
| `release.yml` | 릴리스 워크플로우 |
| `auto-merge.yml` | 자동 병합 |
| `post-deploy-verify.yml` | 배포 후 검증 |

#### 문서 및 동기화

| 워크플로우 | 설명 |
|-----------|------|
| `20_readme-gen.yml` | README 생성 |
| `21_docs-sync.yml` | 문서 동기화 |
| `42_reusable-docs-sync.yml` | 재사용 가능한 문서 동기화 |

#### 유지보수

| 워크플로우 | 설명 |
|-----------|------|
| `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| `60_ci-auto-heal.yml` | CI 자동 복구 |
| `29_downstream-health-check.yml` | 하위 프로젝트 상태 확인 |
| `labeler.yml` | 이슈/PR 라벨링 |
| `auto-sync-data.yml` | 데이터 자동 동기화 |

#### 재사용 가능한 워크플로우

| 워크플로우 | 설명 |
|-----------|------|
| `42_reusable-docs-sync.yml` | 문서 동기화 |
| `43_reusable-issue-management.yml` | 이슈 관리 |
| `44_reusable-pr-checks.yml` | PR 검사 |
| `45_reusable-gitleaks.yml` | Gitleaks |

### Go 자동화 도구

| 도구 | 경로 | 설명 |
|------|------|------|
| **PDF 생성기** | `tools/scripts/build/pdf-generator.go` | 이력서 PDF 생성 (master 브랜치) |
| **제안 동기화** | `tools/scripts/sync/apply-proposals.go` | 제안서 자동 동기화 |
| **AI 인치먼트** | `tools/scripts/enrichment/ai/main.go` | AI 기반 이력서 인치먼트 |
| **GitHub 인치먼트** | `tools/scripts/enrichment/github/main.go` | GitHub 데이터 동기화 |
| **스킬 인치먼트** | `tools/scripts/enrichment/skills/main.go` | 스킬 데이터 동기화 |
| **클라우드플레어 검증** | `tools/ci/validate-cloudflare-native.go` | Cloudflare 네이티브 검증 |

### Node.js/JavaScript 스크립트

| 스크립트 | 명령어 | 설명 |
|---------|--------|------|
| **데이터 동기화** | `npm run sync:data` | SSoT 이력서 데이터 동기화 |
| **PPTX 생성** | `npm run sync:pptx` | Python 기반 PPTX 생성 |
| **제안서 검토 CLI** | `apps/job-server/src/sync/proposal-review-cli.js` | 제안서 검토 자동화 |
| **README 생성** | `20_readme-gen.yml` (workflow) | 자동 README 생성 |

### Python 스크립트

| 스크립트 | 설명 |
|---------|------|
| `tools/scripts/build/generate_shinhan_pptx.py` | 신한 PPTX 생성 |

## 빠른 시작 (Quick Start)

### 전제 조건

- Node.js 22+
- Docker & Docker Compose
- Git

### 로컬 개발 환경

```bash
# 저장소 클론
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# 의존성 설치
npm ci

# 데이터 동기화
npm run sync:data

# 개발 서버 실행
npm run build
```

### Docker Compose로 실행

```bash
# 컨테이너 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 빌드 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run build` | 전체 빌드 (데이터 동기화 포함) |
| `npm run build:portfolio` | 포트폴리오 Worker 빌드 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pdf` | PDF 생성 |
| `npm run sync:pptx` | PPTX 생성 |
| `npm run sync:all` | 모든 동기화 (data + pdf + pptx) |

### 테스트 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run test` | 전체 테스트 |
| `npm run test:node` | Node.js 테스트 |

### 자동화 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run automate:ssot` | SSoT 자동화 (sync + build + typecheck + test) |
| `npm run automate:full` | 전체 자동화 (sync + lint + typecheck + test + build + 검증) |

### 배포 명령어

```bash
# CLI 배포
npm run deploy

# DB 명령어
npm run db

# 검증
npm run verify
```

## 로컬 개발

### 패키지 구조

```
packages/
├── cli/        # CLI 도구 (deploy, verify, db)
├── env/        # 환경 검증 + 시크릿
├── data/       # SSoT 데이터
├── shared/     # 공유 유틸리티
├── types/      # 타입 정의
├── schemas/    # Zod 스키마
└── contracts/  # OpenAPI 스펙
```

### 환경 변수

`.env` 파일 생성:

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# 데이터
RESUME_DATA_PATH=./packages/data/resumes/master/resume_data.json
```

### 컨테이너 개발

```bash
# 단일 서비스 실행
docker-compose up -d mcp-server

# 로그 확인
docker-compose logs -f mcp-server

# 정지
docker-compose down
```

## 기여指南 (Contributing)

 CONTRIBUTING.md를 참조하세요.

### 주요 규칙

1. **브랜치命名:** `type/description` (예: `feat/new-feature`)
2. **커밋 메시지:** 시맨틱 커밋 사용 (`feat:`, `fix:`, `docs:`)
3. **PR 리뷰:** `10_pr-review.yml` 워크플로우로 자동 리뷰
4. **테스트:** 모든 PR에 테스트 필수
5. **린트:** `npm run lint` 통과 필수

### 워크플로우

1. 이슈 생성 또는 기존 이슈 할당
2. `02_issue-to-branch.yml`으로 브랜치 생성
3. 코드 작성 및 테스트
4. PR 생성 → 자동 리뷰 + 검사
5. 병합 후 `15_merged-pr-cleanup.yml`로 정리

---

# English

## Overview

**Resume** is a monorepo integrating a Cloudflare Worker-based portfolio site, Wanted/JobKorea job automation, Single Source of Truth (SSoT) resume data, and self-hosted observability infrastructure.

**Architecture:**

```
apps/
├── portfolio/          # Cloudflare Worker-based edge portfolio
├── job-server/        # MCP-based job automation runtime
└── job-dashboard/     # Dashboard API and workflow handlers

packages/
├── cli/               # CLI deployment/verification tools
├── env/               # Environment validation + type-safe secrets
├── data/              # SSoT resume data (master resume_data.json)
├── shared/            # Errors, logger, retry, circuit breaker, crypto utilities
├── types/             # Canonical JSDoc/TS type definitions (zero runtime deps)
├── schemas/           # Zod runtime validation schemas
└── contracts/         # OpenAPI spec + Cloudflare Worker Env interface

tools/                 # CI, build, deploy, verification scripts (Go + JS)
.github/workflows/     # 37 GitHub Actions workflows
```

## Key Features

### Portfolio and Job Automation

| Feature | Description |
|---------|-------------|
| **Portfolio Worker** | High-performance edge site powered by Cloudflare Workers |
| **Job Automation** | Wanted/JobKorea MCP-based auto-application system |
| **SSoT Data** | Structured resume data in `packages/data` |
| **Self-hosted Observability** | Cloudflare dashboards + self-hosted monitoring |

### Tech Stack

- **Runtime:** Node.js 22+, Cloudflare Workers
- **Languages:** JavaScript/TypeScript (JSDoc annotated), Go (scripts)
- **Validation:** Zod (runtime), JSDoc/TS (static)
- **Container:** Docker, docker-compose
- **CI/CD:** GitHub Actions (37 workflows)

## Automation Inventory

### GitHub Actions Workflows (37 total)

#### Pull Request Automation

| Workflow | Description |
|----------|-------------|
| `01_branch-to-pr.yml` | Branch to PR conversion |
| `02_issue-to-branch.yml` | Issue to branch creation |
| `03_pr-checks.yml` | PR basic checks |
| `09_semantic-pr.yml` | Semantic PR validation |
| `10_pr-review.yml` | AI code review (qodo-ai/pr-agent) |
| `13_pr-auto-merge.yml` | Auto-merge |
| `14_bot-auto-fix.yml` | Bot auto-fix |
| `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| `44_reusable-pr-checks.yml` | Reusable PR checks |

#### Security and Quality

| Workflow | Description |
|----------|-------------|
| `04_actionlint.yml` | GitHub Actions lint |
| `05_gitleaks.yml` | Secret scanning |
| `06_codeql.yml` | Code quality analysis |
| `07_dependency-review.yml` | Dependency security review |
| `08_scorecard.yml` | Open source security score |
| `45_reusable-gitleaks.yml` | Reusable Gitleaks |

#### Issue Management

| Workflow | Description |
|----------|-------------|
| `18_issue-management.yml` | Issue management |
| `19_issue-backfill.yml` | Issue backfill |
| `37_ci-failure-issues.yml` | CI failure issue creation |
| `43_reusable-issue-management.yml` | Reusable issue management |

#### Release and Deploy

| Workflow | Description |
|----------|-------------|
| `24_release-notes.yml` | Release notes generation |
| `25_release-publish.yml` | Release publishing |
| `release.yml` | Release workflow |
| `auto-merge.yml` | Auto-merge |
| `post-deploy-verify.yml` | Post-deploy verification |

#### Documentation and Sync

| Workflow | Description |
|----------|-------------|
| `20_readme-gen.yml` | README generation |
| `21_docs-sync.yml` | Docs synchronization |
| `42_reusable-docs-sync.yml` | Reusable docs sync |

#### Maintenance

| Workflow | Description |
|----------|-------------|
| `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| `60_ci-auto-heal.yml` | CI auto-heal |
| `29_downstream-health-check.yml` | Downstream health check |
| `labeler.yml` | Issue/PR labeling |
| `auto-sync-data.yml` | Data auto-sync |

#### Reusable Workflows

| Workflow | Description |
|----------|-------------|
| `42_reusable-docs-sync.yml` | Docs sync |
| `43_reusable-issue-management.yml` | Issue management |
| `44_reusable-pr-checks.yml` | PR checks |
| `45_reusable-gitleaks.yml` | Gitleaks |

### Go Automation Tools

| Tool | Path | Description |
|------|------|-------------|
| **PDF Generator** | `tools/scripts/build/pdf-generator.go` | Resume PDF generation (master branch) |
| **Proposals Sync** | `tools/scripts/sync/apply-proposals.go` | Proposals auto-sync |
| **AI Enrichment** | `tools/scripts/enrichment/ai/main.go` | AI-based resume enrichment |
| **GitHub Enrichment** | `tools/scripts/enrichment/github/main.go` | GitHub data sync |
| **Skills Enrichment** | `tools/scripts/enrichment/skills/main.go` | Skills data sync |
| **Cloudflare Validation** | `tools/ci/validate-cloudflare-native.go` | Cloudflare native validation |

### Node.js/JavaScript Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Data Sync** | `npm run sync:data` | SSoT resume data sync |
| **PPTX Generation** | `npm run sync:pptx` | Python-based PPTX generation |
| **Proposal Review CLI** | `apps/job-server/src/sync/proposal-review-cli.js` | Proposal review automation |
| **README Generation** | `20_readme-gen.yml` (workflow) | Automatic README generation |

### Python Scripts

| Script | Description |
|--------|-------------|
| `tools/scripts/build/generate_shinhan_pptx.py` | Shinhan PPTX generation |

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- Git

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install dependencies
npm ci

# Sync data
npm run sync:data

# Build
npm run build
```

### Run with Docker Compose

```bash
# Build and run containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Full build (includes data sync) |
| `npm run build:portfolio` | Portfolio Worker build |
| `npm run build:full` | Portfolio + CLI build |
| `npm run sync:data` | Resume data sync |
| `npm run sync:pdf` | PDF generation |
| `npm run sync:pptx` | PPTX generation |
| `npm run sync:all` | All sync (data + pdf + pptx) |

### Test Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Full test suite |
| `npm run test:node` | Node.js tests |

### Automation Commands

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | SSoT automation (sync + build + typecheck + test) |
| `npm run automate:full` | Full automation (sync + lint + typecheck + test + build + validation) |

### Deployment Commands

```bash
# CLI deployment
npm run deploy

# DB commands
npm run db

# Verification
npm run verify
```

## Local Development

### Package Structure

```
packages/
├── cli/        # CLI tools (deploy, verify, db)
├── env/        # Environment validation + secrets
├── data/       # SSoT data
├── shared/     # Shared utilities
├── types/      # Type definitions
├── schemas/    # Zod schemas
└── contracts/  # OpenAPI spec
```

### Environment Variables

Create `.env` file:

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# Data
RESUME_DATA_PATH=./packages/data/resumes/master/resume_data.json
```

### Container Development

```bash
# Run single service
docker-compose up -d mcp-server

# View logs
docker-compose logs -f mcp-server

# Stop
docker-compose down
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

### Key Rules

1. **Branch naming:** `type/description` (e.g., `feat/new-feature`)
2. **Commit messages:** Use semantic commits (`feat:`, `fix:`, `docs:`)
3. **PR review:** Automated via `10_pr-review.yml` workflow
4. **Tests:** Required for all PRs
5. **Lint:** Must pass `npm run lint`

### Workflow

1. Create issue or get assigned
2. Create branch via `02_issue-to-branch.yml`
3. Write code and tests
4. Create PR → auto-review + checks
5. Merge → cleanup via `15_merged-pr-cleanup.yml`

---

## Links

- **Documentation:** [docs](./docs/)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **License:** [LICENSE](./LICENSE)

> **AI Code Review:** Powered by [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent)