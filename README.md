# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability

이 저장소는 개인 포트폴리오 사이트, 채용 자동화 워커, 단일 진실 공급원(SSoT) 데이터 레이어, 그리고 운영 대시보드를 하나의 npm 워크스페이스 모노레포로 통합한 사설 저장소입니다.

This repository is a private npm workspaces monorepo that unifies a personal portfolio site, job automation tooling, a Single Source of Truth (SSoT) data layer, and an operations dashboard under a single, versioned codebase.

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

핵심 가치 / Core values:

- **단일 진실 공급원 (SSoT)** — 이력, 프로필, 스킬, 직무 데이터는 `packages/data`에서 한 번 정의되고 포트폴리오, 이력서 PDF, PPTX, 운영 대시보드 등 모든 산출물로 자동 동기화됩니다.
- **엣지 우선 포트폴리오** — `apps/portfolio`는 Cloudflare Worker 기반 정적 자바스크립트 번들로 빌드되어 전 세계 엣지에서 즉시 응답합니다.
- **자동화 가능한 채용 워크플로우** — `apps/job-server`의 MCP 런타임과 크롤러/오토어플라이어가 Wanted, JobKorea 등 채용 플랫폼과 통합됩니다.
- **관측 가능한 운영 대시보드** — `apps/job-dashboard`의 Worker(fetch/queue/scheduled)와 Cloudflare D1, Queues, Workflows가 백오피스 작업을 안전하게 조율합니다.
- **타입 안전 데이터 계약** — JSDoc/TS 도메인 타입(`packages/types`), Zod 스키마(`packages/schemas`), OpenAPI/Worker 환경 계약(`packages/contracts`)이 일관된 인터페이스를 보장합니다.
- **단일 진실 공급원 (SSoT, Single Source of Truth)** — Resume, profile, skill, and role data are defined once in `packages/data` and automatically synchronized to portfolio, resume PDFs, PPTX, and the operations dashboard.
- **Edge-first portfolio** — `apps/portfolio` is built as a Cloudflare Worker bundle that responds instantly from the global edge.
- **Automatable hiring workflow** — The MCP runtime and crawlers/auto-appliers in `apps/job-server` integrate with platforms such as Wanted and JobKorea.
- **Observable operations dashboard** — Worker handlers (fetch/queue/scheduled), Cloudflare D1, Queues, and Workflows in `apps/job-dashboard` orchestrate back-office jobs safely.
- **Type-safe data contracts** — JSDoc/TS domain types (`packages/types`), Zod schemas (`packages/schemas`), and OpenAPI/Worker env contracts (`packages/contracts`) guarantee consistent interfaces across every artifact.

대상 사용자 / Target audience:

- **본인 (포트폴리오 소유자)** — 이력, 자격, 프로젝트 정보를 한 곳에서 관리하고 PDF, PPTX, 웹사이트로 재사용합니다.
- **리크루터 / 면접관** — `apps/portfolio`의 정적 페이지를 통해 자격 요약과 프로젝트를 빠르게 확인하고, `applications/` 폴더의 역할별 패키지로 정밀 이력 정보를 받습니다.
- **운영자 (장기 자동화 유지보수)** — 대시보드와 워크플로우로 자동 지원 진행 상황을 모니터링하고 정책을 조정합니다.

- **The owner (portfolio author)** — Maintains resume, credentials, and projects in one place, re-rendering them as PDF, PPTX, and web.
- **Recruiters / interviewers** — Quickly review qualifications on the static `apps/portfolio` site and obtain role-specific packets from `applications/`.
- **Operators (long-term automation maintainers)** — Monitor auto-apply progress and tune policies through the dashboard and workflows.

---

## 주요 기능 / Features

- **npm 워크스페이스 모노레포** — `apps/*`와 `packages/*`를 하나의 `package-lock.json`과 `tsconfig.base.json`로 통합 빌드합니다.
- **Cloudflare Worker 빌드 파이프라인** — `apps/portfolio/generate-worker.js`가 HTML/데이터/라이브러리 모듈을 번들링해 `worker.js`를 생성합니다(절대 직접 수정 금지).
- **MCP 기반 잡 자동화 서버** — `apps/job-server`는 Node 22 위에서 Wanted/JobKorea 크롤러, 오토어플라이어, 세션 복구 러너를 호스팅합니다.
- **Cloudflare D1 + Queues + Workflows 대시보드** — `apps/job-dashboard`는 관리자 라우트, 자동화 라우트, 헬스 체크, CORS/CSRF/레이트 리미트 미들웨어를 갖춘 Worker로 배포됩니다.
- **SSoT 콘텐츠 동기화** — `npm run sync:data`, `sync:pdf`, `sync:pptx`, `sync:all`로 마스터 JSON → 산출물 일관성을 보장합니다.
- **1Password 시크릿 관리** — `tools/scripts/onepassword/`의 Go 러너가 시크릿 시드, 세션 파일 복원, 네이티브 인증 흐름을 다룹니다.
- **콘텐츠 보강(enrichment)** — GitHub 프로필, 스킬, AI 기반 메타데이터를 각각의 Go 러너가 추출해 SSoT를 보강합니다.
- **PPTX 생성 (TA 프로필)** — `ta/`의 Python 스크립트가 마스터 데이터를 활용해 다국어 프레젠테이션을 빌드합니다.
- **문서 자동 검증** — `lychee.toml`(링크 체크), `redocly.yaml`(OpenAPI 린트), `eslint.config.cjs`(JS 린트), `tsconfig.base.json`(strict 타입), `jest.config.cjs`/`playwright.config.js`(테스트)를 통합합니다.
- **Docker 컨테이너화** — 멀티 스테이지 `Dockerfile`이 프로덕션 의존성만 담은 job-server 이미지를 빌드합니다.

- **npm workspaces monorepo** — Unifies `apps/*` and `packages/*` under one lockfile and base TS config.
- **Cloudflare Worker build pipeline** — `apps/portfolio/generate-worker.js` bundles HTML/data/lib modules into `worker.js` (never hand-edit).
- **MCP-driven job automation server** — Node 22 runtime hosts Wanted/JobKorea crawlers, auto-appliers, and session restore runners.
- **Cloudflare D1 + Queues + Workflows dashboard** — `apps/job-dashboard` deploys admin/automation/health routes with CORS/CSRF/rate-limit middleware.
- **SSoT content sync** — `sync:data`, `sync:pdf`, `sync:pptx`, `sync:all` keep the master JSON consistent with every artifact.
- **1Password secret management** — Go runners under `tools/scripts/onepassword/` handle secret seeding, session restore, and native auth.
- **Content enrichment** — Dedicated Go runners extract GitHub profile, skill, and AI-derived metadata to augment SSoT.
- **PPTX generation (TA profile)** — Python scripts in `ta/` build multilingual presentations from the master data.
- **Document verification** — `lychee.toml` (link check), `redocly.yaml` (OpenAPI lint), ESLint, strict TS, Jest, and Playwright in one toolchain.
- **Docker containerization** — Multi-stage `Dockerfile` builds a production image containing only the job-server runtime.

---

## 아키텍처 / Architecture

#### Diagram summary 1

- Type: flowchart
- Component: packages/data / resumedata.json / profile + skills (DATA)
- Component: packages/types / JSDoc/TS 도메인 타입 (TYPES)
- Component: packages/schemas / Zod 런타임 스키마 (SCHEMA)
- Component: packages/contracts / OpenAPI + Worker env (CONTRACT)
- Component: packages/env / 런타임 환경 검증 (ENV)
- Component: packages/shared / logger, retry, crypto, / rate-limit, auth, browser (SHARED)
- Component: apps/portfolio / Cloudflare Worker / (edge site) (PORTFOLIO)
- Component: apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- Component: apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- Component: Cloudflare Edge / &lt;placeholder&gt; 도메인 (EDGE)
- Component: Wanted / JobKorea / 외부 채용 플랫폼 (PLATFORMS)
- Component: 운영자 / Recruiter / 대시보드 UI (OPS)
- Component: Docker / jobautomationdata 볼륨 (DOCKER)
- packages/data / resumedata.json / profile + skills (DATA) -> apps/portfolio / Cloudflare Worker / (edge site) (PORTFOLIO)
- packages/data / resumedata.json / profile + skills (DATA) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- packages/data / resumedata.json / profile + skills (DATA) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- packages/types / JSDoc/TS 도메인 타입 (TYPES) -> apps/portfolio / Cloudflare Worker / (edge site) (PORTFOLIO)
- packages/types / JSDoc/TS 도메인 타입 (TYPES) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- packages/types / JSDoc/TS 도메인 타입 (TYPES) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- packages/schemas / Zod 런타임 스키마 (SCHEMA) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- packages/schemas / Zod 런타임 스키마 (SCHEMA) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- packages/contracts / OpenAPI + Worker env (CONTRACT) -> apps/portfolio / Cloudflare Worker / (edge site) (PORTFOLIO)
- packages/contracts / OpenAPI + Worker env (CONTRACT) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- packages/env / 런타임 환경 검증 (ENV) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- packages/env / 런타임 환경 검증 (ENV) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- packages/shared / logger, retry, crypto, / rate-limit, auth, browser (SHARED) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- packages/shared / logger, retry, crypto, / rate-limit, auth, browser (SHARED) -> apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH)
- apps/portfolio / Cloudflare Worker / (edge site) (PORTFOLIO) -> Cloudflare Edge / &lt;placeholder&gt; 도메인 (EDGE)
- apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH) -> 운영자 / Recruiter / 대시보드 UI (OPS)
- apps/job-dashboard / Worker fetch/queue/scheduled / D1 + Queues + Workflows (DASH) -> apps/job-server / MCP 서버 / Node 22 + Fastify (JOB)
- apps/job-server / MCP 서버 / Node 22 + Fastify (JOB) -> Wanted / JobKorea / 외부 채용 플랫폼 (PLATFORMS)


핵심 흐름 / Key flows:

1. `packages/data`의 마스터 JSON이 변경되면 `npm run sync:all`이 PDF, PPTX, 빌드 아티팩트를 다시 생성합니다.
2. `apps/job-dashboard`의 fetch/queue 핸들러가 자동화 작업을 `apps/job-server`로 위임하고, 결과를 D1/Queues에 기록합니다.
3. `apps/portfolio`는 빌드 시점에 SSoT를 임베드하여 정적 페이지로 응답합니다(엣지 캐시 친화적).
4. 모든 환경 변수는 `packages/env`에서 Zod로 검증된 뒤 Worker/Node 런타임에 주입됩니다.

1. Edits to `packages/data` flow through `npm run sync:all` to regenerate PDFs, PPTX, and built artifacts.
2. The dashboard's fetch/queue handlers delegate automation jobs to `apps/job-server`, persisting results in D1/Queues.
3. `apps/portfolio` embeds SSoT at build time and serves a fully static, edge-cacheable page.
4. All environment variables are validated by `packages/env` (Zod) before being injected into Worker/Node runtimes.

---

## 저장소 구조 / Repository Structure

제공된 최상위 디렉터리만 반영합니다(내부 세부 구조는 AGENTS.md의 "WHERE TO LOOK" 표를 참고). / Only the top-level directories provided in the project layout are shown below (consult `AGENTS.md` for finer-grained guidance).

```text
./
├── AGENTS.md                      # 에이전트/기여자를 위한 프로젝트 지식 베이스
├── CHANGELOG.md                   # 릴리스 변경 이력
├── CONTRIBUTING.md                # 기여 가이드
├── Dockerfile                     # 멀티 스테이지 job-server 런타임 이미지
├── LICENSE                        # 사설 라이선스
├── OWNERS                         # 코드 오너십 매니페스트
├── ProfileView.jpg                # 포트폴리오 프로필 이미지
├── README.md                      # 본 문서
├── docker-compose.yml             # mcp-server 컨테이너 + 영구 볼륨 정의
├── eslint.config.cjs              # ESLint v9 flat config
├── jest.config.cjs                # Jest 테스트 설정
├── lychee.toml                    # 링크 검사기 설정
├── package-lock.json              # npm 잠금 파일
├── package.json                   # 루트 매니페스트 + 명령 허브
├── playwright.config.js           # Playwright e2e 설정
├── redocly.yaml                   # OpenAPI 린트 설정
├── tsconfig.base.json             # TypeScript strict 베이스 설정
├── tsconfig.json                  # 루트 TS 프로젝트 레퍼런스
├── wrangler.jsonc                 # Cloudflare Workers 배포 설정
│
├── ta/                            # Python PPTX TA 프로필 생성기
│   ├── improve_visual.py
│   ├── inspect.py
│   ├── verify.py
│   ├── *.pptx
│   └── output/                    # 생성된 PPTX + verify_report
│
├── applications/                  # 역할별 지원 패키지
│   ├── airpremia-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── cloudflare-one-se-2026/
│   ├── gitlab-apac-security-2026/
│   └── security-ir-2026/
│
└── apps/
    └── job-dashboard/             # Cloudflare Worker 대시보드
        ├── AGENTS.md
        ├── API_REFERENCE.md
        ├── DEPLOYMENT_GUIDE.md
        ├── DEVELOPMENT_GUIDE.md
        ├── DIAGRAMS.md
        ├── OWNERS
        ├── README.md
        ├── SECRETS.md
        ├── migrate-json-to-d1.cjs
        ├── migration-data.sql
        ├── schema.sql
        ├── package.json
        ├── tsconfig.json
        ├── migrations/            # D1 마이그레이션 SQL
        └── src/
            ├── index.js
            ├── queue-consumer.js
            ├── router.js
            ├── middleware/        # cors, csrf, rate-limit
            └── routes/            # admin, applications, auth, automation, health
```

`AGENTS.md`가 안내하는 추가 최상위 영역(소스 트리에 존재하지만 본 스냅샷에서 일부 생략됨) / Additional top-level areas referenced by `AGENTS.md` (present in the source tree but partially elided in this snapshot):

- `apps/portfolio/`, `apps/job-server/` — 워커와 MCP/잡 자동화 런타임.
- `packages/cli`, `packages/data`, `packages/env`, `packages/shared`, `packages/types`, `packages/schemas`, `packages/contracts` — 공유 코드, SSoT, 스키마, 계약.
- `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/` — 빌드/검증/관측 도구와 Supabase Edge 함수, 외부 의존성.

---

## 빠른 시작 / Quick Start

### 사전 요구 사항 / Prerequisites

| 도구 / Tool | 권장 버전 / Recommended | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22.x | `Dockerfile`, `package.json` 워크스페이스 런타임 |
| npm | 10.x+ | 워크스페이스 설치 (`npm ci`) |
| Wrangler | latest | Cloudflare Worker 로컬/배포 (`apps/portfolio`, `apps/job-dashboard`) |
| Python | 3.11+ | `ta/`의 PPTX 생성 스크립트 |
| Go | 1.22+ | `tools/scripts/`의 Go 러너(sync, enrichment, onepassword) |
| Docker + Compose | latest | `mcp-server` 컨테이너 기동 |
| ExifTool (선택) | any | `npm run strip-exif` 메타데이터 제거 |

### 클론 & 설치 / Clone & install

```bash
git clone <repo-url> resume
cd resume
npm ci
```

### 환경 변수 템플릿 / Environment template

루트에 `.env`를 작성하고 `packages/env` 스키마가 요구하는 키를 채워주세요. 시크릿은 `tools/scripts/onepassword/`의 러너로 1Password에서 시드할 수 있습니다.

Create a root `.env` and populate the keys required by the `packages/env` schema. Secrets can be seeded from 1Password via the runners in `tools/scripts/onepassword/`.

```bash
cp .env.example .env  # 제공되는 경우 / if available
npm run op:seed:resume
```

### 로컬 빌드 & 실행 / Local build & run

```bash
# 포트폴리오 Worker 로컬 실행 (Cloudflare Workers 에뮬레이션)
npx wrangler dev --config wrangler.jsonc

# 잡 자동화 MCP 서버를 Docker로 기동
docker compose up -d mcp-server

# 또는 Node로 직접 실행
node apps/job-server/src/server/index.js
```

### 첫 동기화 / First sync

```bash
npm run sync:all
```

이 명령은 `packages/data`의 마스터 JSON을 PDF(`tools/scripts/build/pdf-generator.go`), PPTX(`tools/scripts/build/generate_shinhan_pptx.py`), 워커 번들로 동기화합니다.

This synchronizes the master JSON in `packages/data` to the PDF, PPTX, and Worker bundles.

---

## 설정 / Configuration

설정은 다음 위치에서 관리됩니다 / Configuration lives in the following locations:

| 영역 / Area | 파일 / File | 설명 / Notes |
| --- | --- | --- |
| 워크스페이스 루트 / Workspace root | `package.json` | `workspaces`, `scripts`, 의존성 그래프 |
| TypeScript | `tsconfig.base.json`, `tsconfig.json` | strict 모드, 경로 별칭 |
| Worker 배포 / Worker deploy | `wrangler.jsonc` | 환경, 바인딩(D1, Queues, Workflows), 트리거 |
| Docker | `Dockerfile`, `docker-compose.yml` | 멀티 스테이지 빌드, 헬스 체크, 영구 볼륨 |
| ESLint | `eslint.config.cjs` | v9 flat config |
| 테스트 / Tests | `jest.config.cjs`, `playwright.config.js` | 단위 + e2e |
| OpenAPI | `redocly.yaml` | API 린트 규칙 |
| 링크 검사 / Link check | `lychee.toml` | 깨진 링크 모니터링 |
| 환경 / Env | `packages/env` (Zod) | 런타임 환경 변수 검증 |
| 시크릿 / Secrets | `tools/scripts/onepassword/` | 1Password CLI 통합 |
| D1 스키마 | `apps/job-dashboard/schema.sql`, `migrations/` | 자동화 결과 저장 |
| 데이터 마이그레이션 | `apps/job-dashboard/migrate-json-to-d1.cjs`, `migration-data.sql` | JSON → D1 초기 적재 |

### Cloudflare 리소스 / Cloudflare resources

`wrangler.jsonc`와 `apps/job-dashboard`의 별도 wrangler 설정이 다음 자원을 선언합니다 / `wrangler.jsonc` and the dashboard's own wrangler config declare:

- **D1 데이터베이스** — 자동화 결과, 지원 이력, 큐 메타데이터 저장.
- **Queues** — 자동화 작업 비동기 처리(`queue-consumer.js`가 컨슈머 역할).
- **Workflows** — 장기 실행 자동화 상태 머신.
- **Secrets** — 환경별 시크릿(1Password에서 주입).

실제 바인딩 이름은 배포 환경의 변수에 맞춰 조정하세요. 본 README에는 IP나 컨테이너 번호를 하드코딩하지 않습니다 — 자리표시자 `<placeholder>`만 사용합니다.

Adjust binding names to match your deployment environment. This README intentionally does not hardcode private IPs or container numbers — only `<placeholder>` tokens are used.

---

## 명령어 레퍼런스 / Commands Reference

루트 `package.json`의 `scripts`에서 노출되는 주요 명령어입니다. 모든 명령은 워크스페이스 루트에서 실행하세요.

Key commands exposed by the root `package.json`. Run them from the workspace root.

### 메타데이터 / Metadata

```bash
# 이미지 EXIF 메타데이터 제거 (선택적)
npm run strip-exif
```

### SSoT 동기화 / SSoT synchronization

```bash
npm run sync:data    # Node: packages/data → 다양한 산출물 메타데이터
npm run sync:pptx    # Python: PPTX 생성
npm run sync:pdf     # Go: 마스터 PDF 생성
npm run sync:all     # data → pdf → pptx 풀 파이프라인
```

### 1Password 시크릿 / 1Password secrets

```bash
npm run op:run              # 표준 러너 실행
npm run op:native:run       # 네이티브 인증 흐름
npm run op:seed:resume      # 이력서 시크릿 시드
npm run op:seed:sessions    # 세션 파일 시드
npm run op:restore:sessions # 세션 파일 복원
```

### 제안 동기화 / Proposal synchronization

```bash
npm run sync:proposals   # Node proposal-review-cli + Go apply-proposals
```

### 보강 (Enrichment) / Content enrichment

```bash
npm run enrich:github   # Go: GitHub 프로필/저장소 메타데이터
npm run enrich:skills   # Go: 스킬 표준화/정제
npm run enrich:ai       # Go: AI 보조 메타데이터
npm run enrich:all      # 위 세 단계를 순차 실행
```

### 풀 자동화 / Full automation

```bash
npm run automate:ssot   # data → pdf → build → typecheck → node 테스트
npm run automate:full   # sync:all → lint → typecheck → 전체 테스트
```

> 이후 명령어(예: `build`, `lint`, `typecheck`, `test`, `test:node`, `test:e2e`, `deploy` 등)는 루트 `package.json`에 정의되어 있습니다. 정의된 스크립트를 그대로 사용하세요.
>
> Additional commands such as `build`, `lint`, `typecheck`, `test`, `test:node`, `test:e2e`, and `deploy` are defined in the root `package.json`; invoke them as authored.

---

## 로컬 개발 / Local Development

### 워크스페이스 작업 흐름 / Workspace workflow

1. `packages/types`, `packages/schemas`, `packages/contracts`의 변경은 모든 앱에 영향을 줍니다 — `npm run build && npm run typecheck`로 회귀를 확인하세요.
2. `packages/data`의 마스터 JSON을 수정한 뒤에는 항상 `npm run sync:data`로 산출물을 다시 생성합니다.
3. 새 라우트를 추가할 때는 `apps/job-dashboard/src/router.js`와 `routes/` 디렉터리를 함께 업데이트하고, `middleware/`의 CORS/CSRF/레이트 리미트를 우회하지 마세요.
4. `apps/portfolio/worker.js`는 **절대 직접 수정 금지** — `generate-worker.js`가 재생성합니다.

1. Edits to `packages/types`, `packages/schemas`, and `packages/contracts` affect every app — run `npm run build && npm run typecheck` to catch regressions.
2. After editing the master JSON under `packages/data`, always regenerate artifacts via `npm run sync:data`.
3. When adding new routes, update both `apps/job-dashboard/src/router.js` and the corresponding file under `routes/`, and never bypass the CORS/CSRF/rate-limit middleware.
4. **Never** hand-edit `apps/portfolio/worker.js` — `generate-worker.js` regenerates it.

### 디버깅 팁 / Debugging tips

- **Worker 로그** — `npx wrangler tail`로 실시간 로그 확인.
- **D1 쿼리** — `npx wrangler d1 execute <DB_NAME> --command "SELECT * FROM ..."`.
- **큐 검사** — `npx wrangler queues list` / `consumer` 메트릭 확인.
- **Docker 로그** — `docker compose logs -f mcp-server`.
- **EXIF 누락** — `npm run strip-exif`로 PNG/WEBP 메타데이터를 정리.

### 1Password 워크플로우 / 1Password workflow

`tools/scripts/onepassword/`의 Go 러너는 다음을 처리합니다 / The Go runners under `tools/scripts/onepassword/` handle:

- 로컬 `.env` 시드 (시크릿 회전 시 재실행)
- 세션 쿠키/스토리지 파일의 안전한 백업과 복원
- 네이티브 인증 흐름을 위한 임시 자격 증명 처리

### PPTX 빌드 (TA) / PPTX build (TA)

```bash
cd ta
python3 improve_visual.py   # 시각 자료 개선
python3 verify.py           # 검증 리포트 생성 (output/verify_report_*.txt)
```

---

## 테스트 / Testing

- **단위 / 통합** — `npm test` (Jest). `apps/job-dashboard/src/middleware/rate-limit.test.js`와 같이 워크스페이스 내에 인접 테스트를 두는 패턴을 따르세요.
- **E2E** — `npm run test:e2e` (Playwright). `playwright.config.js`가 헤드리스 브라우저를 구동합니다.
- **타입 검사** — `npm run typecheck` (`tsconfig.base.json` 기준 strict).
- **린트** — `npm run lint` (ESLint v9 flat config).
- **OpenAPI 린트** — `redocly lint` (설정: `redocly.yaml`).
- **링크 검사** — `lychee` (설정: `lychee.toml`).
- **풀 회귀** — `npm run automate:full`.

테스트 디렉터리 컨벤션은 `tests/` 하위의 자식 가이드를 따르세요(예: `tests/unit`, `tests/integration`, `tests/e2e`). 자세한 내용은 `AGENTS.md`의 "WHERE TO LOOK" 표를 참고하세요.

Follow the per-layer child guides under `tests/` (e.g. `tests/unit`, `tests/integration`, `tests/e2e`). See the `AGENTS.md` "WHERE TO LOOK" table for the canonical mapping.

---

## 배포 / Deployment

### 프로덕션 배포 권한 / Production deploy authority

- **Cloudflare Workers Builds**가 프로덕션 배포의 권위적 트리거입니다(워크스페이스 루트 `AGENTS.md` 참조).
- GitHub Actions 워크플로우는 검증과 릴리스 작업을 보조하지만, 최종 프로덕션 반영은 Worker Builds가 담당합니다.

- **Cloudflare Workers Builds** is the authoritative production deploy trigger (see root `AGENTS.md`).
- GitHub Actions workflows support validation and release tasks; the final production promotion is owned by Worker Builds.

### 컨테이너 배포 / Containerized deploy

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f mcp-server
```

`docker-compose.yml`이 정의하는 사항 / Defined by `docker-compose.yml`:

- 컨테이너 이름: `resume-mcp-server`
- 빌드 컨텍스트: 루트, 멀티 스테이지 `Dockerfile`
- 포트 매핑: `<host>:3000 → 3000`
- 영구 볼륨: `job_automation_data` (`/app/apps/job-server/.data`에 마운트)
- 헬스 체크: 30초 간격, 5초 타임아웃, 시작 대기 20초, 재시도 3회
- 재시작 정책: `unless-stopped`

> 호스트 포트(`3000`)는 사용자 환경에 맞춰 자유롭게 변경하세요. 본 README는 RFC1918 사설 IP를 하드코딩하지 않습니다.
>
> Adjust the host port (`3000`) to suit your environment. This README does not hardcode RFC1918 private IPs.

### 마이그레이션 / Migrations

- **D1 스키마** — `apps/job-dashboard/schema.sql` 적용 후 `migrations/0002_*.sql`, `migrations/0003_*.sql` 순서로 실행.
- **JSON → D1 초기 적재** — `node apps/job-dashboard/migrate-json-to-d1.cjs` (CI/배포 스크립트에서 호출).
- **시크릿** — `npm run op:seed:resume` 후 Wrangler에 `wrangler secret put <KEY>`로 주입.

---

## 기여 / Contribution

1. 변경 범위에 해당하는 워크스페이스(`apps/portfolio`, `apps/job-server`, `apps/job-dashboard`, `packages/*`)를 식별합니다.
2. `AGENTS.md`의 "WHERE TO LOOK" 표에서 진입점과 컨벤션을 확인합니다.
3. 코드 스타일은 `eslint.config.cjs` + `tsconfig.base.json`을, 데이터 변경은 `packages/data`의 마스터 JSON을 SSoT로 사용합니다.
4. `npm run automate:ssot`(또는 최소 `npm run typecheck && npm run lint && npm test`)를 로컬에서 통과시킵니다.
5. PR 작성 시 변경 요약, 영향받는 워크스페이스, 동기화된 산출물(예: PDF, PPTX 변경 여부)을 명시합니다.
6. 자세한 절차는 `CONTRIBUTING.md`를 따르세요.

1. Identify the workspace(s) affected by your change (`apps/portfolio`, `apps/job-server`, `apps/job-dashboard`, `packages/*`).
2. Use the "WHERE TO LOOK" table in `AGENTS.md` to find entry points and conventions.
3. Follow the style in `eslint.config.cjs` + `tsconfig.base.json`, and treat the master JSON under `packages/data` as the SSoT for content changes.
4. Pass `npm run automate:ssot` locally (or at minimum `npm run typecheck && npm run lint && npm test`).
5. In your PR, describe the change, affected workspaces, and any synchronized artifacts (e.g. PDF/PPTX).
6. For full guidelines, follow `CONTRIBUTING.md`.

### 아키텍처 규칙 / Architecture rules

- **200 LOC 규칙** — 모듈은 가능한 한 200줄을 넘지 않도록 분리합니다(상세: `docs/conventions/architecture-rules.md`).
- **스크립트 언어 정책** — 운영 스크립트는 가능한 한 Go로 작성하고, 특수 목적(예: PPTX 생성)은 Python을 허용합니다.
- **자동화 SSoT** — `tools/scripts/`의 러너는 `package.json`의 `scripts`에서 단일 진입점으로 호출되어야 합니다.

- **200 LOC rule** — Modules should stay under ~200 lines; split when they grow (see `docs/conventions/architecture-rules.md`).
- **Script language policy** — Operational scripts should be Go whenever possible; Python is permitted for special purposes (e.g. PPTX).
- **Automation SSoT** — Runners under `tools/scripts/` must be invoked through a single entry point in the root `package.json` `scripts`.

---

## 라이선스 / License

이 저장소는 사설 라이선스로 배포됩니다. 자세한 내용은 [`LICENSE`](./LICENSE)를 참고하세요.

This repository is distributed under a private license. See [`LICENSE`](./LICENSE) for details.
