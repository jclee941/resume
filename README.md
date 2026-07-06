# 포트폴리오·채용 운영 워크스페이스 / Portfolio & Job Operations Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker Compose](https://img.shields.io/badge/docker--compose-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

이 저장소는 이력서·지원서 자료, 채용 운영 대시보드, PPTX/프로필 산출물, 그리고 배포·검증 설정을 함께 관리하는 개인 포트폴리오 및 채용 운영 워크스페이스입니다.  
English: A private portfolio and job-operations workspace for resume assets, role-specific applications, an edge dashboard, generated presentation/profile files, and deployment/test configuration.

## 빠른 현황 / Quick Status

| 항목 | 현재 상태 | 운영자가 다음에 볼 곳 |
| --- | --- | --- |
| 주 목적 | 이력서·지원서 자료와 채용 운영 대시보드 관리 | [`applications/`](applications/), [`apps/job-dashboard/`](apps/job-dashboard/) |
| 주요 런타임 | Cloudflare Worker 기반 대시보드, Docker 기반 Node 런타임 설정 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js), [`Dockerfile`](Dockerfile) |
| 운영 엔드포인트 | 컨테이너 헬스체크: `GET /health` | [`docker-compose.yml`](docker-compose.yml) |
| 데이터 저장 | 대시보드 D1 스키마·마이그레이션, 컨테이너 볼륨 데이터 | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) |
| 산출물 | 역할별 지원 패킷, PDF/HTML 이력서, PPTX 자료 | [`applications/`](applications/), [`ta/`](ta/) |
| 상태 | 사설 운영 워크스페이스. 공개 SDK가 아니라 운영자 중심 저장소 | [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Compact Flow

1. **지원 자료 작성**: `applications/`에서 역할별 커버레터, 이력서 HTML/PDF, 지원 가이드를 관리합니다.
2. **대시보드 운영**: `apps/job-dashboard/src/index.js`가 Worker `fetch`, `queue`, `scheduled` 엔트리를 제공합니다.
3. **데이터 변경**: `apps/job-dashboard/schema.sql`과 `migrations/`로 D1 스키마 변경을 추적합니다.
4. **컨테이너 실행**: 운영자는 `docker compose up --build`로 Node 런타임을 띄우고 `GET /health`로 상태를 확인합니다.
5. **검증·품질 관리**: 루트 설정의 Jest, Playwright, ESLint, TypeScript, Redocly 설정으로 로컬 검증을 수행합니다.

## 목차 / Table of Contents

- [목적 / Purpose](#목적--purpose)
- [패키지 구성 / Package Contents](#패키지-구성--package-contents)
- [상태 / Status](#상태--status)
- [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
- [기능 / Features](#기능--features)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [API와 엔트리 포인트 / API and Entry Points](#api와-엔트리-포인트--api-and-entry-points)
- [빠른 시작 / Quick Start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 참조 / Commands Reference](#명령어-참조--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트와 검증 / Testing and Verification](#테스트와-검증--testing-and-verification)
- [저장소 구조 / Repository Structure](#저장소-구조--repository-structure)
- [운영 참고 / Operations Notes](#운영-참고--operations-notes)
- [기여 / Contributing](#기여--contributing)
- [관리자와 문의 / Maintainers and Support](#관리자와-문의--maintainers-and-support)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

## 목적 / Purpose

이 프로젝트는 개인의 경력 자료와 채용 운영을 한곳에서 관리하기 위한 워크스페이스입니다.

English: This repository acts as an operator workspace for career materials and job-application operations.

사용자는 다음을 할 수 있습니다.

- 역할별 지원 패킷을 작성·보관합니다.
- 대시보드 Worker와 D1 스키마를 개발합니다.
- Docker Compose로 서버 런타임을 실행하고 헬스체크합니다.
- 이력서 데이터, PDF, PPTX 등 산출물 생성을 위한 스크립트 명령을 실행합니다.
- 지원 활동에 필요한 문서, 가이드, 인터뷰 답변, 아웃리치 템플릿을 관리합니다.

## 패키지 구성 / Package Contents

현재 체크아웃 기준 주요 구성은 다음과 같습니다.  
English: Main contents in the provided checkout are listed below.

| 경로 | 역할 |
| --- | --- |
| [`applications/`](applications/) | 회사·직무별 지원서, 커버레터, 이력서 PDF/HTML, 지원 가이드 |
| [`apps/job-dashboard/`](apps/job-dashboard/) | 채용 운영 대시보드 Worker, API 문서, 배포 문서, D1 스키마와 마이그레이션 |
| [`ta/`](ta/) | PPTX 기반 프로필/TA 자료와 Python 검증·개선 스크립트 |
| [`Dockerfile`](Dockerfile) | Node 22 Alpine 기반 컨테이너 런타임 빌드 정의 |
| [`docker-compose.yml`](docker-compose.yml) | 로컬/서버 실행용 Compose 서비스와 볼륨 정의 |
| [`package.json`](package.json) | 루트 npm 스크립트, 버전, 워크스페이스 메타데이터 |
| [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 배포 설정 |
| [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js), [`eslint.config.cjs`](eslint.config.cjs) | 테스트와 정적 분석 설정 |
| [`redocly.yaml`](redocly.yaml) | API 문서/스펙 검증 설정 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`OWNERS`](OWNERS), [`CHANGELOG.md`](CHANGELOG.md) | 기여, 소유권, 변경 이력 |

## 상태 / Status

- **운영 성격**: 개인용·운영자 중심의 프로덕션 지향 워크스페이스입니다.
- **공개 라이브러리 여부**: 일반 사용자를 위한 npm SDK 또는 범용 CLI 제품이 아닙니다.
- **배포 대상**: Cloudflare Worker 설정과 Docker Compose 런타임 설정을 포함합니다.
- **주의 사항**: 루트 `package.json`과 `Dockerfile`은 `apps/portfolio`, `apps/job-server`, `packages/*`, `tools/*` 같은 전체 워크스페이스 경로를 참조합니다. 제공된 체크아웃에 해당 경로가 없으면 일부 루트 명령과 Docker 빌드는 실패할 수 있습니다. 이 경우 전체 워크스페이스를 복원하거나 해당 앱 문서에 맞춰 부분 실행하세요.
- **폐기 여부**: 현재 README 기준으로 deprecated 표시는 없습니다.

## 먼저 읽을 파일 / First Files to Read

| 목적 | 파일 |
| --- | --- |
| 전체 개요 | [`README.md`](README.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |
| 기여 규칙 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 코드 소유자 | [`OWNERS`](OWNERS) |
| 대시보드 앱 개요 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) |
| 대시보드 API | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 대시보드 개발 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 대시보드 배포 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 보안/시크릿 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 애플리케이션 자료 설계 | [`applications/DESIGN.md`](applications/DESIGN.md) |

## 기능 / Features

### 채용 자료 관리

- 회사·직무별 지원 패킷 보관
- 커버레터, 지원 가이드, 인터뷰 Q&A, 아웃리치 템플릿 관리
- PDF/HTML 이력서와 미리보기 이미지 포함
- 월별 또는 캠페인별 구직 액션 플랜 관리

### 채용 운영 대시보드

- Cloudflare Worker 스타일의 `fetch`, `queue`, `scheduled` 엔트리
- 라우터와 미들웨어 분리
- D1 스키마와 마이그레이션 파일 포함
- 별도 API, 배포, 개발, 다이어그램 문서 제공

### 산출물 생성과 검증

- PPTX 기반 TA/프로필 산출물 관리
- Python 스크립트로 PPTX 검사·시각 개선·검증
- 루트 스크립트로 데이터, PDF, PPTX 동기화 작업 정의

### 운영 배포

- Dockerfile 기반 Node 22 런타임 빌드
- Compose 서비스, 볼륨, 헬스체크 정의
- Wrangler 설정으로 Worker 배포 흐름 지원
- TypeScript, Jest, Playwright, ESLint, Redocly 설정 포함

## 아키텍처 / Architecture

### 구성 요소

| 컴포넌트 | 책임 | 주요 파일 |
| --- | --- | --- |
| 지원 자료 저장소 | 역할별 지원서와 이력서 산출물 보관 | [`applications/`](applications/) |
| Job Dashboard Worker | 요청 처리, 큐 소비, 예약 작업 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| Dashboard Router | API 라우팅 | [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) |
| Queue Consumer | 비동기 작업 소비 | [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js) |
| D1 Schema | 대시보드 데이터 모델 | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) |
| Container Runtime | Node 서버 프로세스 실행 환경 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| TA Generator Assets | PPTX 자료와 검증 스크립트 | [`ta/`](ta/) |

### 요청·작업 흐름

1. 사용자가 대시보드 URL 또는 API 엔드포인트로 요청합니다.
2. Worker 엔트리인 `apps/job-dashboard/src/index.js`가 요청을 받습니다.
3. 라우터가 요청을 기능별 핸들러로 분배합니다.
4. 큐가 필요한 작업은 `queue-consumer.js`를 통해 비동기 처리됩니다.
5. 예약 작업은 Worker `scheduled` 엔트리에서 실행됩니다.
6. 데이터 구조 변경은 `schema.sql`과 `migrations/`로 버전 관리합니다.
7. 컨테이너 런타임에서는 `GET /health`로 서비스 상태를 확인합니다.

## API와 엔트리 포인트 / API and Entry Points

### Worker 엔트리

| 엔트리 | 설명 | 위치 |
| --- | --- | --- |
| `fetch` | HTTP 요청 처리 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| `queue` | 큐 메시지 처리 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| `scheduled` | 예약 작업 처리 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| Router | 요청 라우팅 | [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) |
| Queue Consumer | 큐 작업 구현 | [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js) |

자세한 API는 [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)를 확인하세요.  
English: See the dashboard API reference for route-level details.

### 컨테이너 엔트리

| 항목 | 값 |
| --- | --- |
| Compose 서비스 | `mcp-server` |
| 컨테이너 이름 | `resume-mcp-server` |
| 기본 포트 | `3000` |
| 헬스체크 | `GET /health` |
| 실행 명령 | `node src/server/index.js` |
| 데이터 볼륨 | `job_automation_data` |

참고: Dockerfile은 `apps/job-server`와 여러 내부 패키지를 런타임 소스로 복사합니다. 현재 체크아웃에 해당 경로가 없으면 전체 워크스페이스가 필요합니다.

## 빠른 시작 / Quick Start

### 1. 요구 사항

| 도구 | 권장 버전/용도 |
| --- | --- |
| Node.js | 22.x |
| npm | `package-lock.json` 기반 설치 |
| Docker / Docker Compose | 컨테이너 런타임 실행 |
| Python 3 | `ta/` PPTX 검사·개선 스크립트 |
| Go | 루트 스크립트 중 일부 빌드·동기화 도구 |
| Wrangler | Cloudflare Worker 로컬 실행/배포 |

### 2. 저장소 준비

```bash
git clone <repository-url>
cd <repository-directory>
```

이 README는 저장소 URL을 하드코딩하지 않습니다. 실제 원격 주소는 운영 환경에 맞게 사용하세요.

### 3. 의존성 설치

전체 워크스페이스가 있는 경우:

```bash
npm ci
```

부분 체크아웃에서 워크스페이스 경로가 누락된 경우에는 `npm ci`가 실패할 수 있습니다. 이때는 다음 중 하나를 선택하세요.

```bash
# 대시보드 앱만 작업하는 경우
cd apps/job-dashboard
npm install
```

또는 전체 워크스페이스 파일을 복원한 뒤 루트에서 다시 실행하세요.

### 4. 대시보드 앱 확인

```bash
cd apps/job-dashboard
ls
```

대시보드 세부 실행 명령은 앱 문서를 우선합니다.

- [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md)
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
- [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)

### 5. Docker Compose 실행

전체 런타임 소스가 있는 경우:

```bash
docker compose up --build
```

헬스체크:

```bash
curl http://localhost:3000/health
```

중지:

```bash
docker compose down
```

데이터 볼륨까지 제거하려면 주의해서 실행하세요.

```bash
docker compose down -v
```

## 설정 / Configuration

### 환경 변수

`docker-compose.yml`은 루트 `.env` 파일을 읽습니다.

```yaml
env_file:
  - .env
```

저장소에는 시크릿 값을 커밋하지 마세요. 필요한 키와 보관 방식은 다음 문서를 확인하세요.

- [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md)
- [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)

### 기본 런타임 설정

| 설정 | 기본값 | 위치 |
| --- | --- | --- |
| `NODE_ENV` | `production` | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| `PORT` | `3000` | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| Compose volume | `job_automation_data` | [`docker-compose.yml`](docker-compose.yml) |
| Worker config | 프로젝트별 Wrangler 설정 | [`wrangler.jsonc`](wrangler.jsonc) |
| TypeScript base config | strict TypeScript 설정 | [`tsconfig.base.json`](tsconfig.base.json) |

### 데이터베이스와 마이그레이션

대시보드 데이터 모델은 앱 디렉터리 안에 있습니다.

| 파일 | 설명 |
| --- | --- |
| [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql) | 기준 스키마 |
| [`apps/job-dashboard/migration-data.sql`](apps/job-dashboard/migration-data.sql) | 마이그레이션용 데이터 |
| [`apps/job-dashboard/migrations/0002_add_approval_metadata.sql`](apps/job-dashboard/migrations/0002_add_approval_metadata.sql) | 승인 메타데이터 추가 |
| [`apps/job-dashboard/migrations/0003_add_auto_apply_application_metadata.sql`](apps/job-dashboard/migrations/0003_add_auto_apply_application_metadata.sql) | 자동 지원 애플리케이션 메타데이터 추가 |
| [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs) | JSON 데이터를 D1로 옮기는 보조 스크립트 |

## 명령어 참조 / Commands Reference

루트 `package.json`에 정의된 확인 가능한 명령입니다.  
English: Commands visible in the root package metadata.

| 명령 | 목적 |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지의 EXIF 제거. `exiftool`이 없으면 건너뜀 |
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 산출물 생성 |
| `npm run sync:pdf` | PDF 산출물 생성 |
| `npm run sync:all` | 데이터, PDF, PPTX 전체 동기화 |
| `npm run op:run` | 1Password 기반 실행 래퍼 |
| `npm run op:native:run` | 네이티브 1Password 실행 래퍼 |
| `npm run op:seed:resume` | 이력서 관련 시크릿/데이터 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run sync:proposals` | 제안 리뷰 CLI 실행 후 제안 반영 |
| `npm run enrich:github` | GitHub 기반 프로필/데이터 보강 |
| `npm run enrich:skills` | 스킬 데이터 보강 |
| `npm run enrich:ai` | AI 기반 데이터 보강 |
| `npm run enrich:all` | GitHub, 스킬, AI 보강 전체 실행 |
| `npm run automate:ssot` | 데이터 동기화, PDF 생성, 빌드, 타입체크, Node 테스트 실행 |
| `npm run automate:full` | 전체 자동화 파이프라인. 자세한 내용은 `package.json` 확인 |

주의: 일부 명령은 현재 제공된 트리에 없는 `tools/`, `packages/`, `apps/portfolio`, `apps/job-server` 경로를 요구할 수 있습니다.

## 로컬 개발 / Local Development

### 대시보드 개발

```bash
cd apps/job-dashboard
npm install
```

그다음 앱 문서에 있는 개발 서버, Wrangler, D1, Queue 설정을 따르세요.

- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
- [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)
- [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md)

### 지원 자료 편집

역할별 자료는 `applications/` 하위 디렉터리에서 관리합니다.

| 디렉터리 | 내용 |
| --- | --- |
| [`applications/airpremia-security-2026/`](applications/airpremia-security-2026/) | Air Premia 보안 직무 지원 자료 |
| [`applications/cloudflare-one-se-2026/`](applications/cloudflare-one-se-2026/) | Cloudflare One SE 지원 자료 |
| [`applications/coupang-fintech-sre-2026/`](applications/coupang-fintech-sre-2026/) | Coupang Pay Fintech SRE 지원 자료 |
| [`applications/gitlab-apac-security-2026/`](applications/gitlab-apac-security-2026/) | GitLab APAC 보안/인프라 지원 자료 |
| [`applications/openai-codex-korea-2026/`](applications/openai-codex-korea-2026/) | OpenAI Codex Korea 지원 자료 |
| [`applications/security-ir-2026/`](applications/security-ir-2026/) | Security IR 지원 자료 |
| [`applications/job-search-2026-07/`](applications/job-search-2026-07/) | 구직 액션 플랜, 스코어카드, 답변, 템플릿 |
| [`applications/infrastructure-architecture-2026/`](applications/infrastructure-architecture-2026/) | 인프라 아키텍처 자료 |

### PPTX/TA 자료 작업

```bash
cd ta
python3 inspect.py
python3 improve_visual.py
python3 verify.py
```

출력물과 검증 리포트는 [`ta/output/`](ta/output/)에 보관됩니다.

## 테스트와 검증 / Testing and Verification

### 사용되는 설정 파일

| 도구 | 설정 파일 | 용도 |
| --- | --- | --- |
| Jest | [`jest.config.cjs`](jest.config.cjs) | Node/단위 테스트 |
| Playwright | [`playwright.config.js`](playwright.config.js) | 브라우저/E2E 테스트 |
| ESLint | [`eslint.config.cjs`](eslint.config.cjs) | 정적 분석 |
| TypeScript | [`tsconfig.json`](tsconfig.json), [`tsconfig.base.json`](tsconfig.base.json) | 타입 검사 |
| Redocly | [`redocly.yaml`](redocly.yaml) | OpenAPI 문서/스펙 검증 |
| Lychee | [`lychee.toml`](lychee.toml) | 링크 검증 |

### 권장 검증 순서

전체 워크스페이스가 있는 경우:

```bash
npm ci
npm run sync:all
npm run automate:ssot
```

부분 체크아웃에서는 앱별 문서를 우선하세요.

```bash
cd apps/job-dashboard
npm test
```

위 명령은 앱 `package.json`에 테스트 스크립트가 정의되어 있을 때 사용합니다.

## 저장소 구조 / Repository Structure

현재 제공된 최상위 레이아웃입니다.  
English: Top-level layout in the provided repository snapshot.

```text
/
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

참고: 루트 메타데이터는 더 넓은 워크스페이스 경로를 참조하지만, 위 트리는 제공된 체크아웃 기준입니다.

## 운영 참고 / Operations Notes

### Docker 운영

- Compose 서비스명은 `mcp-server`입니다.
- 기본 포트는 `3000`입니다.
- 헬스체크는 컨테이너 내부 `http://127.0.0.1:3000/health`를 호출합니다.
- 데이터는 `job_automation_data` 볼륨에 저장됩니다.
- 운영 중 볼륨 삭제는 데이터 손실을 유발할 수 있습니다.

### Cloudflare Worker 운영

- Worker 설정은 [`wrangler.jsonc`](wrangler.jsonc)를 기준으로 합니다.
- 대시보드 Worker 문서는 [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)를 확인하세요.
- D1, Queue, Secret 바인딩은 앱 배포 문서와 시크릿 문서를 우선합니다.

### 보안

- `.env`와 토큰, 쿠키, 세션 파일은 커밋하지 마세요.
- 시크릿 사용법은 [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md)를 따르세요.
- 이력서와 지원 자료에는 개인정보가 포함될 수 있으므로 공개 배포 전 파일별 공개 범위를 확인하세요.

## 기여 / Contributing

기여 전 다음 문서를 확인하세요.

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`OWNERS`](OWNERS)
- 하위 디렉터리별 `AGENTS.md`
  - [`apps/job-dashboard/AGENTS.md`](apps/job-dashboard/AGENTS.md)
  - [`applications/AGENTS.md`](applications/AGENTS.md)
  - [`ta/AGENTS.md`](ta/AGENTS.md)

일반 원칙:

- 역할별 지원 자료는 기존 디렉터리 구조와 파일명을 유지합니다.
- 대시보드 스키마 변경은 `schema.sql`과 `migrations/`를 함께 갱신합니다.
- 시크릿, 내부 주소, 개인 세션 정보는 커밋하지 않습니다.
- 생성 산출물은 원본 데이터와 생성 절차가 함께 추적될 때만 갱신합니다.
- 문서 링크는 저장소 상대 경로를 사용합니다.

## 관리자와 문의 / Maintainers and Support

| 영역 | 담당 위치 |
| --- | --- |
| 저장소 소유권 | [`OWNERS`](OWNERS) |
| 기여와 리뷰 규칙 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 대시보드 운영 | [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |

도움이 필요하면 먼저 관련 앱 문서를 확인한 뒤, 저장소 소유자 또는 해당 하위 디렉터리 소유자에게 문의하세요.  
English: For help, start with the app-level documentation and then contact the listed owner.

## 추가 문서 / Further Documentation

| 문서 | 설명 |
| --- | --- |
| [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 앱 개요 |
| [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | API 레퍼런스 |
| [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) | 로컬 개발 가이드 |
| [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 배포 가이드 |
| [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) | 상세 구조와 흐름 |
| [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 시크릿 관리 |
| [`applications/DESIGN.md`](applications/DESIGN.md) | 지원 자료 설계 |
| [`applications/job-search-2026-07/README.md`](applications/job-search-2026-07/README.md) | 구직 캠페인 운영 자료 |
| [`CHANGELOG.md`](CHANGELOG.md) | 릴리스와 변경 사항 |

## 라이선스 / License

라이선스 정보는 [`LICENSE`](LICENSE)를 확인하세요.  
English: See the repository license file for terms.