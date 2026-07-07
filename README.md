# Resume Automation Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](./package.json)
[![Node](https://img.shields.io/badge/node-22-green.svg)](https://nodejs.org)
[![Runtime: Cloudflare Workers + Node](https://img.shields.io/badge/runtime-workers%20%2B%20node-orange.svg)](./wrangler.jsonc)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)
[![Build: docker compose](https://img.shields.io/badge/build-docker--compose-2496ED.svg)](./docker-compose.yml)

## 개요 (Overview)

이 저장소는 이력서·포트폴리오 운영을 자동화하는 워크스페이스입니다. Cloudflare Worker 기반 포트폴리오, 잡 자동화 MCP 서버(Wanted/JobKorea 크롤링·자동 지원), 큐·스케줄 기반 대시보드 Worker, 공유 타입·스키마·계약 패키지, 그리고 단일 출처(SSoT) 이력서 데이터를 한 루트에서 운영합니다. 6개 역할의 지원 패키지(`applications/`)와 Python·PPTX 기반 TA 프로필 생성(`ta/`)도 함께 포함됩니다.

This workspace automates resume and portfolio operations end-to-end. It ships a Cloudflare Worker portfolio, an MCP-based job automation server (Wanted/JobKorea crawlers and auto-apply), a queue- and schedule-driven dashboard Worker, shared type/schema/contract packages, and a single source of truth for resume content. It also bundles role-specific application packets and Python/PPTX TA profile generation.

## 빠른 참조 (Quick Status)

| 영역 | 상태 | 핵심 진입점 |
| --- | --- | --- |
| Workspace | 활성 v1.40.11 | 루트 [`package.json`](./package.json), npm workspaces 10개 |
| Portfolio Worker | Cloudflare Edge 배포 | `apps/portfolio/entry.js` → 자동 생성 `worker.js` |
| Job Server (MCP) | Node 22, Docker | `http://localhost:3000` · 헬스체크 `/health` |
| Job Dashboard | Worker + D1 + Queue | `apps/job-dashboard/src/index.js` |
| TA 프로필 | Python + PPTX | `ta/improve_visual.py`, `ta/verify.py` |
| Application Packets | 6개 역할 진행 중 | `applications/<role>-2026/` |

## 운영 흐름 요약 (Operator Flow)

1. 콘텐츠 수정 — [`packages/data/resumes/master/resume_data.json`](./packages/data/) (SSoT)에서 이력서 데이터 편집.
2. 자산 동기화 — `npm run sync:all` 로 PDF·PPTX·HTML 일괄 재생성.
3. 워커 빌드 — `apps/portfolio/generate-worker.js` 가 `worker.js` 를 자동 생성 (수동 편집 금지).
4. 잡 자동화 — `docker compose up -d mcp-server` 로 MCP 서버 기동, `/health` 로 상태 확인.
5. 대시보드 운영 — `apps/job-dashboard` Worker가 큐·스케줄로 결과를 수집·승인, D1에 저장.
6. 배포 — Cloudflare Workers Builds 가 배포 권한 보유, 로컬 미리보기는 `npx wrangler dev`.

## 목차 (Table of Contents)

- [구성 요소 (Package Contents)](#구성-요소-package-contents)
- [처음 읽을 파일 (First Files to Read)](#처음-읽을-파일-first-files-to-read)
- [진입점 (API or Entry Points)](#진입점-api-or-entry-points)
- [빠른 시작 (Quickstart)](#빠른-시작-quickstart)
- [명령어 (Commands)](#명령어-commands)
- [아키텍처 (Architecture)](#아키텍처-architecture)
- [로컬 개발 (Local Development)](#로컬-개발-local-development)
- [테스트 (Testing)](#테스트-testing)
- [기여 (Contribution)](#기여-contribution)
- [유지보수자 (Maintainers)](#유지보수자-maintainers)
- [라이선스 (License)](#라이선스-license)
- [추가 문서 (Further Documentation)](#추가-문서-further-documentation)

## 구성 요소 (Package Contents)

루트 npm workspaces:

| 경로 | 종류 | 역할 |
| --- | --- | --- |
| `apps/portfolio` | Cloudflare Worker | 공개 포트폴리오 + 인-프로세스 `/job/*` 라우터 |
| `apps/job-server` | Node 22 / Fastify | 잡 자동화 MCP 서버, 크롤러, 자동 지원 |
| `apps/job-dashboard` | Cloudflare Worker | 큐·스케줄 핸들러, D1 스키마, 미들웨어 |
| `packages/cli` | 라이브러리 | 운영자 CLI |
| `packages/data` | SSoT 데이터 | `resumes/master/resume_data.json` 권위 |
| `packages/env` | 라이브러리 | 런타임 환경 변수 검증 |
| `packages/shared` | 라이브러리 | 에러·로거·재시도·암호·레이트 리미트·클라이언트 |
| `packages/types` | 라이브러리 | JSDoc/TS 도메인 타입 |
| `packages/schemas` | 라이브러리 | Zod 런타임 스키마 |
| `packages/contracts` | 라이브러리 | OpenAPI + Worker 환경 계약 |

기타 최상위 디렉터리:

| 경로 | 역할 |
| --- | --- |
| `applications/` | 역할별 이력서·자기소개서·면접 Q&A·실행 로그 |
| `ta/` | Python + PPTX 기반 TA 프로필 생성·검증 |
| `docs/`, `tools/`, `tests/` | ADRs/규약, CI·빌드 스크립트, Jest·Playwright (상세는 [`AGENTS.md`](./AGENTS.md) 참조) |
| `infrastructure/`, `supabase/`, `third_party/` | 인프라 정의, Deno 엣지 함수, 외부 벤더 자료 |

## 처음 읽을 파일 (First Files to Read)

| 순서 | 파일 | 이유 |
| --- | --- | --- |
| 1 | [`AGENTS.md`](./AGENTS.md) | 저장소 지식 베이스와 코드 맵 |
| 2 | [`package.json`](./package.json) | 워크스페이스 정의 + 명령어 허브 |
| 3 | [`Dockerfile`](./Dockerfile), [`docker-compose.yml`](./docker-compose.yml) | MCP 잡 서버 컨테이너 정의 |
| 4 | [`apps/portfolio/entry.js`](./apps/portfolio/entry.js) | 포트폴리오 + `/job/*` 라우터 진입점 |
| 5 | [`apps/job-server/src/server/index.js`](./apps/job-server/src/server/index.js) | 잡 자동화 서버 부트스트랩 |
| 6 | [`apps/job-dashboard/src/index.js`](./apps/job-dashboard/src/index.js) | 대시보드 fetch·queue·scheduled 진입점 |
| 7 | [`wrangler.jsonc`](./wrangler.jsonc) | Cloudflare Workers 배포 설정 |

## 진입점 (API or Entry Points)

| 서비스 | 위치 | 프로토콜/이벤트 |
| --- | --- | --- |
| Portfolio | `/` (Cloudflare Worker) | HTTP fetch |
| Job Dashboard (in-process) | `/job/*` | HTTP fetch from portfolio |
| Job Server (MCP) | `http://localhost:3000` | HTTP / MCP |
| Health Check | `http://localhost:3000/health` | HTTP GET, 30초 간격 |
| Dashboard Worker | D1 + Queue + Scheduled | Cloudflare 이벤트 |

## 빠른 시작 (Quickstart)

```bash
# 1. 의존성 설치
npm ci

# 2. SSoT → PDF·PPTX·HTML 동기화
npm run sync:all

# 3. 잡 자동화 MCP 서버 기동
docker compose up -d mcp-server

# 4. 포트폴리오 로컬 미리보기
npx wrangler dev --config wrangler.jsonc

# 5. 데이터 마이그레이션 (JSON → D1)
node apps/job-dashboard/migrate-json-to-d1.cjs
```

## 명령어 (Commands)

루트 [`package.json`](./package.json) 의 주요 스크립트:

| 명령 | 용도 |
| --- | --- |
| `npm run sync:data` | SSoT 데이터를 다른 형식으로 동기화 |
| `npm run sync:pdf` | PDF 생성 (Go) |
| `npm run sync:pptx` | PPTX 생성 (Python) |
| `npm run sync:all` | data + pdf + pptx 일괄 동기화 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + Node 테스트 |
| `npm run op:run` / `op:seed:resume` | 1Password 자격 증명 실행·시드 |
| `npm run enrich:all` | GitHub·스킬·AI 강화 일괄 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test:node` | Jest 단위 테스트 |

전체 스크립트 목록은 [`package.json`](./package.json) 참조.

## 아키텍처 (Architecture)

요청 흐름 (단순화):

1. 사용자가 `/`에 접속 → `apps/portfolio/entry.js` 가 라우팅.
2. `/job/*` 경로는 인-프로세스로 대시보드 핸들러로 전달.
3. 큐·스케줄 이벤트는 `apps/job-dashboard/src/index.js` 의 fetch·queue·scheduled 핸들러가 처리.
4. 잡 자동화 작업은 `apps/job-server` MCP 서버가 받아 크롤링·자동 지원 실행.
5. 결과는 D1에 저장되고, 대시보드 Worker가 후속 처리를 트리거.
6. 콘텐츠 수정은 `packages/data/resumes/master/resume_data.json` (SSoT) 에서 시작해 `sync:all` 로 PDF·PPTX·HTML에 전파.

런타임·외부 의존성 매트릭스:

| 구성 요소 | 런타임 | 주요 외부 의존성 |
| --- | --- | --- |
| Portfolio Worker | Cloudflare Edge | KV/D1, 환경 변수 |
| Job Server (MCP) | Node 22 컨테이너 | 1Password, Wanted/JobKorea, D1 |
| Job Dashboard Worker | Cloudflare Edge | D1, Queue, 환경 변수 |
| TA 생성 | Python 3 + PPTX | 로컬 파일 시스템 |

## 로컬 개발 (Local Development)

- Node 22, Python 3, Go(선택), Docker 설치.
- `npm ci` 로 워크스페이스 의존성 설치.
- `.env` 작성 — 잡 서버·대시보드 환경 변수.
- `docker compose up -d mcp-server` 로 MCP 서버 기동.
- `npx wrangler dev` 로 포트폴리오·대시보드 로컬 미리보기.
- 변경 후 `npm run lint && npm run typecheck && npm run test:node` 실행.
- 워크스페이스 경계 규칙(200 LOC, 명명, 스크립트 언어 정책)은 [`AGENTS.md`](./AGENTS.md) 의 `docs/conventions` 항목 참조.

## 테스트 (Testing)

| 계층 | 도구 | 위치/설정 |
| --- | --- | --- |
| 단위·통합 | Jest + Node | [`jest.config.cjs`](./jest.config.cjs), `tests/` |
| E2E | Playwright | [`playwright.config.js`](./playwright.config.js) |
| 컨테이너 헬스 | docker-compose healthcheck | `/health`, 30초 간격, 재시도 3회 |
| 링크 검사 | lychee | [`lychee.toml`](./lychee.toml) |
| API 컨트랙트 | Redocly | [`redocly.yaml`](./redocly.yaml) |

## 기여 (Contribution)

[`CONTRIBUTING.md`](./CONTRIBUTING.md) 참조. 워크스페이스 규칙·자동화 SSoT·스크립트 언어 정책은 [`AGENTS.md`](./AGENTS.md) 의 아키텍처 규약 섹션에 정리되어 있습니다.

## 유지보수자 (Maintainers)

[`OWNERS`](./OWNERS) 파일 참조. 변경 요청은 PR 또는 이슈로 제출하세요. 개별 패키지 OWNERS는 [`apps/job-dashboard/OWNERS`](./apps/job-dashboard/OWNERS) 에 있습니다.

## 라이선스 (License)

[`LICENSE`](./LICENSE) 참조.

## 추가 문서 (Further Documentation)

- [`AGENTS.md`](./AGENTS.md) — 전체 코드 맵과 규약
- [`CHANGELOG.md`](./CHANGELOG.md) — 릴리스 기록
- [`design-state.md`](./design-state.md) — 현재 디자인 상태
- [`applications/DESIGN.md`](./applications/DESIGN.md) — 역할별 지원 디자인
- [`apps/job-dashboard/API_REFERENCE.md`](./apps/job-dashboard/API_REFERENCE.md) — 대시보드 API
- [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](./apps/job-dashboard/DEPLOYMENT_GUIDE.md) — 배포 가이드
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](./apps/job-dashboard/DEVELOPMENT_GUIDE.md) — 개발 가이드
- [`apps/job-dashboard/DIAGRAMS.md`](./apps/job-dashboard/DIAGRAMS.md) — 시스템 다이어그램
- [`apps/job-dashboard/SECRETS.md`](./apps/job-dashboard/SECRETS.md) — 비밀 관리
- [`apps/job-dashboard/README.md`](./apps/job-dashboard/README.md) — 대시보드 패키지 개요