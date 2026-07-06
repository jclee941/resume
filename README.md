# 포트폴리오·채용 운영 워크스페이스 / Portfolio & Job Operations Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker Compose](https://img.shields.io/badge/docker-compose-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript Strict](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

**한 줄 요약 (Korean)**: 이력서·지원서 SSoT, 채용 운영 대시보드, PPTX/프로필 산출물, 배포·검증 설정을 한 곳에서 다루는 개인 운영 워크스페이스입니다.

**One-line summary (English)**: A personal operations workspace that consolidates a resume/application single source of truth, a job operations dashboard, generated presentation/profile artifacts, and the deployment/verification wiring that supports them.

## 빠른 현황 / Quick Status

| 항목 | 현재 상태 | 운영자가 다음에 볼 곳 |
| --- | --- | --- |
| 주 목적 | 이력서·지원서 자료 + 채용 운영 대시보드 + 산출물 통합 관리 | [`applications/`](applications/), [`apps/job-dashboard/`](apps/job-dashboard/) |
| 대시보드 런타임 | Cloudflare Worker(`fetch`, `queue`, `scheduled` 엔트리) | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| 컨테이너 런타임 | Node 22 Alpine, `apps/job-server` 진입점 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| 배포 설정 | Wrangler, Docker Compose, Dockerfile, healthcheck 포함 | [`wrangler.jsonc`](wrangler.jsonc), [`Dockerfile`](Dockerfile) |
| 산출물 | 역할별 지원 패킷, PDF/HTML 이력서, PPTX 프로필 | [`applications/`](applications/), [`ta/`](ta/) |
| 자동화 도구 | Go 빌드/동기화/검증 스크립트, npm 스크립트 허브 | [`package.json`](package.json) |
| 성격 | 사설 운영자 워크스페이스(공개 SDK/API 아님) | [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Compact Flow

| 흐름 | 무엇이 실행되나 | 소유/관리 위치 | 다음 명령 또는 엔드포인트 |
| --- | --- | --- | --- |
| 채용 대시보드 | Worker 요청 라우팅, 큐 소비, 예약 핸들러 | [`apps/job-dashboard/src/`](apps/job-dashboard/src/) | 앱 디렉터리로 이동해 `npm install` |
| 컨테이너 서버 | Node 22 Alpine에서 `apps/job-server` 부트스트랩 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) | `docker compose up --build` → `GET /health` |
| SSoT 동기화 | 데이터 → PDF → PPTX 빌드 체인 | [`package.json`](package.json) `scripts.sync:*` | `npm run sync:all` |
| 스키마 진화 | SQL 마이그레이션 적용 | [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) | 앱 문서의 마이그레이션 절차 참조 |
| 지원 패킷 | 역할별 이력서·커버레터·산출물 | [`applications/`](applications/) | 폴더별 `cover_letter.md` / 가이드 |
| PPTX 검증 | 프로필 산출물 회귀 확인 | [`ta/`](ta/) | `python3 ta/verify.py` |

## 목차 / Table of Contents

1. [Purpose / Package Contents](#purpose--package-contents)
2. [Status](#status)
3. [First Files to Read](#first-files-to-read)
4. [API or Entry Points](#api-or-entry-points)
5. [Quickstart / Usage](#quickstart--usage)
6. [Configuration](#configuration)
7. [Commands Reference](#commands-reference)
8. [Architecture](#architecture)
9. [Local Development](#local-development)
10. [Testing](#testing)
11. [Contribution Guide](#contribution-guide)
12. [Maintainers / Points of Contact](#maintainers--points-of-contact)
13. [Further Documentation](#further-documentation)
14. [License](#license)

## Purpose / Package Contents

이 저장소는 단일 제품이 아니라 다음 자산을 한 워크스페이스에 묶어 관리하는 운영자 중심 저장소입니다.

| 영역 | 무엇이 들어 있나 | 위치 |
| --- | --- | --- |
| 이력서·지원서 자료 | 역할별 이력서 PDF/HTML, 커버레터, 지원 가이드 | [`applications/`](applications/) |
| 채용 운영 대시보드 | Worker 라우터, 큐 컨슈머, 마이그레이션, 스키마 | [`apps/job-dashboard/`](apps/job-dashboard/) |
| PPTX/프로필 산출물 | PowerPoint 프로필, 생성 스크립트, 검증 리포트 | [`ta/`](ta/) |
| 배포/검증 | Wrangler, Dockerfile, Docker Compose, 테스트 설정 | [`wrangler.jsonc`](wrangler.jsonc), [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml), [`playwright.config.js`](playwright.config.js), [`jest.config.cjs`](jest.config.cjs) |
| 운영 규칙 | 기여 규칙, 소유자, 변경 이력, 에이전트 가이드 | [`CONTRIBUTING.md`](CONTRIBUTING.md), [`OWNERS`](OWNERS), [`CHANGELOG.md`](CHANGELOG.md), [`AGENTS.md`](AGENTS.md) |

English: This is an operator-facing workspace that groups resume/application assets, a job operations dashboard, and generated presentation/profile artifacts together with the deployment/verification wiring that supports them.

## Status

| 측면 | 현재 상태 | 비고 |
| --- | --- | --- |
| 제품 성격 | 사설 운영 워크스페이스(공개 SDK/API 아님) | 외부 사용자가 임포트해 쓰는 라이브러리가 아님 |
| 안정성 표시 | 버전 `1.40.11` 명시 | [`package.json`](package.json) 참조 |
| 지원 채널 | 저장소 내 `OWNERS`, `CONTRIBUTING.md` | 외부 이슈 트래커는 운영되지 않음 |
| 폐기 여부 | 폐기(deprecated) 아님 — 운영 중 | 변경 이력은 [`CHANGELOG.md`](CHANGELOG.md) |
| 런타임 요구 | Node 22(컨테이너), Cloudflare Workers(엣지) | [`Dockerfile`](Dockerfile), [`wrangler.jsonc`](wrangler.jsonc) |
| 비밀 관리 | 1Password 기반 로컬 시드/복원 흐름 | [`package.json`](package.json) `scripts.op:*` |

## First Files to Read

운영자/새 합류자가 가장 먼저 봐야 할 파일입니다.

| 순서 | 파일 | 왜 읽나 |
| --- | --- | --- |
| 1 | [`package.json`](package.json) | 워크스페이스 정의와 전체 스크립트 허브 |
| 2 | [`AGENTS.md`](AGENTS.md) | 구조·심볼·위치 가이드(고지식 베이스) |
| 3 | [`OWNERS`](OWNERS) | 책임자, 연락 채널 |
| 4 | [`CONTRIBUTING.md`](CONTRIBUTING.md) | 기여·변경 절차 |
| 5 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 앱 단위 진입점 |
| 6 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) | 컨테이너 부트스트랩 |
| 7 | [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 배포 설정 |

## API or Entry Points

| 진입점 종류 | 위치 | 사용 시점 |
| --- | --- | --- |
| Worker `fetch` 핸들러 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | HTTP 요청 라우팅 |
| Worker `queue` 컨슈머 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | 비동기 작업 소비 |
| Worker `scheduled` 핸들러 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | 주기 작업 트리거 |
| 라우터 | [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) | 핸들러 분기 |
| 미들웨어 | [`apps/job-dashboard/src/middleware/`](apps/job-dashboard/src/middleware/) | 공통 처리(가이드: [`apps/job-dashboard/src/middleware/AGENTS.md`](apps/job-dashboard/src/middleware/AGENTS.md)) |
| 큐 컨슈머 | [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js) | 큐 메시지 처리 |
| 컨테이너 부트스트랩 | `apps/job-server`(`Dockerfile` 마지막 `CMD`) | 컨테이너 프로세스 시작 |
| Healthcheck 엔드포인트 | `GET /health` (포트 3000) | Docker Compose liveness |
| D1 마이그레이션 | [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) | DB 스키마 진화 |
| 데이터 마이그레이션 도구 | [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs) | JSON → D1 일회성 이관 |
| PPTX 검증 | [`ta/verify.py`](ta/verify.py) | 산출물 회귀 확인 |

## Quickstart / Usage

아래는 로컬에서 컨테이너 서버만 띄우는 가장 짧은 경로입니다. 대시보드 Worker는 [`wrangler.jsonc`](wrangler.jsonc) 기준의 별도 배포 흐름을 따릅니다.

1. 저장소 최상위에서 환경 변수 파일을 준비합니다.

   ```bash
   cp .env.example .env  # 실제 키 값으로 채움
   ```

2. 컨테이너 이미지를 빌드하고 실행합니다.

   ```bash
   docker compose up --build
   ```

3. Healthcheck가 응답하는지 확인합니다.

   ```bash
   curl -fsS http://127.0.0.1:3000/health
   ```

4. (선택) SSoT 동기화를 한 번에 실행합니다.

   ```bash
   npm run sync:all
   ```

5. (선택) 로컬 검증(타입체크, Node 테스트)을 돌립니다.

   ```bash
   npm run typecheck
   npm run test:node
   ```

English: For the dashboard Worker, follow the Cloudflare Workers flow encoded in `wrangler.jsonc`; for the local containerized job server, the steps above are the minimal path.

## Configuration

| 설정 종류 | 위치 | 비고 |
| --- | --- | --- |
| 컨테이너 환경 변수 | `.env` (`env_file`로 주입) | [`docker-compose.yml`](docker-compose.yml) 참조 |
| Worker 환경/바인딩 | [`wrangler.jsonc`](wrangler.jsonc) | D1, Queue, Cron 등 |
| TypeScript 컴파일러 옵션 | [`tsconfig.base.json`](tsconfig.base.json), [`tsconfig.json`](tsconfig.json) | strict 모드 |
| Lint 규칙 | [`eslint.config.cjs`](eslint.config.cjs) | |
| 테스트 프레임워크 | [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js) | |
| API 컨트랙트 린팅 | [`redocly.yaml`](redocly.yaml) | OpenAPI 검증 |
| 링크 검사 | [`lychee.toml`](lychee.toml) | 문서/링크 무결성 |
| 비밀 관리 | 1Password CLI 기반 | [`package.json`](package.json) `scripts.op:*` |

## Commands Reference

`package.json`의 `scripts`가 단일 허브입니다. 자주 쓰는 항목만 추렸습니다.

| 명령 | 의도 | 비고 |
| --- | --- | --- |
| `npm run sync:data` | SSoT 데이터 동기화 | Node 스크립트 |
| `npm run sync:pdf` | PDF 빌드 | Go 스크립트 |
| `npm run sync:pptx` | PPTX 빌드 | Python 스크립트 |
| `npm run sync:all` | 위 세 단계를 순차 실행 | |
| `npm run sync:proposals` | 제안 동기화 | Node + Go |
| `npm run typecheck` | TypeScript 타입 검사 | |
| `npm run test:node` | Node 테스트 | |
| `npm run op:run` / `op:native:run` | 1Password 항목 실행 | 비밀 필요 |
| `npm run op:seed:resume` | 이력서 시드 | 비밀 필요 |
| `npm run op:seed:sessions` | 세션 파일 시드 | 비밀 필요 |
| `npm run op:restore:sessions` | 세션 파일 복원 | 비밀 필요 |
| `npm run enrich:github` / `enrich:skills` / `enrich:ai` | 외부 소스 보강 | 각각 별도 디렉터리 |
| `npm run enrich:all` | 위 보강 작업 일괄 실행 | |
| `npm run automate:ssot` | sync + build + typecheck + Node 테스트 | |
| `npm run automate:full` | 풀 자동화 체인 | |
| `npm run strip-exif` | 산출 PNG/WebP EXIF 제거 | exiftool 의존 |

전체 목록은 [`package.json`](package.json)을 확인하세요.

## Architecture

### 최상위 디렉터리 구조(실제 확인분)

| 경로 | 역할 |
| --- | --- |
| `applications/` | 역할별 지원 패킷(이력서, 커버레터, 가이드, 산출물) |
| `apps/job-dashboard/` | 대시보드 Worker(라우터, 큐, 워크플로, 마이그레이션) |
| `ta/` | PowerPoint 프로필 생성·검증 스크립트와 산출물 |
| 최상위 설정 파일들 | 빌드·테스트·린트·배포 일체(`Dockerfile`, `wrangler.jsonc`, `docker-compose.yml`, `tsconfig*.json`, `eslint.config.cjs`, `jest.config.cjs`, `playwright.config.js`, `redocly.yaml`, `lychee.toml`) |
| 최상위 문서/규칙 | `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `OWNERS`, `LICENSE` |

자세한 광역 구조(예: `apps/portfolio/`, `apps/job-server/`, `packages/`, `tools/`, `docs/`, `infrastructure/`, `supabase/functions/`, `third_party/`)는 [`AGENTS.md`](AGENTS.md)의 "STRUCTURE" 절을 참조하세요.

### 요청 흐름(요약)

1. 외부 요청이 Cloudflare Worker `fetch` 핸들러([`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js))로 진입합니다.
2. 라우터([`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js))가 미들웨어를 거쳐 핸들러로 분기합니다.
3. 비동기 작업은 동일 Worker의 `queue` 핸들러에서 [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js)로 소비됩니다.
4. 주기 작업은 `scheduled` 핸들러에서 트리거됩니다.
5. 영속 상태는 D1(`migrations/`, `migrate-json-to-d1.cjs`)에 저장됩니다.
6. 컨테이너 경로(`apps/job-server`)는 Docker Compose로 띄워 별도 포트 3000에서 `GET /health`를 노출합니다.

### 런타임/관측 가능 표면

| 표면 | 위치 | 비고 |
| --- | --- | --- |
| Healthcheck | `GET /health` (포트 3000) | Dockerfile `HEALTHCHECK`, docker-compose `healthcheck` |
| 데이터 볼륨 | `job_automation_data` | [`docker-compose.yml`](docker-compose.yml) |
| 로그 | 컨테이너 stdout/stderr | Docker 기본 |
| 환경 변수 | `.env` | [`docker-compose.yml`](docker-compose.yml) `env_file` |
| 메트릭/트레이스 | 워크스페이스 내부 스크립트 | 광역 운영 자원은 [`AGENTS.md`](AGENTS.md) "operational scripts" 참조 |

## Local Development

| 작업 | 절차 |
| --- | --- |
| 의존성 설치 | 저장소 루트에서 `npm install`(npm workspaces) |
| 대시보드 로컬 실행 | `cd apps/job-dashboard && npm install` 후 앱 문서(`DEVELOPMENT_GUIDE.md`) 절차 따르기 |
| 컨테이너 로컬 실행 | `docker compose up --build` |
| 환경 변수 | `.env`를 [`docker-compose.yml`](docker-compose.yml)이 자동으로 로드 |
| 비밀 사용 | 1Password CLI 경유 — `npm run op:seed:*` 후 사용 |
| 산출물 갱신 | `npm run sync:all` |
| EXIF 제거 | `npm run strip-exif` (exiftool 설치 필요) |
| 컨테이너 중지 | `docker compose down` (볼륨 유지) / `docker compose down -v` (볼륨 삭제) |

## Testing

| 종류 | 도구 | 설정 파일 |
| --- | --- | --- |
| Node 단위/통합 | Jest | [`jest.config.cjs`](jest.config.cjs) |
| E2E | Playwright | [`playwright.config.js`](playwright.config.js) |
| 링크 무결성 | lychee | [`lychee.toml`](lychee.toml) |
| API 컨트랙트 | Redocly | [`redocly.yaml`](redocly.yaml) |
| Lint | ESLint | [`eslint.config.cjs`](eslint.config.cjs) |
| 타입 | TypeScript | [`tsconfig.base.json`](tsconfig.base.json) |
| PPTX 산출물 회귀 | Python 스크립트 | [`ta/verify.py`](ta/verify.py) |

## Contribution Guide

1. [`CONTRIBUTING.md`](CONTRIBUTING.md)의 절차를 먼저 읽습니다.
2. [`OWNERS`](OWNERS)에서 책임 영역을 확인하고, 해당 영역 오너에게 변경 의도를 공유합니다.
3. [`AGENTS.md`](AGENTS.md)의 "WHERE TO LOOK" 표를 따라 가장 알맞은 위치를 정합니다.
4. 변경 후 로컬에서 `npm run typecheck`, `npm run test:node`, E2E가 필요하면 Playwright 스위트를 돌립니다.
5. 변경 사항은 [`CHANGELOG.md`](CHANGELOG.md)에 한 줄 단위로 남깁니다.

## Maintainers / Points of Contact

| 역할 | 위치 |
| --- | --- |
| 저장소 책임자 | [`OWNERS`](OWNERS) |
| 에이전트/기여 규칙 | [`AGENTS.md`](AGENTS.md) |
| 변경 절차 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |

## Further Documentation

| 주제 | 위치 |
| --- | --- |
| 대시보드 앱 개요 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) |
| 대시보드 API | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 대시보드 배포 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 개발 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| 비밀/시크릿 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 디자인 | [`applications/DESIGN.md`](applications/DESIGN.md) |
| 역할별 지원 가이드 | [`applications/*/application-guide.md`](applications/) |
| TA 프로필 | [`ta/AGENTS.md`](ta/AGENTS.md) |
| 작업 검색 운영 | [`applications/job-search-2026-07/README.md`](applications/job-search-2026-07/README.md) |
| 최상위 가이드 | [`AGENTS.md`](AGENTS.md) |

## License

라이선스 전문은 [`LICENSE`](LICENSE)를 확인하세요. 본 워크스페이스는 사설 운영 자산이며, 외부 배포/재배포 정책은 [`LICENSE`](LICENSE)와 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 따릅니다.