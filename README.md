# Resume Portfolio Monorepo

> [!IMPORTANT]
> **이 README는 bilingual (한국어/English) 입니다.**
> **This README is bilingual (Korean/English).**

[![CI](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/ci.yml)
[![Release](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml/badge.svg)](https://github.com/qodo-ai/pr-agent/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#english) | [한국어](#한국어)

---

## English

### Overview

**Resume** is a monorepo powering a Cloudflare Worker-based portfolio site, automated job application workflows (Wanted/JobKorea), single source of truth (SSoT) resume data, and self-hosted observability infrastructure.

**Version:** 1.40.11  
**Runtime:** Node.js ≥22 (Cloudflare Workers compatible)

### Key Features

| Feature | Description |
|---------|-------------|
| **Portfolio Worker** | Edge-optimized Cloudflare Worker serving public portfolio |
| **Job Automation** | MCP-based automation for Wanted/JobKorea job applications |
| **SSoT Data** | Authoritative resume data in `packages/data` |
| **Dashboard API** | Workflow handlers and job management APIs |
| **Shared Packages** | Type-safe schemas, Zod validation, retry/circuit-breaker, crypto utilities |
| **CLI Tool** | `@resume/cli` for deployment, verification, and database operations |

### Architecture

```
resume/
├── apps/
│   ├── portfolio/        # Cloudflare Worker portfolio site
│   ├── job-server/       # MCP/job automation runtime
│   └── job-dashboard/    # Dashboard API worker
├── packages/
│   ├── cli/              # resume CLI (deploy, verify, db commands)
│   ├── env/              # Environment validation + type-safe secrets
│   ├── data/             # SSoT resumes and JSON schema
│   ├── shared/           # Utilities: errors, logger, retry, crypto, rate-limit, auth, browser, clients
│   ├── types/            # Canonical JSDoc/TS type definitions
│   ├── schemas/          # Runtime Zod validation schemas
│   └── contracts/        # OpenAPI spec + Cloudflare Worker Env interface
├── tools/
│   └── scripts/          # Go + JS automation scripts (enrichment, sync, build)
├── infrastructure/      # Monitoring, n8n, database configs
├── tests/                # Jest, Playwright E2E
└── .github/workflows/    # 37 GitHub Actions workflows
```

### Automation Inventory

#### GitHub Actions Workflows

| # | Workflow File | Purpose |
|---|---------------|---------|
| 01 | `01_branch-to-pr.yml` | Branch to PR automation |
| 02 | `02_issue-to-branch.yml` | Issue to branch creation |
| 03 | `03_pr-checks.yml` | PR validation checks |
| 04 | `04_actionlint.yml` | Action workflow linting |
| 05 | `05_gitleaks.yml` | Secret scanning |
| 06 | `06_codeql.yml` | CodeQL security analysis |
| 07 | `07_dependency-review.yml` | Dependency vulnerability review |
| 08 | `08_scorecard.yml` | OpenSSF scorecard |
| 09 | `09_semantic-pr.yml` | Semantic PR validation |
| 10 | `10_pr-review.yml` | PR review automation |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot auto-merge |
| 13 | `13_pr-auto-merge.yml` | PR auto-merge |
| 14 | `14_bot-auto-fix.yml` | Bot-based auto-fix |
| 15 | `15_merged-pr-cleanup.yml` | Post-merge cleanup |
| 18 | `18_issue-management.yml` | Issue lifecycle management |
| 19 | `19_issue-backfill.yml` | Issue backfill |
| 20 | `20_readme-gen.yml` | README generation |
| 21 | `21_docs-sync.yml` | Documentation sync |
| 24 | `24_release-notes.yml` | Release notes generation |
| 25 | `25_release-publish.yml` | Release publishing |
| 29 | `29_downstream-health-check.yml` | Downstream health check |
| 37 | `37_ci-failure-issues.yml` | CI failure issue creation |
| 42 | `42_reusable-docs-sync.yml` | Reusable docs sync workflow |
| 43 | `43_reusable-issue-management.yml` | Reusable issue management |
| 44 | `44_reusable-pr-checks.yml` | Reusable PR checks |
| 45 | `45_reusable-gitleaks.yml` | Reusable gitleaks workflow |
| 60 | `60_ci-auto-heal.yml` | CI auto-healing |
| - | `auto-merge.yml` | Auto-merge automation |
| - | `auto-sync-data.yml` | Data sync automation |
| - | `ci.yml` | Main CI workflow |
| - | `delete-standalone-job-worker.yml` | Worker cleanup |
| - | `labeler.yml` | PR labeler |
| - | `post-deploy-verify.yml` | Post-deployment verification |
| - | `provision-queues.yml` | Queue provisioning |
| - | `release.yml` | Release workflow |
| - | `welcome.yml` | Welcome message workflow |
| - | `security/11_pr-review.yml` | Security PR review |

#### Automation Tools

| Tool | Location | Purpose |
|------|----------|---------|
| **sync-resume-data.js** | `tools/scripts/utils/` | Resume data synchronization |
| **generate_shinhan_pptx.py** | `tools/scripts/build/` | PPTX generation |
| **proposal-review-cli.js** | `apps/job-server/src/sync/` | Proposal review automation |
| **apply-proposals.go** | `tools/scripts/sync/` | Go-based proposal application |
| **enrichment/github** | `tools/scripts/enrichment/` | GitHub data enrichment |
| **enrichment/skills** | `tools/scripts/enrichment/` | Skills data enrichment |
| **enrichment/ai** | `tools/scripts/enrichment/` | AI-based data enrichment |
| **validate-cloudflare-native.go** | `tools/ci/` | Cloudflare validation |

#### README Generation

Automated README updates are maintained by:
- **Model:** `minimax-m2.7` (primary) with fallback to `gpt-5.5`
- **API:** CLIProxyAPI (`cliproxy.jclee.me`)
- **Bot:** `bot.jclee.me`

### Quick Start

#### Prerequisites

- Node.js ≥22
- npm ≥10

#### Installation

```bash
# Clone repository
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# Install dependencies (workspace)
npm ci

# Sync data (SSoT)
npm run sync:data

# Build portfolio worker
npm run build:portfolio
```

#### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up --build

# Health check
curl http://localhost:3000/health
```

### Commands Reference

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data |
| `npm run sync:pptx` | Generate PPTX |
| `npm run sync:all` | Sync all data |
| `npm run enrich:github` | Enrich GitHub data |
| `npm run enrich:skills` | Enrich skills data |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | All enrichment tasks |
| `npm run automate:ssot` | Sync + build + typecheck + test:node |
| `npm run automate:full` | Full automation pipeline |
| `npm run build` | Build portfolio worker |
| `npm run build:full` | Build portfolio + CLI |
| `npm run lint` | Lint codebase |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run all tests |
| `npm run test:node` | Node-specific tests |
| `npm run deploy` | Deploy (disabled - use PR workflow) |

### Local Development

```bash
# Start job-server with hot reload (if supported)
npm run dev --workspace=@resume/job-server

# Run tests
npm test

# Run specific workspace
npm run build --workspace=@resume/portfolio-worker
```

### Contribution Guide

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** using semantic commits (`npm run commit` or conventional commit)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request with detailed description

#### Code Standards

- TypeScript with strict mode
- ESLint + Prettier formatting
- Jest for unit tests
- Playwright for E2E tests
- All PRs require CI passing

#### Commit Convention

```
<type>(<scope>): <description>

types: feat, fix, docs, style, refactor, test, chore
```

---

## 한국어

### 개요

**Resume**는 Cloudflare Worker 기반 포트폴리오 사이트, 잡 자동화 워크플로우 (Wanted/JobKorea), 단일 진실 공급원 (SSoT) 이력서 데이터, 그리고 자체 호스팅 가능한 모니터링 인프라를 운영하는 모노레포입니다.

**버전:** 1.40.11  
**런타임:** Node.js ≥22 (Cloudflare Workers 호환)

### 주요 기능

| 기능 | 설명 |
|------|------|
| **Portfolio Worker** | 에지 최적화 Cloudflare Worker 공개 포트폴리오 |
| **잡 자동화** | Wanted/JobKorea 잡 지원 자동화를 위한 MCP 기반 |
| **SSoT 데이터** | `packages/data`의 권위 있는 이력서 데이터 |
| **Dashboard API** | 워크플로우 핸들러 및 잡 관리 API |
| **공유 패키지** | 타입 안전한 스키마, Zod 검증, retry/circuit-breaker, crypto 유틸리티 |
| **CLI 도구** | 배포, 검증, 데이터베이스 작업을 위한 `@resume/cli` |

### 아키텍처

```
resume/
├── apps/
│   ├── portfolio/        # Cloudflare Worker 포트폴리오 사이트
│   ├── job-server/       # MCP/잡 자동화 런타임
│   └── job-dashboard/    # Dashboard API 워커
├── packages/
│   ├── cli/              # resume CLI (deploy, verify, db 명령)
│   ├── env/              # 환경 검증 + 타입 안전한 시크릿
│   ├── data/             # SSoT 이력서 및 JSON 스키마
│   ├── shared/           # 유틸리티: errors, logger, retry, crypto, rate-limit, auth, browser, clients
│   ├── types/            # 표준 JSDoc/TS 타입 정의
│   ├── schemas/          # 런타임 Zod 검증 스키마
│   └── contracts/        # OpenAPI 스펙 + Cloudflare Worker Env 인터페이스
├── tools/
│   └── scripts/          # Go + JS 자동화 스크립트 (enrichment, sync, build)
├── infrastructure/      # 모니터링, n8n, 데이터베이스 설정
├── tests/                # Jest, Playwright E2E
└── .github/workflows/    # 37개의 GitHub Actions 워크플로우
```

### 자동화 목록

#### GitHub Actions 워크플로우

| # | 워크플로우 파일 | 목적 |
|---|---------------|------|
| 01 | `01_branch-to-pr.yml` | 브랜치에서 PR로 자동화 |
| 02 | `02_issue-to-branch.yml` | 이슈에서 브랜치 생성 |
| 03 | `03_pr-checks.yml` | PR 검증 체크 |
| 04 | `04_actionlint.yml` | Action 워크플로우 린팅 |
| 05 | `05_gitleaks.yml` | 시크릿 스캔 |
| 06 | `06_codeql.yml` | CodeQL 보안 분석 |
| 07 | `07_dependency-review.yml` | 의존성 취약점 검토 |
| 08 | `08_scorecard.yml` | OpenSSF 점수표 |
| 09 | `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| 10 | `10_pr-review.yml` | PR 리뷰 자동화 |
| 12 | `12_dependabot-auto-merge.yml` | Dependabot 자동 머지 |
| 13 | `13_pr-auto-merge.yml` | PR 자동 머지 |
| 14 | `14_bot-auto-fix.yml` | 봇 기반 자동 수정 |
| 15 | `15_merged-pr-cleanup.yml` | 머지 후 정리 |
| 18 | `18_issue-management.yml` | 이슈 생명주기 관리 |
| 19 | `19_issue-backfill.yml` | 이슈 백필 |
| 20 | `20_readme-gen.yml` | README 생성 |
| 21 | `21_docs-sync.yml` | 문서 동기화 |
| 24 | `24_release-notes.yml` | 릴리스 노트 생성 |
| 25 | `25_release-publish.yml` | 릴리스 게시 |
| 29 | `29_downstream-health-check.yml` | 다운스트림 건강 상태 확인 |
| 37 | `37_ci-failure-issues.yml` | CI 실패 이슈 생성 |
| 42 | `42_reusable-docs-sync.yml` | 재사용 문서 동기화 워크플로우 |
| 43 | `43_reusable-issue-management.yml` | 재사용 이슈 관리 |
| 44 | `44_reusable-pr-checks.yml` | 재사용 PR 체크 |
| 45 | `45_reusable-gitleaks.yml` | 재사용 gitleaks 워크플로우 |
| 60 | `60_ci-auto-heal.yml` | CI 자동 복구 |
| - | `auto-merge.yml` | 자동 머지 자동화 |
| - | `auto-sync-data.yml` | 데이터 동기화 자동화 |
| - | `ci.yml` | 메인 CI 워크플로우 |
| - | `delete-standalone-job-worker.yml` | 워커 정리 |
| - | `labeler.yml` | PR 라벨러 |
| - | `post-deploy-verify.yml` | 배포 후 검증 |
| - | `provision-queues.yml` | 큐 프로비저닝 |
| - | `release.yml` | 릴리스 워크플로우 |
| - | `welcome.yml` | 환영 메시지 워크플로우 |
| - | `security/11_pr-review.yml` | 보안 PR 리뷰 |

#### 자동화 도구

| 도구 | 위치 | 목적 |
|------|----------|-------|
| **sync-resume-data.js** | `tools/scripts/utils/` | 이력서 데이터 동기화 |
| **generate_shinhan_pptx.py** | `tools/scripts/build/` | PPTX 생성 |
| **proposal-review-cli.js** | `apps/job-server/src/sync/` | 제안 검토 자동화 |
| **apply-proposals.go** | `tools/scripts/sync/` | Go 기반 제안 적용 |
| **enrichment/github** | `tools/scripts/enrichment/` | GitHub 데이터 보강 |
| **enrichment/skills** | `tools/scripts/enrichment/` | 스킬 데이터 보강 |
| **enrichment/ai** | `tools/scripts/enrichment/` | AI 기반 데이터 보강 |
| **validate-cloudflare-native.go** | `tools/ci/` | Cloudflare 검증 |

#### README 생성

자동화된 README 업데이트는 다음으로 유지 관리됩니다:
- **모델:** `minimax-m2.7` (기본) 및 `gpt-5.5` 폴백
- **API:** CLIProxyAPI (`cliproxy.jclee.me`)
- **봇:** `bot.jclee.me`

### 빠른 시작

#### 전제 조건

- Node.js ≥22
- npm ≥10

#### 설치

```bash
# 레포 클론
git clone https://github.com/qodo-ai/pr-agent.git
cd pr-agent

# 의존성 설치 (workspace)
npm ci

# 데이터 동기화 (SSoT)
npm run sync:data

# 포트폴리오 워커 빌드
npm run build:portfolio
```

#### Docker 배포

```bash
# docker-compose로 빌드 및 실행
docker-compose up --build

# 헬스 체크
curl http://localhost:3000/health
```

### 명령어 참조

| 명령어 | 설명 |
|---------|------|
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 생성 |
| `npm run sync:all` | 모든 데이터 동기화 |
| `npm run enrich:github` | GitHub 데이터 보강 |
| `npm run enrich:skills` | 스킬 데이터 보강 |
| `npm run enrich:ai` | AI 보강 |
| `npm run enrich:all` | 모든 보강 작업 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + 테스트:node |
| `npm run automate:full` | 전체 자동화 파이프라인 |
| `npm run build` | 포트폴리오 워커 빌드 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run lint` | 코드베이스 린트 |
| `npm run typecheck` | TypeScript 체크 |
| `npm run test` | 모든 테스트 실행 |
| `npm run test:node` | Node 특정 테스트 |
| `npm run deploy` | 배포 (비활성화 - PR 워크플로우 사용) |

### 로컬 개발

```bash
# 핫 리로드로 job-server 시작 (지원 시)
npm run dev --workspace=@resume/job-server

# 테스트 실행
npm test

# 특정 워크스페이스 실행
npm run build --workspace=@resume/portfolio-worker
```

### 기여 가이드

1. 레포지토리를 **Fork** 합니다
2. 피처 브랜치를 **생성**합니다 (`git checkout -b feature/amazing-feature`)
3. 시맨틱 커밋으로 **커밋**합니다 (`npm run commit` 또는 conventional commit)
4. 브랜치에 **푸시**합니다 (`git push origin feature/amazing-feature`)
5. 상세한 설명으로 **Pull Request**를 엽니다

#### 코드 표준

- Strict 모드의 TypeScript
- ESLint + Prettier 포맷팅
- Jest 유닛 테스트
- Playwright E2E 테스트
- 모든 PR은 CI 통과 필요

#### 커밋 규칙

```
<type>(<scope>): <description>

types: feat, fix, docs, style, refactor, test, chore
```

---

## License

MIT License - See [LICENSE](LICENSE) for details.

## External Links

- **PR Agent:** [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent)
- **CLI Proxy API:** [cliproxy.jclee.me](https://cliproxy.jclee.me)
- **Bot Service:** [bot.jclee.me](https://bot.jclee.me)