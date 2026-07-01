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
- [기여 / 기여 / Contribution](#기여--contribution)
- [라이선스 / License](#라이선스--license)

---

## Overview / 개요

`package.json`의 `description` 필드는 이 모노레포를 다음과 같이 정의합니다.

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability

핵심 가치 / Core values:

- **단일 진실 공급원 (SSoT)** — 이력, 프로필, 스킬, 직무 데이터는 `packages/data`에서 한 번 정의되고 포트폴리오, 이력서 PDF, PPTX, 운영 대시보드 등 모든 산출물로 자동 동기화됩니다.
- **엣지 우선 포트폴리오** — `apps/portfolio`는 Cloudflare Worker 기반으로 동작하며, 데이터 변경 시 단일 명령으로 재배포됩니다.
- **채용 자동화** — `apps/job-server`의 MCP 런타임이 Wanted, JobKorea 등 플랫폼 클라이언트, 크롤러, 자동 지원 워크플로를 노출합니다.
- **운영 대시보드** — `apps/job-dashboard`는 Cloudflare Worker의 `fetch` / `queue` / `scheduled` 핸들러를 통해 지원 파이프라인과 큐 작업을 시각화합니다.
- **공유 패키지** — `packages/{shared,types,schemas,contracts,env,cli}`는 도메인 타입, Zod 스키마, OpenAPI 계약, 환경 변수 검증, 운영 CLI를 제공합니다.

- **Single Source of Truth (SSoT)** — Resume, profile, skills, and job data are defined once in `packages/data` and automatically synced to the portfolio, resume PDFs, PPTX, and operations dashboard.
- **Edge-first portfolio** — `apps/portfolio` runs on Cloudflare Workers and is redeployed with a single command when data changes.
- **Job automation** — The `apps/job-server` MCP runtime exposes platform clients, crawlers, and auto-apply workflows for Wanted, JobKorea, and others.
- **Operations dashboard** — `apps/job-dashboard` surfaces the application pipeline and queue work via Cloudflare Worker `fetch` / `queue` / `scheduled` handlers.
- **Shared packages** — `packages/{shared,types,schemas,contracts,env,cli}` provide domain types, Zod schemas, OpenAPI contracts, environment validation, and an operator CLI.

---

## 주요 기능 / Features

| 영역 / Area | 기능 / Feature | 위치 / Location |
| --- | --- | --- |
| 포트폴리오 / Portfolio | Cloudflare Worker 기반 정적 + 동적 포트폴리오, 데이터 자동 주입 | `apps/portfolio/` |
| 채용 자동화 / Job automation | MCP 서버, 크롤러, 자동 지원, 스크립트 | `apps/job-server/` |
| 운영 대시보드 / Operations dashboard | Worker fetch/queue/scheduled, 라우터, 미들웨어, 워크플로 | `apps/job-dashboard/` |
| 콘텐츠 SSoT / Content SSoT | `packages/data`의 JSON이 모든 산출물의 원천 | `packages/data/` |
| 도메인 타입 / Domain types | JSDoc/TS 정식 타입 | `packages/types/` |
| 런타임 검증 / Runtime validation | Zod 스키마 | `packages/schemas/` |
| 계약 / Contracts | OpenAPI 스펙, Worker env 계약 | `packages/contracts/` |
| 환경 검증 / Environment | 런타임 환경 변수 Zod 검증 | `packages/env/` |
| 운영 CLI / Operator CLI | 레쥬메 운영자 CLI | `packages/cli/` |
| 공유 유틸 / Shared utilities | 에러, 로거, 재시도, 암호, 인증, 브라우저, 클라이언트 | `packages/shared/` |
| 지원 패키지 / Application packets | 직무별 이력서/표지/실행 로그 | `applications/` |
| TA 자료 / TA materials | Python/PPTX 프로필 생성 | `ta/` |
| 운영 스크립트 / Operational scripts | Go-first 빌드, 동기화, 배포, 검증, 보안 도구 | `tools/scripts/` |

---

## 아키텍처 / Architecture

### 최상위 컴포넌트 / Top-level components

| 컴포넌트 / Component | 런타임 / Runtime | 역할 / Role |
| --- | --- | --- |
| `apps/portfolio` | Cloudflare Worker | 공개 포트폴리오 사이트 및 인프로세스 `/job/*` 라우터 |
| `apps/job-server` | Node.js (Docker) | MCP 서버, 크롤러, 자동 지원 런타임, 동기화 CLI |
| `apps/job-dashboard` | Cloudflare Worker | 운영 대시보드 API, 큐 컨슈머, 스케줄러, 워크플로 |
| `packages/data` | Node.js | 모든 콘텐츠의 단일 진실 공급원 (SSoT) |
| `packages/{shared,types,schemas,contracts,env,cli}` | Node.js | 도메인 모델, 검증, 계약, 환경, 운영 도구 |
| `applications/*` | 정적 자산 / Static | 직무별 지원 패키지 (HTML, PDF, 표지, 실행 로그) |
| `ta/*` | Python | PPTX 기반 TA/프로필 자료 생성 |
| `tools/scripts/*` | Go + Node | 빌드, 동기화, 배포, 검증, 보안 운영 스크립트 |

### 요청 흐름 / Request flow (포트폴리오 진입)

1. 브라우저가 `apps/portfolio`의 Cloudflare Worker 엣지 노드에 도달합니다.
2. `apps/portfolio/entry.js`가 요청을 받아 HTML, 데이터, 라이브러리 모듈을 병합합니다.
3. `worker.js`(생성 파일)는 데이터 모듈을 인라인하여 응답을 구성합니다.
4. `/job/*` 경로는 동일 Worker 내에서 운영 대시보드 측 라우터로 위임됩니다.

### 데이터 흐름 / Data flow (SSoT 동기화)

1. 운영자가 `packages/data/resumes/master/resume_data.json` 또는 `packages/cli`를 통해 콘텐츠를 수정합니다.
2. `npm run sync:data`가 변경을 검증하고 빌드 단계를 트리거합니다.
3. `npm run sync:pdf`는 Go 기반 PDF 생성기로 모든 직무 PDF를 갱신합니다.
4. `npm run sync:pptx`는 Python 스크립트로 `ta/` 산출물을 재생성합니다.
5. `apps/portfolio` 및 `apps/job-dashboard` Worker가 단일 명령으로 재배포됩니다.

### 컨테이너 런타임 / Container runtime

| 서비스 / Service | 이미지 / Image | 포트 / Port | 볼륨 / Volume | 헬스체크 / Healthcheck |
| --- | --- | --- | --- | --- |
| `mcp-server` | 멀티스테이지 Dockerfile (`node:22-alpine`) | `3000` | `job_automation_data:/app/apps/job-server/.data` | `GET /health` 30s 간격, 5s 타임아웃, 3회 재시도 |

---

## 저장소 구조 / Repository Structure

```text
/
├── AGENTS.md                 # 프로젝트 지식 베이스 (저장소 지침)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile                # 멀티스테이지 job-server 런타임 이미지
├── LICENSE
├── OWNERS
├── ProfileView.jpg
├── README.md
├── docker-compose.yml        # mcp-server 서비스 정의
├── eslint.config.cjs
├── jest.config.cjs
├── lychee.toml
├── package.json              # npm 워크스페이스 루트 / 명령 허브
├── package-lock.json
├── playwright.config.js
├── redocly.yaml
├── tsconfig.base.json
├── tsconfig.json
├── wrangler.jsonc            # Cloudflare Worker 배포 설정
├── ta/                       # Python/PPTX 기반 TA 프로필 생성
│   ├── improve_visual.py
│   ├── inspect.py
│   ├── verify.py
│   ├── lee_jaecheol_*.pptx
│   └── output/               # 생성된 PPTX 및 검증 리포트
├── applications/             # 직무별 지원 패키지
│   ├── airpremia-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── cloudflare-one-se-2026/
│   ├── openai-codex-korea-2026/
│   ├── gitlab-apac-security-2026/
│   └── security-ir-2026/
└── apps/
    └── job-dashboard/        # Cloudflare Worker 대시보드
        ├── API_REFERENCE.md
        ├── DEPLOYMENT_GUIDE.md
        ├── DEVELOPMENT_GUIDE.md
        ├── DIAGRAMS.md
        ├── OWNERS
        ├── README.md
        ├── SECRETS.md
        ├── migrate-json-to-d1.cjs
        ├── migration-data.sql
        ├── package.json
        ├── schema.sql
        ├── tsconfig.json
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

> 위 트리는 저장소 최상위에서 직접 관찰 가능한 항목만 반영합니다. 워크스페이스 패키지(`apps/portfolio`, `apps/job-server`, `packages/*`) 및 기타 영역(`tools/`, `tests/`, `docs/`, `infrastructure/`, `supabase/`, `third_party/`)은 루트의 `AGENTS.md`에서 정식 위치를 확인할 수 있습니다.

---

## 빠른 시작 / Quick Start

### 사전 요구 사항 / Prerequisites

| 도구 / Tool | 버전 / Version | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22.x | 워크스페이스 빌드, 테스트, 스크립트 |
| npm | 10.x+ | `package-lock.json` 기반 워크스페이스 설치 |
| Python | 3.x | `ta/` PPTX 생성 스크립트 |
| Go | 1.22+ | `tools/scripts` 빌드/동기화 도구 |
| Docker | 24.x+ | `mcp-server` 컨테이너 런타임 |
| Wrangler | latest | Cloudflare Worker 배포 |

### 로컬 클론 및 설치 / Clone and install

```bash
git clone <repository-url> resume
cd resume
npm ci
```

### Docker로 MCP 서버 실행 / Run the MCP server with Docker

```bash
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/health
```

### 포트폴리오 로컬 미리보기 / Local portfolio preview

```bash
cd apps/portfolio
wrangler dev
```

### 데이터 동기화 / Sync data (SSoT)

```bash
npm run sync:all
```

---

## 설정 / Configuration

### 환경 변수 / Environment variables

| 키 / Key | 필수 / Required | 용도 / Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | 런타임 모드 (`development` / `production`) |
| `PORT` | yes (Docker) | 컨테이너 내부 HTTP 포트 (기본 `3000`) |
| `.env` | yes (Docker) | MCP 서버 환경 파일 (docker-compose `env_file`) |

`packages/env`는 Zod 기반 런타임 환경 검증을 제공합니다. 자세한 키 목록은 `packages/env` 패키지의 자체 문서를 참고하세요.

### TypeScript / 빌드 설정 / Build configuration

- `tsconfig.base.json` — 엄격(strict) 모드가 적용된 워크스페이스 공통 베이스.
- `tsconfig.json` — 루트 프로젝트 참조.
- `apps/job-dashboard/tsconfig.json` — 대시보드 패키지 빌드 설정.

### Linting / Formatting

- `eslint.config.cjs` — 플랫 ESLint 설정.
- `tsconfig.base.json` — TypeScript 컴파일러 옵션의 단일 진실 공급원.

### 보안 / Security

- `SECRETS.md` (앱별) — 시크릿 관리 절차.
- `tools/scripts/onepassword/` — 1Password 기반 로컬 시크릿/세션 복원 스크립트.
- `.env` 파일은 커밋 금지.

---

## 명령어 레퍼런스 / Commands Reference

루트 `package.json`은 워크스페이스 전체의 단일 명령 허브입니다. 주요 스크립트는 다음과 같습니다.

| 명령 / Command | 설명 / Description |
| --- | --- |
| `npm run strip-exif` | `apps/portfolio/src/images`의 PNG/WebP EXIF 메타데이터 제거 |
| `npm run sync:data` | `packages/data` SSoT JSON 동기화 (`tools/scripts/utils/sync-resume-data.js`) |
| `npm run sync:pptx` | 신한 PPTX 재생성 (`tools/scripts/build/generate_shinhan_pptx.py`) |
| `npm run sync:pdf` | Go 기반 PDF 생성기로 마스터 PDF 빌드 |
| `npm run sync:all` | `sync:data` → `sync:pdf` → `sync:pptx` 순차 실행 |
| `npm run sync:proposals` | 제안 검토 CLI + Go 측 적용 (`apply-proposals.go`) |
| `npm run op:run` | 1Password 운영 CLI (`tools/scripts/onepassword/run`) |
| `npm run op:native:run` | 1Password 네이티브 모드 실행 |
| `npm run op:seed:resume` | 1Password 레쥬메 시드 |
| `npm run op:seed:sessions` | 1Password 세션 시드 |
| `npm run op:restore:sessions` | 1Password 세션 복원 |
| `npm run enrich:github` | GitHub 정보 보강 (`tools/scripts/enrichment/github`) |
| `npm run enrich:skills` | 스킬 정보 보강 (`tools/scripts/enrichment/skills`) |
| `npm run enrich:ai` | AI 보강 (`tools/scripts/enrichment/ai`) |
| `npm run enrich:all` | 위 세 보강 스크립트 순차 실행 |
| `npm run automate:ssot` | 데이터/PDF 동기화 + 빌드 + 타입체크 + Node 테스트 |
| `npm run automate:full` | 전체 동기화 + 린트 + 타입체크 |

> 사용 가능한 `build`, `test`, `lint`, `typecheck`, `test:node` 등 명령은 루트 `package.json`의 `scripts` 블록에서 직접 확인하세요.

---

## 로컬 개발 / Local Development

### 워크스페이스 개발 / Workspace development

```bash
# 의존성 설치
npm ci

# 단일 워크스페이스만 작업할 때
npm --workspace apps/portfolio run dev
npm --workspace apps/job-dashboard run dev
```

### 포트폴리오 빌드 / Portfolio build

```bash
cd apps/portfolio
node generate-worker.js   # worker.js 재생성
wrangler dev              # 로컬 미리보기
wrangler deploy           # Cloudflare에 배포
```

### 대시보드 개발 / Dashboard development

```bash
cd apps/job-dashboard
npm run dev               # 워처 + 미니플라이트
wrangler tail             # 로그 스트리밍
```

### 데이터/산출물 재생성 / Regenerate data and artifacts

```bash
npm run sync:all
```

### 시크릿/세션 / Secrets and sessions

1Password CLI 기반 스크립트는 `tools/scripts/onepassword/`에 위치합니다.

```bash
npm run op:seed:sessions
npm run op:restore:sessions
```

---

## 테스트 / Testing

| 프레임워크 / Framework | 설정 파일 / Config | 용도 / Purpose |
| --- | --- | --- |
| Jest | `jest.config.cjs` | Node 단위/통합 테스트 |
| Playwright | `playwright.config.js` | E2E 테스트 |
| ESLint | `eslint.config.cjs` | 정적 분석 |
| lychee | `lychee.toml` | 링크 검증 |

```bash
npm run test            # Jest
npm run test:node       # Node 전용 테스트
npm run lint
npm run typecheck
```

---

## 배포 / Deployment

| 대상 / Target | 도구 / Tool | 비고 / Notes |
| --- | --- | --- |
| `apps/portfolio` | Wrangler (`wrangler.jsonc`) | Cloudflare Workers Builds가 운영 배포 권위 |
| `apps/job-dashboard` | Wrangler | fetch/queue/scheduled 핸들러 일괄 배포 |
| `apps/job-server` | Docker (`docker compose`) | `mcp-server` 서비스로 기동 |

```bash
# 포트폴리오/대시보드
cd apps/portfolio   && wrangler deploy
cd apps/job-dashboard && wrangler deploy

# MCP 서버
docker compose up -d --build
```

`apps/job-dashboard/DEPLOYMENT_GUIDE.md`에서 단계별 절차와 환경별 변수 매트릭스를 확인하세요.

---

## 기여 / Contribution

1. 변경 전 `AGENTS.md`와 작업 영역의 하위 `AGENTS.md`를 반드시 읽습니다.
2. `docs/conventions/architecture-rules.md`의 200 LOC 규칙, 명명 규칙, 자동화 SSoT 규칙을 준수합니다.
3. 브랜치를 생성하고 변경에 집중된 커밋 메시지를 작성합니다.
4. `npm run lint && npm run typecheck && npm run test`를 로컬에서 통과시킵니다.
5. PR 본문에 동기화된 산출물(예: `applications/*`)의 영향을 명시합니다.
6. 자세한 절차는 저장소 루트의 `CONTRIBUTING.md`를 따릅니다.

For contributions: read `AGENTS.md` and any package-local `AGENTS.md`, follow `docs/conventions/architecture-rules.md`, keep changes scoped, and ensure `lint`/`typecheck`/`test` pass locally before opening a PR.

---

## 라이선스 / License

이 저장소는 사설이며 별도의 공개 라이선스를 부여하지 않습니다. 자세한 사항은 [`LICENSE`](LICENSE) 파일을 참고하세요.

This repository is private and ships under the terms described in [`LICENSE`](LICENSE). No public license is granted by default.