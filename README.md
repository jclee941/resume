# 포트폴리오 자동화 워크스페이스 / Portfolio Automation Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)
[![ESLint](https://img.shields.io/badge/eslint-configured-4b32c3.svg)](eslint.config.cjs)
[![Playwright](https://img.shields.io/badge/playwright-e2e-2ead33.svg)](playwright.config.js)
[![ReDocly](https://img.shields.io/badge/redocly-api--lint-blue.svg)](redocly.yaml)

## 한 줄 요약 / One-line summary

개인 포트폴리오 사이트, 채용 자동화, 단일 진실 공급원(SSoT) 데이터, 그리고 운영 대시보드를 하나의 워크스페이스로 통합한 사설 코드베이스입니다.

A private workspace that unifies a personal portfolio site, job-automation tooling, a Single Source of Truth (SSoT) data layer, and an operations dashboard under one versioned codebase.

---

## 상태 / Status

| 항목 / Item | 값 / Value | 출처 / Source |
| --- | --- | --- |
| 버전 / Version | `1.40.11` | [`package.json`](package.json) |
| 라이선스 / License | Private | [`LICENSE`](LICENSE) |
| Node 런타임 / Node runtime | `22-alpine` | [`Dockerfile`](Dockerfile) |
| 언어 정책 / Language policy | TypeScript strict, JSDoc, Go scripts | [`tsconfig.base.json`](tsconfig.base.json) |
| 린트 / Lint | ESLint flat config | [`eslint.config.cjs`](eslint.config.cjs) |
| 테스트 / Testing | Jest + Playwright | [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js) |
| API 컨트랙트 / API contracts | OpenAPI via ReDocly | [`redocly.yaml`](redocly.yaml) |
| 엣지 배포 / Edge deploy | Cloudflare Worker | [`wrangler.jsonc`](wrangler.jsonc) |
| 컨테이너 / Container | Docker Compose (`mcp-server`) | [`docker-compose.yml`](docker-compose.yml) |
| 헬스체크 / Health check | `GET /health` → 200 OK | [`Dockerfile`](Dockerfile) |

운영 준비도 / Production readiness: 로컬·엣지 워커 단독 실행은 가능하며, 배포는 Cloudflare Workers Builds가 권한을 가집니다.

---

## 실행 흐름 요약 / Runtime flow at a glance

| 단계 / Step | 동작 / Action | 위치 / Location |
| --- | --- | --- |
| 1. SSoT 데이터 동기화 | `sync:data` → `sync:pdf` → `sync:pptx` | [`packages/data/`](packages/data), [`tools/scripts/`](tools/scripts) |
| 2. 정적 사이트 빌드 | `apps/portfolio/generate-worker.js`로 `worker.js` 생성 | [`apps/portfolio/`](apps/portfolio) |
| 3. 엣지 라우팅 | Cloudflare Worker가 `/`와 `/job/*` 라우트 처리 | [`apps/portfolio/entry.js`](apps/portfolio/entry.js) |
| 4. 채용 자동화 | MCP 서버가 Wanted/JobKorea 크롤러·자동 지원 실행 | [`apps/job-server/`](apps/job-server) |
| 5. 대시보드 API | Worker fetch / queue / scheduled 핸들러로 운영 데이터 노출 | [`apps/job-dashboard/`](apps/job-dashboard) |
| 6. 운영 대시보드 | D1 + Workers Queues 기반 승인/자동화 워크플로 | [`apps/job-dashboard/`](apps/job-dashboard) |
| 7. 시크릿 / 구성 | 1Password CLI로 시크릿 시드 및 세션 복원 | [`tools/scripts/onepassword/`](tools/scripts/onepassword) |

소유자 / Owner: [`OWNERS`](OWNERS). 변경 이력 / Change log: [`CHANGELOG.md`](CHANGELOG.md).

---

## 목차 / Table of Contents

- [목적 / Purpose](#목적--purpose)
- [구성 요소 / Package Contents](#구성-요소--package-contents)
- [첫 번째로 읽을 파일 / First Files to Read](#첫-번째로-읽을-파일--first-files-to-read)
- [진입점 / Entry Points](#진입점--entry-points)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [기여 / Contribution](#기여--contribution)
- [유지보수 / Maintainers](#유지보수--maintainers)
- [라이선스 / License](#라이선스--license)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)

---

## 목적 / Purpose

이 워크스페이스는 한 사람의 이력·프로필·스킬·지원 활동을 한 곳에서 정의하고, 그 데이터를 포트폴리오 사이트, 이력서 PDF, PPTX, 운영 대시보드, 그리고 채용 자동화로 자동 전파하기 위한 통합 환경입니다.

Who uses it: 단일 운영자(개인 포트폴리오 + 채용 자동화 운영자)가 사용합니다. 다른 사용자가 직접 인스턴스를 띄우기보다는, 결과물(공개 포트폴리오, 이력서 산출물, 지원 기록)을 소비합니다.

What users can do with it:

- `packages/data`의 SSoT 한 번 수정으로 사이트·PDF·PPTX를 동시에 갱신합니다.
- Cloudflare Worker 엣지에서 포트폴리오와 인-프로세스 대시보드 라우트를 함께 제공합니다.
- MCP 서버(`apps/job-server`)에서 Wanted/JobKorea 크롤링과 자동 지원을 실행합니다.
- Worker Queues 기반 대시보드(`apps/job-dashboard`)에서 승인 메타데이터와 자동화 워크플로를 추적합니다.
- 1Password CLI 통합으로 시크릿을 로컬에 안전하게 시드·복원합니다.

Production-ready 여부: 사설 워크스페이스이며, Cloudflare Workers Builds가 운영 배포 권한을 가집니다. 핵심 런타임(`job-server`)은 Docker로 컨테이너화되어 헬스체크와 자동 재시작을 지원합니다.

---

## 구성 요소 / Package Contents

### 앱 / Apps (`apps/`)

| 앱 / App | 역할 / Role | 진입점 / Entry | 산출물 / Output |
| --- | --- | --- | --- |
| [`portfolio`](apps/portfolio/) | Cloudflare Worker 엣지 사이트 + 인-프로세스 `/job/*` 라우트 | [`entry.js`](apps/portfolio/entry.js) | `worker.js` (생성됨) |
| [`job-server`](apps/job-server/) | MCP 서버, Wanted/JobKorea 크롤러, 자동 지원 스크립트 | [`src/index.js`](apps/job-server/src/index.js), [`src/server/index.js`](apps/job-server/src/server/index.js) | `.data/` 영속 볼륨 |
| [`job-dashboard`](apps/job-dashboard/) | 대시보드 Worker (fetch/queue/scheduled) + D1 마이그레이션 | [`src/index.js`](apps/job-dashboard/src/index.js) | Queues + D1 |

### 패키지 / Packages (`packages/`)

| 패키지 / Package | 역할 / Role |
| --- | --- |
| [`cli`](packages/cli/) | resume 운영자 CLI |
| [`data`](packages/data/) | 이력·프로필·지원 컨텐츠 SSoT |
| [`env`](packages/env/) | 런타임 환경 변수 검증 |
| [`shared`](packages/shared/) | 에러·로거·재시도·암호화·레이트리미트·인증·브라우저·클라이언트 |
| [`types`](packages/types/) | 정식 JSDoc/TS 도메인 타입 |
| [`schemas`](packages/schemas/) | Zod 런타임 스키마 |
| [`contracts`](packages/contracts/) | OpenAPI 스펙 + Worker 환경 변수 컨트랙트 |

### 보조 디렉터리 / Supporting directories

| 경로 / Path | 용도 / Purpose |
| --- | --- |
| [`applications/`](applications/) | 직무별 지원 패킷(커버레터, 이력서 변형, 미리보기, 실행 로그) |
| [`ta/`](ta/) | Python + PPTX 기반 TA 프로필 생성 (입력/출력 분리) |
| `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/` | CI/빌드/배포/검증, 테스트 스위트, 인프라 운영, ADRs·가이드, Deno 엣지 함수, 외부 의존성 |

---

## 첫 번째로 읽을 파일 / First Files to Read

| 우선순위 / Priority | 파일 / File | 이유 / Why |
| --- | --- | --- |
| 1 | [`package.json`](package.json) | 워크스페이스 정의, 스크립트 허브, 의존성 그래프 |
| 2 | [`apps/portfolio/entry.js`](apps/portfolio/entry.js) | 엣지 라우터와 인-프로세스 `/job/*` 진입점 |
| 3 | [`apps/job-server/src/index.js`](apps/job-server/src/index.js) | MCP 부트스트랩과 셧다운 처리 |
| 4 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | 대시보드 fetch/queue/scheduled 핸들러 |
| 5 | [`packages/data/`](packages/data/) | 모든 산출물의 단일 진실 공급원 |
| 6 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 전용 가이드(API, 배포, 비밀, 다이어그램) |
| 7 | [`AGENTS.md`](AGENTS.md) | 코드 맵과 “어디를 봐야 하는가” 표 |

도움이 더 필요하면: [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)(200 LOC 규칙, 명명 규칙, 스크립트 언어 정책)와 [`docs/security/`](docs/security/)(시크릿 로테이션, 1Password 마이그레이션)를 참조하세요.

---

## 진입점 / Entry Points

| 유형 / Type | 경로 / Path | 책임 / Responsibility |
| --- | --- | --- |
| Worker fetch | [`apps/portfolio/entry.js`](apps/portfolio/entry.js) | 포트폴리오 + `/job/*` 통합 라우터 |
| Worker 빌드 생성기 | [`apps/portfolio/generate-worker.js`](apps/portfolio/) | HTML/데이터/lib 모듈을 `worker.js`로 머지 |
| MCP 부트 | [`apps/job-server/src/index.js`](apps/job-server/src/index.js) | 작업 자동화 프로세스 시작·종료 |
| HTTP 서버 | [`apps/job-server/src/server/index.js`](apps/job-server/src/server/index.js) | Fastify 기반 대시보드/잡 자동화 API |
| Worker fetch/queue/scheduled | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | 대시보드 요청·큐·예약 오케스트레이션 |
| JSON→D1 마이그레이터 | [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs) | 레거시 JSON 데이터를 D1로 이전 |
| 운영자 CLI | [`packages/cli/`](packages/cli/) | 데이터 동기화, 검증, 점검 |
| Go 도구 | [`tools/scripts/`](tools/scripts/) | 빌드·동기화·배포·검증·보안 운영 |

API 컨트랙트: [`packages/contracts/`](packages/contracts/)의 OpenAPI 스펙과 Worker 환경 변수 정의를 참조하세요.

---

## 아키텍처 / Architecture

### 요청 흐름 / Request flow

1. **SSoT 동기화** — 운영자가 `npm run sync:data`로 `packages/data/`의 마스터 데이터를 최신화합니다.
2. **산출물 빌드** — `sync:pdf`와 `sync:pptx`로 PDF/PPTX를 재생성하고, `build`로 `apps/portfolio/worker.js`를 생성합니다.
3. **엣지 제공** — Cloudflare Worker가 `/` 경로의 정적 포트폴리오와 `/job/*` 라우트를 동일 프로세스에서 처리합니다.
4. **잡 자동화** — `job-server`의 MCP 엔트리에서 크롤러·자동 지원 스크립트가 실행되고, 결과를 `.data/` 영속 볼륨에 기록합니다.
5. **대시보드 운영** — `job-dashboard`의 fetch/queue/scheduled 핸들러가 D1 스키마(`schema.sql`, `migrations/`)와 Queues로 승인 메타데이터와 자동화 워크플로를 추적합니다.
6. **시크릿 로테이션** — 1Password CLI(`op:run`, `op:seed:*`)로 로컬 세션을 안전하게 시드·복원합니다.

### 런타임 표 / Runtime matrix

| 런타임 / Runtime | 역할 / Role | 트리거 / Trigger | 헬스체크 / Healthcheck |
| --- | --- | --- | --- |
| Cloudflare Worker (`apps/portfolio`) | 포트폴리오 + 인-프로세스 라우트 | HTTP 요청 | Worker 표준 |
| Cloudflare Worker (`apps/job-dashboard`) | 대시보드 + 큐/예약 | HTTP, Queue, Cron | Worker 표준 |
| Node MCP 서버 (`apps/job-server`) | 채용 자동화 + REST | Docker, npm 스크립트 | `GET /health` |
| Go 운영 도구 (`tools/scripts/`) | 동기화·빌드·검증·1Password | npm 스크립트 | N/A (단발성) |

### 워크스페이스 의존성 / Workspace dependencies

`package.json`의 `workspaces`는 `apps/{portfolio,job-server,job-dashboard}`와 `packages/{cli,data,shared,types,schemas,contracts,env}`를 등록합니다. 런타임 Docker 이미지는 `apps/job-server`가 필요로 하는 `@resume/{shared,schemas,types,data,env}`만 포함합니다.

### 운영 대시보드 인터페이스 / Operator-facing surface

| 표면 / Surface | 위치 / Location | 비고 / Notes |
| --- | --- | --- |
| API 레퍼런스 | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | 라우트, 요청/응답 |
| 배포 가이드 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | Wrangler + D1 + Queues |
| 비밀 관리 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 1Password 연동 |
| 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) | 큐/예약 흐름 |
| 스키마 | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`migrations/`](apps/job-dashboard/migrations/) | D1 진화 |

---

## 빠른 시작 / Quick Start

### 사전 요구 사항 / Prerequisites

| 요구 사항 / Requirement | 버전 / Version | 출처 / Source |
| --- | --- | --- |
| Node.js | 22 LTS | [`Dockerfile`](Dockerfile) |
| npm | 워크스페이스 잠금 일치 | [`package-lock.json`](package-lock.json) |
| Docker (선택 / optional) | Compose v2 | [`docker-compose.yml`](docker-compose.yml) |
| Wrangler (엣지 배포 시) | Cloudflare 호환 | [`wrangler.jsonc`](wrangler.jsonc) |
| 1Password CLI (운영 시) | `op` | [`tools/scripts/onepassword/`](tools/scripts/onepassword) |
| Python 3 (TA 산출물) | 시스템 기본 | [`ta/`](ta/) |
| Go (운영 도구) | 시스템 기본 | [`tools/scripts/`](tools/scripts) |

### 워크스페이스 설치 / Install the workspace

```bash
npm ci
```

### 로컬 포트폴리오 빌드 / Build the portfolio locally

```bash
npm run sync:data
npm run build         # apps/portfolio/worker.js 생성
```

### 로컬 MCP 서버 실행 (Docker) / Run the MCP server via Docker

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:3000/health
```

### 시크릿 시드 (운영자) / Seed secrets (operator)

```bash
npm run op:run
npm run op:seed:resume
npm run op:seed:sessions
```

### 지원 자동화 동기화 / Sync job automation

```bash
npm run sync:all         # data → pdf → pptx
npm run enrich:all       # github, skills, ai
npm run automate:ssot    # data → pdf → build → typecheck → test
```

---

## 설정 / Configuration

| 영역 / Area | 위치 / Location | 비고 / Notes |
| --- | --- | --- |
| 환경 변수 검증 | [`packages/env/`](packages/env/) | Zod 기반 런타임 검증 |
| Worker 환경 컨트랙트 | [`packages/contracts/`](packages/contracts/) | OpenAPI + Worker env |
| 포트폴리오 라우터/번들 | [`apps/portfolio/`](apps/portfolio/) | `entry.js` + HTML/lib 모듈 |
| 대시보드 D1 | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`migrations/`](apps/job-dashboard/migrations/) | 마이그레이션은 순서대로 적용 |
| Docker 런타임 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) | `PORT=3000`, `job_automation_data` 볼륨 |
| 1Password | [`tools/scripts/onepassword/`](tools/scripts/onepassword/) | 시크릿 시드/복원/세션 |
| 데이터 SSoT | [`packages/data/`](packages/data/) | 모든 산출물의 진실 공급원 |

`Dockerfile`은 `NODE_ENV=production`, `PORT=3000`을 명시하고, `http://127.0.0.1:3000/health`로 헬스체크를 수행합니다. 모든 IP는 루프백이며 외부 네트워크에 노출되지 않습니다.

---

## 명령어 레퍼런스 / Commands Reference

| 카테고리 / Category | 명령어 / Command | 설명 / Description |
| --- | --- | --- |
| 데이터 동기화 / Data sync | `npm run sync:data` | `packages/data` 정규화 |
| | `npm run sync:pdf` | PDF 마스터 생성 (Go) |
| | `npm run sync:pptx` | PPTX 생성 (Python) |
| | `npm run sync:all` | data → pdf → pptx |
| 시크릿 / Secrets | `npm run op:run` | 1Password 메인 러너 |
| | `npm run op:native:run` | 네이티브 러너 |
| | `npm run op:seed:resume` | 이력서 시크릿 시드 |
| | `npm run op:seed:sessions` | 세션 시드 |
| | `npm run op:restore:sessions` | 세션 복원 |
| 보강 / Enrichment | `npm run enrich:github` | GitHub 프로필/기여 보강 |
| | `npm run enrich:skills` | 스킬 분류 보강 |
| | `npm run enrich:ai` | AI 기반 항목 보강 |
| | `npm run enrich:all` | 모든 보강 실행 |
| 지원 동기화 / Proposals | `npm run sync:proposals` | 제안 검토 CLI + 적용 (Go) |
| 자동화 파이프라인 / Pipelines | `npm run automate:ssot` | sync:data → pdf → build → typecheck → test |
| | `npm run automate:full` | sync:all → lint → test |
| 컨테이너 / Container | `docker compose up -d --build` | MCP 서버 기동 |
| 메타 / Meta | `npm run strip-exif` | 이미지 EXIF 정리 (선택) |

상세 옵션은 [`package.json`](package.json)의 `scripts` 섹션을 참조하세요.

---

## 로컬 개발 / Local Development

1. `npm ci`로 워크스페이스 의존성을 설치합니다.
2. `.env`(또는 `env_file`)에 필수 변수를 채우고 [`packages/env/`](packages/env/)가 통과시키는지 확인합니다.
3. `apps/portfolio/`에서 `entry.js`, HTML, `src/`, `lib/`를 수정한 뒤 `npm run build`로 `worker.js`를 재생성합니다. **`worker.js`는 생성물이므로 직접 수정하지 마세요.**
4. `apps/job-server/`에서 MCP 도구를 개발할 때는 [`apps/job-server/AGENTS.md`](apps/job-server/AGENTS.md)(트리에서 보이는 경우)의 규칙을 따릅니다.
5. `apps/job-dashboard/`에서 핸들러를 추가할 때는 [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)와 [`API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)를 함께 갱신합니다.
6. 새 도메인 타입은 [`packages/types/`](packages/types/)에, 런타임 검증은 [`packages/schemas/`](packages/schemas/)에 정의합니다.
7. 외부 클라이언트/유틸은 [`packages/shared/`](packages/shared/)에 추가합니다.
8. Go 운영 스크립트는 [`tools/scripts/`](tools/scripts/)에 둡니다(스크립트 언어 정책은 [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)).

---

## 테스트 / Testing

| 계층 / Layer | 도구 / Tool | 위치 / Location |
| --- | --- | --- |
| 단위 / Unit | Jest | [`jest.config.cjs`](jest.config.cjs), [`tests/`](tests/) |
| 노드 통합 / Node integration | Jest/Node | [`tests/`](tests/) |
| 엔드투엔드 / E2E | Playwright | [`playwright.config.js`](playwright.config.js), [`tests/e2e/`](tests/e2e/) |
| API 컨트랙트 / API contract | ReDocly | [`redocly.yaml`](redocly.yaml) |
| 타입 / Types | TypeScript strict | [`tsconfig.base.json`](tsconfig.base.json) |
| 헬스 / Health | Docker HEALTHCHECK | [`Dockerfile`](Dockerfile) |
| 링크 / Links | lychee | [`lychee.toml`](lychee.toml) |

권장 실행 시퀀스: `npm run typecheck` → `npm run lint` → `npm run test:node` → `npm run test:e2e` → `npm run automate:ssot`.

---

## 배포 / Deployment

- **엣지 / Edge**: Cloudflare Worker로 `apps/portfolio`와 `apps/job-dashboard`를 배포합니다. 구성은 [`wrangler.jsonc`](wrangler.jsonc)에 정의되어 있습니다. 운영 배포 권한은 Cloudflare Workers Builds가 가집니다.
- **컨테이너 / Container**: `apps/job-server`는 `docker compose up -d --build`로 띄우며, `job_automation_data` 볼륨이 `.data/`에 마운트됩니다.
- **데이터 / Data**: D1 마이그레이션은 [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql)와 [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/)를 순서대로 적용합니다. 레거시 JSON 데이터는 [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs)로 일회성 이전합니다.
- **시크릿 / Secrets**: 1Password CLI로 로컬 시드를, 운영 환경은 Workers Secrets/Doppler 등 외부 시크릿 매니저를 사용합니다.

상세 절차는 [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)와 [`SECRETS.md`](apps/job-dashboard/SECRETS.md)를 참조하세요.

---

## 기여 / Contribution

기여 절차는 [`CONTRIBUTING.md`](CONTRIBUTING.md)를 따릅니다. PR 전 체크리스트:

1. `npm run typecheck`와 `npm run lint`가 통과합니다.
2. 영향 범위에 맞는 테스트를 [`tests/`](tests/)에 추가·갱신합니다.
3. SSoT(데이터, 타입, 스키마, 컨트랙트) 변경 시 모든 산출물 재생성 영향도를 [`CHANGELOG.md`](CHANGELOG.md)에 기록합니다.
4. 운영 스크립트(Go) 변경 시 [`tools/scripts/`](tools/scripts/) 내부 가이드를 함께 갱신합니다.
5. 대시보드 변경 시 [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)와 [`DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md)를 동기화합니다.

행동 강령·라이선스: [`LICENSE`](LICENSE)(사설), [`OWNERS`](OWNERS).

---

## 유지보수 / Maintainers

| 역할 / Role | 담당 / Owner | 연락처 / Contact |
| --- | --- | --- |
| 코드 오너 / Code owner | [`OWNERS`](OWNERS) 참조 | 로컬 이슈 트래커 |

지원 채널: 저장소 이슈 트래커를 사용합니다. 외부 의존성(Cloudflare, 1Password, Docker)의 장애는 각 벤더 지원 채널을 우선합니다.

---

## 라이선스 / License

이 저장소는 사설이며 [`LICENSE`](LICENSE)의 조건을 따릅니다. 외부 배포나 재사용 전에 오너에게 문의하세요.

---

## 추가 문서 / Further Documentation

| 주제 / Topic | 위치 / Location |
| --- | --- |
| 코드 맵과 “어디를 봐야 하는가” | [`AGENTS.md`](AGENTS.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |
| 기여 절차 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 아키텍처 규칙 | [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md) |
| 보안 / 시크릿 운영 | [`docs/security/`](docs/security/), [`tools/scripts/onepassword/`](tools/scripts/onepassword/) |
| 대시보드 가이드 묶음 | [`apps/job-dashboard/`](apps/job-dashboard/) (`README.md`, `DEVELOPMENT_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `API_REFERENCE.md`, `SECRETS.md`, `DIAGRAMS.md`) |
| 직무별 지원 패킷 | [`applications/`](applications/) |
| TA 프로필 생성 | [`ta/`](ta/) |
| OpenAPI 컨트랙트 | [`packages/contracts/`](packages/contracts/) |

상세 다이어그램이 필요하면 [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md)를, 큐/예약 흐름의 시각화는 해당 가이드의 Mermaid 블록을 참조하세요.