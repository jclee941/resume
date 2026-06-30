# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Workers](https://img.shields.io/badge/cloudflare-workers-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation, Single Source of Truth data, and self-hosted operational dashboard.
>
> 개인 포트폴리오, 채용/지원 관리 런타임, 이력서 SSoT 데이터, 운영 대시보드를 하나의 모노레포에서 관리하는 사설 저장소입니다.

---

## 목차 / Table of Contents

- [개요 / Overview](#개요--overview)
- [주요 기능 / Features](#주요-기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [Docker 실행 / Running with Docker](#docker-실행--running-with-docker)
- [운영 및 관측성 / Operations and Observability](#운영-및-관측성--operations-and-observability)
- [콘텐츠 및 지원서 자료 / Content and Application Materials](#콘텐츠-및-지원서-자료--content-and-application-materials)
- [기여 가이드 / Contribution Guide](#기여-가이드--contribution-guide)
- [라이선스 / License](#라이선스--license)

---

## 개요 / Overview

이 저장소는 이력서와 채용 관련 산출물을 중심으로 한 개인 운영 플랫폼입니다. 루트 `package.json` 기준으로 npm workspaces를 사용하며, Cloudflare Worker 기반 사이트와 지원서 대시보드, Node.js 기반 job runtime, 이력서/지원서 데이터 동기화 스크립트, 문서 및 지원서 자료를 함께 관리합니다.

This repository is a private resume and job-operations monorepo. It uses npm workspaces and brings together a Cloudflare Worker edge site, a job/application dashboard, a Node.js job runtime, resume data synchronization scripts, and role-specific application materials.

주요 사용자는 다음과 같습니다.

| 사용자 / User | 목적 / Purpose |
| --- | --- |
| 저장소 소유자 / Repository owner | 이력서, 포트폴리오, 지원서, 자동화 런타임, 대시보드를 한 곳에서 운영 |
| 운영자 / Operator | Docker 또는 Cloudflare Workers 환경에서 job runtime 및 dashboard 배포/점검 |
| 개발자 / Developer | TypeScript/JavaScript 기반 Worker, API, middleware, schema, 테스트 수정 |
| 리뷰어 / Reviewer | `applications/`의 직무별 이력서, 자기소개서, 지원 가이드 검토 |

---

## 주요 기능 / Features

### 한국어

- Cloudflare Workers 기반 포트폴리오 및 대시보드 배포 설정
- Node.js 22 기반 job runtime 컨테이너 이미지
- 지원서/채용 관련 dashboard Worker 코드
- D1 또는 SQL migration 기반 dashboard 데이터 모델
- CORS, CSRF, rate limit middleware 포함
- Jest, Playwright, ESLint, TypeScript 설정
- Docker Compose 기반 로컬/서버 실행
- 직무별 지원 자료, 커버레터, 이력서 HTML/PDF, 미리보기 이미지 관리
- PPTX 기반 TA/profile 자료 생성 및 검증 스크립트

### English

- Cloudflare Workers configuration for portfolio and dashboard deployment
- Node.js 22 container runtime for job-related server processes
- Dashboard Worker code for application/job operations
- SQL migration files for dashboard persistence
- CORS, CSRF, and rate limiting middleware
- Jest, Playwright, ESLint, and TypeScript configuration
- Docker Compose support for local/server execution
- Role-specific application packets: resumes, cover letters, guides, and previews
- PPTX-based TA/profile material generation and verification scripts

---

## 아키텍처 / Architecture

### 런타임 구성 / Runtime Components

| 구성 요소 / Component | 위치 / Location | 런타임 / Runtime | 역할 / Responsibility |
| --- | --- | --- | --- |
| Root workspace | `package.json` | npm workspaces | 공통 명령어, 버전, workspace 의존성 관리 |
| Job dashboard | `apps/job-dashboard/` | Cloudflare Worker style runtime | dashboard API, queue consumer, routes, middleware |
| Job server image | `Dockerfile` | Node.js 22 Alpine | job runtime production container build |
| Docker Compose service | `docker-compose.yml` | Docker | `mcp-server` service 실행, persistent volume 연결 |
| Cloudflare config | `wrangler.jsonc` | Wrangler / Workers | Worker 배포 및 Cloudflare 리소스 설정 |
| Application materials | `applications/` | Static documents | 직무별 이력서, 자기소개서, 지원 가이드 보관 |
| TA materials | `ta/` | Python + PPTX | 발표/프로필 PPTX 생성, 개선, 검증 |

### Dashboard 내부 구성 / Dashboard Internal Layout

| 파일 / File | 설명 / Description |
| --- | --- |
| `apps/job-dashboard/src/index.js` | Worker-style entry point |
| `apps/job-dashboard/src/router.js` | Request routing |
| `apps/job-dashboard/src/queue-consumer.js` | Queue event handling |
| `apps/job-dashboard/src/routes/admin.js` | Admin route handlers |
| `apps/job-dashboard/src/routes/applications.js` | Application route handlers |
| `apps/job-dashboard/src/middleware/cors.js` | CORS handling |
| `apps/job-dashboard/src/middleware/csrf.js` | CSRF protection |
| `apps/job-dashboard/src/middleware/rate-limit.test.js` | Rate limit middleware tests |
| `apps/job-dashboard/schema.sql` | Initial database schema |
| `apps/job-dashboard/migrations/*.sql` | Incremental schema migrations |
| `apps/job-dashboard/migrate-json-to-d1.cjs` | JSON-to-D1 migration helper |

### Docker Runtime Flow

1. `docker compose up --build`가 루트 `Dockerfile`을 사용해 이미지를 빌드합니다.
2. `deps` stage에서 루트 lockfile과 workspace package metadata를 기준으로 production dependency를 설치합니다.
3. `runtime` stage가 필요한 workspace source와 `node_modules`만 복사합니다.
4. 컨테이너는 `/app/apps/job-server`에서 `node src/server/index.js`를 실행합니다.
5. Docker healthcheck가 `GET /health`를 호출해 런타임 상태를 확인합니다.
6. `job_automation_data` Docker volume이 runtime data를 보존합니다.

### Request Flow

1. Client 또는 operator가 HTTP 요청을 dashboard/server endpoint로 전송합니다.
2. Router가 요청 경로를 확인합니다.
3. Middleware가 CORS, CSRF, rate limiting 등 공통 검사를 수행합니다.
4. Route handler가 admin 또는 application 관련 작업을 처리합니다.
5. 필요한 경우 queue consumer 또는 persistent storage와 연동합니다.
6. API response 또는 health status가 반환됩니다.

---

## 저장소 구조 / Repository Structure

아래 구조는 제공된 최상위 레이아웃을 기준으로 합니다.

```text
/
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── LICENSE
├── OWNERS
├── ProfileView.jpg
├── README.md
├── docker-compose.yml
├── eslint.config.cjs
├── jest.config.cjs
├── lychee.toml
├── package-lock.json
├── package.json
├── playwright.config.js
├── redocly.yaml
├── tsconfig.base.json
├── tsconfig.json
├── wrangler.jsonc
├── ta/
│   ├── *.pptx
│   ├── improve_visual.py
│   ├── inspect.py
│   ├── verify.py
│   └── output/
├── applications/
│   ├── DESIGN.md
│   ├── airpremia-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── cloudflare-one-se-2026/
│   ├── openai-codex-korea-2026/
│   ├── gitlab-apac-security-2026/
│   └── security-ir-2026/
└── apps/
    └── job-dashboard/
        ├── API_REFERENCE.md
        ├── DEPLOYMENT_GUIDE.md
        ├── DEVELOPMENT_GUIDE.md
        ├── DIAGRAMS.md
        ├── README.md
        ├── SECRETS.md
        ├── migrate-json-to-d1.cjs
        ├── migration-data.sql
        ├── package.json
        ├── schema.sql
        ├── tsconfig.json
        ├── migrations/
        └── src/
```

### 주요 파일 / Important Files

| 파일 / File | 용도 / Purpose |
| --- | --- |
| `package.json` | workspace metadata, version, root script hub |
| `package-lock.json` | reproducible npm dependency lockfile |
| `Dockerfile` | production container build for the job runtime |
| `docker-compose.yml` | local/server Docker service definition |
| `wrangler.jsonc` | Cloudflare Workers deployment configuration |
| `tsconfig.base.json` | shared TypeScript compiler settings |
| `eslint.config.cjs` | ESLint flat config |
| `jest.config.cjs` | Jest test configuration |
| `playwright.config.js` | Playwright end-to-end/browser test configuration |
| `redocly.yaml` | OpenAPI/Redocly linting or documentation config |
| `lychee.toml` | link-checking configuration |
| `CHANGELOG.md` | release/change history |
| `CONTRIBUTING.md` | contributor workflow |
| `OWNERS` | ownership metadata |
| `LICENSE` | license terms |

---

## 빠른 시작 / Quick Start

### 요구 사항 / Prerequisites

| 도구 / Tool | 권장 버전 / Recommended Version | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22.x | runtime and development scripts |
| npm | lockfile-compatible npm bundled with Node 22 | workspace dependency installation |
| Docker | recent stable version | containerized runtime |
| Docker Compose | recent stable version | local service orchestration |
| Wrangler | project dependency or local CLI | Cloudflare Worker development/deployment |
| Python 3 | optional | `ta/` PPTX helper scripts |
| Go | optional | 일부 sync/enrichment scripts 실행 시 필요 |

### 설치 / Install

```bash
npm ci
```

### 기본 검증 / Basic Validation

```bash
npm run lint
npm run typecheck
npm test
```

일부 스크립트는 환경 변수, Cloudflare binding, 외부 CLI, 또는 workspace source가 필요할 수 있습니다.

Some scripts may require environment variables, Cloudflare bindings, external CLIs, or workspace source files.

### Docker로 실행 / Run with Docker

```bash
docker compose up --build
```

기본 포트는 `3000`입니다.

```bash
curl http://localhost:3000/health
```

---

## 설정 / Configuration

### 환경 변수 / Environment Variables

`docker-compose.yml`은 루트 `.env` 파일을 읽고 다음 runtime 값을 명시합니다.

| 변수 / Variable | 기본값 / Default | 설명 / Description |
| --- | --- | --- |
| `NODE_ENV` | `production` | Node.js runtime mode |
| `PORT` | `3000` | HTTP server listen port |

추가 secret 또는 binding은 배포 대상에 따라 `.env`, Wrangler secret, Cloudflare binding, 또는 dashboard 문서(`apps/job-dashboard/SECRETS.md`)에서 관리합니다.

Additional secrets or bindings are managed through `.env`, Wrangler secrets, Cloudflare bindings, or the dashboard secret guide depending on the deployment target.

### Cloudflare 설정 / Cloudflare Configuration

Cloudflare Workers 관련 설정은 루트 `wrangler.jsonc`와 dashboard app 설정을 기준으로 합니다.

일반적인 작업 흐름:

```bash
# Cloudflare local development, if configured
npx wrangler dev

# Cloudflare deployment, if configured
npx wrangler deploy
```

프로젝트별 binding, D1 database, queue, secret 이름은 `wrangler.jsonc`와 app-specific deployment guide를 확인하세요.

Check `wrangler.jsonc` and app-specific deployment guides for binding, D1 database, queue, and secret names.

### 데이터베이스 / Database

`apps/job-dashboard/`는 SQL schema와 migration 파일을 포함합니다.

| 파일 / File | 용도 / Purpose |
| --- | --- |
| `schema.sql` | 초기 schema |
| `migration-data.sql` | migration seed/import data |
| `migrations/0002_add_approval_metadata.sql` | approval metadata 추가 |
| `migrations/0003_add_auto_apply_application_metadata.sql` | auto-apply application metadata 추가 |
| `migrate-json-to-d1.cjs` | JSON data를 D1-compatible format으로 migration |

---

## 명령어 레퍼런스 / Commands Reference

루트 `package.json`에 정의된 주요 명령어입니다.

### 콘텐츠 동기화 / Content Synchronization

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run strip-exif` | portfolio image metadata 제거. `exiftool`이 없으면 skip |
| `npm run sync:data` | resume SSoT data 동기화 |
| `npm run sync:pptx` | PPTX 산출물 생성 |
| `npm run sync:pdf` | PDF 산출물 생성 |
| `npm run sync:all` | data, PDF, PPTX 전체 동기화 |

### Secret/Session Helper Commands

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run op:run` | helper runner 실행 |
| `npm run op:native:run` | native helper runner 실행 |
| `npm run op:seed:resume` | resume 관련 secret/data seed |
| `npm run op:seed:sessions` | session files seed |
| `npm run op:restore:sessions` | session files restore |

### Proposal and Enrichment

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run sync:proposals` | proposal review CLI 실행 후 proposal 적용 |
| `npm run enrich:github` | GitHub 기반 enrichment 실행 |
| `npm run enrich:skills` | skill enrichment 실행 |
| `npm run enrich:ai` | AI-assisted enrichment 실행 |
| `npm run enrich:all` | GitHub, skills, AI enrichment 전체 실행 |

### Aggregate Commands

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run automate:ssot` | data sync, PDF sync, build, typecheck, Node tests를 묶어서 실행 |
| `npm run automate:full` | 전체 자동화 검증용 aggregate command. 세부 동작은 `package.json` 확인 |

### 일반 개발 명령 / Common Development Commands

아래 명령은 구성 파일이 존재하는 표준 개발 명령입니다. 실제 script 이름은 `package.json`을 기준으로 확인하세요.

| 목적 / Purpose | 예시 / Example |
| --- | --- |
| dependency install | `npm ci` |
| lint | `npm run lint` |
| typecheck | `npm run typecheck` |
| unit/integration test | `npm test` 또는 `npm run test:node` |
| browser/e2e test | `npx playwright test` |
| Worker local dev | `npx wrangler dev` |
| Worker deploy | `npx wrangler deploy` |

---

## 로컬 개발 / Local Development

### 1. 의존성 설치 / Install Dependencies

```bash
npm ci
```

### 2. 환경 파일 준비 / Prepare Environment File

Docker Compose는 루트 `.env`를 읽습니다.

```bash
cp .env.example .env
```

`.env.example`이 없는 경우 운영 문서 또는 secret guide를 기준으로 필요한 값을 직접 구성하세요.

If `.env.example` is not present, create `.env` using the deployment and secret documentation.

### 3. Dashboard 개발 / Dashboard Development

Dashboard app은 `apps/job-dashboard/`에 있습니다.

```bash
cd apps/job-dashboard
npm install
```

가능한 문서:

| 문서 / Document | 설명 / Description |
| --- | --- |
| `apps/job-dashboard/README.md` | dashboard app overview |
| `apps/job-dashboard/API_REFERENCE.md` | API reference |
| `apps/job-dashboard/DEVELOPMENT_GUIDE.md` | local development guide |
| `apps/job-dashboard/DEPLOYMENT_GUIDE.md` | deployment guide |
| `apps/job-dashboard/DIAGRAMS.md` | architecture diagrams/detail |
| `apps/job-dashboard/SECRETS.md` | secret management notes |

### 4. Root에서 품질 검사 / Quality Checks from Root

```bash
npm run lint
npm run typecheck
npm test
```

### 5. Docker Runtime 확인 / Verify Docker Runtime

```bash
docker compose up --build
curl http://localhost:3000/health
```

---

## 테스트 / Testing

이 저장소는 여러 테스트 도구 설정을 포함합니다.

| 도구 / Tool | 설정 파일 / Config | 용도 / Purpose |
| --- | --- | --- |
| Jest | `jest.config.cjs` | Node.js unit/integration tests |
| Playwright | `playwright.config.js` | browser/e2e tests |
| ESLint | `eslint.config.cjs` | JavaScript/TypeScript linting |
| TypeScript | `tsconfig.json`, `tsconfig.base.json` | static type checking |
| Lychee | `lychee.toml` | link checking |
| Redocly | `redocly.yaml` | OpenAPI lint/docs validation |

### 권장 테스트 순서 / Recommended Test Order

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright test
```

### Dashboard Middleware Test

`apps/job-dashboard/src/middleware/rate-limit.test.js`는 rate limit middleware 동작을 검증합니다.

```bash
npm test -- apps/job-dashboard/src/middleware/rate-limit.test.js
```

프로젝트의 Jest 설정에 따라 test path 또는 command가 달라질 수 있습니다.

The exact test selector may vary depending on the Jest configuration.

---

## Docker 실행 / Running with Docker

### 이미지 빌드 / Build Image

```bash
docker build -t resume-job-runtime .
```

### 컨테이너 실행 / Run Container

```bash
docker run --rm \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -p 3000:3000 \
  resume-job-runtime
```

### Compose 실행 / Run with Compose

```bash
docker compose up --build
```

### Healthcheck

Dockerfile과 Compose 모두 다음 healthcheck를 사용합니다.

```bash
curl http://localhost:3000/health
```

### Persistent Volume

| Volume | Mount Path | 목적 / Purpose |
| --- | --- | --- |
| `job_automation_data` | `/app/apps/job-server/.data` | job runtime data persistence |

---

## 운영 및 관측성 / Operations and Observability

### Runtime Status

| 항목 / Item | 값 / Value |
| --- | --- |
| Service name | `mcp-server` |
| Container name | `resume-mcp-server` |
| Runtime | Node.js 22 Alpine |
| Default port | `3000` |
| Health endpoint | `/health` |
| Restart policy | `unless-stopped` |
| Data volume | `job_automation_data` |

### Operator Checks

| 점검 / Check | 명령 / Command | 기대 결과 / Expected Result |
| --- | --- | --- |
| Container status | `docker compose ps` | service is running or healthy |
| Health endpoint | `curl http://localhost:3000/health` | HTTP success response |
| Logs | `docker compose logs -f mcp-server` | no repeated startup/runtime errors |
| Rebuild | `docker compose up --build` | image builds and service starts |
| Stop | `docker compose down` | service stops without deleting volume |
| Stop and remove volume | `docker compose down -v` | service and local data volume removed |

### 권한 및 보안 고려 / Permissions and Security Notes

| 영역 / Area | 권장 사항 / Recommendation |
| --- | --- |
| `.env` | commit하지 말고 local/secret manager에서 관리 |
| Cloudflare secrets | Wrangler secret 또는 Cloudflare dashboard에서 관리 |
| Generated documents | 개인정보 포함 여부 확인 후 공유 |
| Docker volume | runtime state가 포함될 수 있으므로 백업/삭제 정책 명확화 |
| Application PDFs/HTML | 외부 제출 전 개인정보, 연락처, 회사별 맞춤 문구 확인 |

---

## 콘텐츠 및 지원서 자료 / Content and Application Materials

`applications/`는 직무별 지원 자료를 포함합니다.

| 디렉터리 / Directory | 포함 자료 / Materials |
| --- | --- |
| `airpremia-security-2026/` | application guide, cover letter, signup gate screenshot |
| `infrastructure-architecture-2026/` | homelab infrastructure architecture document |
| `coupang-fintech-sre-2026/` | PDF resume, HTML resume, cover letter |
| `cloudflare-one-se-2026/` | PDF/HTML resume, cover letter, application guide, interview Q&A, LinkedIn optimization, preview |
| `openai-codex-korea-2026/` | application guide, cover letter |
| `gitlab-apac-security-2026/` | PDF/HTML resume, cover letter |
| `security-ir-2026/` | PDF/HTML resume, preview |

`ta/`는 PPTX 기반 프로필/발표 자료와 검증 스크립트를 포함합니다.

| 파일 / File | 설명 / Description |
| --- | --- |
| `ta/improve_visual.py` | visual improvement helper |
| `ta/inspect.py` | PPTX inspection helper |
| `ta/verify.py` | PPTX verification helper |
| `ta/output/` | generated PPTX outputs and verification report |

---

## 기여 가이드 / Contribution Guide

기여 전 `CONTRIBUTING.md`와 관련 app 문서를 확인하세요.

Before contributing, read `CONTRIBUTING.md` and the relevant app-level documentation.

### 기본 원칙 / Basic Rules

1. 작은 변경 단위로 작업합니다.
2. generated artifact와 source file을 구분합니다.
3. secret, token, session file, private runtime data를 commit하지 않습니다.
4. 변경 후 lint, typecheck, test를 실행합니다.
5. 직무별 지원 자료 변경 시 개인정보와 제출 대상별 문구를 재확인합니다.
6. database schema 변경 시 migration 파일을 함께 추가합니다.
7. Docker runtime 변경 시 `/health` endpoint와 Compose 실행을 확인합니다.

### 권장 PR 전 체크 / Recommended Pre-PR Checklist

```bash
npm ci
npm run lint
npm run typecheck
npm test
docker compose up --build
```

별도 browser/e2e 변경이 있다면 다음도 실행합니다.

```bash
npx playwright test
```

---

## 라이선스 / License

이 저장소는 사설 저장소이며 라이선스 조건은 `LICENSE` 파일을 따릅니다.

This is a private repository. See `LICENSE` for the applicable license terms.