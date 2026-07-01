# 레쥬메 모노레포 / Resume Portfolio Monorepo

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

> 개인 포트폴리오 사이트, 채용 자동화 워커, 단일 진실 공급원(SSoT) 데이터, 운영 대시보드를 하나의 npm 워크스페이스 모노레포로 통합한 사설 저장소.
> A private npm workspaces monorepo that unifies a personal portfolio site, job automation tooling, a Single Source of Truth (SSoT) data layer, and an operations dashboard under a single, versioned codebase.

## 한눈에 보기 / At a Glance

| 항목 / Item | 값 / Value |
| --- | --- |
| 버전 / Version | `1.40.11` ([package.json](package.json)) |
| 런타임 / Runtime | Node.js 22 (`node:22-alpine`) |
| 배포 타깃 / Deploy target | Cloudflare Workers (portfolio, dashboard), Docker (job-server) |
| 상태 / Status | Private, actively maintained (pre-release / personal project) |
| 라이선스 / License | Private ([LICENSE](LICENSE)) |
| 헬스 체크 / Health check | `GET /health` on port `3000` |

### 운영 흐름 요약 / Operator Flow Summary

1. `packages/data` 의 `resume_data.json` 을 SSoT 로 수정한다.
2. `npm run sync:all` 로 PDF·PPTX·정적 자산을 재생성한다.
3. `apps/portfolio` 의 Worker 를 `wrangler deploy` 로 엣지에 게시한다.
4. `apps/job-dashboard` 의 Worker 와 큐·워크플로로 운영 대시보드를 게시한다.
5. `apps/job-server` 는 Docker 이미지로 빌드해 `docker compose up` 으로 실행한다.
6. 모든 산출물과 런타임 로그는 `applications/` 와 `apps/job-server/.data` 에 보존된다.

### Entry / API at a Glance

| Surface | Entry | Notes |
| --- | --- | --- |
| Portfolio Worker | [apps/portfolio/entry.js](apps/portfolio/entry.js) | Edge router, `worker.js` 는 생성 산출물 |
| MCP / Job runtime | [apps/job-server/src/index.js](apps/job-server/src/index.js) | 크롤러·자동 지원·스크립트 부트스트랩 |
| Fastify server | [apps/job-server/src/server/index.js](apps/job-server/src/server/index.js) | 내부 자동화 HTTP 진입점 |
| Dashboard Worker | [apps/job-dashboard/src/index.js](apps/job-dashboard/src/index.js) | `fetch` / `queue` / `scheduled` 핸들러 |
| Health endpoint | `GET /health` (port `3000`) | Docker `HEALTHCHECK` 와 동일 |

---

## 목차 / Table of Contents

- [개요 / Overview](#개요--overview)
- [주요 기능 / Features](#주요-기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [패키지 구성 / Package Contents](#패키지-구성--package-contents)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [기여 / Contribution](#기여--contribution)
- [유지보수 / Maintainers](#유지보수--maintainers)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

---

## 개요 / Overview

`package.json` 의 `description` 필드는 이 모노레포를 다음과 같이 정의합니다.

> Resume portfolio monorepo: Cloudflare Worker edge site, job automation (Wanted/JobKorea), SSoT data, self-hosted observability

핵심 가치 / Core values:

- **단일 진실 공급원 (SSoT)** — 이력·프로필·스킬·직무 데이터는 `packages/data` 에서 한 번 정의되고 포트폴리오, 이력서 PDF, PPTX, 운영 대시보드 등 모든 산출물로 자동 동기화됩니다.
- **엣지 우선 포트폴리오** — `apps/portfolio` 는 Cloudflare Worker 기반의 정적+동적 라우터로, 데이터 변경 시 빌드·배포 사이클로 즉시 반영됩니다.
- **자영형 채용 자동화** — `apps/job-server` 의 MCP 런타임은 Wanted·JobKorea 등 플랫폼 크롤러와 자동 지원 스크립트를 자체 호스팅합니다.
- **운영 가시성** — `apps/job-dashboard` 는 대시보드 API, 큐 컨슈머, 스케줄 워크플로를 Worker 런타임에서 직접 제공합니다.

이 저장소는 사설이며 외부 배포용이 아닙니다. 공개용 자산(예: PDF, PPTX)은 [applications/](applications/) 하위 폴더에서 확인할 수 있습니다.

---

## 주요 기능 / Features

| 영역 / Area | 기능 / Capability |
| --- | --- |
| 포트폴리오 | Cloudflare Worker 렌더링, 자동 생성 `worker.js`, OG·메타 동기화 |
| SSoT 데이터 | `packages/data/resumes/master/resume_data.json` 단일 출처, PDF·PPTX·HTML 동기화 |
| 채용 자동화 | MCP 서버, Wanted/JobKorea 크롤러, 세션 파일 복원, 1Password 시드 |
| 대시보드 | Worker fetch/queue/scheduled, CSRF·CORS·rate-limit 미들웨어, D1 마이그레이션 |
| 패키지화 | CLI, shared 유틸(에러·로거·재시도·암호화·rate-limit·auth·browser), Zod 스키마, OpenAPI 컨트랙트 |
| 운영 | Go 스크립트 빌드·동기화·배포, Python PPTX 생성, Docker 헬스 체크, Wrangler 게시 |
| 관측 | 자체 호스팅 로그·런타임 메트릭, 대시보드 워크플로, 큐 컨슈머 |

---

## 아키텍처 / Architecture

### 요청 흐름 / Request Flow

1. 클라이언트가 Cloudflare 엣지에 도달한다.
2. `apps/portfolio/entry.js` 라우터가 HTML·정적·`/job/*` 경로를 분기한다.
3. `/job/*` 트래픽은 `apps/job-dashboard` 의 Worker 로 위임되어 fetch·queue·scheduled 핸들러를 실행한다.
4. 비동기 자동화 작업은 `apps/job-dashboard` 의 큐 컨슈머가 `apps/job-server` 의 MCP 런타임에 위임한다.
5. MCP 런타임은 크롤러·자동 지원 스크립트를 실행하고 결과를 `apps/job-server/.data` 에 보존한다.
6. 모든 변경은 SSoT 데이터(`packages/data`)에서 시작해 `sync:all` 파이프라인으로 PDF·PPTX·정적 자산으로 전파된다.

### 런타임 표면 / Runtime Surfaces

| Surface | Process | Entry | 책임 / Responsibility |
| --- | --- | --- | --- |
| Portfolio | Cloudflare Worker | `apps/portfolio/entry.js` | 정적·동적 포트폴리오 렌더링, 대시보드 임베드 |
| Dashboard | Cloudflare Worker | `apps/job-dashboard/src/index.js` | 운영 대시보드 API, 큐, 스케줄 워크플로 |
| Job server (MCP) | Docker / Node | `apps/job-server/src/index.js` | 크롤링·자동 지원·세션 복원 |
| HTTP server | Fastify | `apps/job-server/src/server/index.js` | 내부 자동화 엔드포인트 |
| Build tools | Go / Node / Python | `tools/scripts/` | 동기화·검증·배포 스크립트 |

### 패키지 경계 / Package Boundaries

| Package | 역할 / Role | 소비자 / Consumers |
| --- | --- | --- |
| `packages/data` | 이력·프로필 SSoT | portfolio, job-server, job-dashboard |
| `packages/types` | JSDoc/TS 도메인 타입 | 모든 앱·패키지 |
| `packages/schemas` | Zod 런타임 스키마 | server, dashboard |
| `packages/contracts` | OpenAPI·Worker env 컨트랙트 | portfolio, dashboard |
| `packages/shared` | 에러·로거·재시도·암호화·rate-limit·auth | server, dashboard |
| `packages/env` | 런타임 환경 검증 | server, dashboard |
| `packages/cli` | 운영자 CLI | 로컬 개발자 |

자세한 규칙은 `docs/conventions/architecture-rules.md` 를 참조하세요.

---

## 저장소 구조 / Repository Structure

루트 디렉터리는 실제로 다음과 같이 구성되어 있습니다. 표시되지 않은 하위 디렉터리는 각 앱·패키지의 `AGENTS.md` 에서 안내합니다.

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
├── ProfileView.jpg
├── applications/         # 직무별 지원 패킷(HTML/PDF/표지이미지/커버레터)
├── apps/
│   ├── job-dashboard/    # 대시보드 Worker + 큐/워크플로
│   └── portfolio/        # Cloudflare Worker 포트폴리오
├── packages/             # 공유 패키지 (cli, data, env, shared, types, schemas, contracts)
├── ta/                   # Python/PPTX 기반 TA 프로필 생성 + 출력 폴더
├── tools/                # Go/Node 빌드·동기화·배포·검증 스크립트
├── tests/                # Jest·Node·Playwright 테스트 슈트
├── infrastructure/       # Cloudflare·DB·모니터링·시스템 자동화
├── docs/                 # ADR·아키텍처·컨벤션·가이드·보안 문서
├── supabase/functions/   # Deno 엣지 함수
└── third_party/          # npm 으로 도입한 외부 자료
```

> 참고: 표시된 트리는 루트와 주요 워크스페이스만 반영합니다. 작업 전 해당 영역의 `AGENTS.md` 를 반드시 읽으세요.

---

## 패키지 구성 / Package Contents

| Workspace | 위치 / Path | 책임 / Responsibility |
| --- | --- | --- |
| Portfolio | `apps/portfolio` | Cloudflare Worker 포트폴리오, `worker.js` 자동 생성 |
| Job server | `apps/job-server` | MCP 런타임, 크롤러, 자동 지원 스크립트, Fastify 서버 |
| Job dashboard | `apps/job-dashboard` | 대시보드 Worker, 큐 컨슈머, 미들웨어, 마이그레이션 |
| CLI | `packages/cli` | 운영자 CLI |
| Data | `packages/data` | 이력·지원 SSoT |
| Env | `packages/env` | 런타임 환경 변수 검증 |
| Shared | `packages/shared` | 공용 유틸리티 |
| Types | `packages/types` | JSDoc/TS 도메인 타입 |
| Schemas | `packages/schemas` | Zod 런타임 스키마 |
| Contracts | `packages/contracts` | OpenAPI·Worker env 컨트랙트 |

---

## 빠른 시작 / Quick Start

### 1. 요구 사항 / Prerequisites

| Tool | Version | 비고 / Note |
| --- | --- | --- |
| Node.js | 22 | `Dockerfile` 의 베이스 이미지와 일치 |
| npm | 10+ | `package-lock.json` 사용 |
| Docker | 24+ | `docker-compose.yml` 사용 시 |
| Wrangler | 최신 | Cloudflare Worker 배포 시 |

### 2. 클론과 설치 / Clone and Install

```bash
git clone <repository-url> resume
cd resume
npm ci
```

### 3. 환경 변수 / Environment Variables

루트에 `.env` 를 작성합니다. `docker-compose.yml` 이 자동으로 로드합니다.

```dotenv
NODE_ENV=development
PORT=3000
# Cloudflare / Wrangler 관련 키는 wrangler.jsonc 와 apps/*/wrangler.* 참조
# 1Password 시드 키는 tools/scripts/onepassword/README 참조
```

### 4. 개발 모드 / Development

```bash
# 포트폴리오 로컬 미리보기
npm run dev --workspace=apps/portfolio

# 대시보드 Worker 로컬
npm run dev --workspace=apps/job-dashboard

# job-server (Docker 권장)
docker compose up mcp-server
```

### 5. 헬스 체크 / Health Check

```bash
curl -fsS http://127.0.0.1:3000/health
```

Docker 의 `HEALTHCHECK` 와 동일한 엔드포인트입니다.

---

## 설정 / Configuration

| 영역 / Area | 위치 / Location | 비고 / Notes |
| --- | --- | --- |
| Worker 정의 | `wrangler.jsonc` | 포트폴리오 + 대시보드 공통 |
| Worker 환경 변수 | `apps/*/wrangler.*` | 각 앱의 `AGENTS.md` 참조 |
| 런타임 환경 검증 | `packages/env` | 스키마 기반 부트 검증 |
| Docker 설정 | `Dockerfile`, `docker-compose.yml` | 멀티 스테이지, `job-server` 런타임 |
| 린트 | `eslint.config.cjs` | 모노레포 단일 설정 |
| 테스트 | `jest.config.cjs`, `playwright.config.js` | 단위/E2E |
| 타입 | `tsconfig.base.json`, `tsconfig.json` | strict 모드 |
| OpenAPI | `redocly.yaml` | `packages/contracts` |

---

## 명령어 레퍼런스 / Commands Reference

`package.json` 의 주요 스크립트입니다. 모든 명령은 루트에서 실행합니다.

| 명령 / Command | 설명 / Description |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지의 EXIF 메타 제거 |
| `npm run sync:data` | SSoT 데이터를 워크스페이스로 동기화 |
| `npm run sync:pptx` | Python 스크립트로 PPTX 생성 |
| `npm run sync:pdf` | Go 스크립트로 PDF 생성 |
| `npm run sync:all` | data → pdf → pptx 순차 동기화 |
| `npm run op:run` | 1Password 통합 스크립트 실행 |
| `npm run op:seed:resume` | 1Password 로 이력 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run sync:proposals` | 제안서 동기화 후 적용 |
| `npm run enrich:github` | GitHub 프로필 강화 |
| `npm run enrich:skills` | 스킬 데이터 강화 |
| `npm run enrich:ai` | AI 메타데이터 강화 |
| `npm run enrich:all` | 모든 enrichment 파이프라인 실행 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + Node 테스트 |
| `npm run automate:full` | 전체 동기화 + 린트 + 타입체크 |

> 전체 스크립트 목록과 인자는 [package.json](package.json) 을 참조하세요.

---

## 로컬 개발 / Local Development

| 작업 / Task | 절차 / Procedure |
| --- | --- |
| 워크스페이스 추가 | `package.json` 의 `workspaces` 에 경로 추가 후 `npm install` |
| 새 SSoT 필드 | `packages/data/resumes/master/resume_data.json` 수정 → `npm run sync:data` |
| 새 타입 | `packages/types` 에 도메인 타입 정의 후 필요한 워크스페이스에서 import |
| 새 스키마 | `packages/schemas` 의 Zod 스키마로 런타임 검증 추가 |
| 새 라우트 | `apps/job-dashboard/src/routes` 또는 `apps/portfolio/entry.js` 에 추가 |
| 새 미들웨어 | `apps/job-dashboard/src/middleware` 또는 동등 위치 |
| 200-LOC 규칙 | `docs/conventions/architecture-rules.md` 의 모듈 크기 정책 준수 |
| 스크립트 작성 | 가능한 경우 Go 우선, Python 보조 (정책: `docs/conventions/architecture-rules.md`) |

---

## 테스트 / Testing

| 계층 / Layer | 도구 / Tool | 위치 / Path |
| --- | --- | --- |
| 단위 | Jest | `jest.config.cjs`, `**/*.test.js` |
| Node 통합 | Jest | `tests/node` 등 |
| E2E | Playwright | `playwright.config.js` |
| API 컨트랙트 | Redocly | `redocly.yaml`, `packages/contracts` |
| 링크 무결성 | lychee | `lychee.toml` |

```bash
npm test
npm run lint
npm run typecheck
```

상세 실행 옵션은 각 앱·패키지의 `AGENTS.md` 를 참조하세요.

---

## 배포 / Deployment

| Surface | 방법 / Method | 비고 / Notes |
| --- | --- | --- |
| Portfolio Worker | `wrangler deploy` (`wrangler.jsonc`) | Cloudflare Workers Builds 권장 |
| Dashboard Worker | `wrangler deploy` (앱별 설정) | 큐·스케줄 트리거 포함 |
| Job server | `docker compose up --build` | `apps/job-server/.data` 볼륨 유지 |
| PDF / PPTX 산출물 | `npm run sync:pdf` / `sync:pptx` | `applications/` 로 배포 가능 |
| D1 마이그레이션 | `apps/job-dashboard/migrate-json-to-d1.cjs` | `schema.sql`, `migrations/*.sql` 참조 |

> 프로덕션 배포 권한은 Cloudflare Workers Builds 입니다. GitHub Actions 의 워크플로우는 보조 검증용입니다.

---

## 기여 / Contribution

기여 절차는 [CONTRIBUTING.md](CONTRIBUTING.md) 와 영역별 `AGENTS.md` 를 따릅니다. 요약:

1. 작업 전 해당 디렉터리의 `AGENTS.md` 를 읽는다.
2. SSoT 데이터 변경은 `packages/data` 에서만 수행한다.
3. 모듈은 200-LOC 규칙을 준수한다 (예외는 ADR 로 기록).
4. PR 전 `npm run lint && npm run typecheck && npm test` 를 통과시킨다.
5. 자동화·시크릿 관련 변경은 `docs/security/` 와 `tools/scripts/onepassword/` 규칙을 따른다.

---

## 유지보수 / Maintainers

| 역할 / Role | 책임 / Responsibility |
| --- | --- |
| 저장소 OWNER | [OWNERS](OWNERS) 참조 |
| 운영자 CLI | `packages/cli` |
| 인프라·배포 | `infrastructure/`, Cloudflare Workers Builds |
| 보안·시크릿 | `docs/security/`, `tools/scripts/onepassword/` |

---

## 추가 문서 / Further Documentation

| 문서 / Document | 위치 / Path |
| --- | --- |
| 디자인 컨벤션 | [applications/DESIGN.md](applications/DESIGN.md) |
| 대시보드 API | [apps/job-dashboard/API_REFERENCE.md](apps/job-dashboard/API_REFERENCE.md) |
| 대시보드 배포 | [apps/job-dashboard/DEPLOYMENT_GUIDE.md](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 개발 | [apps/job-dashboard/DEVELOPMENT_GUIDE.md](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 대시보드 다이어그램 | [apps/job-dashboard/DIAGRAMS.md](apps/job-dashboard/DIAGRAMS.md) |
| 대시보드 시크릿 | [apps/job-dashboard/SECRETS.md](apps/job-dashboard/SECRETS.md) |
| 직무별 지원 가이드 | [applications/](applications/) |
| 홈랩 인프라 | [applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md](applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md) |
| TA 프로필 생성 | [ta/AGENTS.md](ta/AGENTS.md) |
| 변경 이력 | [CHANGELOG.md](CHANGELOG.md) |
| 에이전트 가이드 | [AGENTS.md](AGENTS.md) |

---

## 도움말 / Getting Help

- 버그·질문: 저장소 이슈 트래커 사용
- 보안 이슈: [docs/security/](docs/security/) 절차에 따라 비공개로 보고
- 운영 문제: `apps/job-dashboard/SECRETS.md` 와 `tools/scripts/onepassword/` 문서 우선 확인

---

## 라이선스 / License

이 저장소는 사설이며 [LICENSE](LICENSE) 의 정책을 따릅니다. 외부 배포·재배포를 금합니다.