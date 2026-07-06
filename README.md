# 이력서 포트폴리오 & 잡 자동화 워크스페이스 / Resume Portfolio & Job Automation Workspace

[![Cloudflare Workers](https://img.shields.io/badge/edge-Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](apps/portfolio/)
[![Node.js](https://img.shields.io/badge/runtime-Node.js_22-339933?logo=node.js&logoColor=white)](Dockerfile)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#license)
[![Version](https://img.shields.io/badge/version-1.40.11-blue)](package.json)

> Cloudflare Worker 엣지 포트폴리오, 잡 자동화 런타임, 대시보드 API, 공유 타입/스키마/컨트랙트 패키지, 컨텐츠 SSoT 데이터, 그리고 자체 호스팅 옵저버빌리티 도구를 한 워크스페이스에서 운영하는 이재철 개인 포트폴리오·잡서치 자동화 환경입니다.

This workspace hosts a Cloudflare Worker portfolio site, a Node-based MCP/job-automation server, a Worker dashboard with queues and workflows, shared TypeScript/Zod packages, and a Python/PPTX teaching-assistant pipeline. It also keeps per-role application packets (resumes, cover letters, preview screenshots) under `applications/` as the final deliverable layer.

## 빠른 상태 / Quick Status

| 항목 / Item | 값 / Value | 비고 / Notes |
| --- | --- | --- |
| 워크스페이스 이름 / Workspace name | `resume` | [`package.json`](package.json) |
| 현재 버전 / Current version | `1.40.11` | [`package.json`](package.json) |
| 기본 진입점 / Default entry | `apps/portfolio/worker.js` | 생성 산출물, 직접 편집 금지 / generated, do not hand-edit |
| 런타임 컨테이너 / Runtime container | `resume-mcp-server` (port `3000`) | [`docker-compose.yml`](docker-compose.yml) |
| 헬스체크 / Health probe | `GET /health` | 30s interval, 3 retries |
| 데이터 SSoT / Authoritative data | `packages/data/resumes/master/resume_data.json` | [`AGENTS.md`](AGENTS.md) |
| 배포 권한 / Deploy authority | Cloudflare Workers Builds | GitHub Actions는 검증 전용 / validation only |
| 운영자 다음 행동 / Operator next action | `npm run sync:all && npm run automate:full` | 전체 동기화 + 자동화 / full sync + automation |

## 작동 흐름 한눈에 / Compact Flow

1. 콘텐츠는 `packages/data/resumes/master/resume_data.json`에서 단일 출처(SSoT)로 관리됩니다. Content lives in `packages/data/resumes/master/resume_data.json` as the single source of truth.
2. 동기화 스크립트가 PDF·PPTX 산출물을 생성합니다. `npm run sync:data`, `npm run sync:pdf`, `npm run sync:pptx`로 단계별 실행 가능합니다. Sync scripts generate PDF/PPTX artifacts; run individually or together via `npm run sync:all`.
3. 포트폴리오 빌더(`apps/portfolio/generate-worker.js`)가 `worker.js`를 생성하여 Cloudflare 엣지에 배포합니다. The portfolio builder emits `worker.js`, which Cloudflare Workers Builds ships to the edge.
4. 잡 자동화 런타임(`apps/job-server/`)이 Wanted·JobKorea 크롤링, 자동 지원, 제안 동기화를 처리합니다. `job-server` runs crawlers, auto-apply, and proposal sync.
5. 대시보드(`apps/job-dashboard/`)가 큐·워크플로·예약 핸들러로 운영 상태를 보여줍니다. The dashboard surfaces queue, workflow, and scheduled handler status.
6. 지원 패키지(`applications/`)는 역할별 이력서·자기소개서·미리보기 PNG의 최종 산출물입니다. `applications/` holds per-role deliverables as the final output layer.

## 목차 / Table of Contents

- [목적과 구성 / Purpose & Package Contents](#목적과-구성--purpose--package-contents)
- [상태 / Status](#상태--status)
- [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
- [API와 진입점 / API & Entry Points](#api와-진입점--api--entry-points)
- [빠른 시작 / Quickstart](#빠른-시작--quickstart)
- [명령어 참조 / Commands Reference](#명령어-참조--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [기여 안내 / Contributing](#기여-안내--contributing)
- [유지보수자 / Maintainers](#유지보수자--maintainers)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

## 목적과 구성 / Purpose & Package Contents

이 워크스페이스는 개인 포트폴리오 사이트 운영과 IT/SRE/Security·Infra·Fintech 직무 지원을 위한 잡서치 자동화를 한 곳에서 다루기 위해 설계되었습니다. PDF·PPTX·HTML 이력서와 자기소개서를 SSoT 데이터에서 생성하고, Cloudflare Workers에 배포하고, 자동 지원·제안 동기화·대시보드 옵저버빌리티까지 제공합니다.

This workspace unifies a personal portfolio site with end-to-end job-search automation for IT/SRE/Security/Infrastructure/Fintech roles. It generates PDF/PPTX/HTML resumes and cover letters from a single data source, deploys the public site to Cloudflare Workers, and adds auto-apply, proposal sync, and operator dashboards.

### 주요 구성 / Top-Level Layout

| 경로 / Path | 역할 / Role | 핵심 산출물 / Key Output |
| --- | --- | --- |
| `apps/portfolio/` | Cloudflare Worker 공개 사이트 / public edge site | `worker.js` (생성됨 / generated) |
| `apps/job-server/` | 잡 자동화 MCP 런타임, 크롤러, 자동 지원 / job automation MCP runtime | Node/Fastify 서버 (port `3000`) |
| `apps/job-dashboard/` | 대시보드 Worker, 큐·워크플로 / dashboard Worker, queues, workflows | `src/index.js` 핸들러 진입점 |
| `packages/cli/` | 운영자 CLI / operator CLI | 명령줄 도구 / command-line tooling |
| `packages/data/` | 이력서·지원서 SSoT / resume & application SSoT | `resumes/master/resume_data.json` |
| `packages/env/` | 런타임 환경 검증 / runtime env validation | 환경 변수 스키마 / env schemas |
| `packages/shared/` | 공용 유틸·클라이언트 / shared utils & clients | 에러·로거·재시도·암호화 |
| `packages/types/` | 도메인 타입 / canonical domain types | JSDoc/TS 타입 |
| `packages/schemas/` | Zod 런타임 스키마 / Zod runtime schemas | 입력 검증 / input validation |
| `packages/contracts/` | OpenAPI, Worker env 컨트랙트 / contracts | API/Worker 인터페이스 |
| `applications/` | 역할별 지원 패키지 / per-role application packets | PDF·자기소개서·미리보기 |
| `ta/` | Python/PPTX TA 프로필 생성 / Python/PPTX TA profile pipeline | `.pptx` 산출물 |
| `tools/scripts/` | Go 우선 빌드·배포·검증 스크립트 / Go-first ops scripts | 빌드·동기화·검증 |
| `tests/` | Jest·Node·Playwright 스위트 / test suites | 단위·통합·E2E |
| `infrastructure/` | Cloudflare·DB·모니터링 / infra & monitoring | 시스템 자동화 |
| `docs/` | ADR·아키텍처·컨벤션·가이드 / docs | 결정 기록·규칙 |
| `supabase/functions/` | Deno 엣지 함수 / Deno edge functions | 서버리스 보조 로직 |
| `third_party/` | npm으로 vendoring한 자료 / vendored material | 외부 의존 |

## 상태 / Status

- **배포 가능 / Production-ready**: 포트폴리오(`apps/portfolio/`)는 Cloudflare Workers Builds를 통해 운영 배포됩니다. Portfolio site is production-deployed via Cloudflare Workers Builds.
- **자체 호스팅 / Self-hosted**: 잡 자동화 MCP 서버는 Docker 컨테이너(`resume-mcp-server`)로 자체 호스팅됩니다. The job automation MCP server is self-hosted as the `resume-mcp-server` container.
- **활발히 개발 중 / Actively developed**: `package.json` 버전은 `1.40.11`이며 워크스페이스 전반에서 빈번한 동기화가 이루어집니다. Version is `1.40.11`; SSoT-to-output sync runs frequently.
- **유지보수 모드 / Maintenance**: 지원 패키지 디렉터리(`applications/`)는 역할별로 분기되어 있어 역할 추가 시 새 폴더를 생성합니다. Per-role application directories are forked per role.
- **지원 종료 없음 / No deprecation**: 현재 사용 중단 예정 항목은 없습니다. No items are marked for deprecation.

## 먼저 읽을 파일 / First Files to Read

| 우선순위 / Priority | 파일 / File | 읽는 이유 / Why read it |
| --- | --- | --- |
| 1 | [`AGENTS.md`](AGENTS.md) | 프로젝트 지식 베이스와 위치 가이드 / project knowledge base & where-to-look map |
| 2 | [`package.json`](package.json) | 워크스페이스 정의와 명령어 허브 / workspace & command hub |
| 3 | [`docker-compose.yml`](docker-compose.yml) + [`Dockerfile`](Dockerfile) | 런타임 컨테이너와 헬스체크 / runtime container & healthcheck |
| 4 | [`apps/portfolio/entry.js`](apps/portfolio/) | 포트폴리오 엣지 라우터 진입 / portfolio edge router entry |
| 5 | [`apps/job-server/src/index.js`](apps/job-server/) | 잡 자동화 MCP 부트스트랩 / MCP bootstrap |
| 6 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/) | 대시보드 Worker fetch·queue·scheduled 진입 / dashboard entry |
| 7 | [`packages/data/resumes/master/resume_data.json`](packages/data/) | 콘텐츠 단일 출처 / content SSoT |

## API와 진입점 / API & Entry Points

### 런타임 엔드포인트 / Runtime Endpoints

| 경로 / Path | 종류 / Kind | 소유 / Owner | 설명 / Description |
| --- | --- | --- | --- |
| `GET /health` | 컨테이너 헬스체크 / container healthcheck | `apps/job-server` | 200 OK 시 정상 / 200 means healthy |
| `apps/portfolio/worker.js` | Cloudflare Worker fetch | `apps/portfolio` | 포트폴리오 엣지 라우터 / portfolio edge router |
| `apps/portfolio/entry.js` | 빌더 입력 / builder input | `apps/portfolio` | 생성기 입력, 직접 수정 가능 / editable builder input |
| `apps/job-dashboard/src/index.js` | Worker fetch/queue/scheduled | `apps/job-dashboard` | 대시보드 요청·큐·예약 오케스트레이션 |

### 워커 진입점 / Worker Entry Points

| 워커 / Worker | 파일 / File | 핸들러 / Handlers |
| --- | --- | --- |
| Portfolio | `apps/portfolio/entry.js` | `fetch` |
| Dashboard | `apps/job-dashboard/src/index.js` | `fetch`, `queue`, `scheduled` |

### 패키지 진입점 / Package Entry Points

| 패키지 / Package | 진입점 / Entry | 책임 / Responsibility |
| --- | --- | --- |
| `apps/job-server` | `src/server/index.js` | Node/Fastify 잡 자동화 부트스트랩 / dashboard-side bootstrap |
| `apps/job-server` | `src/index.js` | MCP 부트스트랩과 셧다운 처리 / MCP bootstrap & shutdown |
| `packages/cli` | 워크스페이스 CLI / workspace CLI | 운영자 명령어 / operator commands |

## 빠른 시작 / Quickstart

### 사전 준비 / Prerequisites

| 항목 / Item | 권장 버전 / Recommended | 비고 / Notes |
| --- | --- | --- |
| Node.js | `22` | [`Dockerfile`](Dockerfile) 베이스와 일치 / matches Dockerfile base |
| npm | `>=10` | `package-lock.json` 기반 / lockfile-based |
| Python | `>=3.11` | `ta/` 파이프라인용 / for `ta/` pipeline |
| Go | `>=1.22` | `tools/scripts/` 빌드/검증용 / for build/verify scripts |
| Docker + Compose v2 | 최신 / latest | 자체 호스팅 런타임 / self-hosted runtime |

### 한 줄 요약 / One-line Summary

```bash
npm install && npm run sync:all && npm run automate:full
```

### 단계별 가이드 / Step-by-Step

1. 의존성 설치 / Install dependencies:

   ```bash
   npm install
   ```

2. 환경 변수 준비 / Prepare environment:

   `.env` 파일을 워크스페이스 루트에 두고 [`packages/env`](packages/env/) 스키마로 검증합니다. Place a `.env` at the workspace root and validate via `packages/env` schemas.

3. 데이터 동기화 / Sync content from SSoT:

   ```bash
   npm run sync:all
   ```

   이는 `sync:data` → `sync:pdf` → `sync:pptx`를 순차 실행합니다. Runs `sync:data`, then `sync:pdf`, then `sync:pptx`.

4. 포트폴리오 빌드·테스트 / Build & test portfolio:

   ```bash
   npm run build && npm run typecheck && npm run test:node
   ```

5. 로컬 컨테이너 실행 / Run the local container:

   ```bash
   docker compose up -d --build
   curl -fsS http://127.0.0.1:3000/health
   ```

   헬스체크가 200을 반환하면 런타임이 정상입니다. A 200 from `/health` confirms a healthy runtime.

## 명령어 참조 / Commands Reference

### 동기화 / Sync

| 명령어 / Command | 목적 / Purpose |
| --- | --- |
| `npm run sync:data` | `packages/data/`의 SSoT 데이터를 클라이언트 형식으로 직렬화 / serialize SSoT |
| `npm run sync:pdf` | Go PDF 생성기로 마스터 PDF 빌드 / build master PDF via Go |
| `npm run sync:pptx` | Python으로 PPTX 산출물 생성 / generate PPTX via Python |
| `npm run sync:all` | 위 세 명령을 순차 실행 / run the three above in order |
| `npm run sync:proposals` | 제안 리뷰 CLI 후 Go 적용 스크립트 실행 / review CLI then Go applier |

### 1Password / 세션 / Secrets & Sessions

| 명령어 / Command | 목적 / Purpose |
| --- | --- |
| `npm run op:run` | 1Password 통합 러너 / 1Password runner |
| `npm run op:native:run` | 네이티브 1Password CLI 러너 / native 1Password runner |
| `npm run op:seed:resume` | 이력서 시크릿 시드 / seed resume secrets |
| `npm run op:seed:sessions` | 세션 파일 시드 / seed session files |
| `npm run op:restore:sessions` | 세션 파일 복원 / restore session files |

### Enrichment / 데이터 보강

| 명령어 / Command | 목적 / Purpose |
| --- | --- | 
| `npm run enrich:github` | GitHub 메타데이터 보강 / enrich GitHub metadata |
| `npm run enrich:skills` | 스킬 분류 보강 / enrich skill taxonomy |
| `npm run enrich:ai` | AI 보조 보강 / AI-assisted enrichment |
| `npm run enrich:all` | 위 세 명령을 순차 실행 / run the three above |

### Automation / 검증 / Verification

| 명령어 / Command | 목적 / Purpose |
| --- | --- |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + Node 테스트 / sync + build + typecheck + node test |
| `npm run automate:full` | 전체 동기화 + 린트 + … / full sync + lint + (truncated in source) |
| `npm run strip-exif` | PNG/WEBP EXIF 제거 / strip EXIF from images |

> 참고: 일부 스크립트는 `tools/scripts/`에 정의되어 있으며 Go 우선 정책(`docs/conventions/architecture-rules.md`)을 따릅니다. Some scripts live under `tools/scripts/` and follow the Go-first script policy.

## 로컬 개발 / Local Development

### 디렉터리 규칙 / Directory Conventions

| 영역 / Area | 규칙 / Rule |
| --- | --- |
| 워커 빌드 산출물 | `apps/portfolio/worker.js`는 생성 산출물로 직접 편집 금지 / generated, do not hand-edit |
| 데이터 진실 공급원 | `packages/data/resumes/master/resume_data.json`가 권위 / authoritative resume data |
| 패키지 경계 | 워크스페이스 패키지 간 import는 명시적 `package.json` 의존성으로만 / explicit dep only |
| 스크립트 언어 | 운영 스크립트는 Go 우선 / Go-first for ops scripts |

### 워크스페이스 멤버 / Workspace Members

```text
apps/portfolio     apps/job-server    apps/job-dashboard
packages/cli       packages/data      packages/shared
packages/types     packages/schemas   packages/contracts
packages/env
```

### EXIF 제거 / Image Hygiene

`npm run strip-exif`로 `apps/portfolio/src/images/`의 PNG·WEBP 메타데이터를 일괄 제거합니다. Run `npm run strip-exif` to strip PNG/WEBP metadata under `apps/portfolio/src/images/`.

## 테스트 / Testing

| 도구 / Tool | 위치 / Location | 용도 / Purpose |
| --- | --- | --- |
| Jest | `jest.config.cjs` | 단위·통합 테스트 / unit & integration |
| Playwright | `playwright.config.js` | E2E 테스트 / end-to-end |
| Node 테스트 러너 | `npm run test:node` | Node 환경 스모크 / Node smoke |

```bash
npm run lint
npm run typecheck
npm run test:node
```

## 기여 안내 / Contributing

기여 전 [`CONTRIBUTING.md`](CONTRIBUTING.md)와 [`AGENTS.md`](AGENTS.md)의 "WHERE TO LOOK" 표를 확인하세요. Before contributing, read [`CONTRIBUTING.md`](CONTRIBUTING.md) and the WHERE TO LOOK table in [`AGENTS.md`](AGENTS.md).

- 콘텐츠 변경은 `packages/data/`의 SSoT에서 시작합니다. Make content changes from `packages/data/` SSoT first.
- 워커 빌드 산출물(`worker.js`)은 커밋하지 마세요. Do not commit generated worker builds.
- 새 역할 지원서는 `applications/<role>-<year>/` 폴더로 추가합니다. Add new role packets under `applications/<role>-<year>/`.
- 변경 이력은 [`CHANGELOG.md`](CHANGELOG.md)를 따릅니다. Track changes in [`CHANGELOG.md`](CHANGELOG.md).

## 유지보수자 / Maintainers

| 역할 / Role | 위치 / Location |
| --- | --- |
| 워크스페이스 소유 / Workspace ownership | [`OWNERS`](OWNERS) |
| 영역별 가이드 / Area-specific guides | `apps/*/AGENTS.md`, `applications/AGENTS.md`, `ta/AGENTS.md` |

기타 연락처는 [`OWNERS`](OWNERS) 파일을 참조하세요. For other contacts, see [`OWNERS`](OWNERS).

## 추가 문서 / Further Documentation

| 주제 / Topic | 위치 / Location |
| --- | --- |
| 프로젝트 지식 베이스 / Project knowledge base | [`AGENTS.md`](AGENTS.md) |
| 설계 상태 / Design state | [`design-state.md`](design-state.md) |
| 변경 로그 / Change log | [`CHANGELOG.md`](CHANGELOG.md) |
| 기여 안내 / Contributing | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 워커 빌드 / Portfolio build | [`wrangler.jsonc`](wrangler.jsonc) |
| API 문서 / API docs | [`redocly.yaml`](redocly.yaml), [`packages/contracts/`](packages/contracts/) |
| 링크 검사 / Link checker config | [`lychee.toml`](lychee.toml) |
| 타입스크립트 베이스 / TypeScript base | [`tsconfig.base.json`](tsconfig.base.json) |
| 린트 / Lint | [`eslint.config.cjs`](eslint.config.cjs) |
| 역할별 지원서 / Per-role packets | [`applications/`](applications/) |
| TA 파이프라인 / TA pipeline | [`ta/`](ta/) |
| 잡 대시보드 가이드 / Job dashboard guides | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md), [`DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md), [`DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md), [`DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md), [`SECRETS.md`](apps/job-dashboard/SECRETS.md) |

## 라이선스 / License

이 워크스페이스는 [`LICENSE`](LICENSE)에 명시된 조건을 따릅니다. This workspace is governed by the terms in [`LICENSE`](LICENSE).