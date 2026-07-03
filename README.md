# 포트폴리오·채용 운영 워크스페이스 / Portfolio & Job Operations Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker](https://img.shields.io/badge/docker-compose-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

이 저장소는 이력서·지원서 자료, 채용 운영 대시보드, PPTX/프로필 산출물, 그리고 배포·검증 설정을 함께 관리하는 개인 포트폴리오 및 채용 운영 워크스페이스입니다.  
English: A private workspace for resume/application assets, a job operations dashboard, generated presentation/profile materials, and deployment/verification configuration.

## 빠른 현황 / Quick Status

| 항목 | 현재 상태 | 운영자가 다음에 볼 곳 |
| --- | --- | --- |
| 주 제품 | 이력서·지원서 자료와 채용 운영 대시보드 | [`applications/`](applications/), [`apps/job-dashboard/`](apps/job-dashboard/) |
| 대시보드 런타임 | Cloudflare Worker 형태의 `fetch`, `queue`, `scheduled` 엔트리 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| 컨테이너 런타임 | `Dockerfile`은 `apps/job-server` 런타임을 대상으로 함 | [`Dockerfile`](Dockerfile), [주의 사항](#현재-체크아웃-주의-사항--checkout-notes) |
| 배포 설정 | Wrangler, Docker Compose 설정 포함 | [`wrangler.jsonc`](wrangler.jsonc), [`docker-compose.yml`](docker-compose.yml) |
| 산출물 | 역할별 지원 패킷, PDF/HTML 이력서, PPTX 자료 | [`applications/`](applications/), [`ta/`](ta/) |
| 상태 | 사설 운영 워크스페이스. 공개 제품 SDK가 아니라 운영자 중심 저장소 | [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Compact Flow

| 흐름 | 무엇이 실행되나 | 소유/관리 위치 | 다음 명령 또는 엔드포인트 |
| --- | --- | --- | --- |
| 채용 대시보드 | Worker 요청 라우팅, 큐 소비, 예약 작업 | `apps/job-dashboard/src/` | `cd apps/job-dashboard && npm install` 후 앱 문서 확인 |
| 컨테이너 서버 | Node 22 기반 job-server 프로세스 | `Dockerfile`, `docker-compose.yml` | `docker compose up --build` |
| SSoT 동기화 | 이력서 데이터, PDF, PPTX 산출물 생성 스크립트 | `package.json` scripts | `npm run sync:all` |
| 지원 자료 관리 | 회사/역할별 자기소개서, 이력서, 가이드 보관 | `applications/*` | 대상 폴더의 `cover_letter.md`, `application-guide.md` 확인 |
| TA/PPTX 검증 | Python 기반 PPTX 검사·개선 스크립트 | `ta/` | `python3 ta/inspect.py` 또는 `python3 ta/verify.py` |

## 목차 / Table of Contents

- [목적 / Purpose](#목적--purpose)
- [패키지 구성 / Package Contents](#패키지-구성--package-contents)
- [현재 체크아웃 주의 사항 / Checkout Notes](#현재-체크아웃-주의-사항--checkout-notes)
- [주요 기능 / Features](#주요-기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [처음 읽을 파일 / First Files to Read](#처음-읽을-파일--first-files-to-read)
- [API 및 엔트리 포인트 / API and Entry Points](#api-및-엔트리-포인트--api-and-entry-points)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 레퍼런스 / Commands Reference](#명령어-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [운영 관찰성 / Observability](#운영-관찰성--observability)
- [기여 / Contribution](#기여--contribution)
- [관리자 / Maintainers](#관리자--maintainers)
- [라이선스 / License](#라이선스--license)

## 목적 / Purpose

이 프로젝트는 개인 이력·지원 활동을 반복 가능한 운영 흐름으로 관리하기 위해 만들어졌습니다.

- 이력서, 커버레터, 지원 가이드, 미리보기 이미지를 역할별로 보관합니다.
- Cloudflare Worker 기반 채용 대시보드 앱을 제공합니다.
- PPTX 프로필 자료를 생성·검증하는 Python 유틸리티를 포함합니다.
- Docker, Wrangler, Jest, Playwright, ESLint, TypeScript 설정을 루트에서 관리합니다.
- 운영자가 `package.json`의 명령어를 통해 데이터 동기화, 산출물 생성, 검증 작업을 수행할 수 있게 합니다.

English: The repository centralizes resume/application content, job dashboard runtime code, generated profile materials, and operational scripts/configuration for repeatable portfolio and job-search workflows.

## 패키지 구성 / Package Contents

| 영역 | 경로 | 설명 |
| --- | --- | --- |
| 루트 설정 | `package.json`, `tsconfig*.json`, `eslint.config.cjs`, `jest.config.cjs`, `playwright.config.js` | Node/TypeScript 테스트·빌드·검증 설정 |
| 컨테이너 | `Dockerfile`, `docker-compose.yml` | Node 22 런타임 이미지와 Compose 서비스 정의 |
| Cloudflare 설정 | `wrangler.jsonc`, `redocly.yaml` | Worker 및 API 문서 관련 설정 |
| 채용 대시보드 | `apps/job-dashboard/` | Worker 앱, API 문서, 배포·개발 가이드, D1 스키마/마이그레이션 |
| 지원 자료 | `applications/` | 회사/역할별 이력서, 커버레터, 지원 가이드, 미리보기 |
| TA/PPTX 도구 | `ta/` | PPTX 자료와 Python 검사·개선·검증 스크립트 |
| 거버넌스 | `OWNERS`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` | 소유권, 기여, 변경 이력, 라이선스 정보 |

## 현재 체크아웃 주의 사항 / Checkout Notes

현재 제공된 트리에는 루트 `package.json`과 `Dockerfile`이 참조하는 일부 워크스페이스 경로가 보이지 않습니다.

| 참조 위치 | 참조되는 경로 | 현재 트리 상태 | 영향 |
| --- | --- | --- | --- |
| `package.json` workspaces | `apps/portfolio`, `apps/job-server`, `packages/*` | 제공된 구조에는 없음 | 루트 `npm install`, `npm run sync:*`, Docker 빌드가 실패할 수 있음 |
| `Dockerfile` | `apps/job-server`, `packages/shared`, `packages/schemas`, `packages/types`, `packages/data`, `packages/env` | 제공된 구조에는 없음 | `docker compose up --build` 전에 전체 워크스페이스 복원 필요 |
| 루트 scripts | `tools/scripts/*` | 제공된 구조에는 없음 | `sync:*`, `op:*`, `enrich:*` 계열 명령 실행 전 경로 확인 필요 |

English: This README documents the repository as provided. If you are operating the full workspace, restore the missing workspace/package directories before running root-level build, sync, or Docker commands.

## 주요 기능 / Features

### 한국어 요약

- 역할별 지원 패킷 관리: PDF/HTML 이력서, 커버레터, 지원 가이드, 면접 Q&A.
- Cloudflare Worker 기반 job dashboard 앱과 D1 마이그레이션 파일.
- Docker Compose 기반 서버 실행 설정.
- PPTX 프로필 자료 검사, 개선, 검증 스크립트.
- Jest, Playwright, ESLint, TypeScript 설정을 통한 품질 관리.
- 변경 이력, 기여 규칙, 소유자 파일을 통한 운영 절차 문서화.

### English Notes

- Role-specific application packets with resumes, cover letters, guides, and previews.
- Worker-based job dashboard with schema and migration files.
- Docker Compose runtime configuration.
- Python utilities for PPTX inspection/improvement/verification.
- Root-level quality tooling for linting, testing, and TypeScript.

## 아키텍처 / Architecture

### 구성 요소 / Components

| 구성 요소 | 런타임 | 주요 파일 | 책임 |
| --- | --- | --- | --- |
| Job Dashboard Worker | Cloudflare Worker / JavaScript | `apps/job-dashboard/src/index.js` | HTTP 요청, 큐, 예약 작업 엔트리 |
| Dashboard Router | JavaScript | `apps/job-dashboard/src/router.js` | API 라우팅 |
| Queue Consumer | JavaScript | `apps/job-dashboard/src/queue-consumer.js` | 비동기 큐 작업 처리 |
| Dashboard DB | Cloudflare D1 SQL | `apps/job-dashboard/schema.sql`, `apps/job-dashboard/migrations/` | 데이터 스키마와 마이그레이션 |
| Container Runtime | Node 22 Alpine | `Dockerfile`, `docker-compose.yml` | job-server 대상 런타임 이미지 |
| Application Packets | Markdown, PDF, HTML, PNG | `applications/*` | 회사/직무별 제출 자료 |
| PPTX Tooling | Python + PPTX files | `ta/` | 발표/프로필 자료 검사 및 검증 |

### 요청 흐름 / Request Flow

1. 운영자 또는 외부 클라이언트가 Worker 엔드포인트로 요청을 보냅니다.
2. `apps/job-dashboard/src/index.js`가 `fetch` 이벤트를 받아 라우터로 전달합니다.
3. `router.js`가 API 요청을 기능별 핸들러로 분기합니다.
4. 큐 기반 작업은 `queue-consumer.js`에서 처리됩니다.
5. 예약 작업은 Worker의 `scheduled` 엔트리에서 실행됩니다.
6. 데이터 변경이 필요한 경우 `schema.sql`과 `migrations/`에 정의된 D1 구조를 따릅니다.

## 처음 읽을 파일 / First Files to Read

| 목적 | 파일 | 읽어야 하는 이유 |
| --- | --- | --- |
| 전체 프로젝트 메타데이터 | [`package.json`](package.json) | 이름, 버전, 워크스페이스, 운영 명령어 확인 |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) | 배포/수정 히스토리 확인 |
| 기여 규칙 | [`CONTRIBUTING.md`](CONTRIBUTING.md) | 작업 전 개발 규칙 확인 |
| 소유자 | [`OWNERS`](OWNERS) | 리뷰·승인 담당자 확인 |
| 대시보드 개요 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 앱별 실행·운영 절차 확인 |
| 대시보드 API | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | 엔드포인트와 요청/응답 확인 |
| 대시보드 배포 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 배포 절차 확인 |
| 대시보드 개발 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) | 로컬 개발 절차 확인 |
| 비밀값 운영 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 환경 변수와 secret 관리 확인 |

## API 및 엔트리 포인트 / API and Entry Points

### 런타임 엔트리

| 엔트리 | 파일 | 설명 |
| --- | --- | --- |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | Cloudflare Worker의 `fetch`, `queue`, `scheduled` 진입점 |
| Dashboard Router | `apps/job-dashboard/src/router.js` | 대시보드 API 라우팅 |
| Queue Consumer | `apps/job-dashboard/src/queue-consumer.js` | 큐 메시지 처리 |
| Container Command | `Dockerfile` `CMD ["node", "src/server/index.js"]` | 컨테이너에서 job-server 시작 |
| Health Check | `/health` | Compose와 Dockerfile healthcheck가 사용하는 상태 확인 경로 |

### 문서화된 API

| 문서 | 위치 |
| --- | --- |
| Dashboard API Reference | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| Dashboard Diagrams | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| OpenAPI/Redocly 설정 | [`redocly.yaml`](redocly.yaml) |

## 빠른 시작 / Quick Start

### 1. 사전 요구 사항 / Prerequisites

| 도구 | 권장 버전/상태 | 사용 목적 |
| --- | --- | --- |
| Node.js | 22.x | 루트 스크립트, Worker 앱, 서버 런타임 |
| npm | `package-lock.json`과 호환 | 의존성 설치 |
| Docker / Docker Compose | 최신 안정 버전 | 컨테이너 실행 |
| Python 3 | 3.x | `ta/` PPTX 유틸리티 실행 |
| Wrangler | 프로젝트 설정에 맞게 설치 | Cloudflare Worker 배포/개발 |

### 2. 저장소 준비

```bash
npm install
```

> 현재 체크아웃에 루트 `package.json`이 참조하는 워크스페이스가 모두 없으면 설치가 실패할 수 있습니다. 이 경우 전체 저장소를 복원하거나 `apps/job-dashboard` 단위로 작업하세요.

### 3. 대시보드 앱 확인

```bash
cd apps/job-dashboard
npm install
```

앱별 실행 방법은 다음 문서를 우선 확인하세요.

- [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md)
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
- [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)

### 4. 컨테이너 실행

```bash
docker compose up --build
```

서비스는 기본적으로 컨테이너 내부 `PORT=3000`을 사용하며, Compose 설정은 호스트의 `3000` 포트로 매핑합니다.

```bash
curl http://localhost:3000/health
```

> Dockerfile이 `apps/job-server`와 `packages/*`를 복사하므로, 해당 경로가 없는 체크아웃에서는 빌드가 실패합니다.

### 5. PPTX 검증 도구 실행

```bash
python3 ta/inspect.py
python3 ta/verify.py
```

생성 또는 검증 결과는 `ta/output/`에서 확인합니다.

## 설정 / Configuration

### 루트 환경

| 설정 파일 | 설명 |
| --- | --- |
| `.env` | Docker Compose의 `env_file`로 사용됩니다. 저장소에는 포함하지 않는 것이 안전합니다. |
| `wrangler.jsonc` | Cloudflare Worker 배포/런타임 설정 |
| `tsconfig.base.json`, `tsconfig.json` | TypeScript 컴파일 설정 |
| `eslint.config.cjs` | ESLint 설정 |
| `jest.config.cjs` | Jest 설정 |
| `playwright.config.js` | Playwright E2E 설정 |
| `lychee.toml` | 링크 검사 설정 |
| `redocly.yaml` | API 문서/스펙 검사 설정 |

### Docker Compose 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `production` | Node 런타임 모드 |
| `PORT` | `3000` | 서버가 수신하는 포트 |
| `.env` 항목 | 로컬별 설정 | 비밀값과 배포 환경별 설정 |

### 데이터 볼륨

| 볼륨 | 마운트 위치 | 설명 |
| --- | --- | --- |
| `job_automation_data` | `/app/apps/job-server/.data` | job automation 런타임 데이터 보존 |

## 명령어 레퍼런스 / Commands Reference

루트 `package.json`에 정의된 주요 명령어입니다. 현재 체크아웃에 필요한 경로가 없을 수 있으므로 실행 전 경로 존재 여부를 확인하세요.

### 데이터·산출물 동기화

| 명령 | 설명 |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지 EXIF 제거 |
| `npm run sync:data` | 이력서/프로필 데이터 동기화 |
| `npm run sync:pptx` | PPTX 산출물 생성 |
| `npm run sync:pdf` | PDF 산출물 생성 |
| `npm run sync:all` | 데이터, PDF, PPTX 전체 동기화 |
| `npm run sync:proposals` | 제안 리뷰 CLI 실행 후 제안 반영 |

### 보안·세션 운영

| 명령 | 설명 |
| --- | --- |
| `npm run op:run` | 1Password 기반 실행 래퍼 |
| `npm run op:native:run` | 네이티브 1Password 실행 래퍼 |
| `npm run op:seed:resume` | 이력서 secret seed |
| `npm run op:seed:sessions` | 세션 파일 seed |
| `npm run op:restore:sessions` | 세션 파일 복원 |

### 데이터 보강

| 명령 | 설명 |
| --- | --- |
| `npm run enrich:github` | GitHub 기반 데이터 보강 |
| `npm run enrich:skills` | 스킬 데이터 보강 |
| `npm run enrich:ai` | AI 기반 데이터 보강 |
| `npm run enrich:all` | 모든 보강 작업 실행 |

### 자동화 묶음

| 명령 | 설명 |
| --- | --- |
| `npm run automate:ssot` | 데이터 동기화, PDF 생성, 빌드, 타입체크, Node 테스트 |
| `npm run automate:full` | 전체 동기화와 품질 검사를 포함한 장기 자동화 흐름 |

## 로컬 개발 / Local Development

### 권장 작업 순서

1. [`CONTRIBUTING.md`](CONTRIBUTING.md)를 읽고 브랜치/커밋/리뷰 규칙을 확인합니다.
2. 작업 대상이 대시보드라면 [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)를 먼저 확인합니다.
3. 환경 변수는 `.env` 또는 Cloudflare secret으로 관리하고 저장소에 커밋하지 않습니다.
4. 스키마 변경 시 `apps/job-dashboard/schema.sql`과 `apps/job-dashboard/migrations/`를 함께 갱신합니다.
5. 지원 자료 변경 시 대상 `applications/<role>/` 폴더의 Markdown, HTML, PDF, 이미지가 서로 일관적인지 확인합니다.
6. 가능한 경우 Jest/Playwright/앱별 테스트를 실행한 뒤 PR 또는 변경 요청을 제출합니다.

### 작업 영역별 가이드

| 작업 | 위치 | 참고 문서 |
| --- | --- | --- |
| 대시보드 API 수정 | `apps/job-dashboard/src/` | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| D1 스키마 변경 | `apps/job-dashboard/schema.sql`, `apps/job-dashboard/migrations/` | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 지원서 업데이트 | `applications/<role>/` | 각 역할 폴더의 `application-guide.md`, `cover_letter.md` |
| PPTX 개선 | `ta/` | `inspect.py`, `improve_visual.py`, `verify.py` |
| 컨테이너 수정 | `Dockerfile`, `docker-compose.yml` | [배포 / Deployment](#배포--deployment) |

## 테스트 / Testing

### 루트 테스트 설정

| 도구 | 설정 파일 | 목적 |
| --- | --- | --- |
| Jest | `jest.config.cjs` | Node/JavaScript 단위·통합 테스트 |
| Playwright | `playwright.config.js` | 브라우저/E2E 테스트 |
| ESLint | `eslint.config.cjs` | 정적 분석 |
| TypeScript | `tsconfig.json`, `tsconfig.base.json` | 타입 검사 |
| Lychee | `lychee.toml` | 링크 검사 |

### 일반 실행 예시

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run typecheck
```

> 위 명령은 루트 `package.json`의 전체 scripts 정의에 따라 달라집니다. 현재 제공된 `package.json` 내용은 일부가 잘려 있으므로, 실제 실행 전 `npm run`으로 사용 가능한 명령을 확인하세요.

### 대시보드 테스트

대시보드 앱은 자체 `package.json`을 가지고 있습니다.

```bash
cd apps/job-dashboard
npm test
```

앱별 명령은 다음 파일에서 확인하세요.

- [`apps/job-dashboard/package.json`](apps/job-dashboard/package.json)
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)

## 배포 / Deployment

### Cloudflare Worker

| 항목 | 위치 | 설명 |
| --- | --- | --- |
| Wrangler 설정 | `wrangler.jsonc` | Worker 배포 설정 |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | Worker 엔트리 |
| 배포 가이드 | `apps/job-dashboard/DEPLOYMENT_GUIDE.md` | 앱별 배포 절차 |
| Secrets 가이드 | `apps/job-dashboard/SECRETS.md` | 비밀값 설정과 운영 규칙 |

일반적인 Worker 배포는 앱별 문서를 따릅니다.

```bash
cd apps/job-dashboard
npx wrangler deploy
```

### Docker Compose

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:3000/health
```

중지:

```bash
docker compose down
```

볼륨까지 제거:

```bash
docker compose down -v
```

## 저장소 구조 / Repository Structure

현재 제공된 최상위 구조를 기준으로 합니다.

```text
.
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
├── package-lock.json
├── package.json
├── playwright.config.js
├── redocly.yaml
├── tsconfig.base.json
├── tsconfig.json
├── wrangler.jsonc
├── applications/
├── apps/
│   └── job-dashboard/
└── ta/
```

### 주요 하위 디렉터리

| 경로 | 내용 |
| --- | --- |
| `applications/airpremia-security-2026/` | Air Premia 보안 역할 지원 자료 |
| `applications/cloudflare-one-se-2026/` | Cloudflare One SE 지원 자료 |
| `applications/coupang-fintech-sre-2026/` | Coupang Pay Fintech SRE 지원 자료 |
| `applications/gitlab-apac-security-2026/` | GitLab APAC Infra/Security 지원 자료 |
| `applications/job-search-2026-07/` | 구직 운영 계획, 스코어카드, 아웃리치 템플릿 |
| `applications/security-ir-2026/` | Security IR 역할 이력서 자료 |
| `apps/job-dashboard/` | 채용 운영 대시보드 Worker 앱 |
| `ta/` | PPTX 자료와 검사·검증 스크립트 |

## 운영 관찰성 / Observability

| 대상 | 확인 방법 | 위치 |
| --- | --- | --- |
| 컨테이너 상태 | Docker healthcheck `/health` | `Dockerfile`, `docker-compose.yml` |
| Compose 서비스 | `docker compose ps`, `docker compose logs` | `docker-compose.yml` |
| Dashboard API | 앱 API 문서 확인 | `apps/job-dashboard/API_REFERENCE.md` |
| Worker 큐 처리 | Queue consumer 로그와 Cloudflare 대시보드 | `apps/job-dashboard/src/queue-consumer.js` |
| DB 마이그레이션 | SQL 파일 리뷰 | `apps/job-dashboard/migrations/` |
| PPTX 검증 | 검증 리포트 확인 | `ta/output/verify_report_20260212.txt` |

## 보안 / Security

- `.env`, API 토큰, 세션 파일, 계정 정보는 저장소에 커밋하지 않습니다.
- 대시보드 secret은 [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md)의 규칙을 따릅니다.
- Docker Compose는 `.env`를 읽도록 설정되어 있으므로 로컬·운영 환경별 파일을 분리하세요.
- 지원 자료에는 개인 정보가 포함될 수 있으므로 공개 배포 전 PDF, HTML, 이미지 메타데이터를 검토하세요.
- 이미지 메타데이터 제거가 필요한 경우 루트 script `strip-exif`를 사용할 수 있습니다.

## 기여 / Contribution

기여 또는 운영 변경 전 다음 파일을 확인하세요.

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`OWNERS`](OWNERS)
- [`CHANGELOG.md`](CHANGELOG.md)
- 앱별 `AGENTS.md` 및 하위 문서

권장 PR 체크리스트:

- 변경 목적과 영향 범위를 설명했습니다.
- 관련 문서를 갱신했습니다.
- 필요한 테스트 또는 검증 명령을 실행했습니다.
- secret, 개인 정보, 내부 환경 값이 포함되지 않았는지 확인했습니다.
- 스키마 변경 시 마이그레이션을 추가했습니다.

## 관리자 / Maintainers

| 역할 | 파일 |
| --- | --- |
| 저장소 소유자 | [`OWNERS`](OWNERS) |
| 대시보드 소유자 | [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) |
| 기여 규칙 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |

문의나 운영 승인이 필요하면 `OWNERS`에 정의된 담당자를 기준으로 진행하세요.

## 추가 문서 / Further Documentation

| 문서 | 설명 |
| --- | --- |
| [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 앱 개요 |
| [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | API 레퍼런스 |
| [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 배포 가이드 |
| [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) | 개발 가이드 |
| [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) | 상세 다이어그램 |
| [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | secret 관리 |
| [`applications/job-search-2026-07/README.md`](applications/job-search-2026-07/README.md) | 구직 운영 문서 |
| [`applications/DESIGN.md`](applications/DESIGN.md) | 지원 자료 디자인 가이드 |
| [`CHANGELOG.md`](CHANGELOG.md) | 변경 이력 |

## 라이선스 / License

라이선스와 사용 제한은 [`LICENSE`](LICENSE)를 확인하세요. 이 저장소는 개인 이력·지원 자료와 운영 설정을 포함하므로, 재사용 또는 외부 공유 전 소유자 승인이 필요할 수 있습니다.