# 포트폴리오 자동화 워크스페이스 / Portfolio Automation Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript strict](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

개인 포트폴리오 사이트, 채용 자동화 런타임, 단일 진실 공급원(SSoT) 콘텐츠 레이어, 운영 대시보드와 관측 기능을 한 워크스페이스로 묶은 사설 자동화 프로젝트입니다.

A private automation workspace that combines a personal portfolio site, job-automation runtimes, a Single Source of Truth (SSoT) content layer, and an operations dashboard with built-in observability.

---

## 빠른 스캔 / Quick Scan

| 항목 / Item | 값 / Value |
| --- | --- |
| 제품 정체성 / Product | Portfolio + job-automation workspace (personal, private) |
| 현재 버전 / Version | `1.40.11` ([package.json](package.json)) |
| 런타임 / Runtime | Node.js 22 Alpine ([Dockerfile](Dockerfile)) |
| 엣지 배포 / Edge runtime | Cloudflare Workers ([wrangler.jsonc](wrangler.jsonc), [apps/job-dashboard](apps/job-dashboard/)) |
| 데이터 레이어 / Data layer | `packages/data` SSoT → PDF / PPTX / dashboard |
| 라이선스 / License | Private (see [LICENSE](LICENSE)) |
| 배포 권한 / Deploy authority | Cloudflare Workers Builds (CI release job) |
| 상태 / Status | Active development (see [CHANGELOG.md](CHANGELOG.md)) |
| 지원 채널 / Support | See [Maintainers](#maintainers--유지보수-담당자) |

### 워크스페이스가 한 번에 하는 일 / One-glance flow

1. `packages/data/resumes/master/resume_data.json`(단일 진실 공급원)에서 이력·스킬·프로필 콘텐츠를 한 번 정의합니다.
   Author resume, skill, and profile content once in the SSoT file under `packages/data`.
2. `npm run sync:all`로 PDF, PPTX, 동기화된 데이터 산출물을 생성합니다.
   Run `npm run sync:all` to generate the synchronized PDF, PPTX, and data artifacts.
3. `npm run build`로 Cloudflare Worker 번들(`apps/portfolio/worker.js`)을 만들거나 `apps/job-dashboard`를 엣지에 푸시합니다.
   Build the Cloudflare Worker bundle for the portfolio or push the dashboard worker.
4. 운영자는 `docker compose up`로 `job-server` MCP 런타임을 띄우거나 `wrangler` 명령으로 대시보드 엣지를 배포합니다.
   Operators either launch the `job-server` MCP runtime via `docker compose up` or deploy the dashboard edge via `wrangler`.

---

## 목차 / Table of Contents

- [개요 / Overview](#개요--overview)
- [주요 기능 / Features](#주요-기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [진입점과 API 표면 / Entry Points and API Surface](#진입점과-api-표면--entry-points-and-api-surface)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [기여 / Contributing](#기여--contributing)
- [유지보수 담당자 / Maintainers](#maintainers--유지보수-담당자)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

---

## 개요 / Overview

`package.json`의 `description` 필드가 이 워크스페이스의 정체성을 정의합니다.

> Portfolio automation workspace: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability

핵심 가치 / Core values:

- **SSoT 우선 / SSoT-first** — 이력·프로필·스킬은 [`packages/data`](packages/data/)에서 한 번 정의되고 PDF, PPTX, 포트폴리오, 대시보드로 자동 동기화됩니다.
- **엣지 포트폴리오 / Edge-first portfolio** — [`apps/portfolio`](apps/portfolio/)는 Cloudflare Worker에서 SSR/라우팅을 수행하며 `worker.js`는 빌드 산출물입니다.
- **채용 자동화 런타임 / Job automation runtime** — [`apps/job-server`](apps/job-server/)는 MCP 서버, 크롤러, 자동 지원 스크립트, 플랫폼 클라이언트를 제공합니다.
- **운영 대시보드 / Operations dashboard** — [`apps/job-dashboard`](apps/job-dashboard/)는 Cloudflare Worker 위에서 fetch/queue/scheduled 흐름과 마이그레이션을 운영합니다.
- **관측 가능성 / Observability** — 자체 호스팅 로그/메트릭, 1Password 기반 시크릿 운영, 헬스체크가 포함됩니다.

### 대상 사용자 / Intended Users

- 본인 운영자(워크스페이스 오너): 콘텐츠 갱신, 자동화 실행, 채용 관측.
- 검토자/리크루터: `applications/<role>/`에 모인 역할별 이력서·자기소개서·HTML 미리보기·가이드.
- 외부 협업 시 컨트리뷰터: 패키지 경계를 존중하는 변경만 허용.

---

## 주요 기능 / Features

| 영역 / Area | 기능 / Feature | 위치 / Location |
| --- | --- | --- |
| 포트폴리오 / Portfolio | Cloudflare Worker 기반 정적/동적 렌더링, SEO 메타, OG 태그, 이미지 EXIF 제거 스크립트 | [`apps/portfolio/`](apps/portfolio/) |
| 채용 자동화 / Job automation | Wanted/JobKorea 크롤러, 자동 지원 파이프라인, 후속 검토 CLI | [`apps/job-server/src/`](apps/job-server/src/) |
| 운영 대시보드 / Dashboard | Worker fetch + 큐 컨슈머 + 예약 핸들러, CORS/CSRF/레이트리미트, D1 마이그레이션 | [`apps/job-dashboard/src/`](apps/job-dashboard/src/) |
| 콘텐츠 SSoT / Content SSoT | 마스터 이력 JSON, PDF·PPTX 생성 입력, 검증 스키마 | [`packages/data/`](packages/data/) |
| 도메인 타입 / Domain types | JSDoc/TS 공유 타입, Zod 런타임 스키마 | [`packages/types/`](packages/types/), [`packages/schemas/`](packages/schemas/) |
| 계약 / Contracts | OpenAPI 스펙, Worker 환경 변수 계약 | [`packages/contracts/`](packages/contracts/) |
| 공유 유틸 / Shared utilities | 에러, 로거, 재시도, 암호화, 레이트리미트, 인증, 브라우저, 클라이언트 | [`packages/shared/`](packages/shared/) |
| CLI / Operator CLI | `resume` 운영 CLI | [`packages/cli/`](packages/cli/) |
| 환경 검증 / Env validation | 런타임 환경 변수 검증 | [`packages/env/`](packages/env/) |
| TA 산출물 / TA artifacts | PPTX 프로필 빌드/검증/시각화 스크립트 | [`ta/`](ta/) |
| 역할별 지원 패키지 / Application packets | 회사·직무 단위 이력서, 자기소개서, HTML 미리보기 | [`applications/`](applications/) |
| 컨테이너 / Container | 멀티 스테이지 Node 22 Alpine 빌드, 헬스체크 포함 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |

---

## 아키텍처 / Architecture

### 상위 구성 / Top-level Layout

| 계층 / Layer | 책임 / Responsibility | 대표 모듈 / Representative modules |
| --- | --- | --- |
| Edge | Cloudflare Worker 포트폴리오/대시보드 | `apps/portfolio/entry.js`, `apps/job-dashboard/src/index.js` |
| Runtime | Node 22 MCP/잡 자동화 서버 | `apps/job-server/src/index.js`, `apps/job-server/src/server/index.js` |
| Package library | 공유 타입·스키마·계약·유틸·CLI·env | `packages/*` |
| Content SSoT | 마스터 이력·프로필 데이터 | `packages/data/resumes/master/resume_data.json` |
| Build/Sync tools | 동기화, PDF, PPTX, 검증 스크립트 | `tools/scripts/`, `sync:*` npm scripts |
| Operations | Docker compose, 헬스체크, 1Password 시크릿 | `docker-compose.yml`, `tools/scripts/onepassword/` |

### 요청 흐름 / Request Flow

| 단계 / Step | 동작 / Action | 비고 / Note |
| --- | --- | --- |
| 1 | 방문자가 Cloudflare 엣지에 GET 요청 전달 | 포트폴리오 페이지는 `apps/portfolio/entry.js`의 라우터가 처리 |
| 2 | 같은 Worker 안에서 `/job/*` 경로는 대시보드 핸들러로 위임 | 동일 엣지 프로세스 안에서의 라우팅 |
| 3 | `apps/job-dashboard/src/index.js`가 `fetch`, `queue`, `scheduled` 핸들러 디스패치 | 큐 컨슈머는 `src/queue-consumer.js` |
| 4 | 라우터/미들웨어가 인증·CORS·CSRF·레이트리미트 적용 | `apps/job-dashboard/src/middleware/` |
| 5 | 라우트 핸들러가 D1/CRUD/승인 흐름 수행 | `apps/job-dashboard/src/routes/`, `migrations/` |
| 6 | 로컬 운영자는 `job-server`(MCP/크롤러/스크립트)와 Docker compose로 상호작용 | 컨테이너 헬스엔드포인트 `GET /health` |
| 7 | 모든 콘텐츠는 `packages/data`의 SSoT에서 `sync:*` 스크립트로 PDF/PPTX/JSON에 반영 | 변경 후 `npm run sync:all` 권장 |

### 데이터 흐름 / Data Flow

| 출발 / Source | 변환 / Transform | 도착 / Destination |
| --- | --- | --- |
| `packages/data/resumes/master/resume_data.json` | `tools/scripts/build/generate_shinhan_pptx.py` | 역할별 PPTX, [`ta/output`](ta/output) |
| 동일 JSON | `tools/scripts/build/pdf-generator.go` | 역할별 PDF (예: `applications/<role>/*.pdf`) |
| 동일 JSON | `node tools/scripts/utils/sync-resume-data.js` | 동기화된 JSON, 포트폴리오/대시보드 입력 |
| 동일 JSON | `apps/portfolio` 빌드 | 엣지에 배포되는 `worker.js` |
| 자동화 런타임 로그 | `apps/job-server` → D1 (대시보드) | 운영 대시보드 위젯과 큐 검토 |

### 빌드/배포 토폴로지 / Build & Deploy Topology

| 스테이지 / Stage | 도구 / Tool | 산출물 / Artifact |
| --- | --- | --- |
| 데이터 동기화 | `tools/scripts/utils/sync-resume-data.js` | 동기화된 JSON |
| PDF 빌드 | `tools/scripts/build/pdf-generator.go` (Go) | `applications/<role>/*.pdf` |
| PPTX 빌드 | `tools/scripts/build/generate_shinhan_pptx.py` (Python) | `ta/output/*.pptx` |
| Worker 번들링 | `generate-worker.js` (apps/portfolio) | `apps/portfolio/worker.js` (수정 금지) |
| Worker 검증 | `wrangler` + `playwright` + `eslint` + `tsc --noEmit` + `jest` | PR 체크 통과 |
| 컨테이너 빌드 | `Dockerfile` 멀티 스테이지 | `resume-mcp-server` 이미지 |
| 운영 배포 | `wrangler deploy` 또는 Cloudflare Workers Builds | 엣지 사이트/대시보드 |

---

## 저장소 구조 / Repository Structure

본 섹션은 저장소 상단의 실제 트리 구조를 반영합니다.

```text
.
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── LICENSE
├── OWNERS
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
├── ta/                                # PPTX 프로필 빌드/검증/시각화
│   ├── improve_visual.py
│   ├── inspect.py
│   ├── verify.py
│   ├── *.pptx
│   └── output/
├── applications/                     # 역할별 지원 패키지(회사·직무 단위)
│   ├── airpremia-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── cloudflare-one-se-2026/
│   ├── openai-codex-korea-2026/
│   ├── gitlab-apac-security-2026/
│   └── security-ir-2026/
└── apps/
    └── job-dashboard/                # Cloudflare Worker 대시보드
        ├── API_REFERENCE.md
        ├── DEPLOYMENT_GUIDE.md
        ├── DEVELOPMENT_GUIDE.md
        ├── DIAGRAMS.md
        ├── OWNERS
        ├── README.md
        ├── SECRETS.md
        ├── schema.sql
        ├── migrate-json-to-d1.cjs
        ├── migration-data.sql
        ├── migrations/
        │   ├── 0002_add_approval_metadata.sql
        │   └── 0003_add_auto_apply_application_metadata.sql
        └── src/
            ├── index.js
            ├── queue-consumer.js
            ├── router.js
            ├── middleware/
            │   ├── cors.js
            │   ├── csrf.js
            │   └── rate-limit.test.js
            └── routes/
                ├── admin.js
                └── applications.js
```

> 참고 / Note: 전체 워크스페이스에는 위 외에도 `apps/portfolio/`, `apps/job-server/`, `packages/{cli,data,env,shared,types,schemas,contracts}/`, `tools/scripts/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/`가 포함됩니다. 자세한 트리는 [`AGENTS.md`](AGENTS.md)의 STRUCTURE 섹션을 참조하세요.

---

## 진입점과 API 표면 / Entry Points and API Surface

| 진입점 / Entry | 종류 / Kind | 위치 / Location | 역할 / Role |
| --- | --- | --- | --- |
| `apps/portfolio/entry.js` | Cloudflare Worker fetch handler | `apps/portfolio/` | 통합 엣지 라우터 (포트폴리오 + `/job/*` 위임) |
| `apps/portfolio/worker.js` | Build artifact (생성물) | `apps/portfolio/` | `generate-worker.js`로 빌드, 직접 수정 금지 |
| `apps/job-server/src/index.js` | Node MCP bootstrap | `apps/job-server/src/` | 잡 자동화 런타임 부트스트랩 |
| `apps/job-server/src/server/index.js` | Node/Fastify server | `apps/job-server/src/server/` | 대시보드/서버 사이드 잡 자동화 HTTP API |
| `apps/job-dashboard/src/index.js` | Worker `fetch`/`queue`/`scheduled` | `apps/job-dashboard/src/` | 대시보드 요청/큐/예약 오케스트레이션 |
| `apps/job-dashboard/src/queue-consumer.js` | Queue consumer | `apps/job-dashboard/src/` | 비동기 잡 처리 |
| `apps/job-dashboard/src/router.js` | Request router | `apps/job-dashboard/src/` | 미들웨어/라우트 디스패치 |
| `apps/job-dashboard/src/middleware/{cors,csrf}.js` | Middleware | `apps/job-dashboard/src/middleware/` | CORS, CSRF 보호 |
| `apps/job-dashboard/src/routes/{admin,applications}.js` | Routes | `apps/job-dashboard/src/routes/` | 관리자/지원 흐름 API |
| `apps/job-dashboard/DEPLOYMENT_GUIDE.md` | Docs | `apps/job-dashboard/` | 엣지 배포 절차 |
| `apps/job-dashboard/API_REFERENCE.md` | Docs | `apps/job-dashboard/` | 라우트/스키마 레퍼런스 |
| `Dockerfile` HEALTHCHECK → `GET /health` | Health probe | 컨테이너 | `127.0.0.1:3000/health`에서 200을 기대 |

| 외부 노출 엔드포인트 / External endpoint | 위치 / Source | 비고 / Note |
| --- | --- | --- |
| 포트폴리오 사이트 루트 | `apps/portfolio/entry.js` | Cloudflare Workers Builds가 배포 |
| 대시보드 라우트 | `apps/job-dashboard/src/router.js` | 별도 Worker 또는 동일 Worker의 `/job/*` |
| MCP/잡 자동화 HTTP | `apps/job-server/src/server/index.js` | Docker compose로 노출 (포트 `3000`) |

---

## 빠른 시작 / Quick Start

> 워크스페이스 루트에서 실행 / Run all commands from the repository root.

### 1. 사본 준비 / Get a Copy

```bash
git clone <repository-url> resume
cd resume
```

### 2. 의존성 설치 / Install Dependencies

```bash
npm ci
```

### 3. 시크릿 준비 / Prepare Secrets

- 1Password CLI 기반 시크릿 운영은 [`tools/scripts/onepassword/`](tools/scripts/onepassword/)을 참고하세요.
- 로컬 세션 마이그레이션이 필요하면 `npm run op:seed:sessions` 및 `npm run op:restore:sessions`를 사용하세요.
- 운영 변수는 [`packages/env`](packages/env/)의 검증 스키마로 강제됩니다.

### 4. 콘텐츠 동기화 / Sync Content from SSoT

```bash
npm run sync:all
```

이 명령은 데이터 동기화(`sync:data`), PDF 생성(`sync:pdf`), PPTX 생성(`sync:pptx`)을 순차 실행합니다.

### 5. 로컬 실행 옵션 / Run Locally (pick one)

| 시나리오 / Scenario | 명령 / Command | 결과 / Result |
| --- | --- | --- |
| 컨테이너로 잡 자동화 런타임 띄우기 | `docker compose up --build` | `http://127.0.0.1:3000` (헬스체크 동일 호스트) |
| 포트폴리오 Worker 로컬 미리보기 | `cd apps/portfolio && wrangler dev` | 로컬 엣지 시뮬레이션 |
| 대시보드 Worker 로컬 미리보기 | `cd apps/job-dashboard && wrangler dev` | 로컬 대시보드 |
| PPTX TA 산출물 재생성 | `cd ta && python3 improve_visual.py && python3 verify.py` | `ta/output/*` 갱신 |

### 6. 검증 / Validate

```bash
npm run lint
npm run typecheck
npm run test
npm run e2e
```

> ✅ 처음 끝까지 성공하면 워크스페이스는 동작 가능 상태입니다.

---

## 설정 / Configuration

| 설정 영역 / Area | 위치 / Location | 비고 / Note |
| --- | --- | --- |
| 루트 의존성 / workspaces | [`package.json`](package.json) `workspaces` | `apps/{portfolio,job-server,job-dashboard}`, `packages/*` |
| 타입스크립트 / TypeScript | [`tsconfig.base.json`](tsconfig.base.json), [`tsconfig.json`](tsconfig.json) | strict 모드 |
| ESLint | [`eslint.config.cjs`](eslint.config.cjs) | flat config |
| Wrangler(엣지) | [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 설정 |
| OpenAPI linting | [`redocly.yaml`](redocly.yaml) | API 스펙 품질 규칙 |
| 링크 검사 | [`lychee.toml`](lychee.toml) | 마크다운 링크 유효성 검사 |
| 테스트(Jest/Playwright) | [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js) | Jest는 단위/통합, Playwright는 e2e |
| Docker 이미지 | [`Dockerfile`](Dockerfile) | `node:22-alpine` 멀티 스테이지 |
| Docker compose | [`docker-compose.yml`](docker-compose.yml) | 단일 서비스 `mcp-server` |
| 런타임 환경 변수 | [`packages/env`](packages/env/) | 검증 스키마 통과 필수 |
| 시크릿 운영 | [`tools/scripts/onepassword/`](tools/scripts/onepassword/), `npm run op:*` | 로컬 1Password 기반 |

---

## 명령어 레퍼런스 / Commands Reference

루트 [`package.json`](package.json)의 `scripts`를 한 곳에 정리한 표입니다. 실행은 모두 워크스페이스 루트에서 수행합니다.

| 명령 / Command | 카테고리 / Category | 목적 / Purpose |
| --- | --- | --- |
| `npm run strip-exif` | 미디어 / Media | `apps/portfolio/src/images/*.png\|*.webp`의 EXIF 일괄 제거 (도구 미설치 시 경고 후 통과) |
| `npm run sync:data` | 데이터 / Data | `tools/scripts/utils/sync-resume-data.js`로 콘텐츠 JSON 동기화 |
| `npm run sync:pptx` | 빌드 / Build | 신한 PPTX 생성 (Python) |
| `npm run sync:pdf` | 빌드 / Build | 마스터 PDF 생성 (Go) |
| `npm run sync:all` | 빌드 / Build | `sync:data → sync:pdf → sync:pptx` 순차 실행 |
| `npm run op:run` / `op:native:run` | 시크릿 / Secrets | 1Password CLI 통합 러너 |
| `npm run op:seed:resume` | 시크릿 / Secrets | 이력서 시드 |
| `npm run op:seed:sessions` / `op:restore:sessions` | 시크릿 / Secrets | 로컬 세션 마이그레이션 |
| `npm run sync:proposals` | 자동화 / Automation | 제안 동기화 CLI + Go 어플라이어 |
| `npm run enrich:github` / `enrich:skills` / `enrich:ai` / `enrich:all` | 자동화 / Automation | GitHub/스킬/AI enrich |
| `npm run automate:ssot` | 자동화 / Automation | `sync:data + sync:pdf + build + typecheck + test:node` |
| `npm run automate:full` | 자동화 / Automation | `sync:all + lint + ...` 전체 파이프라인 |

| 외부 도구 / External tool | 사용 위치 / Where | 명령 / Command | 목적 / Purpose |
| --- | --- | --- | --- |
| `wrangler` | `apps/portfolio/`, `apps/job-dashboard/` | `wrangler dev` / `wrangler deploy` | Cloudflare Worker 로컬/배포 |
| `docker compose` | 루트 / root | `docker compose up --build` | `mcp-server` 기동 |
| `playwright` | 루트 / root | `npm run e2e` | 엔드 투 엔드 회귀 |
| `exiftool` | 루트 / root | `npm run strip-exif` (자동 호출) | 이미지 메타데이터 정리 |

---

## 로컬 개발 / Local Development

| 영역 / Area | 절차 / Procedure | 참고 문서 / Reference |
| --- | --- | --- |
| 포트폴리오 | `entry.js`, HTML, `src/`, `lib/` 수정 후 `wrangler dev` | [`apps/portfolio/`](apps/portfolio/) |
| 대시보드 | `src/index.js`, 미들웨어, 라우트, 마이그레이션 작업 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md), [`apps/job-dashboard/AGENTS.md`](apps/job-dashboard/AGENTS.md) |
| 잡 자동화 | `apps/job-server/src/` 안의 MCP/크롤러/스크립트 | [`apps/job-server/`](apps/job-server/) |
| 콘텐츠 갱신 | `packages/data/resumes/master/resume_data.json` 편집 → `npm run sync:all` | [`packages/data/`](packages/data/) |
| PPTX TA | `ta/improve_visual.py`, `ta/inspect.py`, `ta/verify.py` | [`ta/AGENTS.md`](ta/AGENTS.md) |
| 시크릿 | 1Password CLI로 시드/복원 | [`tools/scripts/onepassword/`](tools/scripts/onepassword/), [`docs/security/`](docs/security/) |

### 코드 스타일 가드 / Code Style Guards

- 200 LOC 규칙(요약): [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)
- 마크다운 링크 검사: [`lychee.toml`](lychee.toml), `lychee` 실행
- API 스펙: [`packages/contracts/`](packages/contracts/), [`redocly.yaml`](redocly.yaml)

---

## 테스트 / Testing

| 스위트 / Suite | 도구 / Tool | 위치 / Location | 권장 명령 / Command |
| --- | --- | --- | --- |
| 단위 / Unit | Jest | [`jest.config.cjs`](jest.config.cjs) | `npm run test` |
| 노드 통합 / Node integration | Jest (Node preset) | [`tests/`](tests/) | `npm run test:node` |
| 엔드 투 엔드 / End-to-end | Playwright | [`playwright.config.js`](playwright.config.js) | `npm run e2e` |
| 링크 / Link check | lychee | [`lychee.toml`](lychee.toml) | `lychee` |
| API 컨트랙트 / API contract | Redocly CLI | [`redocly.yaml`](redocly.yaml) | `redocly lint` (스펙 파일 기준) |
| 타입 / Types | TypeScript | [`tsconfig.base.json`](tsconfig.base.json) | `npm run typecheck` |
| 마이그레이션 / Migrations | D1 SQL | [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/), [`migration-data.sql`](apps/job-dashboard/migration-data.sql) | 워커 별 배포 절차에 따라 적용 |

> 테스트 작성 시 패키지 경계를 넘는 mock은 [`packages/shared/`](packages/shared/)의 클라이언트를 사용하세요.

---

## 배포 / Deployment

| 컴포넌트 / Component | 타깃 / Target | 진입 명령 / Entry command | 문서 / Docs |
| --- | --- | --- | --- |
| 포트폴리오 Worker | Cloudflare Workers | Cloudflare Workers Builds(`wrangler.jsonc`) | [`apps/portfolio/`](apps/portfolio/) |
| 대시보드 Worker | Cloudflare Workers | 동일 빌드 시스템 또는 `wrangler deploy` | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 잡 자동화 런타임 | 컨테이너/Docker host | `docker compose up -d` | [`docker-compose.yml`](docker-compose.yml) |
| 시크릿 | 1Password → 런타임 env | `npm run op:run` / `op:native:run` | [`tools/scripts/onepassword/`](tools/scripts/onepassword/) |
| D1 마이그레이션 | Cloudflare D1 | `migrate-json-to-d1.cjs`, `apps/job-dashboard/migrations/0002_*`, `0003_*` | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 헬스체크 / Health | 컨테이너 HEALTHCHECK | `GET /health` (`3000` 포트) | [`Dockerfile`](Dockerfile) |

### 배포 전 체크리스트 / Pre-deploy Checklist

- [ ] `npm run sync:all`로 PDF/PPTX/JSON 동기화
- [ ] `npm run typecheck`, `npm run test`, `npm run e2e` 통과
- [ ] `lychee`, `redocly lint` 링크/스펙 검사 통과
- [ ] `wrangler.jsonc` 환경 변수와 [`packages/env`](packages/env/) 검증 스키마 일치 확인
- [ ] D1 마이그레이션이 적용 대상 환경과 일치하는지 확인

---

## 기여 / Contributing

기여 절차는 [`CONTRIBUTING.md`](CONTRIBUTING.md)와 [`AGENTS.md`](AGENTS.md)에 정리되어 있습니다.

- 변경은 워크스페이스 단위 PR로 제출합니다.
- 패키지 경계를 넘는 변경은 [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)를 우선합니다.
- 새 패키지/앱을 추가하면 루트 `package.json`의 `workspaces`에 등록하고 [`Dockerfile`](Dockerfile)의 `COPY` 단계도 갱신합니다.
- 역할별 지원 패키지는 [`applications/`](applications/) 아래 회사/직무 폴더로 추가합니다.
- 콘텐츠는 SSoT(마스터 JSON)에서 한 번만 편집하고 `sync:*` 스크립트로 산출물을 재생성합니다.

---

## Maintainers / 유지보수 담당자

| 역할 / Role | 책임 영역 / Responsibility | 참조 / Reference |
| --- | --- | --- |
| Workspace owner | 전체 자동화 파이프라인, 콘텐츠 SSoT, 배포 권한 | [`OWNERS`](OWNERS), [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) |
| Portfolio owner | `apps/portfolio/` 런타임/렌더링 | [`apps/portfolio/`](apps/portfolio/) |
| Dashboard owner | `apps/job-dashboard/` 라우트/마이그레이션 | [`apps/job-dashboard/`](apps/job-dashboard/) |
| Job-server owner | MCP/크롤러/스크립트 | [`apps/job-server/`](apps/job-server/) |
| TA owner | PPTX 프로필 빌드/검증 | [`ta/AGENTS.md`](ta/AGENTS.md) |
| Applications owner | 역할별 지원 패키지 | [`applications/`](applications/) |

지원/문의 채널 / Support channels:

- 운영 이슈: 워크스페이스 오너에게 직접(공개 채널 없음, 사설 저장소).
- 외부 협업 가이드: [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 추가 문서 / Further Documentation

| 문서 / Document | 위치 / Location | 설명 / Description |
| --- | --- | --- |
| 프로젝트 지식 베이스 | [`AGENTS.md`](AGENTS.md) | 파일 → 책임 매핑, where-to-look 표 |
| 패키지/앱 가이드 | [`apps/`](apps/), [`packages/`](packages/) 하위 `AGENTS.md` | 각 워크스페이스 구성원의 로컬 규칙 |
| 대시보드 API/배포/시크rets | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md), [`DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md), [`SECRETS.md`](apps/job-dashboard/SECRETS.md) | 대시보드 운영의 단일 진실 |
| 디자인 가이드 | [`applications/DESIGN.md`](applications/DESIGN.md) | 지원 패키지 디자인 규칙 |
| 역할별 지원 가이드 | [`applications/<role>/application-guide.md`](applications/) | 회사·직무별 절차 |
| 변경 로그 | [`CHANGELOG.md`](CHANGELOG.md) | 릴리스 노트 |
| 컨벤션 | [`docs/conventions/`](docs/conventions/) | 코딩 컨벤션·아키텍처 규칙 |
| 보안 | [`docs/security/`](docs/security/) | 시크릿/감사 정책 |
| ADR | [`docs/adr/`](docs/adr/) | 아키텍처 결정 기록 |
| 인프라 | [`infrastructure/`](infrastructure/) | Cloudflare/DB/모니터링 설정 |

---

## 라이선스 / License

이 저장소는 사설이며 [`LICENSE`](LICENSE) 파일에 명시된 조건 하에서만 사용할 수 있습니다.

This repository is private and may only be used under the terms stated in [`LICENSE`](LICENSE).