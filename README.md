# resume.jclee.me

## DevSecOps / SRE Resume Automation Monorepo  
## DevSecOps / SRE 이력서 자동화 모노레포

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![Release](https://github.com/jclee941/resume/actions/workflows/release.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/release.yml)
[![CodeQL](https://github.com/jclee941/resume/actions/workflows/06_codeql.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/06_codeql.yml)
[![Gitleaks](https://github.com/jclee941/resume/actions/workflows/05_gitleaks.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/05_gitleaks.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)

[Portfolio](https://resume.jclee.me) · [English](https://resume.jclee.me/en) · [日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) · [Metrics](https://resume.jclee.me/metrics)

---

## Overview / 개요

### English

`resume` is a private npm workspace monorepo for a DevSecOps/SRE resume platform. It combines:

- A Cloudflare Worker-based portfolio site.
- Job automation runtimes for Wanted/JobKorea-style workflows.
- Shared schemas, contracts, types, environment validation, and utilities.
- CI/CD, security scanning, release automation, documentation sync, issue/PR automation, and self-healing GitHub Actions.
- Containerized runtime support for the job automation server.

The repository is designed around **SSoT: Single Source of Truth** resume data. Resume content, schemas, contracts, and runtime packages are maintained in one monorepo and propagated into portfolio builds, automation services, dashboard APIs, and downstream verification flows.

Current AI/automation models used by repository automation are:

- `minimax-m2.7`
- `gpt-5.5` via `CLIProxyAPI`

### 한국어

`resume` 저장소는 DevSecOps/SRE 이력서 플랫폼을 위한 private npm workspace 모노레포입니다. 다음 구성요소를 포함합니다.

- Cloudflare Worker 기반 포트폴리오 사이트
- Wanted/JobKorea 계열 구직 자동화 런타임
- 공통 스키마, 계약 명세, 타입, 환경 변수 검증, 유틸리티 패키지
- CI/CD, 보안 스캔, 릴리스 자동화, 문서 동기화, 이슈/PR 자동화, GitHub Actions 자가 복구 자동화
- 구직 자동화 서버를 위한 Docker 기반 런타임

이 저장소는 **SSoT, Single Source of Truth** 구조를 중심으로 설계되어 있습니다. 이력서 데이터, 스키마, 계약 명세, 런타임 패키지를 하나의 모노레포에서 관리하고, 이를 포트폴리오 빌드, 자동화 서비스, 대시보드 API, 다운스트림 검증 플로우로 전파합니다.

현재 저장소 자동화에서 사용하는 AI/자동화 모델은 다음과 같습니다.

- `minimax-m2.7`
- `gpt-5.5` via `CLIProxyAPI`

---

## Features / 주요 기능

### English

- **Cloudflare Worker portfolio**
  - Edge-deployed resume/portfolio site.
  - Health and metrics endpoints.
  - Wrangler-based deployment configuration.

- **Job automation runtime**
  - Containerized Node.js runtime for job automation services.
  - `/health` endpoint with Docker health checks.
  - Persistent local volume for job automation data.

- **Workspace-based package architecture**
  - `@resume/env`: environment parsing and validation.
  - `@resume/contracts`: OpenAPI contract and Worker environment interface.
  - `@resume/types`: canonical JSDoc/TypeScript type definitions.
  - `@resume/schemas`: runtime validation schemas.
  - `@resume/shared`: shared utilities including retry, crypto, phone/user-agent helpers, Wanted client, and error types.
  - `@resume/cli`: operational CLI commands.

- **DevSecOps automation**
  - CI, linting, tests, actionlint, CodeQL, Gitleaks, dependency review, OpenSSF Scorecard.
  - Semantic PR validation, PR review automation, auto-merge, bot auto-fix, and merged branch cleanup.
  - Release notes and release publishing automation.
  - Documentation generation/sync automation.
  - Issue management and CI failure issue creation.
  - CI auto-healing workflow.

- **API and contract validation**
  - OpenAPI specification through `packages/contracts/openapi.yaml`.
  - Redocly configuration through `redocly.yaml`.

- **Testing stack**
  - Jest configuration.
  - Node-native tests in packages.
  - Playwright configuration for browser/E2E coverage.

- **Container runtime**
  - Multi-stage Docker build based on `node:22-alpine`.
  - Docker Compose service for the MCP/job automation server.

### 한국어

- **Cloudflare Worker 포트폴리오**
  - Edge 환경에 배포되는 이력서/포트폴리오 사이트
  - Health 및 Metrics 엔드포인트
  - Wrangler 기반 배포 설정

- **구직 자동화 런타임**
  - 구직 자동화 서비스를 위한 컨테이너 기반 Node.js 런타임
  - `/health` 엔드포인트와 Docker health check
  - 자동화 데이터를 위한 로컬 영속 볼륨

- **Workspace 기반 패키지 구조**
  - `@resume/env`: 환경 변수 파싱 및 검증
  - `@resume/contracts`: OpenAPI 계약 명세 및 Worker 환경 인터페이스
  - `@resume/types`: 표준 JSDoc/TypeScript 타입 정의
  - `@resume/schemas`: 런타임 검증 스키마
  - `@resume/shared`: retry, crypto, phone/user-agent helper, Wanted client, error type 등 공통 유틸리티
  - `@resume/cli`: 운영 CLI 명령

- **DevSecOps 자동화**
  - CI, lint, test, actionlint, CodeQL, Gitleaks, dependency review, OpenSSF Scorecard
  - semantic PR 검증, PR 리뷰 자동화, auto-merge, bot auto-fix, 병합 브랜치 정리
  - 릴리스 노트 및 릴리스 게시 자동화
  - 문서 생성/동기화 자동화
  - 이슈 관리 및 CI 실패 이슈 생성
  - CI 자가 복구 workflow

- **API 및 계약 검증**
  - `packages/contracts/openapi.yaml` 기반 OpenAPI 명세
  - `redocly.yaml` 기반 API 문서/검증 설정

- **테스트 스택**
  - Jest 설정
  - 패키지 단위 Node 테스트
  - Playwright 기반 브라우저/E2E 테스트 설정

- **컨테이너 런타임**
  - `node:22-alpine` 기반 multi-stage Docker build
  - MCP/job automation server용 Docker Compose 서비스

---

## Architecture / 아키텍처

```text
.
├── apps/
│   ├── portfolio/          # Cloudflare Worker portfolio application
│   ├── job-server/         # MCP/job automation runtime
│   └── job-dashboard/      # Dashboard Worker/API workflows
│
├── packages/
│   ├── cli/                # Operational CLI: db, deploy, verify
│   ├── env/                # Environment validation and parsing
│   ├── contracts/          # OpenAPI spec and Worker Env contract
│   ├── types/              # Canonical shared types
│   ├── schemas/            # Runtime validation schemas
│   └── shared/             # Cross-package utilities
│
├── tools/                  # Automation, build, sync, deploy, verification scripts
├── tests/                  # Unit, integration, and E2E tests
├── infrastructure/         # Cloudflare, monitoring, n8n, DB, observability config
├── docs/                   # Architecture, ADRs, runbooks, conventions
├── .github/workflows/      # GitHub Actions automation control plane
├── Dockerfile              # Production container image for job-server runtime
├── docker-compose.yml      # Local container orchestration
├── wrangler.jsonc          # Cloudflare Workers configuration
├── redocly.yaml            # OpenAPI/Redocly configuration
├── eslint.config.cjs       # ESLint configuration
├── jest.config.cjs         # Jest configuration
└── playwright.config.js    # Playwright configuration
```

### Data and Build Flow / 데이터 및 빌드 흐름

```text
            ┌──────────────────────────────┐
            │ SSoT Resume/Data Packages    │
            │ packages/data + schemas      │
            └───────────────┬──────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌────────────────┐ ┌────────────────────┐
│ Portfolio Worker│ │ Job Automation │ │ Contracts / Schemas │
│ Cloudflare Edge │ │ Job Server     │ │ OpenAPI + Zod       │
└────────┬────────┘ └────────┬───────┘ └─────────┬──────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌────────────────┐ ┌────────────────────┐
│ Public Site     │ │ Runtime APIs   │ │ CI Contract Checks  │
│ /health /metrics│ │ Docker/Compose │ │ Docs/Validation     │
└─────────────────┘ └────────────────┘ └────────────────────┘
```

### Runtime Container / 런타임 컨테이너

The provided `Dockerfile` builds a production image for the job automation runtime.

- Base image: `node:22-alpine`
- Runtime entrypoint: `node src/server/index.js`
- Default port: `3000`
- Health check: `GET http://127.0.0.1:3000/health`
- Runtime workdir: `/app/apps/job-server`
- Persistent Compose volume: `job_automation_data`

---

## Automation Inventory / 자동화 인벤토리

This repository contains **35 GitHub Actions workflows** and npm/package-level automation commands. There are currently **0 standalone Go automation tools listed in the repository inventory**, although npm scripts reference Go-based helper scripts under `tools/` for some validation/enrichment paths.

### GitHub Actions Workflows / GitHub Actions 워크플로

| Workflow file | Purpose / 목적 |
| --- | --- |
| `01_branch-to-pr.yml` | Creates or manages PRs from branches / 브랜치에서 PR 생성 또는 관리 |
| `02_issue-to-branch.yml` | Creates branches from issues / 이슈 기반 브랜치 생성 |
| `03_pr-checks.yml` | Pull request validation checks / PR 검증 |
| `04_actionlint.yml` | GitHub Actions workflow linting / workflow 문법 검사 |
| `05_gitleaks.yml` | Secret scanning with Gitleaks / 시크릿 스캔 |
| `06_codeql.yml` | CodeQL security analysis / CodeQL 보안 분석 |
| `07_dependency-review.yml` | Dependency review for PRs / 의존성 변경 검토 |
| `08_scorecard.yml` | OpenSSF Scorecard checks / 공급망 보안 점수 검사 |
| `09_semantic-pr.yml` | Semantic PR title/body validation / semantic PR 검증 |
| `10_pr-review.yml` | Automated PR review / 자동 PR 리뷰 |
| `12_dependabot-auto-merge.yml` | Dependabot PR auto-merge / Dependabot PR 자동 병합 |
| `13_pr-auto-merge.yml` | General PR auto-merge / 일반 PR 자동 병합 |
| `14_bot-auto-fix.yml` | Bot-driven automatic fixes / bot 기반 자동 수정 |
| `15_merged-pr-cleanup.yml` | Cleanup after PR merge / 병합 후 브랜치/리소스 정리 |
| `18_issue-management.yml` | Issue labeling/triage/management / 이슈 관리 |
| `19_issue-backfill.yml` | Issue metadata backfill / 이슈 메타데이터 보강 |
| `20_readme-gen.yml` | README generation automation / README 생성 자동화 |
| `21_docs-sync.yml` | Documentation synchronization / 문서 동기화 |
| `24_release-notes.yml` | Release notes generation / 릴리스 노트 생성 |
| `25_release-publish.yml` | Release publishing / 릴리스 게시 |
| `29_downstream-health-check.yml` | Downstream health checks / 다운스트림 상태 점검 |
| `37_ci-failure-issues.yml` | Creates issues for CI failures / CI 실패 이슈 생성 |
| `42_reusable-docs-sync.yml` | Reusable docs sync workflow / 재사용 문서 동기화 workflow |
| `43_reusable-issue-management.yml` | Reusable issue management workflow / 재사용 이슈 관리 workflow |
| `44_reusable-pr-checks.yml` | Reusable PR checks workflow / 재사용 PR 검증 workflow |
| `60_ci-auto-heal.yml` | CI auto-healing automation / CI 자가 복구 자동화 |
| `auto-merge.yml` | Auto-merge orchestration / 자동 병합 오케스트레이션 |
| `auto-sync-data.yml` | Data synchronization automation / 데이터 동기화 자동화 |
| `ci.yml` | Main continuous integration workflow / 메인 CI |
| `delete-standalone-job-worker.yml` | Removes standalone job worker resources / standalone job worker 삭제 |
| `labeler.yml` | PR/issue labeling / PR 및 이슈 라벨링 |
| `post-deploy-verify.yml` | Post-deployment verification / 배포 후 검증 |
| `provision-queues.yml` | Queue provisioning / 큐 프로비저닝 |
| `release.yml` | Release workflow / 릴리스 workflow |
| `welcome.yml` | New contributor welcome automation / 신규 기여자 환영 자동화 |

### Package and Tool Inventory / 패키지 및 도구 인벤토리

| Tool / Package | Location | Description |
| --- | --- | --- |
| `@resume/cli` | `packages/cli` | Operational CLI package |
| `db` command | `packages/cli/src/commands/db.js` | Database-related operational command |
| `deploy` command | `packages/cli/src/commands/deploy.js` | Deployment-related operational command |
| `verify` command | `packages/cli/src/commands/verify.js` | Verification command |
| CLI entrypoint | `packages/cli/bin/run.js` | Executable CLI runner |
| `@resume/env` | `packages/env` | Environment parsing and schema validation |
| `@resume/contracts` | `packages/contracts` | OpenAPI contract and environment contract exports |
| `@resume/types` | `packages/types` | Shared type definitions |
| `@resume/schemas` | `packages/schemas` | Runtime schemas for application, auth, resume, portfolio, webhook, common data |
| `@resume/shared` | `packages/shared` | Common retry, crypto, error, phone, UA, and Wanted client utilities |
| Redocly | `redocly.yaml` | OpenAPI linting/documentation configuration |
| Wrangler | `wrangler.jsonc` | Cloudflare Worker deployment configuration |
| ESLint | `eslint.config.cjs` | JavaScript linting |
| Jest | `jest.config.cjs` | Unit test runner configuration |
| Playwright | `playwright.config.js` | Browser/E2E test configuration |
| Lychee | `lychee.toml` | Link checking configuration |
| Docker | `Dockerfile` | Production job-server image |
| Docker Compose | `docker-compose.yml` | Local runtime orchestration |

### AI Automation Models / AI 자동화 모델

| Model | Access Path | Usage |
| --- | --- | --- |
| `minimax-m2.7` | Repository automation / CLI automation | Documentation, review, or maintenance automation |
| `gpt-5.5` | `CLIProxyAPI` | Documentation, review, or maintenance automation |

---

## Quick Start / 빠른 시작

### Prerequisites / 사전 요구사항

- Node.js `>= 22`
- npm with workspace support
- Docker and Docker Compose, optional but recommended
- Cloudflare Wrangler credentials for deployment workflows
- `.env` file for local job-server runtime

### Install / 설치

```bash
npm install
```

For deterministic CI-like installation:

```bash
npm ci
```

### Run the Main Automation Check / 핵심 자동화 검증 실행

```bash
npm run automate:ssot
```

This runs:

1. Data sync
2. Build
3. Type check
4. Node tests

한국어:

위 명령은 다음을 실행합니다.

1. 데이터 동기화
2. 빌드
3. 타입 검사
4. Node 테스트

### Build / 빌드

```bash
npm run build
```

Portfolio-only build:

```bash
npm run build:portfolio
```

Full build including CLI:

```bash
npm run build:full
```

### Test / 테스트

```bash
npm test
```

Package-specific tests can be run through npm workspace commands where available.

### Docker Runtime / Docker 런타임

Start the job automation server locally:

```bash
docker compose up --build
```

The service is exposed at:

```text
http://localhost:3000
```

Health check endpoint:

```text
http://localhost:3000/health
```

Stop services:

```bash
docker compose down
```

Stop and remove volume data:

```bash
docker compose down -v
```

---

## Local Development / 로컬 개발

### Recommended Workflow / 권장 개발 흐름

```bash
npm ci
npm run sync:data
npm run build
npm test
```

For broader validation:

```bash
npm run automate:full
```

`automate:full` is intended to execute a full local validation path, including sync, lint, typecheck, tests, build, and Cloudflare-native validation.

### Environment Variables / 환경 변수

Local container runtime uses:

```yaml
env_file:
  - .env
```

Create a local `.env` file before starting Docker Compose. Do not commit secrets.

Example:

```bash
cp .env.example .env
# edit .env
```

> If `.env.example` is not present in your checkout, derive required variables from `packages/env/src/schemas/` and runtime package documentation.

### Package Development / 패키지 개발

#### Environment Package

```text
packages/env/
├── src/index.js
├── src/parse.js
├── src/schemas/job-dashboard.js
├── src/schemas/job-server.js
└── src/schemas/portfolio.js
```

Use this package for type-safe environment parsing and runtime configuration validation.

#### Contracts Package

```text
packages/contracts/
├── openapi.yaml
└── src/
    ├── env.js
    └── index.js
```

Use this package as the source for OpenAPI and cross-application contract exports.

#### Types Package

```text
packages/types/
└── src/
    ├── application.js
    ├── env.js
    ├── job-categories.js
    ├── notification.js
    ├── queue.js
    ├── resume.js
    ├── session.js
    └── wanted.js
```

Use this package for canonical type definitions shared across applications.

#### Schemas Package

```text
packages/schemas/
└── src/
    ├── application.js
    ├── auth.js
    ├── common.js
    ├── portfolio.js
    ├── resume.js
    └── webhook.js
```

Use this package for runtime validation and schema-backed API boundaries.

#### Shared Package

```text
packages/shared/
└── src/
    ├── job-categories.js
    ├── phone.js
    ├── ua.js
    ├── wanted-client.js
    ├── errors/
    ├── crypto/
    └── retry/
```

Use this package for cross-application utility functions.

#### CLI Package

```text
packages/cli/
├── bin/run.js
└── src/commands/
    ├── db.js
    ├── deploy.js
    └── verify.js
```

Use this package for operator-facing automation commands.

---

## Commands Reference / 명령어 레퍼런스

The following commands are defined in the root `package.json`.

| Command | Description / 설명 |
| --- | --- |
| `npm run strip-exif` | Removes EXIF metadata from portfolio images when `exiftool` is available. / `exiftool`이 있으면 포트폴리오 이미지의 EXIF 메타데이터 제거 |
| `npm run sync:data` | Synchronizes resume SSoT data. / 이력서 SSoT 데이터 동기화 |
| `npm run sync:pptx` | Generates Shinhan PPTX through Python automation. / Python 자동화로 Shinhan PPTX 생성 |
| `npm run sync:all` | Runs data sync and PPTX sync. / 데이터 및 PPTX 동기화 실행 |
| `npm run sync:proposals` | Runs proposal review sync and applies proposals. / 제안 검토 동기화 및 적용 |
| `npm run enrich:github` | Runs GitHub enrichment automation. / GitHub 데이터 보강 자동화 |
| `npm run enrich:skills` | Runs skills enrichment automation. / 기술 스택 데이터 보강 자동화 |
| `npm run enrich:ai` | Runs AI enrichment automation. / AI 기반 데이터 보강 자동화 |
| `npm run enrich:all` | Runs all enrichment tasks. / 전체 데이터 보강 실행 |
| `npm run automate:ssot` | Runs sync, build, typecheck, and Node tests. / 동기화, 빌드, 타입 검사, Node 테스트 실행 |
| `npm run automate:full` | Runs full local automation validation. / 전체 로컬 자동화 검증 실행 |
| `npm run build` | Synchronizes data and builds the portfolio Worker. / 데이터 동기화 후 포트폴리오 Worker 빌드 |
| `npm run build:portfolio` | Builds portfolio Worker. / 포트폴리오 Worker 빌드 |
| `npm run build:full` | Runs main build and CLI build. / 메인 빌드와 CLI 빌드 실행 |
| `npm run build:all` | Alias for full build. / 전체 빌드 별칭 |
| `npm run version:bump` | Bumps patch version without creating a git tag. / git tag 없이 patch 버전 증가 |
| `npm run deploy` | Manual deploy is disabled; use release workflows. / 수동 배포 비활성화, release workflow 사용 |

> Note: Some script definitions may continue beyond the visible excerpt. Check `package.json` for the authoritative command list.

### Docker Commands / Docker 명령어

| Command | Description / 설명 |
| --- | --- |
| `docker compose up --build` | Build and start the local job automation server. / 로컬 구직 자동화 서버 빌드 및 시작 |
| `docker compose up -d --build` | Start in detached mode. / 백그라운드 모드로 시작 |
| `docker compose logs -f mcp-server` | Follow service logs. / 서비스 로그 확인 |
| `docker compose down` | Stop and remove containers. / 컨테이너 중지 및 제거 |
| `docker compose down -v` | Stop containers and remove volumes. / 컨테이너와 볼륨 제거 |

### CLI Commands / CLI 명령어

CLI command source files:

```text
packages/cli/src/commands/db.js
packages/cli/src/commands/deploy.js
packages/cli/src/commands/verify.js
```

Typical usage pattern:

```bash
node packages/cli/bin/run.js <command>
```

Examples:

```bash
node packages/cli/bin/run.js db
node packages/cli/bin/run.js deploy
node packages/cli/bin/run.js verify
```

---

## Security / 보안

### English

This repository includes multiple security and supply-chain controls:

- Gitleaks secret scanning
- CodeQL static analysis
- Dependency review
- OpenSSF Scorecard
- Actionlint for workflow quality
- Semantic PR enforcement
- Automated dependency PR merge policies
- Post-deployment verification

Do not commit secrets, tokens, session cookies, private keys, or production `.env` files.

### 한국어

이 저장소는 다음 보안 및 공급망 통제 기능을 포함합니다.

- Gitleaks 시크릿 스캔
- CodeQL 정적 분석
- Dependency Review
- OpenSSF Scorecard
- Actionlint 기반 workflow 품질 검사
- Semantic PR 강제
- 의존성 PR 자동 병합 정책
- 배포 후 검증

시크릿, 토큰, 세션 쿠키, private key, production `.env` 파일은 절대 커밋하지 마세요.

---

## Release and Deployment / 릴리스 및 배포

### English

Manual deployment is intentionally disabled in the root `deploy` script. Use the release workflows instead:

- `release.yml`
- `24_release-notes.yml`
- `25_release-publish.yml`
- `post-deploy-verify.yml`

This keeps production changes auditable through GitHub Actions.

### 한국어

루트 `deploy` 스크립트에서는 수동 배포가 의도적으로 비활성화되어 있습니다. 다음 release workflow를 사용하세요.

- `release.yml`
- `24_release-notes.yml`
- `25_release-publish.yml`
- `post-deploy-verify.yml`

이를 통해 운영 변경 사항을 GitHub Actions 이력으로 감사 가능하게 유지합니다.

---

## Contribution Guide / 기여 가이드

See also:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`AGENTS.md`](AGENTS.md)
- [`OWNERS`](OWNERS)
- Package-level `AGENTS.md` files

### English

1. **Create or pick an issue**
   - Use issue automation when applicable.
   - `02_issue-to-branch.yml` can create branches from issues.

2. **Create a branch**
   - Use a descriptive branch name.
   - Keep changes focused and reviewable.

3. **Make changes**
   - Edit source files, not generated outputs unless explicitly required.
   - Keep schema/type/contract changes synchronized.

4. **Run local validation**

   ```bash
   npm ci
   npm run automate:ssot
   ```

   For broader validation:

   ```bash
   npm run automate:full
   ```

5. **Open a pull request**
   - Follow semantic PR title conventions.
   - PR automation will run checks, labels, reviews, and security scans.

6. **Address automation feedback**
   - CI, CodeQL, Gitleaks, dependency review, actionlint, and PR review automation may block merge.
   - Bot auto-fix or CI auto-heal workflows may propose changes.

7. **Merge**
   - Auto-merge may be used when checks and policy requirements pass.
   - Merged branch cleanup is automated.

### 한국어

1. **이슈 생성 또는 선택**
   - 가능한 경우 이슈 자동화를 사용합니다.
   - `02_issue-to-branch.yml`이 이슈 기반 브랜치를 생성할 수 있습니다.

2. **브랜치 생성**
   - 의미 있는 브랜치 이름을 사용합니다.
   - 변경 범위를 작고 리뷰 가능하게 유지합니다.

3. **변경 작업**
   - 명시적으로 필요한 경우가 아니라면 generated output 대신 source를 수정합니다.
   - schema/type/contract 변경은 서로 동기화합니다.

4. **로컬 검증 실행**

   ```bash
   npm ci
   npm run automate:ssot
   ```

   더 넓은 검증이 필요한 경우:

   ```bash
   npm run automate:full
   ```

5. **Pull Request 생성**
   - semantic PR 제목 규칙을 따릅니다.
   - PR 자동화가 check, label, review, security scan을 실행합니다.

6. **자동화 피드백 반영**
   - CI, CodeQL, Gitleaks, dependency review, actionlint, PR review 자동화가 merge를 차단할 수 있습니다.
   - bot auto-fix 또는 CI auto-heal workflow가 변경을 제안할 수 있습니다.

7. **병합**
   - 모든 check와 정책 조건을 만족하면 auto-merge를 사용할 수 있습니다.
   - 병합 후 브랜치 정리는 자동화되어 있습니다.

---

## Ownership / 소유권

Ownership metadata is maintained in:

```text
OWNERS
packages/cli/OWNERS
packages/cli/src/OWNERS
packages/cli/bin/OWNERS
```

Package-level guidance is maintained in each package’s `AGENTS.md`.

---

## License / 라이선스

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [`LICENSE`](LICENSE)를 참고하세요.