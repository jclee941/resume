# 포트폴리오·채용 운영 워크스페이스 / Portfolio & Job Operations Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker Compose](https://img.shields.io/badge/docker-compose-ready-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript strict](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

이 저장소는 이력서·지원서 자료, 채용 운영 대시보드, PPTX/프로필 산출물, 배포·검증 설정을 함께 다루는 **사설 운영 워크스페이스**입니다. 외부에 공개되는 제품 SDK가 아니라 운영자 본인이 직접 사용하는 표면입니다.
*English:* A private operator-facing workspace for resume and application artifacts, a Cloudflare Worker job-operations dashboard, generated PPTX/profile deliverables, and the deployment and verification configuration that keeps them running.

## 빠른 현황 / Quick Status

| 항목 | 현재 상태 | 운영자가 다음에 볼 곳 |
| --- | --- | --- |
| 주 제품 | 이력서·지원서 자료와 채용 운영 대시보드 | [`applications/`](applications/), [`apps/job-dashboard/`](apps/job-dashboard/) |
| 대시보드 런타임 | Cloudflare Worker: `fetch`, `queue`, `scheduled` 엔트리 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) |
| 컨테이너 런타임 | `Dockerfile`은 컨테이너 기반 job-automation 프로세스를 패키징 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml), [체크아웃 주의](#체크아웃-주의-사항--checkout-notes) |
| 엣지 배포 설정 | Wrangler 구성 포함 | [`wrangler.jsonc`](wrangler.jsonc) |
| 산출물 | 역할별 지원 패킷, PDF/HTML 이력서, PPTX 자료 | [`applications/`](applications/), [`ta/`](ta/) |
| 성격 | 사설 운영 워크스페이스 (공개 SDK 아님) | [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Compact Flow

| 흐름 | 무엇이 실행되나 | 소유/관리 위치 | 다음 명령 또는 엔드포인트 |
| --- | --- | --- | --- |
| 채용 대시보드 | Worker `fetch` 라우팅, `queue` 소비, `scheduled` 오케스트레이션 | `apps/job-dashboard/src/` | 앱 `README.md`의 로컬 절차 따름 |
| 컨테이너 서버 | Node 22 기반 job-automation 컨테이너 (`mcp-server`) | `Dockerfile`, `docker-compose.yml` | `docker compose up --build` 후 `localhost:3000/health` |
| 엣지 정적 사이트 | Cloudflare Worker 포트폴리오 빌드 결과 | `wrangler.jsonc` | `wrangler deploy` (앱 자체 진입점) |
| SSoT 동기화 | 이력서 데이터 → PDF/HTML/PPTX 재생성 | `package.json` scripts | `npm run sync:data`, `npm run sync:pdf`, `npm run sync:pptx` |
| 외부 데이터 보강 | GitHub/Skills/AI 소스에서 프로필 데이터 보강 | `package.json` scripts | `npm run enrich:github`, `enrich:skills`, `enrich:ai` |

## 목차 / Contents

- [구성 · 패키지 내용 / Package Contents](#구성--패키지-내용--package-contents)
- [현재 상태 / Status](#현재-상태--status)
- [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
- [API · 엔트리 포인트 / API & Entry Points](#api--엔트리-포인트--api--entry-points)
- [빠른 시작 / Quickstart](#빠른-시작--quickstart)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [설정 / Configuration](#설정--configuration)
- [명령 레퍼런스 / Commands Reference](#명령-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [배포 / Deployment](#배포--deployment)
- [기여·기여자 / Contributing & Maintainers](#기여·기여자--contributing--maintainers)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

## 구성 · 패키지 내용 / Package Contents

| 영역 | 경로 | 역할 |
| --- | --- | --- |
| 채용 운영 대시보드 | [`apps/job-dashboard/`](apps/job-dashboard/) | Cloudflare Worker 대시보드, 마이그레이션, API 레퍼런스 |
| 역할별 지원 패킷 | [`applications/`](applications/) | 회사·직무별 이력서(PDF/HTML)와 자기소개서, 지원 가이드 |
| TA 프로필 산출물 | [`ta/`](ta/) | Python/PPTX 기반 프로필 자료와 verify 스크립트 출력 |
| 엣지 사이트 설정 | [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 포트폴리오 배포 구성 |
| 컨테이너 설정 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) | Node 22 기반 job-automation 런타임 |
| 빌드/테스트 설정 | [`package.json`](package.json), [`tsconfig.base.json`](tsconfig.base.json), [`eslint.config.cjs`](eslint.config.cjs), [`jest.config.cjs`](jest.config.cjs), [`playwright.config.js`](playwright.config.js), [`redocly.yaml`](redocly.yaml), [`lychee.toml`](lychee.toml) | 컴파일, 린트, 테스트, OpenAPI/링크 검증 |
| 메타 문서 | [`AGENTS.md`](AGENTS.md), [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md), [`design-state.md`](design-state.md) | 운영 규칙과 의사결정 기록 |

`AGENTS.md`는 워크스페이스 전체(`apps/portfolio`, `apps/job-server`, `packages/*`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/`)의 구조를 문서화합니다. 본 체크아웃에서는 위에 정리한 경로만 직접 노출됩니다 — 자세한 내용은 [체크아웃 주의](#체크아웃-주의-사항--checkout-notes) 참조.

## 현재 상태 / Status

| 항목 | 값 | 출처 |
| --- | --- | --- |
| 버전 | `1.40.11` | [`package.json`](package.json) |
| 런타임 | Node 22 (`node:22-alpine`) | [`Dockerfile`](Dockerfile) |
| 타입 정책 | TypeScript strict | [`tsconfig.base.json`](tsconfig.base.json) |
| 린트 | ESLint flat config | [`eslint.config.cjs`](eslint.config.cjs) |
| API/OpenAPI | Redocly | [`redocly.yaml`](redocly.yaml) |
| 링크 검증 | Lychee | [`lychee.toml`](lychee.toml) |
| 단위/통합 테스트 | Jest | [`jest.config.cjs`](jest.config.cjs) |
| 엔드투엔드 테스트 | Playwright | [`playwright.config.js`](playwright.config.js) |
| 운영 성격 | 사설 운영 워크스페이스 (공개 SDK 아님) | [`OWNERS`](OWNERS) |

## 먼저 읽을 파일 / First Files to Read

| 목적 | 권장 파일 |
| --- | --- |
| 저장소 개요와 운영 표면 빠르게 파악 | [`README.md`](README.md), [`package.json`](package.json) |
| 운영 규칙과 책임 범위 | [`AGENTS.md`](AGENTS.md), [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 대시보드 진입점과 라우팅 | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js), [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) |
| 지원 패킷 확인 | [`applications/`](applications/) 하위 각 회사 폴더의 `cover_letter.md` 또는 `application-guide.md` |
| TA 프로필 빌드 | [`ta/verify.py`](ta/verify.py), [`ta/AGENTS.md`](ta/AGENTS.md) |
| 배포와 컨테이너 | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml), [`wrangler.jsonc`](wrangler.jsonc) |

## API · 엔트리 포인트 / API & Entry Points

| 표면 | 엔트리 | 위치 | 비고 |
| --- | --- | --- | --- |
| 대시보드 Worker | `fetch` / `queue` / `scheduled` | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | 대시보드 요청·큐·예약 작업 진입점 |
| 대시보드 라우터 | `router.js` | [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) | 경로 디스패치 |
| 대시보드 큐 컨슈머 | `queue-consumer.js` | [`apps/job-dashboard/src/queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js) | 비동기 작업 처리 |
| 대시보드 미들웨어 | `middleware/` | [`apps/job-dashboard/src/middleware/`](apps/job-dashboard/src/middleware/) | 인증·로깅·검증 |
| 컨테이너 부트스트랩 | Node 서버 | `Dockerfile` runtime stage | `mcp-server` 서비스의 `CMD ["node", "src/server/index.js"]` |
| 대시보드 스키마 | SQL 마이그레이션 | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql), [`migrations/`](apps/job-dashboard/migrations/) | D1 호환 스키마 |
| API 레퍼런스 | API 문서 | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | 대시보드 공개 경로와 큐 페이로드 |

## 빠른 시작 / Quickstart

사설 운영 표면이므로 일반적인 공개 설치 절차는 제공되지 않습니다. 운영자 워크스테이션에서 사용하는 최소 흐름만 안내합니다.

1. **저장소 클론과 의존성 설치**
   ```bash
   git clone <repository-url> resume
   cd resume
   npm install
   ```
2. **컨테이너 기반 job-automation 서버 기동**
   ```bash
   docker compose up --build
   # 사내에서만 노출: http://localhost:3000/health
   ```
3. **대시보드 Worker 로컬 실행**
   ```bash
   cd apps/job-dashboard
   npm install
   # 자세한 절차는 apps/job-dashboard/README.md 참조
   ```
4. **SSoT 동기화(데이터 → PDF/PPTX)**
   ```bash
   npm run sync:data
   npm run sync:pdf
   npm run sync:pptx
   ```

### 체크아웃 주의 사항 / Checkout notes

- 본 저장소 최상위 트리에는 [`apps/job-dashboard/`](apps/job-dashboard/), [`applications/`](applications/), [`ta/`](ta/)와 루트 메타 파일이 직접 노출됩니다.
- [`Dockerfile`](Dockerfile)의 `runtime` 스테이지는 `apps/job-server/`, `packages/shared`, `packages/schemas`, `packages/types`, `packages/data`, `packages/env`를 복사합니다. 해당 경로의 소스가 현재 체크아웃에 없다면 빌드가 실패하므로, [`AGENTS.md`](AGENTS.md)의 전체 구조도와 [`package.json`](package.json)의 `workspaces` 목록으로 실제 노출 범위를 확인한 뒤 진행하세요.
- `AGENTS.md`가 문서화하는 `apps/portfolio/`, `packages/cli/`, `packages/contracts/`, `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/`는 본 체크아웃에 직접 보이지 않을 수 있습니다.

## 아키텍처 / Architecture

| 영역 | 책임 | 핵심 파일/디렉터리 |
| --- | --- | --- |
| 엣지 사이트 표면 | Cloudflare Worker 포트폴리오(공개) | [`wrangler.jsonc`](wrangler.jsonc) |
| 운영 대시보드 | `fetch`/`queue`/`scheduled` 오케스트레이션, 라우팅, 미들웨어, 마이그레이션 | [`apps/job-dashboard/src/`](apps/job-dashboard/src/) |
| 컨테이너 런타임 | 컨테이너 기반 job-automation Node 서버 (`mcp-server`) | [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml) |
| SSoT 콘텐츠 | 역할별 이력서·지원서 원본 | [`applications/`](applications/) |
| TA 산출물 | PPTX 프로필, verify 리포트 | [`ta/`](ta/) |
| 스크립트 허브 | 동기화·빌드·1Password 운영 스크립트 | [`package.json`](package.json) |

### 요청 흐름 (Cloudflare Worker → 로컬 컨테이너)

1. 운영자 또는 스케줄러가 [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js)의 `fetch` 또는 `scheduled` 핸들러를 호출합니다.
2. `index.js`가 요청을 받아 [`router.js`](apps/job-dashboard/src/router.js)로 디스패치합니다.
3. 비동기 작업은 [`queue-consumer.js`](apps/job-dashboard/src/queue-consumer.js)에서 처리됩니다.
4. 외부 fetch/조정이 필요하면 [`docker-compose.yml`](docker-compose.yml)의 `mcp-server` 서비스(`localhost:3000`)로 위임됩니다.
5. 미들웨어([`apps/job-dashboard/src/middleware/`](apps/job-dashboard/src/middleware/))가 인증·로깅·검증을 거쳐 응답 또는 큐 메시지를 반환합니다.
6. 데이터 산출물 갱신은 [`package.json`](package.json)의 `sync:*` 계열 스크립트로 PDF/PPTX를 재생성합니다.

## 설정 / Configuration

| 출처 | 용도 |
| --- | --- |
| [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Worker 포트폴리오/대시보드 배포 설정 |
| [`docker-compose.yml`](docker-compose.yml) | 로컬 컨테이너 스택, 헬스체크, 영속 볼륨(`job_automation_data`) |
| [`Dockerfile`](Dockerfile) | 다단계 컨테이너 빌드: `deps`(워크스페이스 의존성) → `runtime`(런타임 이미지) |
| [`tsconfig.base.json`](tsconfig.base.json), [`tsconfig.json`](tsconfig.json) | TypeScript strict 컴파일 옵션 |
| [`redocly.yaml`](redocly.yaml) | OpenAPI/Redoc 린트 정책 |
| [`lychee.toml`](lychee.toml) | 저장소 링크 무결성 검증 정책 |
| 호스트 `.env` | 컨테이너 환경 변수(`PORT`, `NODE_ENV` 등). 외부 노출 금지 |

## 명령 레퍼런스 / Commands Reference

아래 표는 [`package.json`](package.json)에 정의된 운영 스크립트입니다. 각 명령은 워크스페이스 루트에서 실행합니다.

| 분류 | 명령 | 역할 |
| --- | --- | --- |
| 동기화 | `npm run sync:data` | SSoT 이력서 데이터 동기화 |
| 동기화 | `npm run sync:pdf` | PDF 산출물 재생성 |
| 동기화 | `npm run sync:pptx` | PPTX 산출물 재생성 |
| 동기화 | `npm run sync:all` | `sync:data` → `sync:pdf` → `sync:pptx` 일괄 |
| 동기화 | `npm run sync:proposals` | 제안 검토 동기화 후 적용 |
| 1Password | `npm run op:run` | 1Password 통합 진입 |
| 1Password | `npm run op:native:run` | 네이티브 1Password 호출 |
| 1Password | `npm run op:seed:resume` | resume 항목 시드 |
| 1Password | `npm run op:seed:sessions`, `op:restore:sessions` | 세션 백업/복원 |
| 보강 | `npm run enrich:github` | GitHub 프로필 보강 |
| 보강 | `npm run enrich:skills` | 스킬 데이터 보강 |
| 보강 | `npm run enrich:ai` | AI 소스 보강 |
| 보강 | `npm run enrich:all` | 세 보강 작업 일괄 |
| 메타 | `npm run strip-exif` | 이미지 EXIF 제거(가능한 경우) |

> 본 체크아웃에 스크립트 원본(`tools/scripts/...`)이 함께 노출되지 않더라도, [`package.json`](package.json)은 운영자에게 동일한 인터페이스를 제공하도록 정의되어 있습니다. 스크립트 원본이 필요한 경우 [`AGENTS.md`](AGENTS.md)의 구조도를 참조해 동기화 여부를 확인하세요.

## 로컬 개발 / Local Development

1. **의존성 설치** — `npm install`(워크스페이스 루트)
2. **대시보드 개발** — [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
3. **대시보드 시각 자료** — [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md)
4. **TA/PPTX 작업** — [`ta/inspect.py`](ta/inspect.py)로 입력 점검 → [`ta/improve_visual.py`](ta/improve_visual.py) → [`ta/verify.py`](ta/verify.py)로 검증
5. **컨테이너 작업** — `docker compose up --build`, [`Dockerfile`](Dockerfile)의 멀티스테이지 빌드 확인
6. **Secret/세션 작업** — [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md), `package.json`의 `op:*` 스크립트 그룹

## 테스트 / Testing

| 도구 | 설정 | 목적 |
| --- | --- | --- |
| Jest | [`jest.config.cjs`](jest.config.cjs) | 단위/통합 테스트 |
| Playwright | [`playwright.config.js`](playwright.config.js) | 엔드투엔드 테스트 |
| Redocly | [`redocly.yaml`](redocly.yaml) | OpenAPI/API 명세 린트 |
| Lychee | [`lychee.toml`](lychee.toml) | 링크 무결성 검증 |
| TypeScript | [`tsconfig.base.json`](tsconfig.base.json) | 타입 안전성 |
| ESLint | [`eslint.config.cjs`](eslint.config.cjs) | 정적 분석 |

각 테스트 레이어의 구체 절차는 [`AGENTS.md`](AGENTS.md)와 앱/패키지별 자식 가이드에 따릅니다.

## 배포 / Deployment

| 대상 | 설정 | 진입점 |
| --- | --- | --- |
| Cloudflare Worker(포트폴리오/대시보드) | [`wrangler.jsonc`](wrangler.jsonc) | `wrangler deploy`(앱 자체 진입점) |
| 로컬/자가호스팅 컨테이너 | [`docker-compose.yml`](docker-compose.yml) + [`Dockerfile`](Dockerfile) | `docker compose up --build` |

CI/릴리스 정책과 책임 경계는 [`AGENTS.md`](AGENTS.md)에서 정의하며, 본 README은 진입점만 안내합니다.

## 기여·기여자 / Contributing & Maintainers

| 항목 | 위치 |
| --- | --- |
| 기여 절차 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 책임자 명단 | [`OWNERS`](OWNERS) |
| 운영 규칙 | [`AGENTS.md`](AGENTS.md) |
| 디자인 결정 | [`design-state.md`](design-state.md), [`applications/DESIGN.md`](applications/DESIGN.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |

## 추가 문서 / Further Documentation

| 문서 | 경로 | 주제 |
| --- | --- | --- |
| 대시보드 README | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 사용·개발 |
| 대시보드 개발 가이드 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) | 대시보드 개발 절차 |
| 대시보드 배포 가이드 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 대시보드 배포 절차 |
| 대시보드 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) | 대시보드 시각화 |
| API 레퍼런스 | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | 대시보드 API |
| 보안/Secret | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 대시보드 secret 운영 |
| 디자인 노트 | [`design-state.md`](design-state.md) | 디자인 결정 기록 |
| 지원서 가이드 | `applications/*/application-guide.md` | 역할별 지원 절차 |
| 자기소개서 | `applications/*/cover_letter.md` | 역할별 자기소개서 |
| TA 가이드 | [`ta/AGENTS.md`](ta/AGENTS.md) | TA 프로필 빌드 규칙 |
| TA 검증 리포트 | `ta/output/verify_report_*.txt` | PPTX 생성 검증 결과 |

## 라이선스 / License

저장소 루트의 [`LICENSE`](LICENSE) 참조. 사설 운영 워크스페이스 특성상 외부 라이선스 정책은 [`OWNERS`](OWNERS)·[`CONTRIBUTING.md`](CONTRIBUTING.md)의 정의를 따릅니다.