# 이력서 포트폴리오 자동화 워크스페이스

[![version](https://img.shields.io/badge/version-1.40.11-blue.svg)](./package.json)
[![node](https://img.shields.io/badge/node-22.x-339933.svg)](./Dockerfile)
[![license](./LICENSE)](#license)
[![cloudflare](https://img.shields.io/badge/edge-Cloudflare%20Workers-F38020.svg)](./wrangler.jsonc)
[![ci](https://img.shields.io/badge/ci-github%20actions-2088FF.svg)](./.github/workflows)
[![docker](https://img.shields.io/badge/runtime-docker%20compose-2496ED.svg)](./docker-compose.yml)

**한 줄 요약 (Korean):** 이 저장소는 개인 이력서·포트폴리오 콘텐츠를 단일 진실 공급원(SSoT) `packages/data`로 관리하고, Cloudflare Worker 포트폴리오, 잡 자동화 런타임(MCP/job-server), 대시보드 Worker, PPTX/PDF 빌더, 자기 강화(enrichment) 스크립트로 연결하는 통합 워크스페이스입니다. 원본은 `package.json` 기준 `"Portfolio automation workspace: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability"`로 정의되어 있습니다.

**English (secondary):** A single workspace that keeps resume/portfolio content as a single source of truth in `packages/data`, then renders and operates it through a Cloudflare Worker portfolio, a job automation runtime, a dashboard Worker, PPTX/PDF builders, and supporting enrichment tooling.

---

## 한눈에 보기 (Quick Status)

| 구성요소 | 런타임 / 호스팅 | 진입점 | 핵심 운영 명령 |
| --- | --- | --- | --- |
| `apps/portfolio` 공개 사이트 | Cloudflare Worker | `apps/portfolio/entry.js` → 생성된 `worker.js` | `wrangler deploy` (루트 `wrangler.jsonc`) |
| `apps/job-server` 잡 자동화 MCP | Node 22 / Docker Compose | `apps/job-server/src/index.js`, `src/server/index.js` | `docker compose up mcp-server` |
| `apps/job-dashboard` 운영 대시보드 | Cloudflare Worker + Queues + D1 | `apps/job-dashboard/src/index.js` | `wrangler deploy -c apps/job-dashboard/wrangler.jsonc` |
| `packages/data` SSoT (resume JSON, applications) | Node + Python + Go 도구 | `packages/data/resumes/master/resume_data.json` | `npm run sync:data` |
| PPTX/PDF 빌더 | Python (`tools/scripts/build/generate_shinhan_pptx.py`) + Go (`tools/scripts/build/pdf-generator.go`) | `ta/` 산출물 | `npm run sync:pptx`, `npm run sync:pdf` |
| Enrichment 스크립트 | Go (`tools/scripts/enrichment/{github,skills,ai}`) | 각 패키지의 `main.go` | `npm run enrich:all` |
| 1Password/세션 동기화 | Go (`tools/scripts/onepassword`) | `op:*` 스크립트 | `npm run op:seed:resume` 등 |
| 테스트 스위트 | Jest + Playwright + Node | `tests/`, `playwright.config.js`, `jest.config.cjs` | `npm test`, `npm run test:e2e` |

누가 운영하나: 책임자는 [`OWNERS`](./OWNERS) 파일과 각 앱의 [`apps/job-dashboard/OWNERS`](./apps/job-dashboard/OWNERS)에 명시되어 있습니다.

운영자가 다음에 칠 명령: 사이트 확인 → `curl https://<worker-host>/health` · 로컬 일괄 동기화 → `npm run automate:ssot` · 전체 파이프라인 → `npm run automate:full` (스크립트 정의는 [`package.json`](./package.json) 참조).

---

## 목차 (Table of Contents)

1. [목적과 구성 (Purpose / Package Contents)](#목적과-구성-purpose--package-contents)
2. [현재 상태 (Status)](#현재-상태-status)
3. [먼저 읽을 파일 (First Files to Read)](#먼저-읽을-파일-first-files-to-read)
4. [진입점과 API (API or Entry Points)](#진입점과-api-api-or-entry-points)
5. [빠른 시작 (Quickstart / Usage)](#빠른-시작-quickstart--usage)
6. [아키텍처 (Architecture)](#아키텍처-architecture)
7. [설정 (Configuration)](#설정-configuration)
8. [명령어 레퍼런스 (Commands Reference)](#명령어-레퍼런스-commands-reference)
9. [로컬 개발 (Local Development)](#로컬-개발-local-development)
10. [테스트 (Testing)](#테스트-testing)
11. [기여 가이드 (Contribution Guide)](#기여-가이드-contribution-guide)
12. [유지보수자 (Maintainers / Points of Contact)](#유지보수자-maintainers--points-of-contact)
13. [추가 문서 (Further Documentation)](#추가-문서-further-documentation)
14. [라이선스 (License)](#라이선스-license)

---

## 목적과 구성 (Purpose / Package Contents)

이 저장소는 **이력서/포트폴리오 콘텐츠 → 웹/문서 → 운영 자동화** 흐름을 하나의 코드베이스로 묶어, 자료 갱신 시 포트폴리오 Worker, 대시보드, 지원서 패키지, PDF/PPTX 산출물이 동일한 데이터에서 파생되도록 만든 것이 핵심 가치입니다.

| 영역 | 경로 | 역할 |
| --- | --- | --- |
| Edge 사이트 | [`apps/portfolio/`](./apps/portfolio) | Cloudflare Worker 기반 공개 포트폴리오. `worker.js`는 생성 산출물이므로 수동 편집 금지, `entry.js`·HTML·`src/`·`lib/`만 수정. |
| 잡 자동화 | [`apps/job-server/`](./apps/job-server) | MCP 서버, 원킬(원소스) 크롤러, 자동 지원, 스크립트, 플랫폼 클라이언트. Docker 이미지의 런타임 진입점. |
| 대시보드 | [`apps/job-dashboard/`](./apps/job-dashboard) | Worker fetch/queue/scheduled 핸들러, D1 마이그레이션, 워크플로우. |
| CLI | [`packages/cli/`](./packages/cli) | 운영자용 resume CLI. |
| 데이터 SSoT | [`packages/data/`](./packages/data) | `resumes/master/resume_data.json`을 권위적 진실로 사용. |
| 환경 검증 | [`packages/env/`](./packages/env) | 런타임 환경 변수 검증. |
| 공유 유틸 | [`packages/shared/`](./packages/shared) | 에러/로거/재시도/암호/레이트리미트/인증/브라우저/클라이언트. |
| 도메인 타입 | [`packages/types/`](./packages/types) | JSDoc/TS 정식 도메인 타입. |
| 런타임 스키마 | [`packages/schemas/`](./packages/schemas) | Zod 기반 입력 검증. |
| API/환경 계약 | [`packages/contracts/`](./packages/contracts) | OpenAPI 사양, Worker env 계약. |
| 지원서 패키지 | [`applications/`](./applications) | 회사별 이력서, 커버레터, 미리보기, 실행 로그. |
| 도구 스크립트 | [`tools/scripts/`](./tools/scripts) | Go 우선 빌드/동기화/배포/검증/보안 도구. 1Password 통합 포함. |
| 테스트 | [`tests/`](./tests), [`playwright.config.js`](./playwright.config.js), [`jest.config.cjs`](./jest.config.cjs) | 단위/통합/E2E. |
| 인프라 정의 | [`infrastructure/`](./infrastructure) | Cloudflare, DB, 모니터링, 시스템 자동화. |
| 문서 | [`docs/`](./docs) | ADR, 아키텍처, 컨벤션, 가이드, 보안. |
| PPTX 프로파일 | [`ta/`](./ta) | Python 기반 TA 프로파일 생성, 검증(`verify.py`), 시각 개선(`improve_visual.py`). |
| Supabase Edge | [`supabase/functions/`](./supabase/functions) | Deno 엣지 함수. |
| 벤더드 자료 | [`third_party/`](./third_party) | npm으로 관리되는 외부 자료. |

> 이 구조는 기술적으로 다중 패키지 워크스페이스이지만, 사용자 입장에서는 **“콘텐츠 SSoT를 중심으로 한 포트폴리오·잡 자동화 워크스페이스”**입니다.

---

## 현재 상태 (Status)

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| 버전 | `1.40.11` | [`package.json`](./package.json) |
| Node 런타임 | `22.x (alpine)` | [`Dockerfile`](./Dockerfile) `FROM node:22-alpine` |
| 프로덕션 배포 권한 | Cloudflare Workers Builds | `AGENTS.md` 명시 |
| 공개 사이트 | Cloudflare Worker | [`wrangler.jsonc`](./wrangler.jsonc), `apps/portfolio/` |
| 잡 자동화 | 컨테이너 (`docker compose`) | [`docker-compose.yml`](./docker-compose.yml) |
| 헬스 체크 | `/health` 30s 주기, 5s 타임아웃, 3회 재시도 | `Dockerfile`, `docker-compose.yml` |
| 테스트 도구 | Jest, Playwright, Node 테스트 | `jest.config.cjs`, `playwright.config.js` |
| 변경 이력 | [`CHANGELOG.md`](./CHANGELOG.md) 추적 | — |
| 지원 중단 여부 | 운영 중(active) | — |

---

## 먼저 읽을 파일 (First Files to Read)

새 합류자가 흐름을 잡는 순서:

1. [`AGENTS.md`](./AGENTS.md) — 워크스페이스 규칙, 코드 맵, 작업 위치 표.
2. [`package.json`](./package.json) — 최상위 스크립트 허브와 워크스페이스 멤버 목록.
3. [`apps/portfolio/entry.js`](./apps/portfolio) — 포트폴리오 Worker의 fetch 라우터.
4. [`apps/job-server/src/server/index.js`](./apps/job-server/src/server/index.js) — 잡 자동화 서버 진입점.
5. [`apps/job-dashboard/src/index.js`](./apps/job-dashboard/src/index.js) — 대시보드 fetch/queue/scheduled 진입점.
6. [`packages/data/resumes/master/resume_data.json`](./packages/data) — 콘텐츠 SSoT.
7. [`docs/conventions/architecture-rules.md`](./docs/conventions/architecture-rules.md) — 200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책.
8. [`Dockerfile`](./Dockerfile) / [`docker-compose.yml`](./docker-compose.yml) — 컨테이너 런타임 사양.

각 앱의 자체 가이드: [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](./apps/job-dashboard/DEVELOPMENT_GUIDE.md), [`apps/job-dashboard/API_REFERENCE.md`](./apps/job-dashboard/API_REFERENCE.md), [`apps/job-dashboard/SECRETS.md`](./apps/job-dashboard/SECRETS.md), [`apps/job-dashboard/DIAGRAMS.md`](./apps/job-dashboard/DIAGRAMS.md).

---

## 진입점과 API (API or Entry Points)

| 진입점 | 위치 | 핸들러/심볼 | 노출 표면 |
| --- | --- | --- | --- |
| Portfolio Worker fetch | `apps/portfolio/entry.js` | `fetch` 핸들러 | 공개 라우트, 인프로세스 `/job/*` |
| Portfolio 빌드 산출물 | `apps/portfolio/worker.js` | (생성됨) | `wrangler deploy` 대상 |
| Job-server MCP 부트스트랩 | `apps/job-server/src/index.js` | `main()` | 프로세스 lifecycle |
| Job-server HTTP 서버 | `apps/job-server/src/server/index.js` | Fastify | `GET /health`, MCP 도구 |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | `fetch`, `queue`, `scheduled` | 대시보드 API, 큐 컨슈머, 크론 |
| Dashboard 라우터 | `apps/job-dashboard/src/router.js` | 라우터 | 경로별 핸들러 |
| Dashboard 큐 컨슈머 | `apps/job-dashboard/src/queue-consumer.js` | 큐 핸들러 | 비동기 잡 처리 |
| D1 마이그레이션 | `apps/job-dashboard/schema.sql`, `migrations/` | SQL | 대시보드 DB |
| 데이터 임포트 | `apps/job-dashboard/migrate-json-to-d1.cjs` | CLI 스크립트 | JSON → D1 일회성 이전 |
| OpenAPI 계약 | `packages/contracts/` | OpenAPI 스펙 | API 계약 정의 |
| Healthcheck | 모든 런타임 | `GET /health` | Docker HEALTHCHECK 사용 |

---

## 빠른 시작 (Quickstart / Usage)

### 1) 의존성 설치 (루트)

```bash
npm ci
```

루트 `package-lock.json`으로 워크스페이스 그래프가 한 번에 해결됩니다. Docker 빌드도 동일 명령을 사용합니다 ([`Dockerfile`](./Dockerfile) `npm ci --omit=dev --ignore-scripts`).

### 2) 잡 자동화 서버를 컨테이너로 띄우기

```bash
docker compose up -d mcp-server
docker compose ps
curl -fsS http://127.0.0.1:3000/health
```

`docker-compose.yml`은 단일 서비스(`resume-mcp-server`)를 노출하며, 컨테이너 내부에 `/app/apps/job-server/.data` 볼륨(`job_automation_data`)을 마운트합니다.

### 3) 콘텐츠 SSoT 동기화 → PDF/PPTX 빌드

```bash
npm run sync:data     # Node: resume JSON 동기화
npm run sync:pdf      # Go: PDF 생성
npm run sync:pptx     # Python: 신한 PPTX 생성
npm run sync:all      # 위 세 단계 일괄 실행
```

### 4) 포트폴리오 Worker 로컬 실행/배포

```bash
# 로컬 프리뷰 (wrangler 사용)
npx wrangler dev -c wrangler.jsonc

# 배포 (Cloudflare 인증 필요)
npx wrangler deploy -c wrangler.jsonc
```

> `worker.js`는 `generate-worker.js`로 생성되는 산출물이므로 절대 직접 수정하지 마세요 ([`AGENTS.md`](./AGENTS.md)).

### 5) 대시보드 워커 배포/마이그레이션

```bash
npx wrangler deploy -c apps/job-dashboard/wrangler.jsonc
node apps/job-dashboard/migrate-json-to-d1.cjs   # 필요 시 1회성 임포트
```

---

## 아키텍처 (Architecture)

핵심 흐름은 **“콘텐츠 SSoT → 빌더 → 공개 사이트 / 운영 도구”** 한 줄과 **“운영 이벤트 → 대시보드 Worker → 큐/스케줄러 → 잡 자동화 서버 → 외부 플랫폼”** 한 줄로 요약됩니다.

| 계층 | 구성 | 책임 |
| --- | --- | --- |
| 콘텐츠 SSoT | `packages/data/resumes/master/resume_data.json`, `applications/*`, `ta/*` | 모든 산출물의 단일 진실 |
| 빌더 | `tools/scripts/build/*.go`, `tools/scripts/build/*.py`, `packages/cli` | PDF/PPTX, 동기화 스크립트 |
| Edge (공개) | `apps/portfolio` Worker (`entry.js` + 생성된 `worker.js`) | 정적 페이지 + 인프로세스 `/job/*` |
| Edge (운영) | `apps/job-dashboard` Worker + D1 + Queues | 운영 대시보드, 비동기 잡 오케스트레이션 |
| 런타임 | `apps/job-server` (Fastify + MCP), Docker 컨테이너 | 크롤러/자동지원/스크립트 호스팅 |
| 공유 | `packages/{shared,types,schemas,contracts,env}` | 타입·스키마·계약·환경 검증 |
| 보조 | `tools/scripts/onepassword`, `tools/scripts/enrichment/*` | 시크릿/세션/데이터 강화 |

요청 흐름 (요약):

1. 운영자가 콘텐츠를 `packages/data`에서 수정하거나 `applications/`의 지원서 패키지를 갱신.
2. `npm run sync:all`이 SSoT → JSON 동기화 → PDF/PPTX 빌드를 순차 실행.
3. 포트폴리오 Worker는 HTML/데이터/라이브러리 모듈을 합쳐 `worker.js`를 재생성 후 Cloudflare에 배포.
4. 대시보드 Worker의 `fetch`는 사용자 요청을, `queue`는 비동기 잡을, `scheduled`는 크론 잡을 라우팅.
5. 잡 자동화 서버는 MCP 도구 + 플랫폼 클라이언트(Wanted/JobKorea 등)로 실제 작업을 수행.
6. 헬스 체크(`/health`)가 컨테이너 상태를 보고하고, Docker가 비정상 인스턴스를 재시작.

> 상세 다이어그램은 [`apps/job-dashboard/DIAGRAMS.md`](./apps/job-dashboard/DIAGRAMS.md), 아키텍처 결정은 [`docs/`](./docs) 참고.

---

## 설정 (Configuration)

| 설정 종류 | 위치 | 비고 |
| --- | --- | --- |
| Worker 바인딩/환경 | 루트 [`wrangler.jsonc`](./wrangler.jsonc) 및 `apps/job-dashboard/wrangler.jsonc` | KV/D1/Queues/Secrets |
| 런타임 환경 변수 | 컨테이너 `.env` (Compose `env_file`) | `docker-compose.yml` |
| D1 스키마 | `apps/job-dashboard/schema.sql`, `migrations/*.sql` | 누적 마이그레이션 |
| OpenAPI/계약 | `packages/contracts/` | API 표면의 권위 |
| 환경 검증 스키마 | `packages/env/` | 런타임 부팅 시 검증 |
| ESLint | `eslint.config.cjs` | 워크스페이스 공통 |
| TypeScript 베이스 | `tsconfig.base.json`, `tsconfig.json` | 패키지별 `tsconfig` |
| 테스트 | `jest.config.cjs`, `playwright.config.js` | 각 패키지의 `package.json` 보조 |
| 링크 검사 | `lychee.toml` | 문서/마크다운 링크 정책 |
| API 문서 린트 | `redocly.yaml` | OpenAPI 린트 규칙 |
| 시크릿 | `docs/security/`, `apps/job-dashboard/SECRETS.md` | 1Password 통합(`tools/scripts/onepassword`) |

운영 시크릿은 평문 커밋을 금지하고, 로컬에서는 `op:seed:*`, `op:run`, `op:native:run` 스크립트로 1Password → 환경으로 주입합니다.

---

## 명령어 레퍼런스 (Commands Reference)

`npm` 스크립트는 [`package.json`](./package.json)이 단일 표면입니다.

| 명령 | 목적 | 내부 구현 |
| --- | --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지에서 EXIF 제거 | `exiftool` 일괄 호출 |
| `npm run sync:data` | SSoT JSON 동기화 | `node tools/scripts/utils/sync-resume-data.js` |
| `npm run sync:pptx` | 신한 PPTX 빌드 | `python3 tools/scripts/build/generate_shinhan_pptx.py` |
| `npm run sync:pdf` | PDF 마스터 빌드 | `go run ./tools/scripts/build/pdf-generator.go master` |
| `npm run sync:all` | data → pdf → pptx 일괄 | 위 셋을 순차 실행 |
| `npm run op:run` | 1Password CLI 러너 | `go run ./onepassword/run` |
| `npm run op:native:run` | 1Password 네이티브 러너 | `go run ./onepassword/native-run` |
| `npm run op:seed:resume` | resume 시드 주입 | `go run ./onepassword/seed-resume` |
| `npm run op:seed:sessions` | 세션 파일 시드 | `go run ./onepassword/session-files seed` |
| `npm run op:restore:sessions` | 세션 파일 복원 | `go run ./onepassword/session-files restore` |
| `npm run sync:proposals` | 제안 검토/적용 | `node ...proposal-review-cli.js` + `go run .../apply-proposals.go` |
| `npm run enrich:github` | GitHub 프로필 강화 | `go run tools/scripts/enrichment/github` |
| `npm run enrich:skills` | 스킬 데이터 강화 | `go run tools/scripts/enrichment/skills` |
| `npm run enrich:ai` | AI 보조 강화 | `go run tools/scripts/enrichment/ai` |
| `npm run enrich:all` | 강화 파이프라인 전체 | 위 셋 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + Node 테스트 | `sync:data && sync:pdf && build && typecheck && test:node` |
| `npm run automate:full` | 전체 자동화 (lint 포함) | `sync:all && lint && ...` |

자세한 워크플로우 권한은 [`AGENTS.md`](./AGENTS.md)와 `.github/workflows/`를 확인하세요.

---

## 로컬 개발 (Local Development)

| 단계 | 명령/도구 | 메모 |
| --- | --- | --- |
| 사전 도구 | Node 22, Python 3, Go(최신 안정), Docker, `exiftool`, `wrangler` | `Dockerfile` 기준 alpine 이미지로 검증 |
| 워크스페이스 설치 | `npm ci` | 루트 lockfile 사용 |
| 작업 위치 선택 | `apps/<...>`, `packages/<...>` | 패키지별 `AGENTS.md`/`README.md` 우선 |
| 빌드/타입체크 | `npm run build`, `npm run typecheck` | 워크스페이스 공통 |
| Lint | `npm run lint` (`eslint.config.cjs`) | — |
| 로컬 에지 실행 | `npx wrangler dev -c wrangler.jsonc` | 포트폴리오/대시보드 |
| 컨테이너 실행 | `docker compose up mcp-server` | 잡 자동화 MCP |
| 시크릿 주입 | `op:seed:resume`, `op:run` | 평문 커밋 금지 |
| 데이터 변경 후 회귀 | `npm run automate:ssot` | 동기화 + 빌드 + 테스트 |
| 문서 링크 검사 | `lychee` (`lychee.toml`) | — |
| OpenAPI 린트 | `redocly lint` (`redocly.yaml`) | — |

---

## 테스트 (Testing)

| 종류 | 도구 | 위치/설정 |
| --- | --- | --- |
| 단위/통합 | Jest | `jest.config.cjs`, `tests/` |
| Node 테스트 | `npm run test:node` | [`package.json`](./package.json) |
| E2E | Playwright | `playwright.config.js` |
| 계약/OpenAPI | Redocly | `redocly.yaml` |
| 링크 무결성 | lychee | `lychee.toml` |
| 컨테이너 헬스 | Docker HEALTHCHECK | `GET /health` (30s/5s/3회) |
| TA 산출물 검증 | `ta/verify.py`, `ta/improve_visual.py`, `ta/inspect.py` | [`ta/`](./ta) |

자동화 파이프라인은 `npm run automate:ssot`(동기화 + 빌드 + 타입체크 + Node 테스트)과 `npm run automate:full`(lint 포함)을 제공합니다.

---

## 기여 가이드 (Contribution Guide)

- 시작하기 전 [`AGENTS.md`](./AGENTS.md)의 “WHERE TO LOOK” 표와 “CODE MAP” 표를 확인합니다.
- 콘텐츠 수정은 [`packages/data/`](./packages/data) SSoT에서 시작하고, `npm run sync:all`로 파생 산출물을 재생성합니다.
- 코드 변경 시 패키지 경계 규칙과 200 LOC 규칙을 준수합니다([`docs/conventions/architecture-rules.md`](./docs/conventions/architecture-rules.md)).
- 새 스크립트는 가능한 Go로 작성합니다(스크립트 언어 정책, [`AGENTS.md`](./AGENTS.md) 참조).
- `worker.js`, 빌드 산출물, 자동 생성 파일은 직접 수정하지 않습니다.
- 시크릿/세션은 [`docs/security/`](./docs/security)와 1Password 도구를 통해서만 처리합니다.
- PR 전 `npm run automate:ssot`(필요 시 `automate:full`) 통과를 확인합니다.
- 상세 절차는 [`CONTRIBUTING.md`](./CONTRIBUTING.md)와 [`CHANGELOG.md`](./CHANGELOG.md) 규칙을 따릅니다.

---

## 유지보수자 (Maintainers / Points of Contact)

- 워크스페이스 책임: [`OWNERS`](./OWNERS)
- 대시보드 책임: [`apps/job-dashboard/OWNERS`](./apps/job-dashboard/OWNERS)
- 도메인 안내: [`AGENTS.md`](./AGENTS.md)의 “Points of Contact” 항목
- 문제 제기/제안: GitHub 이슈 사용. 자동 응답 봇 운영은 본 저장소 기능이 아닙니다(별도 정책 없음).

---

## 추가 문서 (Further Documentation)

| 주제 | 위치 |
| --- | --- |
| 워크스페이스 규칙/코드 맵 | [`AGENTS.md`](./AGENTS.md) |
| 디자인 노트 | [`design-state.md`](./design-state.md) |
| 대시보드 개발/배포/시크릿 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](./apps/job-dashboard/DEVELOPMENT_GUIDE.md), [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](./apps/job-dashboard/DEPLOYMENT_GUIDE.md), [`apps/job-dashboard/SECRETS.md`](./apps/job-dashboard/SECRETS.md) |
| 대시보드 API/다이어그램 | [`apps/job-dashboard/API_REFERENCE.md`](./apps/job-dashboard/API_REFERENCE.md), [`apps/job-dashboard/DIAGRAMS.md`](./apps/job-dashboard/DIAGRAMS.md) |
| 지원서 패키지 | [`applications/`](./applications) (회사별 `application-guide.md`, `cover_letter.md`, 이력서/HTML 미리보기) |
| 인프라 아키텍처 | [`applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md`](./applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md), [`applications/security-ir-2026/`](./applications/security-ir-2026) |
| PPTX 프로파일 | [`ta/`](./ta) (`inspect.py`, `verify.py`, `improve_visual.py`) |
| 변경 이력 | [`CHANGELOG.md`](./CHANGELOG.md) |
| 기여 절차 | [`CONTRIBUTING.md`](./CONTRIBUTING.md) |

---

## 라이선스 (License)

[`LICENSE`](./LICENSE) 파일의 조항을 따릅니다.