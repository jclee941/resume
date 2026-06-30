# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability.

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
- [기여 / 기여](#기여--contribution)
- [라이선스 / License](#라이선스--license)

---

## Overview / 개요

`package.json`의 `description` 필드는 이 모노레포를 다음과 같이 정의합니다.

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability.

핵심 가치 / Core values:

- **단일 진실 공급원 (SSoT)** — 이력, 프로필, 스킬, 직무 데이터는 `packages/data`에서 한 번 정의되고 포트폴리오, 이력서 PDF, PPTX, 운영 대시보드 등 모든 산출물로 자동 동기화됩니다.
- **엣지 우선 포트폴리오** — `apps/portfolio`는 Cloudflare Worker(`wrangler.jsonc`)에서 동작하며, HTML·자산·번들을 빌드 산출물로 정적 제공합니다.
- **자동화 런타임** — `apps/job-server`는 MCP 호환 자동화 서버로 Wanted·JobKorea 등 채용 플랫폼 클라이언트, 크롤러, 자동 지원 스크립트를 제공합니다.
- **운영 대시보드** — `apps/job-dashboard`는 Cloudflare Worker 위에서 fetch / queue / scheduled 핸들러를 통해 신청/리뷰/승인 워크플로를 운영합니다.
- **계약 중심 패키지** — `packages/{types,schemas,contracts}`는 도메인 타입과 Zod 스키마, OpenAPI 명세를 한 곳에 모아 워크스페이스 전반의 계약을 고정합니다.

대상 사용자 / Intended audience:

| 사용자 그룹 / Audience | 활용 영역 / Used for |
| --- | --- |
| 본인 운영자 (Owner) | SSoT 갱신, PDF/PPTX 산출물 재생성, 자동화 워커 운영 |
| 채용 담당자 (Reviewer) | `applications/` 하위의 직무별 이력서·커버레터·HTML/PDF 미리보기 열람 |
| 동료 개발자 (Reviewer/PR) | 워크스페이스 변경의 영향 범위를 추적하고 변경 계약 준수 검토 |

---

## 주요 기능 / Features

| 기능 / Feature | 제공 위치 / Where | 설명 / Description |
| --- | --- | --- |
| Edge Portfolio | `apps/portfolio/` | Cloudflare Worker에서 정적 자산과 라우트 처리. `worker.js`는 `entry.js`·HTML·`lib/`·데이터 모듈로부터 자동 생성됩니다. |
| Job Automation Runtime | `apps/job-server/` | Node 22 MCP 호환 자동화 서버. 크롤러, 자동 지원, 플랫폼 클라이언트, 동기화 스크립트를 포함합니다. |
| Operations Dashboard | `apps/job-dashboard/` | Worker fetch / queue / scheduled 오케스트레이터. 신청·리뷰·승인 API와 워크플로를 제공합니다. |
| SSoT Resume Data | `packages/data/` | `resumes/master/resume_data.json`을 권위 소스로 두어 모든 산출물이 동일한 데이터에서 파생됩니다. |
| Type / Schema / Contract | `packages/{types,schemas,contracts}/` | 도메인 JSDoc/TS 타입, Zod 런타임 스키마, OpenAPI 명세를 단일 출처로 관리합니다. |
| Shared Utilities | `packages/{shared,env}/` | 로거, 재시도, 암호화, 레이트 리미트, 브라우저 헬퍼, 런타임 환경 검증 모듈. |
| Operator CLI | `packages/cli/` | 운영자가 자동화 워커, 대시보드, 동기화 파이프라인을 호출하는 단일 진입점. |
| Per-role Application Packets | `applications/` | 직무별 이력서 PDF/HTML, 커버레터, 미리보기 PNG, 지원 가이드 모음. |
| TA Profile Generation | `ta/` | Python 기반 PPTX 검토·개선·생성 스크립트와 출력 디렉터리. |
| Self-hosted Container | `Dockerfile`, `docker-compose.yml` | 멀티스테이지 Node 22 Alpine 이미지로 `job-server`를 3000 포트에 노출하고 헬스체크를 수행합니다. |

---

## 아키텍처 / Architecture

### 런타임 토폴로지 / Runtime topology

| 컴포넌트 / Component | 환경 / Runtime | 진입점 / Entry point | 책임 / Responsibility |
| --- | --- | --- | --- |
| `apps/portfolio` | Cloudflare Worker | 생성된 `worker.js` (소스: `entry.js`) | 정적 포트폴리오 페이지 제공 |
| `apps/job-dashboard` | Cloudflare Worker | `src/index.js` (`fetch`/`queue`/`scheduled`) + `src/router.js` | 대시보드 API, 큐 컨슈머, 워크플로 |
| `apps/job-server` | Node 22 (Docker 컨테이너) | `src/server/index.js` (Fastify) | MCP 자동화, 크롤러, 동기화 스크립트 |
| `packages/cli` | Node CLI | npm 워크스페이스 패키지 | 운영 명령 단일 진입점 |
| `packages/data` | Node 패키지 | `resumes/master/` JSON | SSoT 레쥬메 콘텐츠 |

### 요청 흐름 / Request flow

1. 방문자가 Cloudflare 엣지에서 `apps/portfolio`의 정적 페이지를 수신합니다.
2. 운영자는 `packages/cli`를 통해 `apps/job-server`에 MCP 요청을 보내 자동화 작업을 트리거합니다.
3. `apps/job-server`는 크롤러·플랫폼 클라이언트·자동 지원 스크립트를 실행하고 결과를 SSoT/대시보드에 기록합니다.
4. 운영자가 대시보드(`apps/job-dashboard`)에서 신청 상태를 조회하거나 워크플로(`queue`/`scheduled`)를 실행합니다.
5. 변경된 SSoT 데이터는 다시 PDF / PPTX / 포트폴리오 자산으로 재동기화됩니다 (`sync:all`).

### 데이터 흐름 / Data flow

- `packages/data`의 JSON이 권위 원본입니다.
- `packages/types` → `packages/schemas` → `packages/contracts` 순서로 도메인을 검증·문서화합니다.
- `packages/shared`가 로깅·재시도·암호화·레이트 리미트 등 횡단 관심사를 제공합니다.
- `tools/scripts/`의 Go / Python / Node 스크립트가 데이터 → PDF / PPTX / 이력서 HTML 변환을 담당합니다.

### 컨테이너 토폴로지 / Container topology

| 서비스 / Service | 이미지 / Image | 포트 / Port | 볼륨 / Volume | 헬스체크 / Healthcheck |
| --- | --- | --- | --- | --- |
| `mcp-server` (resume-mcp-server) | root `Dockerfile` (`deps` → `runtime`) | `3000:3000` | `job_automation_data:/app/apps/job-server/.data` | `GET /health` (30s 주기, 5s 타임아웃, 20s 시작 대기, 3회 재시도) |

---

## 저장소 구조 / Repository Structure

루트 최상위 경로만 정확히 반영합니다. 워크스페이스의 자세한 디렉터리는 각 패키지 및 하위 가이드를 참고하십시오.

```text
./
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
├── package.json
├── package-lock.json
├── playwright.config.js
├── redocly.yaml
├── tsconfig.base.json
├── tsconfig.json
├── wrangler.jsonc
├── applications/         # per-role application packets and run logs
├── apps/                 # portfolio, job-server, job-dashboard workspaces
├── packages/             # cli, data, env, shared, types, schemas, contracts
├── tools/                # CI/build/deploy/verification scripts
├── tests/                # Jest, Node, Playwright suites
├── infrastructure/       # Cloudflare, DB, monitoring, system automation
├── docs/                 # ADRs, architecture, conventions, guides, security
├── supabase/functions/   # Deno edge functions
├── third_party/          # npm-managed vendored material
└── ta/                   # Python/PPTX TA profile generation
```

워크스페이스 목록은 `package.json`의 `workspaces` 필드가 단일 출처입니다:

```text
apps/{portfolio,job-server,job-dashboard}
packages/{cli,data,shared,types,schemas,contracts,env}
```

`apps/job-dashboard`는 본 모노레포의 운영 대시보드 워커로, 다음 최상위 파일을 포함합니다.

```text
apps/job-dashboard/
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
    ├── middleware/{cors.js,csrf.js,rate-limit.test.js}
    └── routes/{admin.js,applications.js,auth.js,automation.js,health.js}
```

---

## 빠른 시작 / Quick Start

### 사전 요구 사항 / Prerequisites

| 요구 사항 / Requirement | 권장 버전 / Recommended |
| --- | --- |
| Node.js | 22 (Alpine Dockerfile 기준) |
| npm | workspaces + lockfile 사용 |
| Docker / Compose | 최신 stable (`docker-compose.yml` v2 계열 호환) |
| Wrangler | Cloudflare Worker 배포용 (`wrangler.jsonc`) |
| Python 3 | `ta/`의 PPTX 스크립트 실행 시 |
| Go | `tools/scripts/`의 동기화/검증 스크립트 실행 시 |

### 컨테이너로 실행 / Run via Docker

```bash
# .env 파일은 1Password 등 외부 시크릿 매니저에서 export 후 사용
docker compose up --build
```

`Dockerfile`은 `deps` → `runtime` 2단계로 빌드하며, 최종 이미지는 `apps/job-server`만 포함합니다. 컨테이너는 `http://127.0.0.1:3000/health`로 헬스체크 신호를 보내고 정상 응답이 아니면 재시작됩니다.

### 로컬 워크스페이스 설치 / Install workspaces

```bash
npm ci            # 루트 lockfile 기준 워크스페이스 일괄 설치
```

### 첫 산출물 생성 / Generate first artifacts

```bash
npm run sync:all  # data → PDF → PPTX 순서로 동기화
```

자세한 명령은 [명령어 레퍼런스](#명령어-레퍼런스--commands-reference)를 참조하십시오.

---

## 설정 / Configuration

### 환경 변수 / Environment variables

비밀 값은 `apps/job-server/.data` 외에는 저장소에 커밋하지 않습니다. 로컬에서는 `tools/scripts/onepassword/` 하위의 시드/복원 스크립트(`op:seed:sessions`, `op:restore:sessions` 등)를 통해 1Password 클라이언트에서 가져옵니다.

| 영역 / Area | 예시 키 / Examples | 출처 / Source |
| --- | --- | --- |
| 런타임 포트 | `PORT=3000` | `Dockerfile` 기본값 |
| 노드 모드 | `NODE_ENV=production` | `Dockerfile`, `docker-compose.yml` |
| 자격/세션 | 플랫폼 세션 쿠키, 토큰 | `tools/scripts/onepassword/` |
| Cloudflare | Account ID, API 토큰, KV/D1 ID | `wrangler.jsonc`, `apps/job-dashboard/` 배포 가이드 |
| 검증 | `validateEnv()` 입력 | `packages/env` |

### 설정 파일 / Configuration files

| 파일 / File | 역할 / Role |
| --- | --- |
| `wrangler.jsonc` | Cloudflare Worker 설정 (계정, 진입점, 바인딩) |
| `tsconfig.base.json`, `tsconfig.json` | TypeScript strict 모드 베이스/루트 |
| `eslint.config.cjs` | 워크스페이스 공통 린트 규칙 |
| `jest.config.cjs` | 단위/통합 테스트 러너 |
| `playwright.config.js` | E2E 테스트 러너 |
| `redocly.yaml` | OpenAPI 린트 (`packages/contracts`) |
| `lychee.toml` | 링크 검사 정책 |
| `docker-compose.yml` | 로컬 컨테이너 토폴로지 |
| `Dockerfile` | 멀티스테이지 빌드 정의 |

---

## 명령어 레퍼런스 / Commands Reference

`package.json`은 본 모노레포의 단일 명령 허브입니다. 모든 명령은 루트에서 실행합니다.

### 동기화 / Sync

| 명령 / Command | 목적 / Purpose |
| --- | --- |
| `npm run sync:data` | `packages/data` SSoT를 다른 워크스페이스로 동기화 |
| `npm run sync:pptx` | `ta/` 또는 `tools/scripts/build/`의 PPTX 생성기를 실행 |
| `npm run sync:pdf` | `tools/scripts/build/pdf-generator.go`로 PDF 마스터 생성 |
| `npm run sync:all` | 위 세 단계를 순차 실행 |
| `npm run sync:proposals` | proposal 검토 CLI + Go 적용 스크립트 실행 |

### 시크릿 / 1Password

| 명령 / Command | 목적 / Purpose |
| --- | --- |
| `npm run op:run` | `tools/scripts/onepassword/run` 실행 |
| `npm run op:native:run` | 1Password 네이티브 런타임 진입 |
| `npm run op:seed:resume` | 레쥬메 시드 데이터 주입 |
| `npm run op:seed:sessions` | 플랫폼 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |

### 데이터 보강 / Enrichment

| 명령 / Command | 목적 / Purpose |
| --- | --- |
| `npm run enrich:github` | GitHub 프로필/저장소 메타 보강 |
| `npm run enrich:skills` | 기술 스택 메타 보강 |
| `npm run enrich:ai` | AI 보조 메타데이터 보강 |
| `npm run enrich:all` | 위 세 단계를 순차 실행 |

### 자산 정리 / Asset hygiene

| 명령 / Command | 목적 / Purpose |
| --- | --- |
| `npm run strip-exif` | `apps/portfolio/src/images/` 내 PNG/WEBP에서 EXIF 메타 제거 |

### 파이프라인 / Pipeline drivers

| 명령 / Command | 목적 / Purpose |
| --- | --- |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + 노드 테스트를 순차 실행 |
| `npm run automate:full` | 동기화 + 린트 + 타입체크 등 더 넓은 검증 파이프라인 |

기타 표준 워크플로(`npm run build`, `npm run typecheck`, `npm run test:node`, `npm run lint` 등)는 `package.json` 루트에서 정의되며, 각 워크스페이스의 `package.json`에 위임됩니다.

---

## 로컬 개발 / Local Development

### 워크플로 요약 / Workflow summary

1. 루트에서 `npm ci`로 워크스페이스 의존성을 설치합니다.
2. 1Password 또는 동등한 시크릿 소스에서 `.env`를 준비합니다.
3. `npm run sync:all`로 SSoT → PDF/PPTX 산출물을 재동기화합니다.
4. 변경 대상 워크스페이스(`apps/portfolio` 또는 `apps/job-dashboard`)에서 `wrangler dev`로 로컬 에지 런타임을 띄웁니다.
5. `apps/job-server`는 Fastify 기반이므로 로컬에서는 `node src/server/index.js` 또는 Docker로 띄웁니다.
6. 변경 후 `npm run lint`, `npm run typecheck`, `npm run test:node`로 검증합니다.

### 워크스페이스별 진입점 / Workspace entries

| 패키지 / Package | 진입점 / Entry | 실행 / Run |
| --- | --- | --- |
| `apps/portfolio` | `entry.js` → 생성된 `worker.js` | `wrangler dev` |
| `apps/job-dashboard` | `src/index.js`, `src/router.js` | `wrangler dev` |
| `apps/job-server` | `src/server/index.js` | `node src/server/index.js` 또는 `docker compose up mcp-server` |
| `packages/cli` | npm 패키지 진입점 | `node packages/cli/bin/...` (워크스페이스 심볼릭 링크) |

### 변경 영향 추적 / Change impact

| 변경 위치 / Where | 재실행 권장 / Re-run |
| --- | --- |
| `packages/data` JSON 수정 | `npm run sync:all`, `npm run strip-exif` |
| `packages/types` / `packages/schemas` | 영향 받는 워크스페이스 `npm run build && npm run test:node` |
| `packages/contracts` OpenAPI | `redocly` 린트 + 컨슈머 워크스페이스 검증 |
| `wrangler.jsonc` 변경 | 해당 Worker `wrangler dev` / 배포 dry-run |

---

## 테스트 / Testing

| 레이어 / Layer | 러너 / Runner | 위치 / Location |
| --- | --- | --- |
| 단위 / Node | Jest (root `jest.config.cjs`) | `tests/`, 각 워크스페이스 |
| 미들웨어 단위 | Jest (`rate-limit.test.js` 등) | `apps/job-dashboard/src/middleware/` |
| E2E | Playwright (root `playwright.config.js`) | `tests/e2e/` |
| 링크 검사 | lychee | `lychee.toml` |
| OpenAPI 린트 | Redocly CLI | `redocly.yaml` |
| 타입 검사 | TypeScript strict | `tsconfig.base.json`, `tsconfig.json` |
| 린트 | ESLint (flat config) | `eslint.config.cjs` |

핵심 명령:

```bash
npm run lint
npm run typecheck
npm run test:node
```

---

## 배포 / Deployment

| 대상 / Target | 진입점 / Entry | 방법 / Method |
| --- | --- | --- |
| `apps/portfolio` | `worker.js` (자동 생성) | `wrangler deploy` (`wrangler.jsonc`) |
| `apps/job-dashboard` | `src/index.js`, `src/router.js`, queue/scheduled | `wrangler deploy` |
| `apps/job-server` | `src/server/index.js` | Docker (`Dockerfile`, `docker-compose.yml`) 또는 Node 프로세스 |

- Cloudflare Worker 배포 권한은 Cloudflare 대시보드와 Wrangler 토큰에 있습니다. `.env`의 `CLOUDFLARE_*` 키를 사용합니다.
- 컨테이너 헬스체크는 `GET /health`로 `127.0.0.1:3000`을 30초 주기로 점검합니다 (`Dockerfile`, `docker-compose.yml`).
- DB 마이그레이션은 `apps/job-dashboard/{schema.sql, migrations/*.sql}`로 추적되며 `migrate-json-to-d1.cjs`로 구 데이터에서 이행합니다.

각 워크스페이스의 세부 절차는 다음 문서를 참조하십시오.

- `apps/job-dashboard/DEPLOYMENT_GUIDE.md`
- `apps/job-dashboard/DIAGRAMS.md`
- `apps/job-dashboard/API_REFERENCE.md`
- `apps/job-dashboard/SECRETS.md`
- `applications/*/application-guide.md`

---

## 기여 / Contribution

1. 변경 전 `docs/conventions/architecture-rules.md`(특히 200 LOC 규칙·네이밍·자동화 SSoT·스크립트 언어 정책)를 확인합니다.
2. 영향 받는 워크스페이스에서 작업합니다. 모듈로 코드를 분할하여 200 LOC 규칙을 유지합니다.
3. `npm run lint && npm run typecheck && npm run test:node`를 로컬에서 통과시킵니다.
4. SSoT 데이터(`packages/data`)를 변경하면 `npm run sync:all`로 PDF / PPTX / 대시보드를 재동기화합니다.
5. 변경 사항을 Conventional Commit 형식으로 커밋하고 CHANGELOG를 갱신합니다.
6. PR 본문에 영향 받은 워크스페이스와 검증 명령을 명시합니다.

자세한 절차는 `CONTRIBUTING.md`를 참조하십시오.

---

## 운영 가시성 / Operational observability

| 항목 / Aspect | 위치 / Where |
| --- | --- |
| 헬스 엔드포인트 | `apps/job-server` `/health` (Docker 헬스체크) |
| 대시보드 헬스 | `apps/job-dashboard/src/routes/health.js` |
| 워커 큐/스케줄 트리거 | `apps/job-dashboard/src/index.js` |
| 로깅 | `packages/shared` 로거 |
| OpenAPI 계약 | `packages/contracts` (Redocly 린트) |
| 시크릿 감사 | `tools/scripts/onepassword/` |

---

## 라이선스 / License

본 저장소는 사설이며 [`LICENSE`](./LICENSE)에 정의된 개인 라이선스를 따릅니다. 외부 배포나 2차 사용을 제한할 수 있습니다. 자세한 내용은 라이선스 전문을 참조하십시오.

This repository is private and distributed under the terms defined in [`LICENSE`](./LICENSE). External redistribution or reuse may be restricted; see the license text for details.