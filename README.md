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
- **엣지 우선 포트폴리오** — `apps/portfolio`는 Cloudflare Worker 기반의 글로벌 엣지 배포로 정적 자산과 API를 동시에 제공합니다.
- **채용 자동화** — `apps/job-server`는 Wanted, JobKorea 등 국내 채용 플랫폼과 상호작용하는 MCP 서버, 크롤러, 자동 지원 워크플로를 운영합니다.
- **운영 대시보드** — `apps/job-dashboard`는 Worker 환경에서 동작하는 fetch/queue/scheduled 핸들러와 마이그레이션, 라우터를 제공합니다.
- **자체 호스팅 옵저버빌리티** — 모든 워크플로 로그는 로컬 볼륨과 구조화 로거를 통해 추적 가능하며, 1Password 기반 시크릿 회전을 지원합니다.

대상 사용자 / Who uses it:

- 저장소 소유자(이재철) — 개인 포트폴리오 운영 및 채용 파이프라인 관리
- 검토자 / 면접관 — 사전 생성된 직무별 지원 패키지(`applications/`), 자기소개서, 이력서 PDF, TA 프레젠테이션 검토
- 협업 운영자 — 대시보드를 통한 자동화 상태 모니터링 및 수동 개입

---

## 주요 기능 / Features

| 영역 / Area | 기능 / Feature | 위치 / Location |
| --- | --- | --- |
| Edge portfolio | Cloudflare Worker 정적 사이트 + `/job/*` 인-프로세스 라우터 | `apps/portfolio/` |
| SSoT content | 마스터 이력/프로필 JSON에서 모든 산출물 자동 생성 | `packages/data/` |
| Job automation | MCP 서버, Wanted/JobKorea 크롤러, 자동 지원 스크립트 | `apps/job-server/` |
| Operations dashboard | Worker fetch/queue/scheduled 핸들러, 관리 라우트, 워크플로 | `apps/job-dashboard/` |
| Document generation | PDF 이력서, PPTX TA 프레젠테이션 빌더 (Go + Python) | `tools/scripts/build/`, `ta/` |
| Domain types | JSDoc/TS 캐노니컬 도메인 타입 | `packages/types/` |
| Runtime validation | Zod 스키마 기반 런타임 검증 | `packages/schemas/` |
| API contracts | OpenAPI + Worker env 계약 | `packages/contracts/` |
| Environment validation | 워크스페이스 공통 env 스키마 | `packages/env/` |
| Shared utilities | 에러, 로거, 재시도, 암호화, 레이트 리미트, 인증, 클라이언트 | `packages/shared/` |
| Operator CLI | 운영자가 호출하는 CLI 도구 | `packages/cli/` |
| Local secret mgmt | 1Password 통합 + 세션 파일 마이그레이션 | `tools/scripts/onepassword/` |
| Application packets | 직무별 이력서, 자기소개서, 가이드, 미리보기 | `applications/` |

---

## 아키텍처 / Architecture

### 상위 구조 / High-level layout

이 모노레포는 다음 네 개의 논리 계층으로 구성됩니다.

1. **Edge / Presentation** — Cloudflare Worker에서 동작하는 포트폴리오와 대시보드
2. **Automation Runtime** — Node 기반 MCP 서버와 워커 큐 컨슈머
3. **Data & Contracts** — 타입, 스키마, OpenAPI, env 검증으로 구성된 도메인 계층
4. **Tooling** — 동기화(SSoT), 빌드(PDF/PPTX), 검증(링크/스키마), 배포 스크립트

### 워크스페이스 / Workspaces

`package.json`의 `workspaces` 필드는 다음 패키지를 선언합니다.

| 워크스페이스 / Workspace | 종류 / Kind | 역할 / Role |
| --- | --- | --- |
| `apps/portfolio` | app | Cloudflare Worker 포트폴리오 (공개 사이트 + `/job/*` 라우터) |
| `apps/job-server` | app | MCP 서버, 크롤러, 자동 지원 런타임 |
| `apps/job-dashboard` | app | 대시보드 Worker + Queue + Workflow + 마이그레이션 |
| `packages/cli` | package | 운영자 CLI |
| `packages/data` | package | 이력/프로필 SSoT 데이터 |
| `packages/shared` | package | 공통 유틸(로거, 에러, 클라이언트 등) |
| `packages/types` | package | JSDoc/TS 도메인 타입 |
| `packages/schemas` | package | Zod 런타임 스키마 |
| `packages/contracts` | package | OpenAPI + Worker env 계약 |
| `packages/env` | package | 환경 변수 검증 |

### 요청 흐름 / Request flow

1. 클라이언트가 Cloudflare 엣지에 도달하면 `apps/portfolio`의 라우터가 요청을 분기합니다.
2. 공개 페이지는 정적 자산으로 응답하고, `/job/*` 경로는 인-프로세스 대시보드 라우터로 위임됩니다.
3. 자동화 액션은 `apps/job-server`의 MCP 엔드포인트로 전달되어 크롤러 또는 자동 지원 워크플로를 호출합니다.
4. 모든 상태 전이는 D1/SQLite 마이그레이션(`apps/job-dashboard/migrations/`, `schema.sql`)과 큐 컨슈머(`queue-consumer.js`)로 추적됩니다.
5. 산출물(이력서 PDF, PPTX TA)은 `packages/data`의 SSoT에서 빌드 스크립트를 통해 재생성됩니다.

### 런타임 표면 / Runtime surface

| 컴포넌트 / Component | 진입점 / Entry | 실행 환경 / Runtime | 책임 / Responsibility |
| --- | --- | --- | --- |
| Portfolio Worker | `apps/portfolio/worker.js` (생성됨) | Cloudflare Workers | 공개 사이트 + `/job/*` 라우팅 |
| Job Server | `apps/job-server/src/server/index.js` | Node 22 (Docker) | MCP 서버, 크롤러, 자동 지원 |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | Cloudflare Workers | 대시보드 fetch/queue/scheduled |
| Queue consumer | `apps/job-dashboard/src/queue-consumer.js` | Cloudflare Workers | 비동기 작업 처리 |
| MCP server (compose) | `docker-compose.yml` `mcp-server` | Docker | 단일 컨테이너 운영 |

상세 다이어그램은 각 앱의 `DIAGRAMS.md` 및 `docs/` 디렉터리를 참조하십시오.

---

## 저장소 구조 / Repository Structure

루트 레벨의 실제 디렉터리/파일 레이아웃은 다음과 같습니다.

```text
.
├── AGENTS.md                 # 저장소 지식 베이스 / repo knowledge base
├── CHANGELOG.md              # 버전별 변경 이력
├── CONTRIBUTING.md           # 기여 가이드
├── Dockerfile                # job-server 멀티스테이지 빌드
├── LICENSE                   # 사설 라이선스
├── OWNERS                    # 코드 오너십 명단
├── ProfileView.jpg           # 프로필 이미지 자산
├── README.md                 # 본 문서
├── docker-compose.yml        # mcp-server 서비스 정의
├── eslint.config.cjs         # ESLint 구성
├── jest.config.cjs           # Jest 구성
├── lychee.toml               # 링크 검사기 구성
├── package.json              # 워크스페이스 루트 + 명령 허브
├── package-lock.json         # 잠금 파일
├── playwright.config.js      # Playwright E2E 구성
├── redocly.yaml              # OpenAPI 린트 구성
├── tsconfig.base.json        # 공유 TS 컴파일 옵션
├── tsconfig.json             # 루트 TS 프로젝트 참조
├── wrangler.jsonc            # Cloudflare Worker 구성
├── ta/                       # Python/PPTX TA 프로필 생성
│   ├── improve_visual.py     # 시각 자료 개선 스크립트
│   ├── inspect.py            # PPTX 구조 검사기
│   ├── verify.py             # 생성 결과 검증기
│   ├── *.pptx                # 입력 프레젠테이션
│   └── output/               # 검증 보고서 및 산출물
├── applications/             # 직무별 지원 패키지
│   ├── airpremia-security-2026/
│   ├── cloudflare-one-se-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── gitlab-apac-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── openai-codex-korea-2026/
│   └── security-ir-2026/
└── apps/
    └── job-dashboard/        # 대시보드 Worker (자체 README/문서 보유)
        ├── API_REFERENCE.md
        ├── DEPLOYMENT_GUIDE.md
        ├── DEVELOPMENT_GUIDE.md
        ├── DIAGRAMS.md
        ├── SECRETS.md
        ├── schema.sql         # D1 스키마
        ├── migrate-json-to-d1.cjs
        ├── migrations/        # SQL 마이그레이션
        └── src/               # 라우터, 미들웨어, 핸들러
```

`AGENTS.md`는 `packages/`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/` 등 추가 디렉터리를 언급합니다. 각 하위 디렉터리의 자체 `README.md` 또는 `AGENTS.md`를 우선적으로 참조하십시오.

---

## 빠른 시작 / Quick Start

### 사전 요구 사항 / Prerequisites

| 도구 / Tool | 최소 버전 / Min version | 용도 / Purpose |
| --- | --- | --- |
| Node.js | 22 | 워크스페이스 런타임 (`Dockerfile`, `package.json` 기준) |
| npm | 10 | 워크스페이스 설치 (`npm ci`) |
| Docker | 24+ | 로컬에서 `mcp-server` 실행 |
| Wrangler | 최신 | Cloudflare Worker 로컬/원격 배포 |
| Go | 1.22+ | PDF 생성 및 동기화 스크립트 |
| Python | 3.11+ | TA PPTX 생성 (`ta/`) |
| exiftool | 선택 / optional | 이미지 메타데이터 제거 (`strip-exif`) |

### 첫 설치 / First install

```bash
# 1. 워크스페이스 의존성 설치
npm ci

# 2. 환경 변수 파일 준비 (1Password CLI 또는 사내 시크릿 매니저 사용 권장)
cp .env.example .env  # 실제 템플릿이 없는 경우 README의 "설정" 섹션 참조

# 3. 로컬 옵션: Docker로 MCP 서버 기동
docker compose up -d mcp-server
docker compose ps  # healthcheck 통과 확인
```

### 첫 빌드 / First build

```bash
# SSoT 데이터 → 모든 산출물 동기화 (data + pdf + pptx)
npm run sync:all

# 포트폴리오 Worker 번들 생성 (apps/portfolio/worker.js)
npm run build --workspace apps/portfolio

# 타입 체크 및 린트
npm run typecheck
npm run lint
```

### 첫 실행 / First run

```bash
# 포트폴리오 로컬 미리보기 (Wrangler)
npx wrangler dev --config wrangler.jsonc

# 대시보드 로컬 미리보기
npm run dev --workspace apps/job-dashboard

# MCP 서버 (Docker compose)
docker compose logs -f mcp-server
```

---

## 설정 / Configuration

### 환경 변수 / Environment variables

`.env` 파일은 docker-compose의 `env_file`로 자동 주입됩니다. 운영 환경에서는 1Password CLI(`tools/scripts/onepassword/`)를 통해 시크릿을 로드합니다.

| 변수 / Var | 필수 / Required | 용도 / Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | 런타임 모드 (`production` 권장) |
| `PORT` | yes | job-server 컨테이너 포트 (기본 `3000`) |
| `CLOUDFLARE_*` | yes | Worker 배포 토큰/계정 ID (`wrangler.jsonc` 참조) |
| `DB_*` | conditional | D1/SQLite 접속 정보 |
| `JOB_PLATFORM_*` | conditional | Wanted/JobKorea 자격 증명 |
| `OP_*` | conditional | 1Password 서비스 계정 토큰 |

### 도구별 구성 파일 / Tool configs

| 파일 / File | 도구 / Tool | 책임 / Responsibility |
| --- | --- | --- |
| `wrangler.jsonc` | Cloudflare Workers | Worker 라우트, 바인딩, 환경 |
| `tsconfig.base.json` | TypeScript | strict 모드, 경로 매핑 |
| `eslint.config.cjs` | ESLint | 코드 스타일 |
| `jest.config.cjs` | Jest | 단위/통합 테스트 |
| `playwright.config.js` | Playwright | E2E 테스트 |
| `redocly.yaml` | Redocly CLI | OpenAPI 린트 |
| `lychee.toml` | lychee | 마크다운 링크 검사 |

### 시크릿 / Secrets

자세한 절차는 `apps/job-dashboard/SECRETS.md` 및 `tools/scripts/onepassword/` 내부 가이드를 따르십시오. 로컬 세션 파일 마이그레이션은 `op:seed:sessions` / `op:restore:sessions` 스크립트를 사용합니다.

---

## 명령어 레퍼런스 / Commands Reference

`package.json`의 `scripts`를 기반으로 한 핵심 명령은 다음과 같습니다. 전체 목록은 `package.json`을 참조하십시오.

### 동기화 파이프라인 / Sync pipelines

| 명령 / Command | 동작 / Action |
| --- | --- |
| `npm run sync:data` | SSoT 데이터를 워크스페이스로 동기화 |
| `npm run sync:pdf` | Go 기반 PDF 이력서 생성 |
| `npm run sync:pptx` | Python 기반 PPTX TA 생성 |
| `npm run sync:all` | data + pdf + pptx 순차 실행 |
| `npm run sync:proposals` | 제안 리뷰 후 적용 (Node + Go) |
| `npm run strip-exif` | 이미지 EXIF 메타데이터 제거 |

### 1Password / 시크릿 / Secrets

| 명령 / Command | 동작 / Action |
| --- | --- |
| `npm run op:run` | 1Password 통합 런타임 |
| `npm run op:native:run` | 1Password 네이티브 실행 |
| `npm run op:seed:resume` | 이력서 시크릿 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |

### Enrichment

| 명령 / Command | 동작 / Action |
| --- | --- |
| `npm run enrich:github` | GitHub 프로필/활동 보강 |
| `npm run enrich:skills` | 스킬 그래프 보강 |
| `npm run enrich:ai` | AI 기반 항목 보강 |
| `npm run enrich:all` | 세 보강 작업 직렬 실행 |

### 자동화 / Automation

| 명령 / Command | 동작 / Action |
| --- | --- |
| `npm run automate:ssot` | sync + build + typecheck + node 테스트 |
| `npm run automate:full` | sync + lint + typecheck + 전체 테스트 |

> 위 명령의 정의는 `package.json`에 따라 변경될 수 있습니다. 정확한 인자/플래그는 저장소 내 `package.json`을 우선하십시오.

### 워크스페이스별 작업 / Workspace tasks

```bash
# 포트폴리오
npm run build --workspace apps/portfolio
npm run dev   --workspace apps/portfolio

# 대시보드
npm run dev   --workspace apps/job-dashboard
npm run test  --workspace apps/job-dashboard

# 잡 서버
npm run start --workspace apps/job-server
```

---

## 로컬 개발 / Local Development

### 권장 워크플로 / Recommended workflow

1. **데이터 변경** — `packages/data/resumes/master/resume_data.json`(또는 동등한 SSoT 파일)을 수정합니다.
2. **동기화** — `npm run sync:all`로 PDF/PPTX/대시보드 데이터를 재생성합니다.
3. **Worker 빌드** — `apps/portfolio/generate-worker.js`가 `worker.js`를 생성합니다. 수동 편집 금지.
4. **로컬 검증** — `npm run typecheck && npm run lint && npm run test:node`를 실행합니다.
5. **로컬 미리보기** — `wrangler dev`로 포트폴리오와 대시보드를 확인합니다.

### MCP 서버 / MCP server

Docker compose 기반 로컬 실행이 권장됩니다.

```bash
docker compose up -d --build mcp-server
docker compose logs -f mcp-server
curl -fsS http://127.0.0.1:${PORT:-3000}/health
```

상태 코드 200이면 헬스체크 통과입니다. 자세한 옵저버빌리티는 `apps/job-server` 내부 문서를 참조하십시오.

### 컨벤션 / Conventions

- **200 LOC 규칙** — 단일 파일은 200줄을 초과하지 않도록 권장 (`docs/conventions/architecture-rules.md`).
- **스크립트 언어 정책** — 빌드/동기화/검증 스크립트는 가능하면 Go로 작성, 데이터 변환 보조는 Python 허용.
- **자동화 SSoT** — 모든 자동화는 `packages/data`를 단일 진실로 사용.
- **네이밍** — 워크스페이스 경계와 export 명명 규칙은 `docs/conventions/` 참조.

### 일반적인 함정 / Common pitfalls

- `apps/portfolio/worker.js`를 직접 수정하지 마십시오 — 항상 `generate-worker.js` 경유.
- 마이그레이션 추가 시 `schema.sql`과 `migrations/*.sql` 양쪽을 모두 갱신하십시오.
- 새 환경 변수는 `packages/env`에 스키마를 추가해야 런타임에서 안전하게 검증됩니다.

---

## 테스트 / Testing

### 계층별 테스트 / Test layers

| 계층 / Layer | 도구 / Tool | 명령 / Command | 위치 / Location |
| --- | --- | --- | --- |
| 단위 / Unit | Jest | `npm test` (또는 `jest.config.cjs`) | 워크스페이스 전반 |
| 노드 통합 / Node integration | Node test runner | `npm run test:node` | `tests/` |
| E2E / End-to-end | Playwright | `npx playwright test` | `tests/e2e/` |
| 링크 검사 / Link check | lychee | `lychee` (`lychee.toml` 사용) | 마크다운 전반 |
| API 계약 / API contract | Redocly | `redocly lint` (`redocly.yaml`) | `packages/contracts/` |
| 정적 분석 / Static | ESLint + tsc | `npm run lint && npm run typecheck` | 워크스페이스 전반 |

### 대시보드 테스트 / Dashboard tests

`apps/job-dashboard/src/middleware/`에는 미들웨어 단위 테스트(`rate-limit.test.js`)가 포함되어 있습니다. 대시보드 전용 API 테스트 절차는 `apps/job-dashboard/API_REFERENCE.md`를 참조하십시오.

### 회귀 테스트 절차 / Regression checklist

1. `npm run sync:all`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npx playwright test`
6. `npx redocly lint`
7. Docker 헬스체크 통과 확인

---

## 배포 / Deployment

### Cloudflare Workers

- **포트폴리오** — `wrangler.jsonc` 기준으로 `apps/portfolio/worker.js`를 엣지에 배포.
- **대시보드** — `apps/job-dashboard/wrangler.jsonc`(존재 시) 기준. 단계별 절차는 `apps/job-dashboard/DEPLOYMENT_GUIDE.md` 참조.

### Docker

`Dockerfile`은 `job-server` 런타임을 위한 멀티스테이지 빌드입니다.

| 스테이지 / Stage | 베이스 / Base | 책임 / Responsibility |
| --- | --- | --- |
| `deps` | `node:22-alpine` | `npm ci --omit=dev`로 프로덕션 의존성 설치 |
| `runtime` | `node:22-alpine` | 워크스페이스 소스 복사 후 `node src/server/index.js` 실행 |

- `EXPOSE 3000`
- `HEALTHCHECK` — `http://127.0.0.1:3000/health`를 30초 간격으로 점검
- `docker-compose.yml`은 동일 이미지를 `resume-mcp-server`라는 단일 서비스로 기동하며 `/app/apps/job-server/.data`를 named volume(`job_automation_data`)에 영속화합니다.

### 환경별 배포 흐름 / Per-env deploy flow

1. PR 단계: `automate:full`로 전체 검증 통과
2. 스테이징: Worker 스테이징 환경 + Docker compose dry-run
3. 프로덕션: Cloudflare Workers Builds가 배포 권위. (`AGENTS.md` 명시)

### 옵저버빌리티 / Observability

| 신호 / Signal | 위치 / Location | 접근 / Access |
| --- | --- | --- |
| 헬스체크 | `Dockerfile`, `docker-compose.yml` | `GET /health` |
| 구조화 로그 | `packages/shared` 로거 | JSON 출력, 컨테이너 stdout |
| 큐 상태 | `apps/job-dashboard` | 대시보드 UI |
| 마이그레이션 히스토리 | `apps/job-dashboard/migrations/` | D1 콘솔 / CLI |

---

## 기여 / Contribution

`CONTRIBUTING.md`를 우선적으로 따르십시오. 핵심 원칙은 다음과 같습니다.

- **변경 단위는 SSoT 우선** — 새 데이터 필드는 `packages/data`에서 시작하여 동기화 스크립트로 전파.
- **타입/스키마 동시 갱신** — `packages/types` 및 `packages/schemas`를 항상 함께 수정.
- **계약 우선 변경** — API 변경 시 `packages/contracts`의 OpenAPI를 먼저 갱신한 뒤 구현.
- **테이트 케이스 동반** — 버그 수정/기능 추가 시 회귀 테스트를 함께 제출.
- **오너십** — 디렉터리별 `OWNERS`/`AGENTS.md`의 책임자 명단을 확인하고 리뷰어를 지정.

### PR 체크리스트 / PR checklist

- [ ] `npm run automate:full` 통과
- [ ] `npx redocly lint` 통과 (API 변경 시)
- [ ] 마이그레이션 추가 시 `schema.sql` 동기화
- [ ] 문서(`README.md`/`AGENTS.md`/`docs/`) 업데이트
- [ ] 새 환경 변수는 `packages/env` 스키마에 등록

---

## 라이선스 / License

이 저장소는 사설(private) 저장소이며 `LICENSE` 파일의 조건을 따릅니다. 외부 배포, 복제, 파생 저작물 작성은 명시적 허가 없이 금지됩니다.

This repository is private and governed by the terms in `LICENSE`. External distribution, reproduction, or derivative works are prohibited without explicit permission.