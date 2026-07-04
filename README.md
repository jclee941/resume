# 포트폴리오·채용 운영 워크스페이스 / Portfolio & Job Operations Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker Compose](https://img.shields.io/badge/docker-compose-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Workers](https://img.shields.io/badge/cloudflare-workers-orange.svg)](wrangler.jsonc)
[![TypeScript strict](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

## 한 줄 요약

이력서·지원서 자료, 채용 운영 대시보드, PPTX/프로필 산출물, 그리고 배포·검증 설정을 한 워크스페이스에서 함께 관리하는 사설 포트폴리오·채용 운영 환경입니다. 포트폴리오 사이트는 Cloudflare Worker, 운영 대시보드와 자동화 런타임은 Node.js, 컨테이너 패키징은 Docker로 분리되어 있습니다.

영어: A private workspace that co-manages resume/application assets, a job operations dashboard, generated PPTX/profile outputs, and the deployment/verification configuration behind them.

## 빠른 상태 / Status at a Glance

| 항목 | 현재 상태 | 운영자 다음 행동 |
| --- | --- | --- |
| 워크스페이스 버전 | `1.40.11` ([`package.json`](package.json)) | 변경 시 [`CHANGELOG.md`](CHANGELOG.md) 갱신 |
| 주 제품 | 이력서·지원서 자료, 채용 운영 대시보드, PPTX/HTML/PDF 산출물 | [`applications/`](applications/), [`ta/`](ta/) |
| 포트폴리오 런타임 | Cloudflare Worker, `worker.js`는 빌드 산출물 | [`wrangler.jsonc`](wrangler.jsonc) |
| 대시보드 런타임 | Cloudflare Worker, `fetch`/`queue`/`scheduled` 핸들러 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| 컨테이너 런타임 | `apps/job-server` Node 22 + Fastify 프로세스 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| SSoT 데이터 | `packages/data` 하위 canonical JSON | [`packages/data/`](packages/data) |
| 비밀 관리 | 1Password CLI 경유 | [`tools/scripts/onepassword/`](tools/scripts/onepassword/) |
| 테스트 | Jest(Node) + Playwright(E2E) + Redocly(OpenAPI) + lychee | [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js), [`redocly.yaml`](redocly.yaml), [`lychee.toml`](lychee.toml) |
| 공개/SDK 여부 | 사설 운영 워크스페이스 (공개 SDK 아님) | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Compact Flow

| 흐름 | 무엇이 실행되나 | 소유 위치 | 운영자 다음 명령/엔드포인트 |
| --- | --- | --- | --- |
| 포트폴리오 | Worker 진입, HTML/데이터 머지, `worker.js` 생성 | `apps/portfolio/` | `wrangler deploy` (root) |
| 대시보드 | Worker `fetch`/`queue`/`scheduled` 라우팅 | `apps/job-dashboard/` | `cd apps/job-dashboard && npm install` |
| MCP/잡 서버 | Node 22 + Fastify, 크롤러/자동 지원 | `apps/job-server/` | `docker compose up --build` → `http://<host>:3000` |
| 헬스 체크 | `GET /health` (200 OK) | 컨테이너/Worker | `curl http://<host>:3000/health` |
| SSoT 동기화 | 이력서 데이터 → PDF/PPTX 산출물 | `packages/data/` + `tools/scripts/build/` | `npm run sync:all` |
| 1Password 시드 | 비밀/세션 파일 로컬 주입 | `tools/scripts/onepassword/` | `npm run op:run`, `npm run op:seed:resume` |
| Enrichment | GitHub/Skills/AI 메타데이터 보강 | `tools/scripts/enrichment/` | `npm run enrich:all` |
| 자동화 통합 | 동기화 + 빌드 + 타입체크 + 테스트 | root | `npm run automate:ssot` |

## 목차 / Table of Contents

1. [워크스페이스 구성 / Package Contents](#1-워크스페이스-구성--package-contents)
2. [먼저 읽을 파일 / First Files to Read](#2-먼저-읽을-파일--first-files-to-read)
3. [엔트리포인트 / Entry Points](#3-엔트리포인트--entry-points)
4. [빠른 시작 / Quickstart](#4-빠른-시작--quickstart)
5. [아키텍처 / Architecture](#5-아키텍처--architecture)
6. [구성 / Configuration](#6-구성--configuration)
7. [명령어 / Commands Reference](#7-명령어--commands-reference)
8. [로컬 개발 / Local Development](#8-로컬-개발--local-development)
9. [테스트 / Testing](#9-테스트--testing)
10. [배포 / Deployment](#10-배포--deployment)
11. [기여 / Contributing](#11-기여--contributing)
12. [운영자 / Maintainers](#12-운영자--maintainers)
13. [추가 문서 / Further Documentation](#13-추가-문서--further-documentation)
14. [보안 / Security](#14-보안--security)
15. [현재 체크아웃 주의 사항 / Checkout Notes](#15-현재-체크아웃-주의-사항--checkout-notes)
16. [라이선스 / License](#16-라이선스--license)

## 1. 워크스페이스 구성 / Package Contents

이 저장소는 `npm workspaces` 기반 다중 패키지 워크스페이스이지만, 상위 브랜드는 운영자 중심 사설 워크스페이스이며 외부 공개 SDK로 노출되지 않습니다.

### 1.1 최상위 트리 (확인된 경로)

```text
./
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── LICENSE
├── OWNERS
├── ProfileView.jpg
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
├── applications/                # 역할별 지원서 패킷 (resume, cover letter, preview, run logs)
│   ├── airpremia-security-2026/
│   ├── cloudflare-one-se-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── gitlab-apac-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── job-search-2026-07/
│   ├── openai-codex-korea-2026/
│   └── security-ir-2026/
├── apps/
│   └── job-dashboard/           # Cloudflare Worker 대시보드
│       ├── src/
│       │   ├── index.js
│       │   ├── queue-consumer.js
│       │   ├── router.js
│       │   └── middleware/
│       ├── migrations/
│       ├── schema.sql
│       └── migration-data.sql
└── ta/                          # PPTX 프로필 생성/검증
    ├── *.pptx
    ├── improve_visual.py
    ├── inspect.py
    ├── verify.py
    └── output/
```

> [`AGENTS.md`](AGENTS.md)에는 추가로 `apps/portfolio/`, `apps/job-server/`, `packages/{cli,data,env,shared,types,schemas,contracts}/`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/` 디렉터리가 기재되어 있습니다. 체크아웃 상태에 따라 일부만 노출될 수 있으므로 [`OWNERS`](OWNERS)와 함께 확인 후 작업하세요.

### 1.2 npm Workspaces

`package.json`의 `workspaces` 필드에 정의된 패키지입니다.

| 워크스페이스 | 역할 |
| --- | --- |
| `apps/portfolio` | 공개 포트폴리오 Cloudflare Worker |
| `apps/job-server` | 잡 자동화/MCP 런타임, 크롤러 |
| `apps/job-dashboard` | 운영 대시보드 Worker (`fetch`/`queue`/`scheduled`) |
| `packages/cli` | 운영자 CLI |
| `packages/data` | 이력서·지원서 콘텐츠 SSoT |
| `packages/env` | 런타임 환경 변수 검증 |
| `packages/shared` | 공용 유틸(에러, 로거, 재시도, 인증, 클라이언트) |
| `packages/types` | 표준 도메인 타입 (JSDoc/TS) |
| `packages/schemas` | Zod 런타임 스키마 |
| `packages/contracts` | OpenAPI, Worker env 계약 |

## 2. 먼저 읽을 파일 / First Files to Read

| 순서 | 파일 | 왜 읽는가 |
| --- | --- | --- |
| 1 | [`AGENTS.md`](AGENTS.md) | 워크스페이스 구조와 코드 맵의 1차 출처 |
| 2 | [`package.json`](package.json) | 루트 스크립트와 workspaces 정의 |
| 3 | [`OWNERS`](OWNERS) | 책임 영역과 운영자 지정 |
| 4 | [`CONTRIBUTING.md`](CONTRIBUTING.md) | 기여/변경 정책 |
| 5 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) | 컨테이너 런타임 경계 |
| 6 | [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 설정 |

## 3. 엔트리포인트 / Entry Points

| 진입점 | 종류 | 위치 | 역할 |
| --- | --- | --- | --- |
| 포트폴리오 Worker (`entry.js`) | Cloudflare Worker | `apps/portfolio/entry.js` | 공개 포트폴리오 + in-process `/job/*` 라우터 |
| 포트폴리오 Worker 산출물 | 빌드 산출 | `apps/portfolio/worker.js` | `generate-worker.js`로 생성 (수동 편집 금지) |
| MCP 부트스트랩 | Node 프로세스 | `apps/job-server/src/index.js` | 잡 자동화 부트/셧다운 |
| 잡 서버 부트스트랩 | Node + Fastify | `apps/job-server/src/server/index.js` | HTTP 진입, 자동 지원·스크립트 |
| 대시보드 Worker | Cloudflare Worker | `apps/job-dashboard/src/index.js` | `fetch`/`queue`/`scheduled` 라우팅 |
| 대시보드 큐 컨슈머 | Worker 핸들러 | `apps/job-dashboard/src/queue-consumer.js` | 비동기 잡 처리 |
| 대시보드 라우터 | Worker 핸들러 | `apps/job-dashboard/src/router.js` | 요청 라우팅 |
| SSoT 데이터 | JSON | `packages/data/resumes/master/resume_data.json` | canonical 이력서 데이터 |
| 헬스 체크 | HTTP | `GET /health` (job-server 컨테이너) | Liveness probe |
| 운영자 CLI | Node | `packages/cli/` | 운영자 CLI 진입 |

## 4. 빠른 시작 / Quickstart

### 4.1 사전 요구 사항

| 항목 | 버전/도구 |
| --- | --- |
| Node.js | 22 (이미지 베이스와 일치) |
| 컨테이너 | Docker / Docker Compose (잡 서버 실행 시) |
| PPTX 도구 | Python 3 (`ta/` 도구) |
| 운영 스크립트 | Go 1.22+ (`tools/scripts/build`, `tools/scripts/onepassword`) |
| 비밀 관리 | 1Password CLI `op` (시드/복원 시) |

### 4.2 루트 의존성 설치

```bash
npm install
```

`workspaces`에 정의된 모든 패키지의 의존성이 설치됩니다.

### 4.3 컨테이너 런타임 (job-server)

```bash
docker compose up --build
```

- `Dockerfile`은 `apps/job-server`를 실행합니다.
- 환경 변수는 `.env`로 주입합니다.
- 헬스 체크: `http://<host>:3000/health`

### 4.4 SSoT → 산출물 동기화

```bash
npm run sync:all
```

`sync:data` → `sync:pdf` → `sync:pptx` 순으로 실행되어 PDF/PPTX 산출물을 갱신합니다.

### 4.5 Cloudflare Worker (portfolio / dashboard)

```bash
# 루트 wrangler.jsonc 기준
wrangler deploy

# 또는 대시보드 워크스페이스로 이동 후
cd apps/job-dashboard
wrangler deploy
```

> `apps/portfolio/worker.js`는 빌드 산출물입니다. HTML/`lib/`/`src/`를 수정한 뒤 빌드/생성 스크립트로 `worker.js`를 재생성하세요.

## 5. 아키텍처 / Architecture

### 5.1 컴포넌트

| 컴포넌트 | 역할 | 위치 |
| --- | --- | --- |
| Edge 사이트 | 공개 포트폴리오 | `apps/portfolio/` |
| 대시보드 | 운영 대시보드 + 큐 + 예약 작업 | `apps/job-dashboard/` |
| 잡 서버 | MCP/자동 지원/스크립트 | `apps/job-server/` |
| SSoT 데이터 | 이력서·지원서 진실 공급원 | `packages/data/` |
| 타입/스키마/계약 | 도메인 타입, Zod 검증, OpenAPI | `packages/{types,schemas,contracts}/` |
| 공용 유틸 | 에러/로거/재시도/인증/클라이언트 | `packages/{shared,env}/` |
| 운영 도구 | 빌드/동기화/배포/1Password/보안 | `tools/scripts/` |
| 산출물 | 역할별 지원서 패킷, PPTX, PDF, HTML | `applications/`, `ta/output/` |

### 5.2 요청 흐름 (대시보드)

| 단계 | 동작 |
| --- | --- |
| 1 | HTTP 요청이 `apps/job-dashboard/src/index.js`의 `fetch` 핸들러에 진입 |
| 2 | `router.js`가 경로/메서드별 핸들러로 분기 |
| 3 | 필요 시 `middleware/`에서 인증·로깅·검증 적용 |
| 4 | 핸들러가 `packages/data`(SSoT) 또는 D1/큐와 상호작용 |
| 5 | 비동기 잡은 `queue-consumer.js`로 위임, `scheduled` 핸들러는 예약 실행 |

### 5.3 컨테이너 흐름 (job-server)

| 단계 | 동작 |
| --- | --- |
| 1 | `docker compose up --build` → `Dockerfile`의 `runtime` 단계 실행 |
| 2 | `apps/job-server/src/index.js` 부트 → Fastify 서버 가동 |
| 3 | 환경 변수 검증은 `packages/env`로 위임 |
| 4 | 자동 지원/크롤러가 MCP 클라이언트로 플랫폼 호출 |
| 5 | 상태/로그는 데이터 볼륨 `job_automation_data`에 저장 |

## 6. 구성 / Configuration

### 6.1 환경 변수

루트 `.env` 파일을 사용합니다. 키 이름과 의미는 코드/문서(예: `packages/env`, `apps/job-dashboard/SECRETS.md`)를 참조하세요.

| 키 (예시) | 용도 |
| --- | --- |
| `NODE_ENV` | 실행 모드 (`production` 기본) |
| `PORT` | 잡 서버 포트 (기본 `3000`) |
| Cloudflare 관련 | `wrangler.jsonc` 및 Cloudflare Secrets |
| 1Password 관련 | `op:run` / `op:seed:*` 경유 |
| 플랫폼 자격 | `apps/job-server` 크롤러 자격 |

### 6.2 설정 파일

| 파일 | 역할 |
| --- | --- |
| `wrangler.jsonc` | Cloudflare Worker 메인 설정 |
| `tsconfig.base.json`, `tsconfig.json` | TypeScript strict 베이스 |
| `eslint.config.cjs` | ESLint 규칙 |
| `jest.config.cjs` | Jest(Node) 테스트 |
| `playwright.config.js` | Playwright E2E 테스트 |
| `redocly.yaml` | OpenAPI 린트 |
| `lychee.toml` | 링크 검사 |
| `docker-compose.yml` | 컨테이너 오케스트레이션 |

### 6.3 비밀 / 시크릿

- 비밀은 [`tools/scripts/onepassword/`](tools/scripts/onepassword/)의 Go 도구로 로컬 주입합니다.
- 세션 마이그레이션: `op:seed:sessions`, `op:restore:sessions`
- 비밀 정책 상세는 `docs/security/`를 참조하세요.

## 7. 명령어 / Commands Reference

루트 `package.json` 기준:

| 스크립트 | 동작 |
| --- | --- |
| `strip-exif` | 포트폴리오 이미지의 EXIF 메타데이터 제거 |
| `sync:data` | SSoT 이력서 데이터 동기화 |
| `sync:pptx` | Shinhan PPTX 생성 (Python) |
| `sync:pdf` | 마스터 PDF 생성 (Go) |
| `sync:all` | `sync:data` → `sync:pdf` → `sync:pptx` |
| `op:run` | 1Password CLI 래퍼 실행 |
| `op:native:run` | 1Password native 실행 |
| `op:seed:resume` | 이력서 비밀 시드 |
| `op:seed:sessions` | 세션 파일 시드 |
| `op:restore:sessions` | 세션 파일 복원 |
| `sync:proposals` | 제안 동기화(Node + Go) |
| `enrich:github` | GitHub 메타데이터 enrichment |
| `enrich:skills` | Skills enrichment |
| `enrich:ai` | AI 메타데이터 enrichment |
| `enrich:all` | 세 enrichment 모두 실행 |
| `automate:ssot` | SSoT 동기화 + 빌드 + 타입체크 + Node 테스트 |
| `automate:full` | 전체 자동화 파이프라인 |

> `package.json` 발췌가 일부만 제공되어 추가 스크립트는 실제 파일을 확인하세요.

## 8. 로컬 개발 / Local Development

| 단계 | 작업 |
| --- | --- |
| 1 | 클론 후 `npm install` (workspaces 의존성 설치) |
| 2 | `.env` 작성, 비밀은 `npm run op:run` 또는 `op:seed:resume`로 주입 |
| 3 | 수정 영역 결정 (portfolio / dashboard / job-server / SSoT 등) |
| 4 | `npm run lint`, `npm run typecheck`, `npm test` (Jest) 로컬 검증 |
| 5 | 필요 시 `docker compose up --build`로 잡 서버 기동 후 `curl http://<host>:3000/health` 확인 |

## 9. 테스트 / Testing

| 종류 | 도구 | 설정 파일 |
| --- | --- | --- |
| Unit / Integration (Node) | Jest | [`jest.config.cjs`](jest.config.cjs) |
| End-to-End | Playwright | [`playwright.config.js`](playwright.config.js) |
| OpenAPI 린트 | Redocly | [`redocly.yaml`](redocly.yaml) |
| 링크 검사 | lychee | [`lychee.toml`](lychee.toml) |
| 타입체크 | TypeScript strict | [`tsconfig.base.json`](tsconfig.base.json) |
| 린트 | ESLint | [`eslint.config.cjs`](eslint.config.cjs) |

## 10. 배포 / Deployment

| 타깃 | 방법 |
| --- | --- |
| Cloudflare Workers (portfolio / dashboard) | [`wrangler.jsonc`](wrangler.jsonc) 기반 `wrangler deploy` |
| 잡 서버 (컨테이너) | `docker compose up --build` (이미지: [`Dockerfile`](Dockerfile) `runtime` 단계) |
| 운영 자동화 | `npm run automate:ssot` 또는 `automate:full` |

`Dockerfile` 헬스체크 사양:

| 항목 | 값 |
| --- | --- |
| 엔드포인트 | `GET /health` |
| 주기 | 30s |
| 타임아웃 | 5s |
| 시작 대기 | 20s |
| 재시도 | 3회 |
| 정상 판정 | 응답 OK 시 0, 그 외 비정상 종료 |

## 11. 기여 / Contributing

- 정책: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- 책임 영역: [`OWNERS`](OWNERS)
- 변경 이력: [`CHANGELOG.md`](CHANGELOG.md)
- 작업 전 [`AGENTS.md`](AGENTS.md)와 패키지 로컬 `AGENTS.md`(예: [`apps/job-dashboard/AGENTS.md`](apps/job-dashboard/AGENTS.md))를 먼저 읽으세요.

## 12. 운영자 / Maintainers

- 운영자/책임자 명단: [`OWNERS`](OWNERS)
- 본 워크스페이스는 사설 운영 환경이며 외부 공개 SDK가 아닙니다. 변경은 [`CONTRIBUTING.md`](CONTRIBUTING.md) 절차에 따릅니다.

## 13. 추가 문서 / Further Documentation

| 문서 | 위치 |
| --- | --- |
| 워크스페이스 지식 베이스 | [`AGENTS.md`](AGENTS.md) |
| 지원서 패킷 모음 | [`applications/`](applications/) |
| PPTX 프로필 도구 | [`ta/`](ta/) |
| 잡 대시보드 API | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 잡 대시보드 배포 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 잡 대시보드 개발 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| 비밀 관리 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 운영 도구 | [`tools/scripts/`](tools/scripts/) |
| 패키지 로컬 가이드 | 각 패키지/앱의 `AGENTS.md` |

## 14. 보안 / Security

- 비밀/세션 관리: [`tools/scripts/onepassword/`](tools/scripts/onepassword/)
- 정책/문서: `docs/security/`
- 시크릿은 `.env` / Cloudflare Secrets / 1Password로만 주입하고 코드/문서에 직접 커밋하지 마세요.

## 15. 현재 체크아웃 주의 사항 / Checkout Notes

| 주제 | 비고 |
| --- | --- |
| 워크스페이스 성격 | 사설 운영 워크스페이스. 공개 SDK/제품이 아님 |
| `apps/portfolio/worker.js` | 빌드 산출물. 직접 편집 금지, 생성기로 재생성 |
| `Dockerfile` 타깃 | `apps/job-server` 런타임. 포트폴리오 배포용이 아님 |
| 1Password 의존 | `op` CLI 없으면 시드/복원 스크립트 미동작 |
| 지원서 패킷 | `applications/<role>-<year>/` 하위는 역할별 이력서·커버레터·실행 로그 |
| PPTX 산출물 | `ta/output/`는 검증/생성 결과, 원본은 `ta/*.pptx` |
| Node 버전 | 컨테이너/스크립트는 Node 22 기준 |

## 16. 라이선스 / License

자세한 내용은 [`LICENSE`](LICENSE)를 참조하세요.