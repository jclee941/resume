# Resume Portfolio & Job Automation Workspace

> Cloudflare Worker 포트폴리오, Fastify 기반 채용 자동화 런타임, 대시보드 워크플로우, 그리고 공유 타입·스키마·데이터 패키지를 한 저장소에서 운영하는 개인 이력서 워크스페이스입니다.

![version](https://img.shields.io/badge/version-1.40.11-blue)
![node](https://img.shields.io/badge/node-22-339933)
![cloudflare](https://img.shields.io/badge/cloudflare-workers-F38020)
![license](https://img.shields.io/badge/license-see%20LICENSE-lightgrey)

## 한 줄 요약

공개 포트폴리오(Cloudflare Worker), MCP/HTTP 채용 자동화 서버(Fastify), 대시보드 Worker(fetch/queue/scheduled), 그리고 단일 진실 공급원(SSoT) 데이터 패키지를 묶어 이력서·지원서·운영 스크립트를 일관되게 관리하는 워크스페이스입니다.

## One-line summary

A personal resume workspace that ships a Cloudflare Worker portfolio, a Fastify-based MCP/HTTP job automation server, a Cloudflare Worker dashboard, and shared type/schema/data packages, all driven from a single content SSoT.

## Status snapshot

| 영역 | 상태 | 위치 / 메모 |
| --- | --- | --- |
| 버전 | `1.40.11` | `package.json` |
| 런타임 | Node.js 22 (Alpine) | `Dockerfile` 베이스 이미지 |
| 포트폴리오 | Cloudflare Worker | `apps/portfolio/entry.js` → 생성된 `worker.js` |
| 자동화 서버 | Fastify / MCP | `apps/job-server/src/server/index.js` |
| 대시보드 | Cloudflare Worker (fetch/queue/scheduled) | `apps/job-dashboard/src/index.js` |
| 데이터 SSoT | `packages/data/resumes/master/resume_data.json` | `npm run sync:data` |
| 컨테이너 | `docker compose up mcp-server` | `docker-compose.yml` |
| 테스트 | Jest + Playwright | `tests/`, `jest.config.cjs`, `playwright.config.js` |
| 린트 / 계약 | ESLint, Redocly, lychee | `eslint.config.cjs`, `redocly.yaml`, `lychee.toml` |
| 문서 / 산출물 | `docs/`, `applications/`, `ta/` | ADRs, 지원서 패키지, TA 프로파일 |

## Request & data flow

1. 방문자가 Cloudflare에서 `apps/portfolio/worker.js`(생성됨)에 도달 → `entry.js`의 라우터가 정적 자산과 인-프로세스 `/job/*` 라우트를 처리합니다.
2. `/job/*` 요청은 같은 Worker 안에서 `apps/job-dashboard`의 핸들러로 위임되어 `fetch`/`queue`/`scheduled` 워크플로우를 트리거합니다.
3. 자동화 흐름은 `apps/job-server`의 MCP 진입점(`src/index.js`)과 Fastify 부트스트랩(`src/server/index.js`)을 통해 Wanted/JobKorea 크롤러, 자동 지원, 세션 복원에 사용됩니다.
4. 모든 컨텐츠는 `packages/data/resumes/master/resume_data.json`을 SSoT로 삼아 `npm run sync:all`(data → pdf → pptx)로 산출물을 재생성합니다.
5. 비밀값은 `tools/scripts/onepassword/`의 Go 도구로 1Password에서 주입되며, Docker 컨테이너는 `.env`로 전달됩니다.

## 목차 / Contents

- [워크스페이스 구성 (Purpose / Package Contents)](#purpose--package-contents)
- [Features](#features)
- [Architecture](#architecture)
- [Status](#status)
- [First Files to Read](#first-files-to-read)
- [API / Entry Points](#api--entry-points)
- [Quickstart](#quickstart)
- [Commands reference](#commands-reference)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Testing](#testing)
- [Contribution guide](#contribution-guide)
- [Maintainers / Points of Contact](#maintainers--points-of-contact)
- [Further documentation](#further-documentation)
- [License](#license)

## Purpose / Package Contents

이 워크스페이스는 다음 네 가지 사용자 흐름을 공유 패키지 계층과 단일 SSoT로 묶습니다.

| 패키지 / 디렉터리 | 역할 | 진입점 / 노트 |
| --- | --- | --- |
| `apps/portfolio/` | 공개 포트폴리오 Cloudflare Worker | `entry.js`, 생성된 `worker.js` |
| `apps/job-server/` | MCP + Fastify 채용 자동화 런타임 | `src/index.js`, `src/server/index.js` |
| `apps/job-dashboard/` | 대시보드 Worker (fetch/queue/scheduled) | `src/index.js`, `src/router.js` |
| `apps/job-dashboard/middleware/` | 인증·로깅 등 요청 미들웨어 | (디렉터리) |
| `apps/job-dashboard/migrations/` | D1 스키마 마이그레이션 | `0002_*.sql`, `0003_*.sql` |
| `packages/data/` | 이력서·지원서 데이터 SSoT | `resumes/master/resume_data.json` |
| `packages/types/` | 도메인 타입 (JSDoc/TS) | `src/` |
| `packages/schemas/` | Zod 런타임 스키마 | `src/` |
| `packages/contracts/` | OpenAPI, Worker env 계약 | `openapi.yaml` 등 |
| `packages/shared/` | 에러·로거·재시도·rate-limit·crypto·브라우저 클라이언트 | `src/` |
| `packages/cli/` | `resume` 운영자 CLI | `bin/` |
| `packages/env/` | 환경 변수 런타임 검증 | `src/` |
| `applications/` | 회사·직무별 지원서 패키지와 실행 로그 | (회사별 하위 디렉터리) |
| `ta/` | Python/PPTX 기반 TA 프로파일 생성 | `improve_visual.py`, `verify.py` |
| `tools/scripts/` | Go 우선 빌드/동기화/배포/검증 | `onepassword/`, `sync/`, `enrichment/` |
| `infrastructure/` | Cloudflare, DB, 모니터링, 시스템 자동화 | (서브 디렉터리) |
| `docs/` | ADR, 아키텍처, 컨벤션, 보안, 가이드 | `conventions/architecture-rules.md` 등 |
| `tests/` | Jest, Node, Playwright 스위트 | (계층별 자식 가이드) |

## Features

- 단일 데이터 SSoT에서 PDF·PPTX·웹·대시보드 산출물까지 자동 재생성 (`sync:data` → `sync:pdf` → `sync:pptx`).
- Cloudflare Worker 포트폴리오가 정적 자산과 `/job/*` 대시보드 라우트를 인-프로세스로 묶어 단일 엣지 배포 제공.
- Fastify MCP/HTTP 자동화 서버가 크롤러, 자동 지원, 세션 복원, 제안 검토를 같은 런타임에서 처리.
- 1Password 기반 시크릿 주입과 Docker 헬스 체크(`GET /health`)로 컨테이너 배포를 안전하게 운영.
- 회사·직무별 `applications/` 패키지로 이력서·커버레터·인터뷰 Q&A·실행 로그를 함께 보관.
- Jest + Playwright + Redocly + lychee 다중 검증 파이프라인과 Python 기반 TA 산출물 검증(`ta/verify.py`)을 결합.

## Architecture

| 레이어 | 책임 | 위치 |
| --- | --- | --- |
| Edge (Public) | 포트폴리오 사이트 + 인-프로세스 대시보드 라우팅 | `apps/portfolio/` |
| Edge (Dashboard) | fetch/queue/scheduled 워크플로우, D1 마이그레이션 | `apps/job-dashboard/` |
| Runtime (HTTP/MCP) | 채용 자동화, 크롤러, 자동 지원, 세션 복원 | `apps/job-server/` |
| Shared libs | 타입/스키마/계약/환경/유틸/CLI | `packages/*` |
| Data SSoT | 이력서·지원서 마스터 JSON | `packages/data/resumes/master/` |
| Tooling | 빌드·동기화·배포·검증 (Go 우선, Python 보조) | `tools/scripts/` |
| Container | MCP/HTTP 서버 런타임 | `Dockerfile`, `docker-compose.yml` |
| Artifacts | 회사별 지원서 패키지, TA 프로파일 | `applications/`, `ta/` |

런타임 운영 흐름(요약):

1. 코드 변경 → `package.json` 워크스페이스 스크립트로 사전 검증(테스트, 린트, 계약, 링크).
2. 데이터 변경 시 `npm run sync:data`로 SSoT 정규화 → `sync:pdf`/`sync:pptx`로 산출물 재생성.
3. 자동화 변경 시 `apps/job-server` 단위 테스트와 `applications/`의 실행 로그로 회귀 검증.
4. 배포는 Cloudflare Workers Builds가 권한을 갖고, 컨테이너 런타임은 Docker Compose로 헬스 체크와 함께 기동.

## Status

| 항목 | 상태 | 메모 |
| --- | --- | --- |
| 유지보수 모드 | 활성 | `AGENTS.md` 작업 맵 기준 |
| 데이터 일관성 | 강제 | `sync:all` 파이프라인 |
| 보안 비밀 | 1Password 통합 | `tools/scripts/onepassword/` |
| Docker 헬스 체크 | `GET /health` (포트 `<PORT>`) | `Dockerfile`, `docker-compose.yml` |
| 외부 통합 | Wanted, JobKorea, GitHub, 1Password | `apps/job-server/scripts/` |
| 프로덕션 배포 권한 | Cloudflare Workers Builds | `wrangler.jsonc` |

## First Files to Read

| 우선순위 | 파일 | 이유 |
| --- | --- | --- |
| 1 | `AGENTS.md` | 워크스페이스 지식 베이스와 작업 맵 |
| 2 | `package.json` | 루트 스크립트 허브와 워크스페이스 정의 |
| 3 | `docs/conventions/architecture-rules.md` | 200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책 |
| 4 | `apps/portfolio/entry.js` | 공개 포트폴리오 진입점 |
| 5 | `apps/job-server/src/index.js` | MCP 자동화 진입점 |
| 6 | `apps/job-server/src/server/index.js` | Fastify HTTP 진입점과 헬스 체크 |
| 7 | `apps/job-dashboard/src/index.js` | 대시보드 Worker 진입점 |
| 8 | `packages/data/resumes/master/resume_data.json` | 콘텐츠 SSoT |
| 9 | `Dockerfile`, `docker-compose.yml` | 컨테이너 런타임 정의 |

## API / Entry Points

| 종류 | 경로 / 심볼 | 설명 |
| --- | --- | --- |
| Portfolio Worker | `apps/portfolio/worker.js` (생성) | Cloudflare에서 서비스되는 공개 사이트, `entry.js`에서 빌드 |
| Portfolio 라우터 | `apps/portfolio/entry.js` | 정적 자산과 인-프로세스 `/job/*` 라우트 |
| Job-server MCP | `apps/job-server/src/index.js` `main()` | MCP 부트스트랩, 종료 핸들링 |
| Job-server HTTP | `apps/job-server/src/server/index.js` | Fastify 부트스트랩, 헬스 체크 `GET /health` |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | `fetch`, `queue`, `scheduled` 핸들러 |
| Dashboard Router | `apps/job-dashboard/src/router.js` | 대시보드 요청 라우팅 |
| Dashboard Middleware | `apps/job-dashboard/middleware/` | 인증·로깅 등 |
| CLI | `packages/cli/` (`resume`) | 운영자 CLI |
| OpenAPI | `packages/contracts/` | API 계약 |

## Quickstart

### 로컬 개발 (Node/npm workspaces)

```bash
npm install
npm run sync:data          # packages/data → apps/* 동기화
npm run dev                # 앱별 dev 스크립트
npm test                   # Jest
npm run test:e2e           # Playwright
```

### Docker로 자동화 서버 실행

```bash
cp .env.example .env       # 1Password 시크릿 주입 참고
docker compose up mcp-server
# 헬스 체크: GET http://<HOST>:<PORT>/health
```

> 호스트/포트는 운영 환경에 맞게 `<HOST>`/`<PORT>`로 치환하세요. 사설 IP 대역(예: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`)은 저장소 문서에 하드코딩하지 않습니다.

### 데이터 산출물 재생성

```bash
npm run sync:data    # 데이터 정규화
npm run sync:pdf     # 마스터 PDF (Go)
npm run sync:pptx    # TA PPTX (Python)
```

## Commands reference

| 명령 | 목적 | 비고 |
| --- | --- | --- |
| `npm run sync:data` | 마스터 JSON을 워크스페이스로 동기화 | `tools/scripts/utils/sync-resume-data.js` |
| `npm run sync:pdf` | 마스터 PDF 생성 | `tools/scripts/build/pdf-generator.go` |
| `npm run sync:pptx` | TA PPTX 생성 | `tools/scripts/build/generate_shinhan_pptx.py` |
| `npm run sync:all` | `data` → `pdf` → `pptx` 일괄 | 루트 허브 |
| `npm run sync:jobkorea` | JobKorea 프로필 동기화·지원 | 1Password env 사용 |
| `npm run sync:jobkorea:dry` | JobKorea dry-run (diff) | 변경 미리보기 |
| `npm run sync:proposals` | 제안 검토 + 적용 | Node + Go 파이프라인 |
| `npm run enrich:github` | GitHub 데이터 보강 | `tools/scripts/enrichment/github` |
| `npm run enrich:skills` | 기술 스택 보강 | `tools/scripts/enrichment/skills` |
| `npm run op:run` | 1Password env로 명령 실행 | Go 런처 |
| `npm run op:native:run` | 1Password 네이티브 호출 | Go 런처 |
| `npm run op:seed:resume` | 1Password 이력서 시드 | Go 도구 |
| `npm run op:seed:sessions` | 1Password 세션 시드 | Go 도구 |
| `npm run op:restore:sessions` | 1Password 세션 복원 | Go 도구 |
| `npm run strip-exif` | 이미지 EXIF 제거 | `exiftool` 필요 |

> 전체 스크립트 목록과 인자는 `package.json` 참조.

## Configuration

| 영역 | 키 / 파일 | 출처 |
| --- | --- | --- |
| 환경 변수 | `packages/env/` | 런타임 검증(Zod) |
| 시크릿 | 1Password (`tools/scripts/onepassword/`) | `op:run`/`op:seed:*` |
| 컨테이너 | `docker-compose.yml`, `.env` | 자동화 서버 기동 |
| Cloudflare | `wrangler.jsonc`, `redocly.yaml` | Worker 배포, API 문서 |
| DB 스키마 | `apps/job-dashboard/schema.sql`, `apps/job-dashboard/migrations/*.sql` | D1 |
| 계약 | `packages/contracts/` | OpenAPI, env 계약 |
| 보안 | `docs/security/`, `apps/job-dashboard/SECRETS.md` | 비밀 회전 정책 |
| JSON→D1 이관 | `apps/job-dashboard/migrate-json-to-d1.cjs` + `migration-data.sql` | 초기 데이터 마이그레이션 |

## Local development

- 워크스페이스 의존성은 `package.json`의 `workspaces` 필드(`apps/*`, `packages/*`)로 관리됩니다.
- 앱 디렉터리마다 자체 가이드가 있습니다. 예: `apps/job-dashboard/DEVELOPMENT_GUIDE.md`, `apps/job-dashboard/API_REFERENCE.md`, `apps/job-dashboard/DEPLOYMENT_GUIDE.md`.
- 빌드 산출물(`apps/portfolio/worker.js`)은 `generate-worker.js`가 만들며 수동 편집하지 않습니다.
- `docs/conventions/architecture-rules.md`의 200 LOC 규칙과 명명 규칙을 따릅니다.
- 외부 사이트 크롤러/자동화 변경 시 `applications/`의 실행 로그와 함께 PR을 제출합니다.
- 로컬 시크릿은 1Password 도구로만 주입하며, 평문 비밀을 저장소에 커밋하지 않습니다.

## Testing

| 레이어 | 도구 | 위치 |
| --- | --- | --- |
| 단위 / 통합 | Jest | `jest.config.cjs`, `tests/` |
| E2E | Playwright | `playwright.config.js` |
| API 계약 | Redocly | `redocly.yaml` |
| 링크 | lychee | `lychee.toml` |
| TA 산출물 검증 | Python | `ta/verify.py`, `ta/improve_visual.py` |
| 컨테이너 헬스 | `GET /health` | `docker-compose.yml` |

## Contribution guide

1. 작업 전 `AGENTS.md`와 해당 패키지의 자식 가이드를 읽습니다.
2. 변경 범위에 맞는 브랜치를 만들고, `package.json`의 관련 스크립트로 사전 검증합니다.
3. 데이터 SSoT를 변경하면 `npm run sync:all`을 실행하고 `applications/`의 산출물을 갱신합니다.
4. 비밀값은 커밋하지 않고 `tools/scripts/onepassword/`의 도구로만 주입합니다.
5. PR 본문에 영향 범위(앱/패키지)와 검증 결과(테스트, 헬스 체크)를 명시합니다.
6. 자세한 규칙은 `CONTRIBUTING.md` 참조.

## Maintainers / Points of Contact

| 역할 | 채널 |
| --- | --- |
| 저장소 소유자 | `OWNERS` |
| 작업 절차 / 책임 맵 | `AGENTS.md` |
| 보안 / 비밀 | `docs/security/`, `apps/job-dashboard/SECRETS.md` |
| 변경 이력 | `CHANGELOG.md` |
| 디자인 상태 | `design-state.md` |

## Further documentation

| 주제 | 위치 |
| --- | --- |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |
| 워크스페이스 구조 / 작업 맵 | `AGENTS.md` |
| 응용 패키지 (회사별) | `applications/*/README.md` |
| 대시보드 개발 / API | `apps/job-dashboard/DEVELOPMENT_GUIDE.md`, `apps/job-dashboard/API_REFERENCE.md` |
| 대시보드 배포 | `apps/job-dashboard/DEPLOYMENT_GUIDE.md`, `wrangler.jsonc` |
| 대시보드 다이어그램 | `apps/job-dashboard/DIAGRAMS.md` |
| 비밀 / 보안 | `apps/job-dashboard/SECRETS.md`, `docs/security/` |
| TA 프로파일 | `ta/AGENTS.md`, `ta/verify.py` |

## License

`LICENSE` 파일 참조.