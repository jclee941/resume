# 포트폴리오 자동화 워크스페이스 / Portfolio Automation Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![Wrangler](https://img.shields.io/badge/wrangler-configured-orange.svg)](wrangler.jsonc)
[![ESLint](https://img.shields.io/badge/eslint-configured-purple.svg)](eslint.config.cjs)
[![Jest](https://img.shields.io/badge/jest-configured-red.svg)](jest.config.cjs)
[![Playwright](https://img.shields.io/badge/playwright-ready-green.svg)](playwright.config.js)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

---

## 한눈에 보기 / At a Glance

이 워크스페이스는 개인 포트폴리오 사이트, 채용 자동화 런타임, 단일 진실 공급원(SSoT) 콘텐츠 데이터 레이어, 운영 대시보드를 하나의 버전 관리된 코드베이스로 통합한 사설 자동화 환경입니다. 포트폴리오 HTML/CSS/JS, 이력서 PDF, PPTX 프로필, 지원서 패키지(에어리어/커버레터), Wanted·JobKorea 자동 지원 워커, D1·Queue 기반 대시보드 워크플로우까지 동일한 데이터에서 파생됩니다.

This private workspace unifies a personal portfolio site, job automation runtimes, a Single Source of Truth (SSoT) content layer, and an operations dashboard under one versioned codebase. Portfolio HTML, resume PDFs, PPTX profiles, per-role application packets, and Wanted/JobKorea automation workers all derive from the same canonical data.

### 상태 요약 / Status Snapshot

| 영역 / Area | 상태 / Status | 위치 / Location | 비고 / Notes |
| --- | --- | --- | --- |
| 포트폴리오 엣지 사이트 / Portfolio edge | 운영 준비 / Production-ready | `apps/portfolio/` | `entry.js` 편집, `worker.js`는 생성 산출물 |
| 채용 자동화 런타임 / Job automation | 운영 준비 / Production-ready | `apps/job-server/` | Fastify + MCP, 크롤러/자동지원 |
| 운영 대시보드 / Operations dashboard | 운영 준비 / Production-ready | `apps/job-dashboard/` | Cloudflare Worker fetch/queue/scheduled |
| 콘텐츠 SSoT / Content SSoT | 단일 진실 / Authoritative | `packages/data/` | `resumes/master/resume_data.json` |
| 타입 / 스키마 / 계약 / Types & Contracts | 동기화됨 / Synced | `packages/{types,schemas,contracts}/` | Zod + JSDoc + OpenAPI |
| 컨테이너 런타임 / Container runtime | Docker Compose | `Dockerfile`, `docker-compose.yml` | `mcp-server` 단일 서비스 |
| 회귀 테스트 / Regression | Jest + Playwright | `jest.config.cjs`, `playwright.config.js` | 단위/통합/E2E 분리 |
| 린트 / Lint | ESLint flat config | `eslint.config.cjs` | 루트 + 워크스페이스별 |
| API 컨트랙트 / API contracts | Redocly CI | `redocly.yaml` | OpenAPI lint/bundle |
| 링크 검사 / Link check | Lychee | `lychee.toml` | 문서/링크 회귀 |

### 실행 흐름 요약 / Runtime Flow Summary

| 항목 / Item | 내용 / Content |
| --- | --- |
| 무엇이 실행되는가 / What runs | 포트폴리오 엣지 워커(`apps/portfolio`), MCP/잡 자동화 서버(`apps/job-server`), 대시보드 워커(`apps/job-dashboard`), 보조 스크립트(`tools/`, `ta/`) |
| 누가 운영 책임자인가 / Who owns it | [`OWNERS`](OWNERS), [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS), [`AGENTS.md`](AGENTS.md) |
| 다음에 쓸 명령 / Next command | `npm install` → `npm run sync:data` → `npm run build` → `npm run dev` (포트폴리오) 또는 `docker compose up -d mcp-server` (잡 서버) |
| 데이터 진입점 / Data entry point | `packages/data/resumes/master/resume_data.json` |
| 배포 권위 / Deploy authority | Cloudflare Workers Builds (운영) |

---

## 목차 / Table of Contents

- [목적 / Purpose](#목적--purpose)
- [패키지 구성 / Package Contents](#패키지-구성--package-contents)
- [운영 상태 / Status](#운영-상태--status)
- [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
- [API와 진입점 / API and Entry Points](#api와-진입점--api-and-entry-points)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [지원 패키지 / Application Packets](#지원-패키지--application-packets)
- [운영자 / Maintainers](#운영자--maintainers)
- [참고 문서 / Further Documentation](#참고-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

---

## 목적 / Purpose

이 워크스페이스는 네 가지 산출물을 하나의 데이터 그래프에서 일관되게 만듭니다.

| 산출물 / Output | 소비 시점 / When used | 생성 경로 / Generation path |
| --- | --- | --- |
| 포트폴리오 웹사이트 / Portfolio website | 공개 채용/미팅 전 | `packages/data` → `apps/portfolio/build` → Cloudflare Worker |
| 이력서 PDF / Resume PDF | 지원서 제출 | `packages/data` → `tools/scripts/build/pdf-generator.go` |
| TA 프로필 PPTX / TA profile PPTX | 채용 컨설팅 미팅 | `packages/data` → `ta/improve_visual.py` 등 |
| 지원서 패키지 / Application packet | 기업별 지원 | `applications/<role>-<year>/` (HTML/PDF/커버레터/가이드) |

왜 유용한가 / Why it is useful:

- **단일 데이터 진실 / Single source of truth** — 이력/프로필/스킬을 한 곳에서 수정하면 포트폴리오, PDF, PPTX, 지원서가 모두 동기화됩니다.
- **엣지 우선 / Edge-first portfolio** — Cloudflare Worker에서 정적 자산과 동적 라우트를 한 번에 처리합니다.
- **자동화 가능한 채용 흐름 / Automatable job funnel** — Wanted/JobKorea 자동 지원, MCP 서버, 큐 기반 워크플로우를 같은 워크스페이스에서 다룹니다.
- **자가 호스팅 가시성 / Self-hosted observability** — 외부 SaaS 의존을 줄이고 워크스페이스 내부에서 모니터링합니다.
- **지원 단위 패키징 / Per-role packetization** — 역할별 지원 패키지가 폴더 단위로 분리되어 운영 로그와 함께 보관됩니다.

이 워크스페이스로 무엇을 할 수 있는가 / What you can do with it:

- 코드 변경 한 번으로 포트폴리오/이력서/PPTX를 동시에 갱신
- 새 채용 포지션 지원 시 지원 패키지 폴더를 템플릿으로 빠르게 생성
- 로컬 또는 컨테이너에서 잡 자동화 서버를 띄우고 워커/큐를 시뮬레이션
- OpenAPI/Redocly로 API 컨트랙트를 CI에서 검증

---

## 패키지 구성 / Package Contents

`package.json`의 `workspaces` 필드에 정의된 워크스페이스입니다.

| 경로 / Path | 종류 / Kind | 역할 / Role |
| --- | --- | --- |
| `apps/portfolio` | 배포 산출물 / Deployable | Cloudflare Worker 포트폴리오 (HTML/CSS/JS + 라우터) |
| `apps/job-server` | Node 서비스 / Node service | MCP/잡 자동화 런타임, Fastify 기반 API, 크롤러 |
| `apps/job-dashboard` | 배포 산출물 / Deployable | Cloudflare Worker 대시보드, fetch/queue/scheduled |
| `packages/cli` | CLI / CLI | 워크스페이스 운영 CLI |
| `packages/data` | 콘텐츠 SSoT / Content SSoT | 이력/프로필/지원 데이터 원본 |
| `packages/shared` | 공용 유틸 / Shared utils | 에러/로거/재시도/암호/클라이언트 |
| `packages/types` | 타입 / Types | JSDoc/TS 도메인 타입 |
| `packages/schemas` | 스키마 / Schemas | Zod 런타임 스키마 |
| `packages/contracts` | 계약 / Contracts | OpenAPI, Worker 환경 계약 |
| `packages/env` | 환경 / Environment | 런타임 환경 변수 검증 |

루트 부속 폴더 / Top-level auxiliary folders:

| 경로 / Path | 역할 / Role |
| --- | --- |
| `applications/` | 역할별 지원 패키지 (에어리어, 커버레터, 가이드, PDF, 실행 로그) |
| `tools/` | CI/빌드/배포/검증 스크립트, 1Password 시드, 동기화 |
| `tests/` | 단위/통합/E2E 테스트 슈트 |
| `infrastructure/` | Cloudflare, DB, 모니터링, 시스템 자동화 설정 |
| `docs/` | ADR, 아키텍처, 컨벤션, 가이드, 보안 문서 |
| `ta/` | Python/PPTX 기반 TA 프로필 생성 |
| `supabase/functions/` | Deno 엣지 함수 |
| `third_party/` | npm으로 관리되는 벤더 자료 |

---

## 운영 상태 / Status

| 컴포넌트 / Component | 상태 / State | 비고 / Notes |
| --- | --- | --- |
| 포트폴리오 워커 / Portfolio worker | 운영 준비 / Production-ready | `wrangler.jsonc` 기반 배포 |
| 잡 서버 컨테이너 / Job server container | 운영 준비 / Production-ready | `Dockerfile` + `docker-compose.yml` |
| 잡 대시보드 / Job dashboard | 운영 준비 / Production-ready | fetch/queue/scheduled 핸들러 검증됨 |
| 데이터 동기화 / Data sync | 안정 / Stable | `npm run sync:all`로 전체 재생성 |
| 테스트 인프라 / Test infra | 안정 / Stable | Jest(단위/통합), Playwright(E2E) |
| API 컨트랙트 / API contracts | 안정 / Stable | Redocly lint 통과 필요 |
| 폐기 여부 / Deprecated? | 아니오 / No | 단, 워크스페이스는 사설(private) |

---

## 먼저 읽을 파일 / First Files to Read

워크스페이스를 처음 접할 때 다음 순서로 읽으면 빠르게 맥락을 잡을 수 있습니다.

| # | 파일 / File | 이유 / Why read it |
| --- | --- | --- |
| 1 | [`AGENTS.md`](AGENTS.md) | 프로젝트 지식 베이스, 구조/심볼 맵 제공 |
| 2 | [`package.json`](package.json) | 명령 허브, 워크스페이스 정의, 버전 정보 |
| 3 | [`packages/data/resumes/master/resume_data.json`](packages/data/) | 콘텐츠 SSoT의 실제 데이터 |
| 4 | [`apps/portfolio/entry.js`](apps/portfolio/) | 포트폴리오 런타임 진입점 |
| 5 | [`apps/job-server/src/index.js`](apps/job-server/) | 잡 자동화 MCP 부트스트랩 |
| 6 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/) | 대시보드 fetch/queue/scheduled 진입점 |
| 7 | [`Dockerfile`](Dockerfile) | 멀티스테이지 빌드, 운영 이미지 정의 |
| 8 | [`docker-compose.yml`](docker-compose.yml) | 로컬 컨테이너 실행 정의 |
| 9 | [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md) | 200-LOC 규칙, 명명 규칙, 스크립트 언어 정책 |
| 10 | [`OWNERS`](OWNERS) | 운영 책임자/리뷰어 명단 |

---

## API와 진입점 / API and Entry Points

### 런타임 진입점 / Runtime entry points

| 진입점 / Entry | 종류 / Kind | 경로 / Path | 호출 시점 / When invoked |
| --- | --- | --- | --- |
| 포트폴리오 워커 / Portfolio Worker | Cloudflare Worker fetch | `apps/portfolio/entry.js` | HTTP 요청 처리 |
| 포트폴리오 빌드 생성기 / Portfolio build generator | Node 스크립트 | `apps/portfolio/generate-worker.js` | `npm run build` |
| 잡 서버 MCP 부트스트랩 / Job server MCP bootstrap | Node 프로세스 | `apps/job-server/src/index.js` | 컨테이너/로컬 실행 |
| 잡 서버 HTTP 부트스트랩 / Job server HTTP bootstrap | Fastify | `apps/job-server/src/server/index.js` | REST API |
| 잡 대시보드 / Job dashboard | Worker fetch/queue/scheduled | `apps/job-dashboard/src/index.js` | HTTP, 큐 메시지, 크론 |
| 잡 대시보드 라우터 / Job dashboard router | Node 모듈 | `apps/job-dashboard/src/router.js` | 요청 라우팅 |
| 잡 대시보드 큐 컨슈머 / Job dashboard queue consumer | Worker 큐 | `apps/job-dashboard/src/queue-consumer.js` | 큐 트리거 |
| 대시보드 관리자 라우트 / Dashboard admin route | Express-style | `apps/job-dashboard/src/routes/admin.js` | 어드민 액션 |
| 대시보드 지원 라우트 / Dashboard applications route | Express-style | `apps/job-dashboard/src/routes/applications.js` | 지원서 처리 |

### HTTP 표면 / HTTP surface

| 메서드+경로 / Method+path | 라우터 / Router | 미들웨어 / Middleware | 비고 / Notes |
| --- | --- | --- | --- |
| `GET /health` | 잡 서버 | — | Docker healthcheck 타깃 |
| `/job/*` | 포트폴리오 워커 | 인-프로세스 라우터 | 대시보드 진입을 엣지에서 처리 |
| 대시보드 API 경로 | `apps/job-dashboard/src/router.js` | [`cors.js`](apps/job-dashboard/src/middleware/cors.js), [`csrf.js`](apps/job-dashboard/src/middleware/csrf.js), [`rate-limit.js`](apps/job-dashboard/src/middleware/) | CORS/CSRF/레이트리밋 적용 |

> 계약은 `packages/contracts/`의 OpenAPI 정의에 정리되어 있으며 `redocly.yaml`로 CI 검증합니다.

---

## 빠른 시작 / Quick Start

### 사전 요구사항 / Prerequisites

| 도구 / Tool | 버전 / Version | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22.x | 워크스페이스 런타임 |
| npm | 10.x 이상 | 워크스페이스 설치/스크립트 |
| Python | 3.x | `ta/` PPTX 생성 |
| Go | 1.22 이상 | 빌드/동기화 스크립트 |
| Docker + Compose | 최신 / Latest | 잡 서버 컨테이너 실행 |
| Wrangler | CLI | Cloudflare Worker 배포 |

### 설치 / Install

```bash
git clone <repo-url>
cd <repo-dir>
npm install
```

### 데이터 동기화 / Sync data

```bash
# 콘텐츠 SSoT → 다른 산출물로 동기화
npm run sync:data     # JSON → 다른 데이터 포맷
npm run sync:pdf      # Go PDF 생성기
npm run sync:pptx     # Python PPTX 생성기
npm run sync:all      # 위 세 개를 차례로 실행
```

### 포트폴리오 로컬 실행 / Run portfolio locally

```bash
npm run build         # apps/portfolio/worker.js 생성
npm run dev           # Wrangler 로컬 개발 서버
```

### 잡 서버 컨테이너 실행 / Run job server container

```bash
docker compose up -d mcp-server
docker compose ps
docker compose logs -f mcp-server
```

### 헬스체크 / Health check

```bash
curl -fsS http://127.0.0.1:3000/health
```

### 1Password 시드 (선택) / 1Password seed (optional)

```bash
npm run op:seed:resume
npm run op:seed:sessions
```

> 1Password CLI가 로컬에 설치되어 있어야 합니다. 자세한 절차는 `docs/security/`와 `tools/scripts/onepassword/`를 참조하세요.

---

## 설정 / Configuration

### 환경 변수 / Environment variables

워크스페이스는 `packages/env`로 런타임 환경 변수를 검증합니다. 주요 카테고리는 다음과 같습니다.

| 카테고리 / Category | 변수 예 / Example vars | 적용 대상 / Applied to |
| --- | --- | --- |
| Cloudflare | `CF_ACCOUNT_ID`, `CF_API_TOKEN` | Wrangler 배포 |
| 데이터 경로 | `RESUME_DATA_DIR`, `DATA_SSOT_PATH` | 동기화/빌드 |
| 1Password | `OP_SERVICE_ACCOUNT_TOKEN`, `OP_VAULT` | `tools/scripts/onepassword/` |
| 잡 자동화 | `JOB_PLATFORM`, `JOB_CRED_*`, `WANTED_SESSION`, `JOBKOREA_SESSION` | `apps/job-server/` |
| 데이터베이스 | `D1_BINDING`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | 대시보드/엣지 함수 |
| 관측 / Observability | `LOG_LEVEL`, `OTEL_EXPORTER_OTLP_ENDPOINT` | 로깅/메트릭 |
| EXIF 제거 | (스크립트 인자) | `npm run strip-exif` |

### Docker 환경 / Docker environment

| 설정 / Setting | 값 / Value | 출처 / Source |
| --- | --- | --- |
| 베이스 이미지 | `node:22-alpine` | `Dockerfile` |
| 컨테이너 포트 | `3000` | `Dockerfile`, `docker-compose.yml` |
| Healthcheck | `GET /health` | `Dockerfile`, `docker-compose.yml` |
| 영구 볼륨 | `job_automation_data` | `docker-compose.yml` |
| 재시작 정책 | `unless-stopped` | `docker-compose.yml` |

---

## 명령어 레퍼런스 / Commands Reference

`package.json`의 주요 스크립트입니다. 전체 목록은 [`package.json`](package.json)을 참조하세요.

### 동기화 / Sync

| 스크립트 / Script | 명령어 / Command | 역할 / Purpose |
| --- | --- | --- |
| 데이터 동기화 / Data sync | `npm run sync:data` | SSoT → 다른 데이터 포맷 |
| PDF 생성 / PDF build | `npm run sync:pdf` | Go PDF 생성기 실행 |
| PPTX 생성 / PPTX build | `npm run sync:pptx` | Python PPTX 생성기 실행 |
| 전체 동기화 / All sync | `npm run sync:all` | 위 셋을 순차 실행 |
| 제안 동기화 / Proposals sync | `npm run sync:proposals` | 제안 검토 CLI + Go 적용 |

### 보강 / Enrichment

| 스크립트 / Script | 명령어 / Command | 역할 / Purpose |
| --- | --- | --- |
| GitHub 보강 / GitHub enrich | `npm run enrich:github` | `tools/scripts/enrichment/github` |
| 스킬 보강 / Skills enrich | `npm run enrich:skills` | `tools/scripts/enrichment/skills` |
| AI 보강 / AI enrich | `npm run enrich:ai` | `tools/scripts/enrichment/ai` |
| 전체 보강 / All enrich | `npm run enrich:all` | 위 셋을 순차 실행 |

### 운영 자동화 / Operational automation

| 스크립트 / Script | 명령어 / Command | 역할 / Purpose |
| --- | --- | --- |
| SSoT 자동화 / SSoT automation | `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + 테스트 |
| 풀 자동화 / Full automation | `npm run automate:full` | 동기화 + 린트 + ... |
| EXIF 제거 / Strip EXIF | `npm run strip-exif` | 이미지 메타데이터 정리 |
| 1Password 실행 / 1Password run | `npm run op:run` | 1Password 통합 실행 |
| 1Password 네이티브 / Native run | `npm run op:native:run` | 네이티브 통합 실행 |
| 시드: 이력서 / Seed: resume | `npm run op:seed:resume` | 1Password에 이력 데이터 시드 |
| 시드: 세션 / Seed: sessions | `npm run op:seed:sessions` | 1Password에 세션 시드 |
| 복원: 세션 / Restore sessions | `npm run op:restore:sessions` | 세션 파일 복원 |

---

## 로컬 개발 / Local Development

| 항목 / Item | 권장 / Recommendation |
| --- | --- |
| IDE | VS Code (TypeScript, ESLint, Jest 확장) |
| Node | `nvm use 22` 또는 시스템 Node 22 |
| 패키지 매니저 | npm 10+ (lockfile 기반) |
| 워크스페이스 설치 | 루트에서 `npm install` 한 번이면 전 워크스페이스 설치 |
| 워크스페이스 단위 실행 | `npm -w apps/portfolio run dev` 등 `-w` 플래그 사용 |
| 데이터 변경 후 | `npm run sync:data` → 영향 받는 워크스페이스 재빌드 |
| 이미지 메타데이터 | `npm run strip-exif`로 EXIF 제거 |
| 컨테이너 디버깅 | `docker compose exec mcp-server sh` |
| 컨트랙트 변경 | `redocly.yaml` 기준 lint 통과 확인 |

### 디렉토리 규칙 / Directory rules

- 워크스페이스 내부 규칙은 각 패키지의 `AGENTS.md`가 우선합니다 (`docs/conventions/architecture-rules.md` 참조).
- 스크립트는 가능한 한 Go로 작성하되, PPTX/이미지 등 Python 생태계가 강한 영역은 Python을 허용합니다.

---

## 테스트 / Testing

| 계층 / Layer | 도구 / Tool | 위치 / Location | 명령어 예 / Example command |
| --- | --- | --- | --- |
| 단위 / Unit | Jest | `tests/`, 워크스페이스별 `__tests__` | `npm test`, `npm -w <pkg> run test` |
| 통합 / Integration | Jest | `tests/integration/` | `npm run test:integration` (정의된 경우) |
| Node 런타임 / Node | Node test runner | 워크스페이스별 | `npm run test:node` |
| E2E / End-to-end | Playwright | `tests/e2e/`, 루트 `playwright.config.js` | `npx playwright test` |
| 링크 / Links | Lychee | `lychee.toml` | `npx lychee` |
| API 컨트랙트 / API contracts | Redocly | `redocly.yaml` | `npx redocly lint` |
| 타입 / Types | TypeScript | `tsconfig.base.json` | `npm run typecheck` |
| 린트 / Lint | ESLint | `eslint.config.cjs` | `npm run lint` |

### 회귀 가이드 / Regression guide

- 데이터 SSoT를 변경하면 `sync:all` → `typecheck` → 테스트 순으로 회귀 확인을 권장합니다.
- 새 라우트를 추가하면 OpenAPI 정의를 `packages/contracts/`에 함께 갱신하고 Redocly lint를 통과시키세요.

---

## 배포 / Deployment

| 타깃 / Target | 진입점 / Entry | 명령 / Command | 비고 / Notes |
| --- | --- | --- | --- |
| 포트폴리오 (Cloudflare Worker) | `apps/portfolio/worker.js` | `wrangler deploy` (CI 권위) | 운영 배포 권위는 Cloudflare Workers Builds |
| 잡 대시보드 (Cloudflare Worker) | `apps/job-dashboard/src/index.js` | `wrangler deploy` | 큐/스케줄 바인딩 확인 |
| 잡 서버 컨테이너 | `apps/job-server/src/index.js` | `docker compose up -d mcp-server` | 이미지 빌드는 `Dockerfile` 멀티스테이지 |
| Supabase 엣지 함수 | `supabase/functions/` | Supabase CLI | Deno 런타임 |

### 컨테이너 빌드 흐름 / Container build flow

1. `deps` 스테이지에서 `npm ci --omit=dev --ignore-scripts`로 프로덕션 의존성 설치
2. `runtime` 스테이지에서 `packages/shared|schemas|types|data|env` + `apps/job-server`만 복사
3. `HEALTHCHECK`로 `/health` 엔드포인트 30초 주기 점검
4. `CMD ["node", "src/server/index.js"]`로 부트스트랩

---

## 지원 패키지 / Application Packets

`applications/` 아래 역할별 지원 패키지를 보관합니다. 각 폴더는 회사·포지션 단위이며 PDF/HTML 미리보기/커버레터/가이드를 포함합니다.

| 폴더 / Folder | 대상 / Target | 핵심 파일 / Key files |
| --- | --- | --- |
| `applications/airpremia-security-2026/` | Airpremia Security 인사 게이트 | `application-guide.md`, `cover_letter.md`, `airpremia-greetinghr-signup-gate.png` |
| `applications/infrastructure-architecture-2026/` | 인프라 아키텍처 포지션 | `homelab-infrastructure-architecture.md` |
| `applications/coupang-fintech-sre-2026/` | Coupang Pay 핀테크 SRE | `Jaecheol_Lee_Resume_Coupang_Pay_Fintech_SRE.pdf`, `resume-coupang-fintech-sre.html`, `cover_letter.md` |
| `applications/cloudflare-one-se-2026/` | Cloudflare One SE | `Jaecheol_Lee_Resume_Cloudflare_One_SE.pdf`, `resume-cloudflare-one-se.html`, `cover_letter.md`, `greenhouse-application-guide.md`, `interview-qa-10.md`, `linkedin-profile-optimization.md`, `preview.png` |
| `applications/openai-codex-korea-2026/` | OpenAI Codex Korea | `application-guide.md`, `cover_letter.md` |
| `applications/gitlab-apac-security-2026/` | GitLab APAC InfraSec | `Jaecheol_Lee_Resume_GitLab_APAC_InfraSec.pdf`, `resume-gitlab-apac-security.html`, `cover_letter.md` |
| `applications/security-ir-2026/` | Security IR (KR) | `Jaecheol_Lee_Resume_Security_IR_KR.pdf`, `resume-security-ir.html`, `resume-security-ir-preview.png` |

> 새 포지션 지원 시 동일 폴더 명명 규칙(`<company>-<team>-<year>/`)을 따르고 PDF + HTML + 커버레터 + 가이드를 기본 산출물로 포함하세요.

### TA 프로필 / TA profile

| 항목 / Item | 위치 / Location |
| --- | --- |
| 입력 PPTX | `ta/*.pptx` |
| 검사 스크립트 | [`ta/inspect.py`](ta/inspect.py), [`ta/verify.py`](ta/verify.py) |
| 시각화 개선 | [`ta/improve_visual.py`](ta/improve_visual.py) |
| 출력 | `ta/output/` (PPTX, 검증 리포트) |

---

## 운영자 / Maintainers

| 역할 / Role | 위치 / Location | 책임 / Responsibility |
| --- | --- | --- |
| 저장소 OWNERS | [`OWNERS`](OWNERS) | 전체 변경 승인, 운영 권한 |
| 대시보드 OWNERS | [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) | 대시보드 변경 승인 |
| 프로젝트 지식 베이스 | [`AGENTS.md`](AGENTS.md) | 구조/심볼/규칙 단일 진입 문서 |
| 디자인 가이드 | [`applications/DESIGN.md`](applications/DESIGN.md) | 지원 패키지 디자인 규칙 |

도움을 받을 곳 / Where to get help:

1. `AGENTS.md`의 "WHERE TO LOOK" 표에서 작업별 권장 위치 확인
2. `docs/conventions/`에서 명명/구조/스크립트 언어 정책 확인
3. `docs/security/`에서 비밀/세션/1Password 절차 확인
4. OWNERS 파일에 명시된 책임자에게 직접 연락

---

## 참고 문서 / Further Documentation

| 주제 / Topic | 위치 / Location |
| --- | --- |
| 프로젝트 지식 베이스 | [`AGENTS.md`](AGENTS.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |
| 기여 가이드 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 라이선스 | [`LICENSE`](LICENSE) |
| 대시보드 배포 가이드 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 개발 가이드 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 대시보드 API 레퍼런스 | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 대시보드 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| 대시보드 시크릿 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 대시보드 마이그레이션 | [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs), [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) |
| 지원 패키지 디자인 | [`applications/DESIGN.md`](applications/DESIGN.md) |
| API 컨트랙트 | [`redocly.yaml`](redocly.yaml), [`packages/contracts/`](packages/contracts/) |
| 타입 / 스키마 | [`packages/types/`](packages/types/), [`packages/schemas/`](packages/schemas/) |
| 워크플로우/큐 | [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js), [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) |
| 미들웨어 | [`apps/job-dashboard/src/middleware/`](apps/job-dashboard/src/middleware/) |
| 라우트 | [`apps/job-dashboard/src/routes/`](apps/job-dashboard/src/routes/) |
| 프로필 이미지 | [`ProfileView.jpg`](ProfileView.jpg) |

---

## 변경 요약 (v1.40.11) / Changelog highlights

- 콘텐츠 SSoT(`packages/data`)를 단일 진실 공급원으로 유지하면서 포트폴리오/이력서/PPTX/지원서 패키지를 자동 재생성
- `apps/job-dashboard`의 큐 컨슈머/라우터/관리자 라우트 분리, 미들웨어(`cors`/`csrf`/`rate-limit`) 일원화
- 대시보드 D1 마이그레이션(`migrate-json-to-d1.cjs`) 및 스키마(`schema.sql`) 안정화
- Docker 멀티스테이지 이미지로 잡 서버 운영 배포 단순화
- TA 프로필 생성 파이프라인(`ta/inspect.py`, `ta/improve_visual.py`, `ta/verify.py`) 정비

---

## 라이선스 / License

사설(private) 워크스페이스입니다. [`LICENSE`](LICENSE) 파일의 조건을 따릅니다.

This is a private workspace. Use is governed by the terms in [`LICENSE`](LICENSE).