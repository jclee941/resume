# Resume Portfolio & Job Automation Workspace

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)
![Docker](https://img.shields.io/badge/Docker-supported-2496ED)
![License](https://img.shields.io/badge/license-see%20LICENSE-blue)

이 저장소는 이력서·포트폴리오 콘텐츠, 채용 지원 자료,
직무 자동화 런타임, 운영 대시보드를 함께 관리하는 개인 운영 워크스페이스입니다.  
주요 사용자는 저장소 소유자, 채용 지원 운영자, 대시보드/API 유지관리자입니다.

English: This workspace manages resume and portfolio content, job-application
materials, automation runtimes, and an operator dashboard.

## 빠른 상태 / Quick status

| 항목 | 현재 상태 | 다음에 볼 곳 |
| --- | --- | --- |
| 제품 상태 | 운영용 개인 워크스페이스. 폐기 아님 | [`CHANGELOG.md`](CHANGELOG.md) |
| 주요 런타임 | Cloudflare Worker 대시보드, Node.js job-server 컨테이너 | [`apps/job-dashboard/`](apps/job-dashboard/) |
| 배포 방식 | Cloudflare Workers, Docker Compose | [`wrangler.jsonc`](wrangler.jsonc), [`docker-compose.yml`](docker-compose.yml) |
| 콘텐츠 원천 | 이력서/지원서/프로필 자료 | [`applications/`](applications/), [`ta/`](ta/) |
| 운영자 시작점 | `npm ci`, `docker compose up -d`, `npm run sync:all` | [`package.json`](package.json) |
| 도움 요청 | 코드 소유자와 기여 가이드 확인 | [`OWNERS`](OWNERS), [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 실행 흐름 요약 / Flow

1. 운영자는 `package.json`의 스크립트로 데이터 동기화와 산출물 생성을 실행합니다.
2. `Dockerfile`은 job-server 런타임을 Node.js 22 기반 컨테이너로 빌드합니다.
3. `docker-compose.yml`은 `mcp-server` 서비스를 띄우고 `/health`로 상태를 확인합니다.
4. `apps/job-dashboard/src/index.js`는 Worker 요청, 큐, 스케줄 작업의 진입점입니다.
5. 지원서와 이력서 산출물은 `applications/`와 `ta/output/`에서 검토합니다.

English: Operators sync data, run the job-server container, use the dashboard
Worker entry point, and review generated application artifacts.

## 목차 / Table of contents

- [목적 / Purpose](#목적--purpose)
- [주요 기능 / Features](#주요-기능--features)
- [패키지와 파일 구성 / Package contents](#패키지와-파일-구성--package-contents)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [진입점 / Entry points](#진입점--entry-points)
- [빠른 시작 / Quick start](#빠른-시작--quick-start)
- [설정 / Configuration](#설정--configuration)
- [명령어 / Commands](#명령어--commands)
- [로컬 개발 / Local development](#로컬-개발--local-development)
- [테스트와 품질 점검 / Testing and quality](#테스트와-품질-점검--testing-and-quality)
- [운영과 관측 / Operations and observability](#운영과-관측--operations-and-observability)
- [보안과 비밀값 / Security and secrets](#보안과-비밀값--security-and-secrets)
- [기여 / Contributing](#기여--contributing)
- [유지관리자 / Maintainers](#유지관리자--maintainers)
- [문서 / Further documentation](#문서--further-documentation)
- [라이선스 / License](#라이선스--license)

## 목적 / Purpose

이 프로젝트는 개인 경력 운영에 필요한 여러 작업을 하나의 저장소에서 다룹니다.

- 포트폴리오와 이력서 콘텐츠 관리
- 역할별 지원서, 커버레터, PDF/HTML 산출물 관리
- 채용 플랫폼 동기화와 지원 자동화 런타임 운영
- Cloudflare Worker 기반 대시보드/API 운영
- Docker 기반 job-server 실행 환경 제공
- 프레젠테이션 및 TA 프로필 자료 생성·검증

English: The repository is useful because it keeps career content, generated
application packets, automation runtime code, and deployment configuration in
one reproducible workspace.

## 주요 기능 / Features

| 기능 | 설명 | 주요 위치 |
| --- | --- | --- |
| 지원서 패킷 관리 | 회사·직무별 이력서, 커버레터, 가이드, 미리보기 보관 | [`applications/`](applications/) |
| 대시보드 Worker | Cloudflare Worker 기반 API, 큐, 스케줄 진입점 | [`apps/job-dashboard/`](apps/job-dashboard/) |
| job-server 컨테이너 | 자동화 런타임을 Node.js 컨테이너로 실행 | [`Dockerfile`](Dockerfile) |
| 데이터 동기화 | 이력서 데이터, PDF, PPTX, 채용 플랫폼 자료 동기화 | [`package.json`](package.json) |
| TA 자료 생성 | PPTX 프로필 자료 생성·검사·검증 | [`ta/`](ta/) |
| 품질 점검 | ESLint, Jest, Playwright, 링크 검사 설정 | 설정 파일 참조 |

## 패키지와 파일 구성 / Package contents

제공된 저장소 최상위 구조는 다음과 같습니다.

| 경로 | 역할 |
| --- | --- |
| [`package.json`](package.json) | npm 워크스페이스 선언과 운영 명령어 허브 |
| [`Dockerfile`](Dockerfile) | job-server 운영 컨테이너 빌드 정의 |
| [`docker-compose.yml`](docker-compose.yml) | 로컬/서버용 `mcp-server` 서비스 실행 |
| [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Workers 설정 |
| [`apps/job-dashboard/`](apps/job-dashboard/) | 대시보드 Worker 애플리케이션 |
| [`applications/`](applications/) | 직무별 지원서, 이력서, 커버레터, 가이드 |
| [`ta/`](ta/) | Python 기반 PPTX/TA 프로필 작업 공간 |
| [`CHANGELOG.md`](CHANGELOG.md) | 변경 이력 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 기여 규칙 |
| [`OWNERS`](OWNERS) | 유지관리 책임자 |
| [`LICENSE`](LICENSE) | 라이선스 |

English: The workspace also declares additional npm workspaces in
`package.json`. If a checkout is partial, make sure all declared workspace
paths exist before running full install, build, or Docker commands.

## 아키텍처 / Architecture

### 구성 요소

| 구성 요소 | 책임 | 실행 환경 |
| --- | --- | --- |
| Dashboard Worker | 운영 대시보드 API, 큐 처리, 예약 작업 | Cloudflare Workers |
| job-server runtime | 채용 자동화와 서버 측 런타임 | Node.js 22, Docker |
| Application content | 지원서, 커버레터, 이력서 산출물 | 파일 기반 |
| TA tooling | PPTX 생성·검사·검증 | Python |
| Root command hub | 동기화, 생성, 비밀값 래핑 명령 | npm scripts |

### 요청 및 운영 흐름

1. 사용자가 대시보드 또는 API 엔드포인트로 요청합니다.
2. `apps/job-dashboard/src/index.js`의 Worker 핸들러가 요청을 라우팅합니다.
3. 필요한 경우 큐 또는 스케줄 작업이 비동기 처리를 수행합니다.
4. job-server가 필요한 작업은 Docker 서비스 또는 Node 런타임에서 수행합니다.
5. 결과 산출물은 지원서 디렉터리, 데이터 파일, 또는 운영 API에 반영됩니다.
6. 운영자는 `/health`, Worker 로그, 테스트 명령으로 상태를 확인합니다.

English: The architecture separates edge-facing dashboard work from
server-side automation and file-based application artifacts.

## 진입점 / Entry points

| 종류 | 진입점 | 용도 |
| --- | --- | --- |
| Dashboard Worker | [`apps/job-dashboard/src/index.js`](apps/job-dashboard/src/index.js) | `fetch`, queue, scheduled 처리 |
| Dashboard router | [`apps/job-dashboard/src/router.js`](apps/job-dashboard/src/router.js) | API 라우팅 |
| Dashboard schema | [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql) | D1/DB 스키마 |
| Dashboard migrations | [`apps/job-dashboard/migrations/`](apps/job-dashboard/migrations/) | 승인·자동지원 메타데이터 변경 |
| Docker runtime | [`Dockerfile`](Dockerfile) | job-server 이미지 빌드 |
| Compose service | [`docker-compose.yml`](docker-compose.yml) | `mcp-server` 실행 |
| Root commands | [`package.json`](package.json) | 동기화·생성·비밀값 실행 |
| TA scripts | [`ta/improve_visual.py`](ta/improve_visual.py), [`ta/verify.py`](ta/verify.py) | PPTX 개선·검증 |

## 빠른 시작 / Quick start

### 1. 요구 사항

| 도구 | 권장 버전/상태 |
| --- | --- |
| Node.js | 22.x |
| npm | `package-lock.json`과 함께 사용 |
| Docker | Compose v2 지원 |
| Python | TA/PPTX 스크립트 실행 시 필요 |
| Go | 일부 운영 스크립트 실행 시 필요 |
| Cloudflare Wrangler | Worker 개발·배포 시 필요 |

### 2. 설치

```bash
npm ci
```

워크스페이스 경로가 누락된 부분 체크아웃에서는 `npm ci`가 실패할 수 있습니다.  
그 경우 전체 저장소를 가져온 뒤 다시 실행하세요.

### 3. 환경 파일 준비

```bash
cp .env.example .env
```

`.env.example`이 없는 환경에서는 필요한 키를 유지관리자에게 확인하세요.  
비밀값은 커밋하지 않습니다.

### 4. job-server 컨테이너 실행

```bash
docker compose up -d --build
```

상태 확인:

```bash
curl http://localhost:3000/health
```

중지:

```bash
docker compose down
```

### 5. 산출물 동기화

```bash
npm run sync:all
```

이 명령은 데이터, PDF, PPTX 생성 흐름을 순서대로 실행합니다.

## 설정 / Configuration

### Docker Compose 환경

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `production` | Node 런타임 모드 |
| `PORT` | `3000` | job-server HTTP 포트 |

Compose 서비스는 `.env` 파일을 읽습니다.

```yaml
env_file:
  - .env
```

### Cloudflare Worker 설정

| 파일 | 설명 |
| --- | --- |
| [`wrangler.jsonc`](wrangler.jsonc) | Worker 프로젝트 설정 |
| [`apps/job-dashboard/wrangler` 설정 관련 문서](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 대시보드 배포 절차 |
| [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 필요한 비밀값 설명 |

### 데이터베이스와 마이그레이션

| 파일 | 설명 |
| --- | --- |
| [`apps/job-dashboard/schema.sql`](apps/job-dashboard/schema.sql) | 기본 스키마 |
| [`apps/job-dashboard/migration-data.sql`](apps/job-dashboard/migration-data.sql) | 마이그레이션용 데이터 |
| [`apps/job-dashboard/migrations/0002_add_approval_metadata.sql`](apps/job-dashboard/migrations/0002_add_approval_metadata.sql) | 승인 메타데이터 추가 |
| [`apps/job-dashboard/migrations/0003_add_auto_apply_application_metadata.sql`](apps/job-dashboard/migrations/0003_add_auto_apply_application_metadata.sql) | 자동지원 메타데이터 추가 |
| [`apps/job-dashboard/migrate-json-to-d1.cjs`](apps/job-dashboard/migrate-json-to-d1.cjs) | JSON 데이터를 D1로 이전 |

## 명령어 / Commands

`package.json`에 정의된 주요 명령입니다.

| 명령 | 설명 |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지의 EXIF 제거 |
| `npm run sync:data` | 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 산출물 생성 |
| `npm run sync:pdf` | PDF 산출물 생성 |
| `npm run sync:all` | 데이터, PDF, PPTX 전체 동기화 |
| `npm run sync:jobkorea` | JobKorea 프로필 동기화 적용 |
| `npm run sync:jobkorea:dry` | JobKorea 동기화 드라이런 |
| `npm run op:run` | 1Password 환경 래퍼로 명령 실행 |
| `npm run op:native:run` | 네이티브 1Password 래퍼 실행 |
| `npm run op:seed:resume` | 이력서 관련 비밀값/데이터 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run sync:proposals` | 제안서 리뷰와 적용 흐름 실행 |
| `npm run enrich:github` | GitHub 기반 프로필 보강 |

English: Treat the root scripts as operator commands. Check the script body
before running commands that update external platforms.

## 로컬 개발 / Local development

### Dashboard Worker

```bash
cd apps/job-dashboard
npm install
```

대시보드별 스크립트와 세부 절차는 다음 문서를 우선 확인하세요.

- [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md)
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
- [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)
- [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md)

### Docker 런타임

```bash
docker compose up -d --build
docker compose logs -f mcp-server
```

컨테이너는 다음 상태 확인을 사용합니다.

```bash
curl http://localhost:3000/health
```

### TA/PPTX 작업

```bash
cd ta
python3 verify.py
```

검증 결과 예시는 [`ta/output/verify_report_20260212.txt`](ta/output/verify_report_20260212.txt)에 있습니다.

## 테스트와 품질 점검 / Testing and quality

| 영역 | 설정 파일 | 실행 예 |
| --- | --- | --- |
| TypeScript | [`tsconfig.json`](tsconfig.json), [`tsconfig.base.json`](tsconfig.base.json) | `npx tsc --noEmit` |
| ESLint | [`eslint.config.cjs`](eslint.config.cjs) | `npx eslint .` |
| Jest | [`jest.config.cjs`](jest.config.cjs) | `npx jest` |
| Playwright | [`playwright.config.js`](playwright.config.js) | `npx playwright test` |
| 링크 검사 | [`lychee.toml`](lychee.toml) | `lychee .` |
| OpenAPI lint | [`redocly.yaml`](redocly.yaml) | `npx redocly lint` |

프로젝트에 정의된 npm 스크립트가 있으면 해당 스크립트를 우선 사용하세요.  
직접 `npx`로 실행할 때는 워크스페이스 의존성이 설치되어 있어야 합니다.

## 운영과 관측 / Operations and observability

| 대상 | 확인 방법 | 비고 |
| --- | --- | --- |
| Docker job-server | `GET /health` | Compose healthcheck와 동일 |
| Compose 로그 | `docker compose logs -f mcp-server` | 런타임 오류 확인 |
| Worker 요청 | Cloudflare 로그와 대시보드 문서 | 배포 환경별 설정 필요 |
| D1 마이그레이션 | `apps/job-dashboard/migrations/` | 배포 전 변경 검토 |
| 산출물 | `applications/`, `ta/output/` | 지원 전 사람이 최종 검토 |

운영 명령은 외부 계정이나 채용 플랫폼 데이터를 변경할 수 있습니다.  
`dry` 또는 `diff` 모드가 있는 명령을 먼저 실행하세요.

## 보안과 비밀값 / Security and secrets

- `.env`와 세션 파일은 커밋하지 않습니다.
- 1Password 래퍼 명령은 비밀값 주입을 위해 사용됩니다.
- Cloudflare Worker 비밀값은 대시보드 문서를 기준으로 관리합니다.
- 지원서 PDF, 이력서, 프로필 이미지에는 개인정보가 포함될 수 있습니다.
- 공개 전 EXIF 제거와 링크 검사를 수행하세요.

관련 문서:

- [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## 기여 / Contributing

기여 전 다음 파일을 읽어주세요.

1. [`CONTRIBUTING.md`](CONTRIBUTING.md)
2. [`OWNERS`](OWNERS)
3. 변경 대상 하위 디렉터리의 `AGENTS.md`
4. 대시보드 변경 시 [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)

기본 원칙:

- 생성 산출물과 원천 데이터를 구분합니다.
- 비밀값, 세션, 개인 식별 정보는 리뷰 전에 제거합니다.
- 운영 명령은 드라이런 후 적용합니다.
- 대시보드 API 변경은 문서와 스키마를 함께 갱신합니다.

## 유지관리자 / Maintainers

| 역할 | 위치 |
| --- | --- |
| 저장소 소유자 | [`OWNERS`](OWNERS) |
| 대시보드 소유자 | [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) |
| 기여 절차 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

도움이 필요하면 관련 `OWNERS` 파일의 담당자에게 문의하세요.

## 문서 / Further documentation

| 문서 | 설명 |
| --- | --- |
| [`CHANGELOG.md`](CHANGELOG.md) | 릴리스와 변경 이력 |
| [`design-state.md`](design-state.md) | 설계 상태 메모 |
| [`applications/DESIGN.md`](applications/DESIGN.md) | 지원서 자료 구조 설계 |
| [`applications/job-search-2026-07/README.md`](applications/job-search-2026-07/README.md) | 구직 운영 자료 |
| [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) | 대시보드 개요 |
| [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) | API 참조 |
| [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) | 배포 가이드 |
| [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) | 개발 가이드 |
| [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) | 상세 다이어그램 |
| [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 비밀값 관리 |
| [`applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md`](applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md) | 인프라 아키텍처 자료 |

## 라이선스 / License

라이선스 조건은 [`LICENSE`](LICENSE)를 확인하세요.