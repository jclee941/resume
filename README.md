# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

이 저장소는 개인 포트폴리오 사이트, 채용 자동화 워커, 단일 진실 공급원(SSoT) 데이터 레이어, 운영 대시보드, 셀프 호스팅 옵저버빌리티를 하나의 npm 워크스페이스 모노레포로 통합한 사설 저장소입니다.

This repository is a private npm workspaces monorepo that unifies a personal portfolio site, job automation tooling, a Single Source of Truth (SSoT) data layer, an operations dashboard, and self-hosted observability under a single, versioned codebase.

---

## 목차 / Table of Contents

- [개요 / Overview](#overview--개요)
- [주요 기능 / Features](#주요-기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [기여 / Contribution](#기여--contribution)
- [라이선스 / License](#라이선스--license)

---

## Overview / 개요

`package.json`의 `description` 필드는 이 모노레포를 다음과 같이 정의합니다.

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability

### 핵심 가치 / Core Values

| 영역 / Area | 설명 / Description |
| --- | --- |
| 단일 진실 공급원 / Single Source of Truth | 이력, 프로필, 스킬, 직무 데이터는 `packages/data`에서 한 번 정의되고 포트폴리오, 이력서 PDF, PPTX, 운영 대시보드 등 모든 산출물로 자동 동기화됩니다. Resume, profile, skill, and role data are defined once in `packages/data` and automatically synced to the portfolio, resume PDF, PPTX, and operations dashboard. |
| 엣지 우선 포트폴리오 / Edge-First Portfolio | `apps/portfolio`는 Cloudflare Worker 기반 엣지 라우터로 운영되며, 글로벌 저지연 응답과 정적 자산 캐싱을 제공합니다. `apps/portfolio` runs as a Cloudflare Worker edge router for global low-latency responses and static asset caching. |
| 자동화 가능한 채용 워크플로 / Automatable Job Workflow | `apps/job-server`는 MCP/잡 자동화 런타임, 크롤러, 자동 지원 스크립트, 플랫폼 클라이언트를 포함합니다. `apps/job-server` contains an MCP/job automation runtime, crawlers, auto-apply scripts, and platform clients. |
| 워커 대시보드 / Worker Dashboard | `apps/job-dashboard`는 Cloudflare Worker fetch/queue/scheduled 핸들러, 미들웨어, 워크플로우로 구성됩니다. `apps/job-dashboard` provides Worker fetch/queue/scheduled handlers, middleware, and workflows. |
| 셀프 호스팅 옵저버빌리티 / Self-Hosted Observability | `tools/`, `infrastructure/`, `supabase/functions/`에 CI/빌드/배포/검증 스크립트와 Deno 엣지 함수가 포함됩니다. `tools/`, `infrastructure/`, and `supabase/functions/` include CI/build/deploy/verification scripts and Deno edge functions. |

---

## 주요 기능 / Features

- **엣지 렌더링 포트폴리오** / Edge-rendered portfolio: Cloudflare Worker에서 HTML/데이터/라이브러리 모듈을 합성하여 `worker.js`를 생성합니다.
- **잡 자동화 런타임** / Job automation runtime: MCP 서버, Wanted/JobKorea 크롤러, 자동 지원, 제안 동기화 CLI를 제공합니다.
- **대시보드 API & 워크플로** / Dashboard API & workflows: Worker fetch/queue/scheduled 핸들러, 어드민 라우트, 애플리케이션 라우트, CORS/CSRF/레이트 리미트 미들웨어를 포함합니다.
- **SSoT 데이터 동기화** / SSoT data sync: `packages/data`의 마스터 데이터를 PDF, PPTX, 포트폴리오, 대시보드로 자동 전파합니다.
- **타입·스키마·계약 패키지** / Type/schema/contract packages: `packages/types`, `packages/schemas`(Zod), `packages/contracts`(OpenAPI + Worker env) 계층을 공유합니다.
- **컨테이너 기반 런타임** / Container-based runtime: Dockerfile 멀티스테이지 빌드로 `apps/job-server` 프로덕션 이미지를 생성합니다.
- **검증·테스트 스위트** / Validation & test suites: Jest(Node 단위), Playwright(E2E), `redocly` API 검증, ESLint, TypeScript strict 타입체크를 지원합니다.

---

## 아키텍처 / Architecture

### 최상위 컴포지션 / Top-Level Composition

| 영역 / Domain | 경로 / Path | 책임 / Responsibility |
| --- | --- | --- |
| Public edge | `apps/portfolio/` | Cloudflare Worker로 배포되는 공개 포트폴리오 (`worker.js`는 생성 산출물) |
| Job automation | `apps/job-server/` | MCP 서버, 크롤러, 자동 지원, 동기화 스크립트 |
| Dashboard | `apps/job-dashboard/` | Worker fetch/queue/scheduled 오케스트레이션, 미들웨어, 워크플로우 |
| Shared packages | `packages/{cli,data,env,shared,types,schemas,contracts}/` | 데이터 SSoT, 타입, Zod 스키마, OpenAPI/Worker env 계약, 공용 유틸 |
| Applications | `applications/` | 회사별·역할별 이력서/자기소개서/지원 가이드/실행 로그 |
| Tools | `tools/` | CI/빌드/배포/검증 스크립트 (Go-first 정책) |
| Tests | `tests/` | Jest(Node), Playwright(E2E) |
| Infrastructure | `infrastructure/` | Cloudflare, DB, 모니터링, 시스템 자동화 |
| Docs | `docs/` | ADR, 아키텍처, 컨벤션, 가이드, 보안 |
| TA profile | `ta/` | Python/PPTX 기반 TA 프로필 생성 (`improve_visual.py`, `inspect.py`, `verify.py`) |
| Supabase | `supabase/functions/` | Deno 엣지 함수 |

### 요청 흐름 / Request Flow

1. 클라이언트 요청이 Cloudflare 엣지에 도달하면 `apps/portfolio/worker.js`(생성 산출물)가 라우팅을 처리합니다. / Client requests reach the Cloudflare edge and `apps/portfolio/worker.js` (generated artifact) handles routing.
2. 정적 자원과 마스터 데이터는 `packages/data/resumes/master/resume_data.json`과 `apps/portfolio/src/`에서 합성됩니다. / Static assets and master data are composed from `packages/data/resumes/master/resume_data.json` and `apps/portfolio/src/`.
3. 대시보드 경로(`/job/*`)는 동일 Worker 내부에서 `apps/job-dashboard/src/index.js`로 위임되거나 별도 Worker로 분리됩니다. / Dashboard paths (`/job/*`) are delegated either in-process to `apps/job-dashboard/src/index.js` or to a separate Worker.
4. 잡 자동화 트리거는 `apps/job-dashboard/src/queue-consumer.js`가 큐 메시지를 소비하고 `apps/job-server` MCP 런타임으로 전달합니다. / Job automation triggers are consumed by `apps/job-dashboard/src/queue-consumer.js` and dispatched to the `apps/job-server` MCP runtime.
5. 동기화 제안/데이터 변경은 `tools/scripts/sync/apply-proposals.go`와 `node tools/scripts/utils/sync-resume-data.js`로 SSoT에 반영됩니다. / Sync proposals and data changes are reflected into the SSoT via `tools/scripts/sync/apply-proposals.go` and `node tools/scripts/utils/sync-resume-data.js`.

---

## 저장소 구조 / Repository Structure

본 저장소의 최상위 디렉터리 구성은 다음과 같습니다. / The top-level directory layout is as follows.

```text
.
├── AGENTS.md                 # 프로젝트 지식 베이스 (에이전트 진입점)
├── CHANGELOG.md              # 변경 이력
├── CONTRIBUTING.md           # 기여 가이드
├── Dockerfile                # 멀티스테이지 빌드 (job-server 런타임)
├── LICENSE                   # 라이선스
├── OWNERS                    # 코드 오너십 메타데이터
├── ProfileView.jpg           # 프로필 미리보기 자산
├── README.md                 # 본 문서
├── docker-compose.yml        # 로컬 컨테이너 오케스트레이션
├── eslint.config.cjs         # ESLint 설정
├── jest.config.cjs           # Jest 설정
├── lychee.toml               # 링크 검사 설정
├── package-lock.json         # npm 잠금 파일
├── package.json              # 워크스페이스 루트 및 명령 허브
├── playwright.config.js      # Playwright E2E 설정
├── redocly.yaml              # API 스펙 린트 설정
├── tsconfig.base.json        # TypeScript 베이스 설정 (strict)
├── tsconfig.json             # TypeScript 루트 설정
├── wrangler.jsonc            # Cloudflare Worker 설정
├── ta/                       # Python/PPTX TA 프로필 생성
├── applications/             # 회사별·역할별 지원 패키지
└── apps/
    ├── job-dashboard/        # 대시보드 Worker (표시된 부분)
    └── ...                   # portfolio, job-server 등 기타 앱
```

> 전체 모노레포는 추가적으로 `apps/portfolio/`, `apps/job-server/`, `packages/{cli,data,env,shared,types,schemas,contracts}/`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/`를 포함합니다. 자세한 워크스페이스 구성은 `package.json`의 `workspaces` 필드를 참조하세요.
>
> The full monorepo additionally contains `apps/portfolio/`, `apps/job-server/`, `packages/{cli,data,env,shared,types,schemas,contracts}/`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, and `third_party/`. See the `workspaces` field in `package.json` for the full workspace graph.

---

## 빠른 시작 / Quick Start

### 요구 사항 / Prerequisites

| 도구 / Tool | 버전 / Version | 출처 / Source |
| --- | --- | --- |
| Node.js | 22.x | `Dockerfile` (`node:22-alpine`) |
| npm | 10.x (Node 22 기본 제공) | npm 워크스페이스 잠금 파일 사용 |
| Docker (선택 / optional) | 24.x 이상 | `docker-compose.yml` |
| Wrangler (선택 / optional) | Cloudflare Workers 배포 시 필요 | `wrangler.jsonc` |
| Go (선택 / optional) | 빌드/동기화 스크립트 실행 시 | `tools/scripts/` 정책 (Go-first) |
| Python 3 (선택 / optional) | TA 프로필 생성 시 | `ta/` 디렉터리 |

### 설치 / Install

```bash
npm ci
```

### 로컬 실행 옵션 / Local Run Options

| 경로 / Path | 명령 / Command | 설명 / Description |
| --- | --- | --- |
| 포트폴리오 워커 / Portfolio Worker | `wrangler dev --config wrangler.jsonc` | Cloudflare Worker 로컬 에뮬레이션 |
| 잡 서버 / Job server | `docker compose up mcp-server` | Docker로 컨테이너 실행 |
| 잡 대시보드 / Job dashboard | `wrangler dev --config apps/job-dashboard` (해당 설정 사용) | 대시보드 Worker 로컬 에뮬레이션 |

---

## 설정 / Configuration

### 환경 변수 / Environment Variables

`docker-compose.yml`은 `.env` 파일을 자동으로 로드합니다. 다음 변수는 런타임에서 사용됩니다. / `docker-compose.yml` automatically loads `.env`. The following variables are consumed at runtime.

| 변수 / Variable | 기본값 / Default | 용도 / Purpose |
| --- | --- | --- |
| `NODE_ENV` | `production` (컨테이너) | Node 런타임 모드 |
| `PORT` | `3000` | HTTP 리스닝 포트 |

추가 환경 변수는 `packages/env`(런타임 환경 검증), `apps/job-dashboard`(Worker env contract), `tools/scripts/onepassword/`(시크릿 로테이션)에서 관리됩니다. / Additional environment variables are managed via `packages/env` (runtime env validation), `apps/job-dashboard` (Worker env contract), and `tools/scripts/onepassword/` (secret rotation).

### 컨테이너 헬스체크 / Container Healthcheck

| 항목 / Item | 값 / Value |
| --- | --- |
| 엔드포인트 / Endpoint | `GET /health` (루프백) |
| 인터벌 / Interval | `30s` |
| 타임아웃 / Timeout | `5s` |
| 시작 대기 / Start period | `20s` |
| 재시도 / Retries | `3` |
| 재시작 정책 / Restart policy | `unless-stopped` |

### 지속성 볼륨 / Persistent Volume

| 볼륨 / Volume | 마운트 / Mount | 용도 / Purpose |
| --- | --- | --- |
| `job_automation_data` | `/app/apps/job-server/.data` (named driver `local`) | 잡 자동화 로컬 데이터 |

### TypeScript / Lint / API 컨벤션 / Conventions

| 항목 / Item | 파일 / File | 비고 / Notes |
| --- | --- | --- |
| TypeScript 베이스 / Base | `tsconfig.base.json` | `strict` 모드 |
| ESLint | `eslint.config.cjs` | 단일 설정 |
| API 스펙 린트 / API spec lint | `redocly.yaml` | OpenAPI 검증 |
| 링크 검사 / Link check | `lychee.toml` | 문서/링크 무결성 |
| E2E 테스트 / E2E | `playwright.config.js` | Playwright |

상세 아키텍처 규칙(200 LOC 룰, 네이밍, 자동화 SSoT, 스크립트 언어 정책)은 `docs/conventions/architecture-rules.md`에 명시되어 있습니다. / Detailed architecture rules (200 LOC rule, naming, automation SSoT, script language policy) are documented in `docs/conventions/architecture-rules.md`.

---

## 명령어 레퍼런스 / Commands Reference

`package.json`은 워크스페이스 루트 명령 허브 역할을 합니다. 주요 스크립트는 다음과 같습니다. / `package.json` acts as the workspace root command hub. Key scripts include the following.

### 데이터·자산 동기화 / Data & Asset Sync

| 스크립트 / Script | 동작 / Action |
| --- | --- |
| `npm run sync:data` | `tools/scripts/utils/sync-resume-data.js`로 마스터 데이터를 전파 |
| `npm run sync:pdf` | `tools/scripts/build/pdf-generator.go`로 PDF 생성 |
| `npm run sync:pptx` | `tools/scripts/build/generate_shinhan_pptx.py`로 PPTX 생성 |
| `npm run sync:all` | 위 세 작업을 순차 실행 |
| `npm run sync:proposals` | `apps/job-server/src/sync/proposal-review-cli.js` + `tools/scripts/sync/apply-proposals.go` |

### 1Password / 시크릿 운영 / 1Password & Secrets

| 스크립트 / Script | 동작 / Action |
| --- | --- |
| `npm run op:run` | `tools/scripts/onepassword/run` 실행 |
| `npm run op:native:run` | `tools/scripts/onepassword/native-run` 실행 |
| `npm run op:seed:resume` | `tools/scripts/onepassword/seed-resume` |
| `npm run op:seed:sessions` | `tools/scripts/onepassword/session-files seed` |
| `npm run op:restore:sessions` | `tools/scripts/onepassword/session-files restore` |

### 데이터 강화 / Enrichment

| 스크립트 / Script | 동작 / Action |
| --- | --- |
| `npm run enrich:github` | `tools/scripts/enrichment/github` Go 메인 실행 |
| `npm run enrich:skills` | `tools/scripts/enrichment/skills` Go 메인 실행 |
| `npm run enrich:ai` | `tools/scripts/enrichment/ai` Go 메인 실행 |
| `npm run enrich:all` | 세 강화 작업을 순차 실행 |

### 자동화 파이프라인 / Automation Pipelines

| 스크립트 / Script | 동작 / Action |
| --- | --- |
| `npm run automate:ssot` | 데이터/PDF 동기화 → 빌드 → 타입체크 → Node 테스트 |
| `npm run automate:full` | 전체 동기화 + 린트 + 타입체크 |
| `npm run strip-exif` | `apps/portfolio/src/images/*.png`, `*.webp`에서 EXIF 제거 (`exiftool` 미설치 시 스킵) |

### 자산 정리 / Asset Hygiene

| 스크립트 / Script | 동작 / Action |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지에서 EXIF 메타데이터 제거 (이미지 프라이버시 강화) |

> 정확한 전체 스크립트 목록과 인자는 `package.json`의 `scripts` 필드를 참조하세요. EXIF 제거 스크립트는 시스템에 `exiftool`이 없으면 경고 없이 스킵합니다.
>
> For the full script list and arguments, refer to the `scripts` field in `package.json`. The EXIF stripping script silently skips when `exiftool` is not installed on the host.

---

## 로컬 개발 / Local Development

### 워크스페이스 멤버 / Workspace Members

`package.json`의 `workspaces` 필드는 다음 패키지를 멤버로 선언합니다. / The `workspaces` field declares the following packages.

| 패키지 / Package | 역할 / Role |
| --- | --- |
| `apps/portfolio` | 공개 Cloudflare Worker 포트폴리오 |
| `apps/job-server` | MCP/잡 자동화 런타임 |
| `apps/job-dashboard` | 대시보드 Worker (fetch/queue/scheduled) |
| `packages/cli` | 운영자 CLI |
| `packages/data` | SSoT 콘텐츠 데이터 |
| `packages/shared` | 공용 유틸 (errors, logger, retry, crypto, rate-limit, auth, browser, clients) |
| `packages/types` | JSDoc/TS 도메인 타입 |
| `packages/schemas` | Zod 런타임 스키마 |
| `packages/contracts` | OpenAPI + Worker env 계약 |
| `packages/env` | 런타임 환경 검증 |

### 일반 워크플로 / Typical Workflow

1. 변경 의도에 맞는 디렉터리를 선택합니다(예: 포트폴리오 텍스트 → `packages/data`, 대시보드 라우트 → `apps/job-dashboard/src/routes/`). / Pick the directory that matches the intent (e.g., portfolio copy → `packages/data`, dashboard routes → `apps/job-dashboard/src/routes/`).
2. 워크스페이스 루트에서 `npm ci`로 의존성을 동기화합니다. / Sync dependencies from the workspace root with `npm ci`.
3. 로컬에서 `wrangler dev` 또는 `docker compose up mcp-server`로 대상 런타임을 띄웁니다. / Boot the target runtime locally with `wrangler dev` or `docker compose up mcp-server`.
4. 영향 범위에 따라 `sync:data`, `sync:pdf`, `sync:pptx`를 선택적으로 실행해 산출물을 재생성합니다. / Regenerate artifacts selectively with `sync:data`, `sync:pdf`, `sync:pptx` as needed.
5. 커밋 전에 `lint`, `typecheck`, `test:node`, Playwright 스위트를 실행합니다. / Run `lint`, `typecheck`, `test:node`, and the Playwright suite before committing.

### TA 프로필 생성 / TA Profile Generation

`ta/` 디렉터리는 Python/PPTX 기반 TA 프로필 생성 워크플로를 제공합니다. / The `ta/` directory provides a Python/PPTX-based TA profile generation workflow.

| 스크립트 / Script | 목적 / Purpose |
| --- | --- |
| `ta/improve_visual.py` | 시각 품질 개선 |
| `ta/inspect.py` | 입력/출력 PPTX 검사 |
| `ta/verify.py` | 생성 결과 검증 (`ta/output/verify_report_*.txt` 출력) |

---

## 테스트 / Testing

| 계층 / Layer | 도구 / Tool | 설정 / Config | 위치 / Location |
| --- | --- | --- | --- |
| Node 단위 / Node unit | Jest | `jest.config.cjs` | `tests/` (및 워크스페이스 `__tests__/`) |
| E2E | Playwright | `playwright.config.js` | `tests/e2e/` |
| 타입 / Type | TypeScript (strict) | `tsconfig.base.json`, `tsconfig.json` | 전체 워크스페이스 |
| API 스펙 / API spec | Redocly CLI | `redocly.yaml` | `packages/contracts/` |
| 링크 / Link | lychee | `lychee.toml` | 문서/저장소 전반 |

`apps/job-dashboard/src/middleware/`에는 `rate-limit.test.js`와 같은 인접 테스트가 위치하며, 라우트 단위 테스트는 `apps/job-dashboard/src/routes/`에 인접 배치합니다. / Adjacent tests such as `rate-limit.test.js` live in `apps/job-dashboard/src/middleware/`, with route tests placed alongside their counterparts in `apps/job-dashboard/src/routes/`.

---

## 배포 / Deployment

### 컨테이너 배포 / Container Deployment

```bash
docker compose build mcp-server
docker compose up -d mcp-server
```

`Dockerfile`은 `deps` 단계에서 워크스페이스 메타데이터만 복사해 `npm ci --omit=dev --ignore-scripts`로 프로덕션 의존성만 설치하고, `runtime` 단계에서 `apps/job-server`와 필수 워크스페이스(`@resume/{shared,schemas,types,data,env}`)만 복사해 이미지 크기를 최소화합니다. / The `Dockerfile` minimizes image size by copying workspace metadata in `deps` to install production dependencies only with `npm ci --omit=dev --ignore-scripts`, and copying only `apps/job-server` plus the required `@resume/{shared,schemas,types,data,env}` packages in `runtime`.

| 빌드 단계 / Stage | 베이스 이미지 / Base | 산출물 / Artifact |
| --- | --- | --- |
| `deps` | `node:22-alpine` | 프로덕션 `node_modules` |
| `runtime` | `node:22-alpine` | `apps/job-server` 런타임 이미지 (`PORT=3000`, `HEALTHCHECK=/health`) |

### Cloudflare Worker 배포 / Cloudflare Worker Deployment

| 앱 / App | 진입점 / Entry | 설정 / Config |
| --- | --- | --- |
| `apps/portfolio` | `worker.js` (생성 산출물 / generated) | `wrangler.jsonc` |
| `apps/job-dashboard` | `src/index.js` | `wrangler.jsonc` (앱 디렉터리 로컬 설정) |

프로덕션 배포 권한은 Cloudflare Workers Builds에 있습니다. 로컬에서는 `wrangler deploy`로 미리보기 환경에 배포할 수 있습니다. / Production deploy authority is Cloudflare Workers Builds. Locally, `wrangler deploy` can be used to publish to preview environments.

---

## 기여 / Contribution

- 기여 절차와 코딩 컨벤션은 [`CONTRIBUTING.md`](CONTRIBUTING.md)를 참조하세요. / See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution workflow and coding conventions.
- 코드 오너십은 [`OWNERS`](OWNERS) 파일을 참조하세요. / See [`OWNERS`](OWNERS) for code ownership.
- 변경 이력은 [`CHANGELOG.md`](CHANGELOG.md)에서 추적합니다. / Changes are tracked in [`CHANGELOG.md`](CHANGELOG.md).
- 에이전트/자동화 진입점은 [`AGENTS.md`](AGENTS.md)와 `apps/`, `packages/`, `tools/`, `tests/` 하위의 각 `AGENTS.md`에 정의되어 있습니다. / Agent/automation entry points are defined in [`AGENTS.md`](AGENTS.md) and in the child `AGENTS.md` files under `apps/`, `packages/`, `tools/`, `tests/`.

### 가이드라인 요약 / Guidelines Summary

| 항목 / Item | 가이드 / Guidance |
| --- | --- |
| 200 LOC 룰 / 200 LOC rule | `docs/conventions/architecture-rules.md` 참조 |
| 스크립트 언어 정책 / Script language policy | 운영 스크립트는 Go 우선 (Go-first) |
| 데이터 진실 공급원 / Data SSoT | `packages/data/resumes/master/resume_data.json` |
| 자동화 진실 공급원 / Automation SSoT | `docs/conventions/architecture-rules.md` 참조 |
| 시크릿 관리 / Secrets | `tools/scripts/onepassword/` 및 `docs/security/` |

---

## 라이선스 / License

이 저장소는 사설이며 [`LICENSE`](LICENSE) 파일에 명시된 조건에 따라 라이선스가 부여됩니다. 외부 배포나 재사용 전에 라이선스 조건을 확인하세요. / This repository is private and licensed under the terms stated in [`LICENSE`](LICENSE). Review the license terms before any external redistribution or reuse.

---

## 참고 자료 / Further Reading

| 문서 / Document | 위치 / Location |
| --- | --- |
| 프로젝트 지식 베이스 / Project knowledge base | [`AGENTS.md`](AGENTS.md) |
| 대시보드 개발 / Dashboard development | `apps/job-dashboard/DEVELOPMENT_GUIDE.md` |
| 대시보드 배포 / Dashboard deployment | `apps/job-dashboard/DEPLOYMENT_GUIDE.md` |
| 대시보드 API 레퍼런스 / Dashboard API reference | `apps/job-dashboard/API_REFERENCE.md` |
| 대시보드 다이어그램 / Dashboard diagrams | `apps/job-dashboard/DIAGRAMS.md` |
| 대시보드 시크릿 / Dashboard secrets | `apps/job-dashboard/SECRETS.md` |
| 디자인 시스템 / Design system | `applications/DESIGN.md` |
| 아키텍처 규칙 / Architecture rules | `docs/conventions/architecture-rules.md` |
| 보안 가이드 / Security guide | `docs/security/` |
| 모노레포 컨벤션 / Monorepo conventions | `docs/conventions/` |
| 지원 패키지 예시 / Application packet examples | `applications/` |