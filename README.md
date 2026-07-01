# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation, SSoT data, and self-hosted observability.

이 저장소는 이력서/포트폴리오 콘텐츠, 채용 지원 자료, Cloudflare Worker 기반 대시보드, Docker 기반 런타임을 함께 관리하는 사설 모노레포입니다.  
This private monorepo manages resume and portfolio content, job-application materials, a Cloudflare Worker dashboard, and a Dockerized runtime in one workspace.

---

## 목차 / Table of Contents

- [개요 / Overview](#개요--overview)
- [주요 기능 / Features](#주요-기능--features)
- [사용자 / Intended Users](#사용자--intended-users)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [운영 및 관측성 / Operations and Observability](#운영-및-관측성--operations-and-observability)
- [배포 / Deployment](#배포--deployment)
- [기여 / Contributing](#기여--contributing)
- [라이선스 / License](#라이선스--license)

---

## 개요 / Overview

### 한국어

이 프로젝트는 개인 경력 자료를 코드와 데이터로 관리하기 위한 모노레포입니다. 주요 구성 요소는 다음과 같습니다.

- 이력서/포트폴리오 데이터와 산출물 관리
- 직무별 지원 패킷, 커버레터, HTML/PDF 이력서 관리
- Cloudflare Worker 기반 `job-dashboard` 애플리케이션
- Docker Compose로 실행 가능한 Node.js 런타임
- Jest, Playwright, ESLint, TypeScript 기반 품질 검증
- Wrangler 설정을 통한 Cloudflare 배포 준비

### English

This project is a monorepo for managing career materials as code and data. It includes:

- Resume and portfolio data/output management
- Per-role application packets, cover letters, and HTML/PDF resumes
- A Cloudflare Worker-based `job-dashboard` application
- A Docker Compose runnable Node.js runtime
- Quality checks with Jest, Playwright, ESLint, and TypeScript
- Cloudflare deployment configuration through Wrangler

---

## 주요 기능 / Features

| 영역 / Area | 설명 / Description |
| --- | --- |
| 포트폴리오/이력서 관리 / Portfolio and resume management | 경력 데이터, 지원 자료, 산출물 파일을 저장소에서 버전 관리합니다. / Version-controls career data, application materials, and generated artifacts. |
| 직무별 지원 패킷 / Role-specific application packets | `applications/` 아래에 회사/직무별 커버레터, 이력서, 가이드, 미리보기 이미지를 관리합니다. / Manages cover letters, resumes, guides, and previews per company or role under `applications/`. |
| Job Dashboard Worker | `apps/job-dashboard`에서 Cloudflare Worker 엔트리, 라우터, 미들웨어, D1 스키마, 마이그레이션을 제공합니다. / Provides Worker entry points, routing, middleware, D1 schema, and migrations in `apps/job-dashboard`. |
| Docker 런타임 / Docker runtime | 루트 `Dockerfile`과 `docker-compose.yml`로 Node.js 런타임을 컨테이너화합니다. / Containerizes the Node.js runtime using the root `Dockerfile` and `docker-compose.yml`. |
| 데이터 동기화 / Data synchronization | `sync:*` 스크립트로 데이터, PDF, PPTX 산출물을 갱신합니다. / Uses `sync:*` scripts to regenerate data, PDFs, and PPTX assets. |
| 테스트 / Testing | Jest, Playwright, TypeScript 설정을 포함합니다. / Includes Jest, Playwright, and TypeScript configuration. |
| 품질 관리 / Quality checks | ESLint, TypeScript strict 설정, 링크 검사 설정을 제공합니다. / Provides ESLint, strict TypeScript configuration, and link-checking configuration. |

---

## 사용자 / Intended Users

### 한국어

이 저장소는 다음 사용자를 대상으로 합니다.

- 개인 포트폴리오와 이력서를 코드 기반으로 유지하려는 소유자
- 채용 지원 자료를 역할별로 정리하고 재사용하려는 운영자
- Cloudflare Worker, D1, Queue 기반 대시보드를 개발/운영하는 개발자
- Docker 기반 Node.js 런타임을 로컬 또는 서버에서 실행하는 운영자

### English

This repository is intended for:

- The owner maintaining a personal portfolio and resume as code
- Operators who organize and reuse role-specific application materials
- Developers working on the Cloudflare Worker, D1, and Queue-based dashboard
- Operators running the Node.js runtime locally or on a server through Docker

---

## 아키텍처 / Architecture

### 주요 구성 요소 / Main Components

| 구성 요소 / Component | 위치 / Location | 역할 / Role |
| --- | --- | --- |
| Root workspace | `package.json` | npm workspace, script hub, project metadata. |
| Docker runtime | `Dockerfile`, `docker-compose.yml` | Builds and runs the Node.js job runtime container. |
| Cloudflare config | `wrangler.jsonc`, `redocly.yaml` | Worker deployment and API documentation configuration. |
| Job Dashboard | `apps/job-dashboard/` | Worker app with HTTP routing, queue consumer, middleware, D1 schema, and migrations. |
| Application packets | `applications/` | Role/company-specific resumes, cover letters, guides, and previews. |
| TA presentation tooling | `ta/` | Python scripts and PPTX artifacts for presentation/profile generation and verification. |
| Quality configuration | `eslint.config.cjs`, `jest.config.cjs`, `playwright.config.js`, `tsconfig*.json`, `lychee.toml` | Linting, tests, browser tests, TypeScript, and link checking. |

### 런타임 엔트리 포인트 / Runtime Entry Points

| 엔트리 / Entry Point | 파일 / File | 설명 / Description |
| --- | --- | --- |
| Docker container command | `CMD ["node", "src/server/index.js"]` in `Dockerfile` | Starts the Node.js server runtime inside the container. |
| Container health check | `GET /health` | Used by Docker and Compose to verify runtime health. |
| Job Dashboard Worker | `apps/job-dashboard/src/index.js` | Cloudflare Worker entry for request, queue, and scheduled handling. |
| Dashboard router | `apps/job-dashboard/src/router.js` | Central request routing for dashboard/API endpoints. |
| Queue consumer | `apps/job-dashboard/src/queue-consumer.js` | Handles asynchronous queue processing. |
| Dashboard routes | `apps/job-dashboard/src/routes/admin.js`, `apps/job-dashboard/src/routes/applications.js` | Admin and application-related route handlers. |
| Middleware | `apps/job-dashboard/src/middleware/` | CORS, CSRF, and rate-limit middleware. |

### 요청 흐름 / Request Flow

1. 클라이언트 또는 운영자가 HTTP 요청을 Worker 또는 Node.js 런타임으로 보냅니다.  
   A client or operator sends an HTTP request to the Worker or Node.js runtime.

2. Worker 요청은 `apps/job-dashboard/src/index.js`에서 수신됩니다.  
   Worker requests are received by `apps/job-dashboard/src/index.js`.

3. 라우터는 요청 경로에 따라 관리자 또는 지원서 관련 라우트로 전달합니다.  
   The router dispatches the request to admin or application routes based on the path.

4. 미들웨어는 CORS, CSRF, rate-limit 정책을 적용합니다.  
   Middleware applies CORS, CSRF, and rate-limit policies.

5. 데이터가 필요한 경우 D1 스키마 및 마이그레이션으로 관리되는 저장소를 사용합니다.  
   When data is required, storage managed by the D1 schema and migrations is used.

6. 비동기 작업은 Queue consumer를 통해 처리됩니다.  
   Asynchronous work is processed through the queue consumer.

---

## 저장소 구조 / Repository Structure

제공된 최상위 구조 기준입니다.  
Based on the provided top-level layout.

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
├── applications/
├── apps/
│   └── job-dashboard/
└── ta/
```

### 주요 디렉터리 / Important Directories

| 경로 / Path | 설명 / Description |
| --- | --- |
| `applications/` | 회사/직무별 지원 자료, 커버레터, 이력서, 가이드, 미리보기 파일. / Company and role-specific application materials. |
| `apps/job-dashboard/` | Cloudflare Worker 기반 대시보드/API 애플리케이션. / Cloudflare Worker-based dashboard/API application. |
| `apps/job-dashboard/src/` | Worker 엔트리, 라우터, 큐 소비자, 미들웨어, 라우트 핸들러. / Worker entry, router, queue consumer, middleware, and route handlers. |
| `apps/job-dashboard/migrations/` | D1 데이터베이스 마이그레이션 SQL. / D1 database migration SQL files. |
| `ta/` | PPTX 자료와 Python 기반 검사/개선 스크립트. / PPTX assets and Python-based inspection/improvement scripts. |
| Root config files | TypeScript, Jest, Playwright, ESLint, Wrangler, Docker, Redocly 설정. / TypeScript, Jest, Playwright, ESLint, Wrangler, Docker, and Redocly configuration. |

---

## 빠른 시작 / Quick Start

### 요구 사항 / Prerequisites

| 도구 / Tool | 권장 버전 / Recommended Version | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22.x | npm scripts and runtime execution |
| npm | lockfile-compatible version bundled with Node.js | dependency installation |
| Docker | Recent stable | containerized runtime |
| Docker Compose | Recent stable | local service orchestration |
| Python 3 | 3.x | `ta/` helper scripts and PPTX tooling |
| Wrangler | Project-managed or installed via npm | Cloudflare Worker development/deployment |

### 설치 / Install

```bash
npm ci
```

### 품질 검사 기본 실행 / Run Basic Checks

```bash
npm run typecheck
npm run lint
npm run test:node
```

사용 가능한 스크립트는 실제 `package.json`을 기준으로 확인하세요.

```bash
npm run
```

### Docker로 실행 / Run with Docker

```bash
docker compose up --build
```

기본 Compose 서비스는 컨테이너 내부에서 `PORT=3000`을 사용하며 호스트의 `3000` 포트로 노출됩니다.

The default Compose service uses `PORT=3000` inside the container and exposes it on host port `3000`.

상태 확인:

```bash
curl http://localhost:3000/health
```

### Job Dashboard 로컬 작업 / Work on Job Dashboard

```bash
cd apps/job-dashboard
npm install
```

프로젝트 루트에서 워크스페이스 기반으로 작업하는 경우 루트 `npm ci`를 우선 사용하세요.

When working with workspace dependencies, prefer running `npm ci` from the repository root first.

---

## 설정 / Configuration

### 루트 설정 파일 / Root Configuration Files

| 파일 / File | 용도 / Purpose |
| --- | --- |
| `package.json` | npm workspace metadata, scripts, package version, project description. |
| `package-lock.json` | Reproducible dependency installation. |
| `tsconfig.base.json` | Shared TypeScript compiler defaults. |
| `tsconfig.json` | Root TypeScript project configuration. |
| `eslint.config.cjs` | ESLint configuration. |
| `jest.config.cjs` | Jest test configuration. |
| `playwright.config.js` | Playwright browser/e2e test configuration. |
| `wrangler.jsonc` | Cloudflare Worker configuration. |
| `redocly.yaml` | API documentation/spec tooling configuration. |
| `lychee.toml` | Link checker configuration. |
| `Dockerfile` | Multi-stage Node.js container image build. |
| `docker-compose.yml` | Local container orchestration. |

### 환경 변수 / Environment Variables

`docker-compose.yml`은 루트의 `.env` 파일을 읽도록 설정되어 있습니다.

`docker-compose.yml` is configured to load a root `.env` file.

```yaml
env_file:
  - .env
```

일반적인 설정 범주는 다음과 같습니다. 실제 변수 이름은 각 애플리케이션의 문서와 배포 환경을 기준으로 관리하세요.

Common configuration categories are listed below. Manage exact variable names according to each application’s documentation and deployment environment.

| 범주 / Category | 설명 / Description |
| --- | --- |
| Runtime | `NODE_ENV`, `PORT` 등 실행 환경과 포트 설정. / Runtime mode and port settings such as `NODE_ENV` and `PORT`. |
| Cloudflare | Worker, D1, Queue, KV 등 Cloudflare 리소스 바인딩. / Bindings for Workers, D1, Queues, KV, and related resources. |
| Authentication | 관리자/API 접근 제어에 필요한 토큰 또는 세션 설정. / Tokens or session settings for admin/API access control. |
| Persistence | 로컬 데이터 볼륨 또는 데이터베이스 연결 설정. / Local data volume or database connection settings. |
| External services | 지원서, 동기화, 알림, 문서 생성 등에 필요한 외부 서비스 인증. / External credentials for application workflows, sync jobs, notifications, or document generation. |

### Docker Compose 환경 / Docker Compose Environment

| 항목 / Item | 값 / Value |
| --- | --- |
| Service | `mcp-server` |
| Container name | `resume-mcp-server` |
| Runtime port | `3000` |
| Host port | `3000` |
| Volume | `job_automation_data:/app/apps/job-server/.data` |
| Restart policy | `unless-stopped` |
| Health endpoint | `GET /health` |

---

## 명령어 레퍼런스 / Commands Reference

아래 명령어는 제공된 `package.json`에서 확인된 스크립트입니다.  
The commands below are scripts visible in the provided `package.json`.

### 데이터/산출물 동기화 / Data and Artifact Sync

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run strip-exif` | Portfolio image metadata removal. Skips if `exiftool` is unavailable. |
| `npm run sync:data` | Synchronizes resume data. |
| `npm run sync:pptx` | Generates/synchronizes PPTX artifacts. |
| `npm run sync:pdf` | Generates/synchronizes PDF artifacts. |
| `npm run sync:all` | Runs data, PDF, and PPTX synchronization. |
| `npm run sync:proposals` | Runs proposal review and applies proposal changes. |

### 보강 / Enrichment

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run enrich:github` | Runs GitHub-related enrichment tooling. |
| `npm run enrich:skills` | Runs skills enrichment tooling. |
| `npm run enrich:ai` | Runs AI-assisted enrichment tooling. |
| `npm run enrich:all` | Runs all enrichment commands. |

### 시크릿/세션 보조 명령 / Secret and Session Helper Commands

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run op:run` | Runs the configured 1Password helper command. |
| `npm run op:native:run` | Runs the native 1Password helper command. |
| `npm run op:seed:resume` | Seeds resume-related secret data. |
| `npm run op:seed:sessions` | Seeds session files. |
| `npm run op:restore:sessions` | Restores session files. |

### 통합 작업 / Combined Workflows

| 명령어 / Command | 설명 / Description |
| --- | --- |
| `npm run automate:ssot` | Runs data sync, PDF sync, build, typecheck, and Node tests. |
| `npm run automate:full` | Runs the broader validation workflow defined in `package.json`. |

> 참고: `package.json`에 더 많은 스크립트가 있을 수 있습니다. 전체 목록은 `npm run`으로 확인하세요.  
> Note: Additional scripts may exist in `package.json`. Run `npm run` to inspect the full list.

---

## 로컬 개발 / Local Development

### 일반 개발 루프 / General Development Loop

```bash
npm ci
npm run typecheck
npm run lint
npm run test:node
```

변경 후 산출물 동기화가 필요한 경우:

When generated artifacts need to be updated after changes:

```bash
npm run sync:all
```

### Job Dashboard 개발 / Job Dashboard Development

`apps/job-dashboard`는 별도 `package.json`, TypeScript 설정, D1 스키마, 마이그레이션, API 문서를 포함합니다.

`apps/job-dashboard` includes its own `package.json`, TypeScript configuration, D1 schema, migrations, and API documentation.

주요 파일:

| 파일 / File | 역할 / Role |
| --- | --- |
| `apps/job-dashboard/src/index.js` | Worker entry point. |
| `apps/job-dashboard/src/router.js` | Request router. |
| `apps/job-dashboard/src/queue-consumer.js` | Queue processing entry. |
| `apps/job-dashboard/src/routes/admin.js` | Admin routes. |
| `apps/job-dashboard/src/routes/applications.js` | Application routes. |
| `apps/job-dashboard/src/middleware/cors.js` | CORS middleware. |
| `apps/job-dashboard/src/middleware/csrf.js` | CSRF middleware. |
| `apps/job-dashboard/src/middleware/rate-limit.test.js` | Rate limit middleware test. |
| `apps/job-dashboard/schema.sql` | Base D1 schema. |
| `apps/job-dashboard/migrations/*.sql` | D1 migration files. |
| `apps/job-dashboard/API_REFERENCE.md` | Dashboard API reference. |
| `apps/job-dashboard/DEPLOYMENT_GUIDE.md` | Deployment guide. |
| `apps/job-dashboard/DEVELOPMENT_GUIDE.md` | Development guide. |
| `apps/job-dashboard/SECRETS.md` | Secret handling guide. |

### TA PPTX 도구 / TA PPTX Tools

`ta/` 디렉터리에는 PPTX 파일과 Python 스크립트가 포함되어 있습니다.

The `ta/` directory contains PPTX files and Python helper scripts.

| 파일 / File | 설명 / Description |
| --- | --- |
| `ta/inspect.py` | Inspects presentation artifacts. |
| `ta/improve_visual.py` | Applies visual improvements. |
| `ta/verify.py` | Verifies generated presentation output. |
| `ta/output/verify_report_*.txt` | Verification report output. |

예시:

```bash
python3 ta/inspect.py
python3 ta/verify.py
```

스크립트별 인자와 동작은 파일 내부 도움말 또는 소스 코드를 확인하세요.

Check each script’s source or help output for supported arguments.

---

## 테스트 / Testing

### 테스트 구성 / Test Configuration

| 테스트 종류 / Test Type | 설정 / Configuration | 설명 / Description |
| --- | --- | --- |
| Unit/Node tests | `jest.config.cjs` | Jest 기반 Node.js 테스트. / Jest-based Node.js tests. |
| Browser/e2e tests | `playwright.config.js` | Playwright 기반 브라우저 테스트. / Playwright browser tests. |
| Type checks | `tsconfig.json`, `tsconfig.base.json` | TypeScript 타입 검증. / TypeScript type checking. |
| Middleware test | `apps/job-dashboard/src/middleware/rate-limit.test.js` | Dashboard rate-limit behavior test. |
| Link checks | `lychee.toml` | Link validation configuration. |

### 권장 실행 순서 / Recommended Test Order

```bash
npm run typecheck
npm run lint
npm run test:node
```

Playwright 테스트가 설정되어 있는 경우:

If Playwright tests are configured:

```bash
npx playwright test
```

Jest를 직접 실행해야 하는 경우:

To run Jest directly:

```bash
npx jest
```

---

## 운영 및 관측성 / Operations and Observability

### 런타임 상태 / Runtime Status

| 대상 / Target | 상태 확인 / Health Check | 설명 / Description |
| --- | --- | --- |
| Docker Node.js runtime | `GET /health` | Dockerfile and Compose health checks use this endpoint. |
| Compose service | `docker compose ps` | Shows service health and restart state. |
| Container logs | `docker compose logs -f mcp-server` | Streams runtime logs. |
| Cloudflare Worker | Wrangler/Cloudflare logs | Use the configured Cloudflare environment to inspect Worker runtime behavior. |

### 운영 명령 / Operator Commands

| 작업 / Task | 명령어 / Command |
| --- | --- |
| Build and start container | `docker compose up --build` |
| Run in background | `docker compose up -d --build` |
| Stop services | `docker compose down` |
| View logs | `docker compose logs -f mcp-server` |
| Check health locally | `curl http://localhost:3000/health` |
| Rebuild image only | `docker compose build --no-cache` |

### 데이터 보존 / Data Persistence

`docker-compose.yml`은 로컬 Docker 볼륨을 사용합니다.

`docker-compose.yml` uses a local Docker volume.

| 볼륨 / Volume | 마운트 경로 / Mount Path | 용도 / Purpose |
| --- | --- | --- |
| `job_automation_data` | `/app/apps/job-server/.data` | Persists runtime job automation data across container restarts. |

---

## 배포 / Deployment

### Docker 배포 / Docker Deployment

1. `.env` 파일을 준비합니다.  
   Prepare the `.env` file.

2. 이미지를 빌드하고 서비스를 시작합니다.  
   Build the image and start the service.

   ```bash
   docker compose up -d --build
   ```

3. 상태를 확인합니다.  
   Check service health.

   ```bash
   docker compose ps
   curl http://localhost:3000/health
   ```

4. 로그를 확인합니다.  
   Inspect logs.

   ```bash
   docker compose logs -f mcp-server
   ```

### Cloudflare Worker 배포 / Cloudflare Worker Deployment

Cloudflare Worker 관련 설정은 `wrangler.jsonc`와 `apps/job-dashboard` 문서를 기준으로 관리합니다.

Cloudflare Worker deployment is managed through `wrangler.jsonc` and the documentation in `apps/job-dashboard`.

권장 확인 항목:

Recommended checks:

| 항목 / Item | 설명 / Description |
| --- | --- |
| Worker bindings | D1, Queue, KV, environment variables, and secrets must match the target environment. |
| Database schema | Apply `schema.sql` and migrations in order. |
| API behavior | Verify routes against `apps/job-dashboard/API_REFERENCE.md`. |
| Secrets | Follow `apps/job-dashboard/SECRETS.md`. |

---

## 보안 / Security

### 한국어

- `.env`, API 토큰, 세션 파일, Cloudflare 시크릿은 저장소에 커밋하지 마세요.
- 운영 환경 값은 환경 변수 또는 시크릿 관리 도구를 통해 주입하세요.
- Docker 볼륨에는 런타임 데이터가 남을 수 있으므로 백업/삭제 정책을 명확히 하세요.
- 공개 이력서/지원 자료에 개인정보가 포함될 수 있으므로 배포 전 검토하세요.
- 이미지 메타데이터 제거가 필요한 경우 `npm run strip-exif`를 사용하세요.

### English

- Do not commit `.env`, API tokens, session files, or Cloudflare secrets.
- Inject production values through environment variables or a secret manager.
- Docker volumes may retain runtime data; define backup and deletion policies clearly.
- Public resume/application artifacts may contain personal data; review them before publishing.
- Use `npm run strip-exif` when image metadata needs to be removed.

---

## 기여 / Contributing

기여 전 `CONTRIBUTING.md`와 `OWNERS`를 확인하세요.

Before contributing, review `CONTRIBUTING.md` and `OWNERS`.

기본 절차:

1. 변경 범위를 명확히 정의합니다.  
   Define the scope of the change.

2. 관련 문서와 테스트를 함께 갱신합니다.  
   Update related documentation and tests.

3. 로컬 검증을 실행합니다.  
   Run local validation.

   ```bash
   npm run typecheck
   npm run lint
   npm run test:node
   ```

4. 생성 산출물이 변경되는 경우 동기화 명령을 실행합니다.  
   Run sync commands when generated artifacts change.

   ```bash
   npm run sync:all
   ```

5. 민감 정보가 포함되지 않았는지 확인합니다.  
   Verify that no sensitive information is included.

---

## 라이선스 / License

이 저장소는 사설 프로젝트입니다. 자세한 내용은 [`LICENSE`](LICENSE)를 확인하세요.

This is a private project. See [`LICENSE`](LICENSE) for details.