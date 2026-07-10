# Resume Workspace

![version](https://img.shields.io/badge/version-1.40.11-blue)
![node](https://img.shields.io/badge/node-22-339933)
![workers](https://img.shields.io/badge/edge-Cloudflare_Workers-F38020)
![license](https://img.shields.io/badge/license-private-lightgrey)

## 한 줄 요약

Cloudflare Worker 포트폴리오, 잡코리아·원티드 잡 자동화, 대시보드, 단일 진실 공급원(SSoT) 데이터를 한 워크스페이스에서 운영하는 개인 포트폴리오/지원 자동화 환경.

## 빠른 상태 표

| 항목 | 값 |
| --- | --- |
| 패키지명 | `resume` |
| 버전 | `1.40.11` |
| 기본 진입점 | `apps/portfolio/worker.js` (생성됨) / `apps/job-server/src/server/index.js` |
| 런타임 | Node.js 22 (Alpine), Cloudflare Workers |
| 컨테이너 | `Dockerfile` 멀티스테이지, `docker-compose.yml` `mcp-server` |
| 워크스페이스 | `apps/*`, `packages/*` (npm workspaces) |
| 데이터 SSoT | `packages/data/resumes/master/resume_data.json` |
| 헬스 체크 | `GET /health` (포트 `3000`) |
| 비밀 저장 | 1Password (`tools/scripts/onepassword/`) |

## 운영 흐름 요약

1. 콘텐츠 작성자는 `packages/data/`의 JSON을 수정해 이력서/지원서 데이터를 단일 진실 공급원으로 관리한다.
2. `apps/portfolio/`의 `entry.js`와 데이터·정적 자산이 `generate-worker.js`로 빌드되어 `worker.js`를 생성한다.
3. Cloudflare Worker 빌드가 `apps/portfolio` 및 `apps/job-dashboard`를 엣지에 배포한다.
4. 로컬 또는 컨테이너에서 `apps/job-server`가 MCP 서버, 크롤러, 자동 지원 스크립트를 실행하고 잡코리아/원티드와 동기화한다.
5. 운영자는 `packages/cli/`의 CLI 또는 `npm run` 스크립트로 빌드·동기화·시드·복원 작업을 트리거한다.

## 목차

- [목적과 구성](#목적과-구성)
- [상태 및 준비도](#상태-및-준비도)
- [먼저 읽을 파일](#먼저-읽을-파일)
- [진입점과 API 표면](#진입점과-api-표면)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [설정과 환경 변수](#설정과-환경-변수)
- [명령어 레퍼런스](#명령어-레퍼런스)
- [로컬 개발](#로컬-개발)
- [테스트](#테스트)
- [기여 가이드](#기여-가이드)
- [유지보수 및 문의](#유지보수-및-문의)
- [라이선스](#라이선스)
- [추가 문서](#추가-문서)

---

## 목적과 구성

이 저장소는 개인 포트폴리오 웹사이트, 외부 채용 플랫폼과의 자동 동기화, 운영 대시보드를 한 코드베이스에서 일관되게 유지하기 위한 워크스페이스다. 콘텐츠(`packages/data/`)와 도메인 타입(`packages/types/`), 런타임 검증(`packages/schemas/`), API 계약(`packages/contracts/`)을 분리해 데이터 변경 한 번으로 포트폴리오·이력서 PDF·PPTX·지원 패킷이 함께 갱신되도록 한다.

### 상위 디렉터리 구성

| 경로 | 역할 |
| --- | --- |
| `apps/portfolio/` | Cloudflare Worker 기반 공개 포트폴리오. `entry.js` + 데이터/HTML/lib 모듈이 `worker.js`로 빌드됨 |
| `apps/job-server/` | MCP 서버, 잡코리아/원티드 크롤러, 자동 지원 스크립트, Fastify 부트스트랩 |
| `apps/job-dashboard/` | 대시보드 Worker(`fetch`/`queue`/`scheduled`), 워크플로, 핸들러, 미들웨어 |
| `packages/data/` | 이력서·지원서 콘텐츠 SSoT |
| `packages/types/` | JSDoc/TS 도메인 타입 |
| `packages/schemas/` | Zod 런타임 스키마 |
| `packages/contracts/` | OpenAPI 명세, Worker env 계약 |
| `packages/cli/` | 운영자 CLI |
| `packages/shared/` | 로거, 에러, 재시도, 레이트 리밋, 클라이언트 등 공용 유틸 |
| `packages/env/` | 런타임 환경 변수 검증 |
| `applications/` | 회사·직무별 지원 패킷(HTML/PDF 이력서, 커버레터, 사전 검토 로그) |
| `ta/` | Python/PPTX 기반 TA 프로필 생성 및 검증 스크립트 |
| `tools/scripts/` | Go 우선 빌드/동기화/배포/검증/보안 스크립트, 1Password 연동 |
| `supabase/functions/` | Deno 엣지 함수 |
| `infrastructure/`, `docs/`, `tests/`, `third_party/` | 인프라 정의, ADR/가이드, Jest/Playwright 테스트, 외부 벤더 자료 |

English summary: This workspace ships a Cloudflare Worker portfolio, a self-hosted job automation runtime (MCP, crawlers, auto-apply for Wanted/JobKorea), a dashboard Worker, and shared type/schema/contract packages. Content lives in `packages/data/` so a single edit propagates to the public site, generated PDFs/PPTX files, and per-role application packets under `applications/`.

---

## 상태 및 준비도

| 영역 | 상태 | 비고 |
| --- | --- | --- |
| 공개 포트폴리오 (`apps/portfolio`) | 운영 가능 | `worker.js`는 생성 산출물이므로 직접 수정 금지 |
| 잡 자동화 런타임 (`apps/job-server`) | 운영 가능 | Docker 이미지로 배포, `/health` 헬스 체크 제공 |
| 대시보드 (`apps/job-dashboard`) | 운영 가능 | fetch/queue/scheduled 핸들러 및 워크플로 포함 |
| 지원 패킷 (`applications/`) | 진행 중 | 2026년 다수 회사 대상 자료가 갱신 중 |
| 보안/비밀 | 1Password 기반 | 로컬 시드/복원 도구 포함 |

> 프로덕션 배포 권한은 Cloudflare Workers Builds가 보유한다. `worker.js`와 같은 생성 산출물은 사람이 직접 편집하지 않는다.

---

## 먼저 읽을 파일

| 순서 | 파일 | 왜 읽는지 |
| --- | --- | --- |
| 1 | `package.json` | 워크스페이스 정의와 모든 빌드/동기화/배포 스크립트의 진입점 |
| 2 | `Dockerfile`, `docker-compose.yml` | 런타임 이미지 정의, 헬스 체크, 영구 볼륨 |
| 3 | `apps/portfolio/entry.js` | 포트폴리오의 라우팅과 데이터 결합 방식 |
| 4 | `apps/job-server/src/server/index.js` | 잡 자동화 서버 부트스트랩 |
| 5 | `apps/job-dashboard/src/index.js` | 대시보드 Worker의 fetch/queue/scheduled 진입점 |
| 6 | `packages/data/resumes/master/resume_data.json` | 콘텐츠 SSoT, 모든 산출물의 원천 |
| 7 | `docs/conventions/architecture-rules.md` | 200 LOC 규칙, 명명, 스크립트 언어 정책 |
| 8 | `applications/` 하위 `cover_letter.md` / `application-guide.md` | 회사·직무별 지원 전략 |

---

## 진입점과 API 표면

| 진입점 | 종류 | 위치 | 비고 |
| --- | --- | --- | --- |
| Portfolio edge router | Cloudflare Worker | `apps/portfolio/entry.js` | 빌드 산출물은 `worker.js` |
| Job automation HTTP API | Node/Fastify | `apps/job-server/src/server/index.js` | 컨테이너 포트 `3000`, `/health` 제공 |
| Dashboard Worker | Cloudflare Worker | `apps/job-dashboard/src/index.js` | `fetch`/`queue`/`scheduled` 핸들러 |
| Resume operator CLI | Node | `packages/cli/` | 데이터 동기화·검증·변환 |
| Build generator | Node | `apps/portfolio/generate-worker.js` | `worker.js`를 재생성 |
| OpenAPI contract | 정적 명세 | `packages/contracts/` | API 계약 SSoT |

---

## 빠른 시작

### 사전 요구 사항

| 항목 | 버전/설명 |
| --- | --- |
| Node.js | 22.x |
| npm | 워크스페이스 잠금 파일 사용 |
| Docker / Docker Compose | 컨테이너 기반 실행 시 |
| Go | 1Password 도구, PDF 생성기 등 운영 스크립트용 |
| Python 3 | PPTX 생성 및 TA 스크립트용 |
| 1Password CLI | 비밀 시드/복원 시 |

### 로컬 설치

```bash
npm ci
```

### 포트폴리오 빌드

```bash
npm run sync:data
# generate-worker.js가 worker.js를 재생성
```

### 잡 자동화 서버 컨테이너 실행

```bash
docker compose up --build
# http://<host>:3000/health 로 헬스 체크
```

### 데이터 전체 동기화

```bash
npm run sync:all
# sync:data → sync:pdf → sync:pptx 순서로 실행
```

English quickstart: install dependencies with `npm ci`, run `npm run sync:data` to refresh portfolio data, build the Worker via the portfolio generator, and bring up the job-server with `docker compose up --build`. Use `npm run sync:all` to chain data, PDF, and PPTX generation in one command.

---

## 아키텍처

### 요청 흐름 (포트폴리오)

1. 클라이언트가 Cloudflare 엣지에 요청을 보낸다.
2. `apps/portfolio/entry.js`의 `fetch` 핸들러가 라우팅을 분기한다.
3. 라우터가 `packages/data/`의 콘텐츠와 `lib/` 헬퍼를 결합해 HTML/JSON 응답을 조립한다.
4. 정적 자산은 캐시 정책에 따라 엣지 캐시에서 반환된다.

### 요청 흐름 (잡 자동화)

1. 컨테이너 또는 호스트에서 `apps/job-server` 프로세스를 기동한다.
2. `src/server/index.js`의 Fastify 부트스트랩이 헬스 체크와 MCP 라우트를 노출한다.
3. 크롤러/자동 지원 스크립트가 잡코리아·원티드 클라이언트를 호출한다.
4. 결과는 `.data` 영구 볼륨에 저장되고, `packages/cli/` 또는 운영 스크립트가 후속 동기화를 수행한다.

### 워크스페이스 책임 경계

| 영역 | 패키지/앱 | 책임 |
| --- | --- | --- |
| 데이터 | `packages/data` | 콘텐츠 SSoT, 직접 편집 |
| 타입/검증 | `packages/types`, `packages/schemas` | 도메인 타입과 Zod 스키마 |
| 계약 | `packages/contracts` | OpenAPI, Worker env 계약 |
| 런타임 | `apps/portfolio`, `apps/job-server`, `apps/job-dashboard` | 배포 단위 |
| 운영 | `tools/scripts`, `packages/cli` | 빌드/배포/동기화/시드 |

---

## 설정과 환경 변수

| 변수 | 용도 | 출처 |
| --- | --- | --- |
| `NODE_ENV` | 런타임 모드 (`production` 권장) | 컨테이너 기본값 |
| `PORT` | 잡 자동화 서버 포트 | 컨테이너 기본 `3000` |
| `JOBKOREA_SYNC_MODE` | 잡코리아 동기화 모드 (`hybrid-api`, `api-dry-run`) | 스크립트 호출 시 전달 |
| `.env` | 컨테이너 환경 변수 | `docker-compose.yml`의 `env_file` |
| `.env.1password` | 1Password 시크릿 주입 | `npm run op:run -- --env-file ...` |

비밀/세션은 모두 `tools/scripts/onepassword/`의 도구로 시드/복원한다. 평문 비밀은 저장소에 커밋하지 않는다.

---

## 명령어 레퍼런스

| 명령 | 용도 |
| --- | --- |
| `npm ci` | 워크스페이스 의존성 설치 |
| `npm run sync:data` | `packages/data/`에서 포트폴리오 데이터 동기화 |
| `npm run sync:pdf` | Go 기반 PDF 생성기 실행 |
| `npm run sync:pptx` | Python 기반 PPTX 생성기 실행 |
| `npm run sync:all` | 데이터 → PDF → PPTX 순서로 일괄 동기화 |
| `npm run sync:jobkorea` | 잡코리아 프로필 동기화(적용) |
| `npm run sync:jobkorea:dry` | 잡코리아 프로필 동기화(드라이런) |
| `npm run sync:proposals` | 제안 검토 후 적용 |
| `npm run enrich:github` | GitHub 프로필 enrichment |
| `npm run op:run` / `op:native:run` | 1Password 시크릿 환경 주입 실행 |
| `npm run op:seed:resume` | 이력서 비밀 시드 |
| `npm run op:seed:sessions` / `op:restore:sessions` | 세션 파일 시드/복원 |
| `npm run strip-exif` | PNG/WebP 메타데이터 제거 |
| `docker compose up --build` | 잡 자동화 컨테이너 기동 |

`package.json`의 `scripts` 블록이 단일 명령 허브다. 자세한 사용법은 `docs/conventions/architecture-rules.md`를 참조한다.

---

## 로컬 개발

1. 저장소 루트에서 `npm ci`로 의존성을 설치한다.
2. `packages/data/` 하위 JSON을 수정하면 `npm run sync:data`로 즉시 반영된다.
3. 포트폴리오 빌드는 `node apps/portfolio/generate-worker.js`로 `worker.js`를 재생성한다.
4. 대시보드/잡 자동화는 각각의 워크스페이스 디렉터리에서 `npm run dev`(제공 시) 또는 `node src/index.js`로 기동한다.
5. 컨테이너 기반 검증은 `docker compose up --build` 후 `/health`로 헬스 체크한다.
6. PPTX 작업은 `python3`이 필요하며, 결과는 `ta/output/`에 저장된다.

워크스페이스 간 경계 규칙(200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책)은 `docs/conventions/architecture-rules.md`에서 확인한다.

---

## 테스트

| 도구 | 위치 | 용도 |
| --- | --- | --- |
| Jest | `jest.config.cjs`, `tests/` | 단위/통합 테스트 |
| Playwright | `playwright.config.js` | 엔드 투 엔드 테스트 |
| ESLint | `eslint.config.cjs` | 정적 분석 |
| Redocly | `redocly.yaml` | OpenAPI 린트 |
| Lychee | `lychee.toml` | 링크 검사 |

새 테스트를 추가할 때는 `tests/` 하위 가이드를 우선 따른다.

---

## 기여 가이드

- 변경 범위가 단일 워크스페이스에 머무르면 해당 패키지 디렉터리의 `AGENTS.md` 규칙을 따른다.
- 콘텐츠 수정은 `packages/data/`의 SSoT만 변경하고, 다른 패키지에서 파생된 산출물은 빌드/동기화 스크립트로 재생성한다.
- 자동화 추가 시 Python/Node 대신 Go를 우선 검토한다(워크스페이스 정책).
- 보안 관련 변경은 `docs/security/`와 `tools/scripts/onepassword/` 갱신을 함께 검토한다.
- 자세한 절차는 `CONTRIBUTING.md`를 참조한다.

---

## 유지보수 및 문의

| 역할 | 위치 |
| --- | --- |
| 저장소 소유자 | `OWNERS` |
| 운영 가이드 | `docs/`, `AGENTS.md`, 하위 패키지 `AGENTS.md` |
| 변경 이력 | `CHANGELOG.md` |
| 디자인 상태 | `design-state.md` |

---

## 라이선스

저장소 라이선스는 `LICENSE` 파일을 참조한다. 외부 자료는 `third_party/`에서 별도 관리한다.

---

## 추가 문서

| 문서 | 경로 |
| --- | --- |
| 프로젝트 지식 베이스 | `AGENTS.md` |
| 지원 패킷 가이드 | `applications/*/application-guide.md` |
| 인프라 아키텍처 | `applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md` |
| 잡 검색 운영 | `applications/job-search-2026-07/README.md` |
| TA 프로필 생성 | `ta/AGENTS.md`, `ta/inspect.py`, `ta/verify.py` |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |
| 보안/비밀 | `docs/security/`, `tools/scripts/onepassword/` |