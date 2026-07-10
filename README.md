# 이력서 포트폴리오 자동화 워크스페이스

![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)
![Node](https://img.shields.io/badge/node-22--alpine-339933.svg)
![Wrangler](https://img.shields.io/badge/deploy-cloudflare--workers-orange.svg)
![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)

## 한국어 요약

이 저장소는 개인 포트폴리오 사이트, 채용 플랫폼 자동화(원티드·잡코리아), 대시보드 Cloudflare Worker, 공유 패키지, 콘텐츠 단일 진실 공급원(SSoT), 자체 호스팅 옵저버빌리티를 한 워크스페이스에서 묶어 운영하는 개인용 자동화 환경이다. 코드와 콘텐츠 변경이 한 곳에서 빌드 → 동기화 → 배포 흐름으로 연결되며, 채용 지원용 산출물(자기소개서·이력서 PDF·HTML·면접 Q&A)도 동일한 데이터에서 파생된다.

## 빠른 상태

| 항목 | 값 |
| --- | --- |
| 패키지 이름 | `resume` (v1.40.11) |
| 런타임 | Node.js 22-alpine 컨테이너, Cloudflare Workers 엣지 |
| 워크스페이스 멤버 | apps/{portfolio, job-server, job-dashboard}, packages/{cli, data, env, shared, types, schemas, contracts} |
| 메인 엔트리 | `apps/portfolio/worker.js` (생성 산출물, 직접 편집 금지) |
| 컨테이너 포트 | 3000, 헬스 `GET /health` |
| 데이터 SSoT | `packages/data/resumes/master/resume_data.json` |
| 지원 플랫폼 | 원티드, 잡코리아 |
| 시크릿 경로 | `tools/scripts/onepassword/` 1Password CLI 어댑터 |

## 흐름 요약

1. `packages/data/` 의 이력서·지원서 JSON 을 단일 진실 공급원으로 수정한다.
2. `npm run sync:data` → `sync:pdf` → `sync:pptx` 순으로 동기화/생성한다 (`sync:all` 한 번 실행 가능).
3. `apps/portfolio/entry.js` 와 HTML/lib 모듈이 `generate-worker.js` 에 의해 `apps/portfolio/worker.js` 로 합쳐진다.
4. `apps/job-server/src/index.js` 의 MCP 부트스트랩과 `src/server/index.js` 가 잡코리아·원티드 동기화(`sync:jobkorea`)를 수행한다.
5. `apps/job-dashboard/src/index.js` 의 `fetch` / `queue` / `scheduled` 핸들러가 대시보드 API·승인 워크플로를 처리한다.
6. 컨테이너는 `Dockerfile` 의 `node src/server/index.js` 가 진입점이며 `docker-compose.yml` 의 `mcp-server` 가 `/health` 헬스체크와 함께 띄운다.

운영자가 다음에 사용할 엔드포인트/명령: 컨테이너 헬스 `GET /health`, 워크스페이스 부트 `npm run sync:all`, 잡 동기화 `npm run sync:jobkorea:dry` → `sync:jobkorea`.

## 목차

- [목적과 사용자](#목적과-사용자)
- [패키지 구성](#패키지-구성)
- [상태와 준비도](#상태와-준비도)
- [먼저 읽을 파일](#먼저-읽을-파일)
- [엔트리 포인트와 API](#엔트리-포인트와-api)
- [빠른 시작](#빠른-시작)
- [구성](#구성)
- [명령 참조](#명령-참조)
- [로컬 개발](#로컬-개발)
- [테스트](#테스트)
- [운영자 관측 가능성](#운영자-관측-가능성)
- [유지보수자와 연락처](#유지보수자와-연락처)
- [추가 문서](#추가-문서)
- [기여](#기여)
- [라이선스](#라이선스)

---

## 목적과 사용자

이 프로젝트는 개인이 다음 네 가지를 한 곳에서 운영하기 위한 워크스페이스다.

- **포트폴리오 사이트** — Cloudflare Worker 에서 정적·동적 페이지를 동시에 처리하는 공개 포트폴리오.
- **채용 자동화** — 잡코리아·원티드 프로필 동기화, 지원 패키지(자기소개서·이력서 PDF·HTML·면접 Q&A) 생성.
- **대시보드** — 지원 현황과 승인 워크플로를 다루는 대시보드 Worker(요청·큐·예약 핸들러).
- **콘텐츠 SSoT** — 이력서·기술·프로젝트 데이터를 한 JSON 에 두고 모든 산출물이 그 데이터를 따르게 함.

주 사용자는 본 저장소의 단일 소유자다. 외부 협업은 `OWNERS` 와 `CONTRIBUTING.md` 의 절차를 따른다.

## 패키지 구성

루트 `package.json` 의 `workspaces` 와 저장소 최상위 디렉터리를 기준으로 구성은 다음과 같다.

| 경로 | 종류 | 역할 |
| --- | --- | --- |
| `apps/portfolio` | workspace | 공개 Cloudflare Worker 포트폴리오. `entry.js` 와 `generate-worker.js` 가 `worker.js` 를 생성한다. |
| `apps/job-server` | workspace | MCP / 잡 자동화 런타임, 크롤러, 프로필 동기화 스크립트, 플랫폼 클라이언트. |
| `apps/job-dashboard` | workspace (소스 트리 표시) | 대시보드 Worker. fetch / queue / scheduled 엔트리, 핸들러, 미들웨어, 워크플로, D1 마이그레이션. |
| `packages/cli` | workspace | 운영자용 resume CLI. |
| `packages/data` | workspace | 이력서·지원서 콘텐츠 SSoT. `resumes/master/resume_data.json` 가 권위 소스. |
| `packages/env` | workspace | 런타임 환경 변수 검증. |
| `packages/shared` | workspace | 오류·로거·재시도·암호·레이트리밋·인증·브라우저·클라이언트 공용 유틸. |
| `packages/types` | workspace | JSDoc / TypeScript 도메인 타입의 권위 정의. |
| `packages/schemas` | workspace | Zod 런타임 스키마. |
| `packages/contracts` | workspace | OpenAPI 명세와 Cloudflare Worker 환경 계약. |
| `applications/` | 루트 디렉터리 | 역할별 지원 패키지(이력서 PDF/HTML, 자기소개서, 가이드, 실행 로그). |
| `ta/` | 루트 디렉터리 | Python 스크립트로 PPTX 프로필 자료를 생성·검증. |
| `tools/`, `tests/`, `infrastructure/`, `docs/`, `supabase/functions/`, `third_party/` | 보조 디렉터리 | 빌드·동기화·배포·검증 스크립트, 테스트, 인프라, ADRs, Deno 엣지 함수, 벤더 자료. |

## 상태와 준비도

| 항목 | 상태 |
| --- | --- |
| 패키지 버전 | 1.40.11 (루트 `package.json`) |
| 공개 사이트 배포 | Cloudflare Workers (`apps/portfolio/worker.js` 빌드 산출물) |
| 컨테이너 배포 | `Dockerfile` → `docker-compose.yml` 의 `mcp-server`, 포트 3000 |
| 헬스체크 | 컨테이너 `HEALTHCHECK` 가 `GET /health` 폴링, 30s 주기, 3회 재시도, 20s 시작 지연 |
| 시크릿 관리 | `tools/scripts/onepassword/` 1Password CLI 어댑터 (`op:seed:*`, `op:restore:*`) |
| 테스트 | `tests/` 의 Jest·Node·Playwright (`jest.config.cjs`, `playwright.config.js`) |
| 링크 검사 / API 린트 | `lychee.toml`, `redocly.yaml` |

> 본 저장소는 개인 운영 자동화 워크스페이스로, 외부 사용자에게 SaaS 로 노출되지 않는다. 도입·도움 요청은 [유지보수자와 연락처](#유지보수자와-연락처) 섹션을 따른다.

## 먼저 읽을 파일

| 순서 | 파일 | 이유 |
| --- | --- | --- |
| 1 | `AGENTS.md` | 저장소 구조·규칙·책임 경계의 단일 안내문. |
| 2 | `package.json` | 워크스페이스 선언과 모든 최상위 명령의 허브. |
| 3 | `Dockerfile`, `docker-compose.yml` | 런타임 컨테이너와 헬스체크 정의. |
| 4 | `packages/data/resumes/master/resume_data.json` | 콘텐츠 권위 소스. |
| 5 | `docs/conventions/architecture-rules.md` | 200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책. |
| 6 | `apps/job-dashboard/DEVELOPMENT_GUIDE.md`, `API_REFERENCE.md`, `DEPLOYMENT_GUIDE.md`, `SECRETS.md` | 대시보드 앱별 운영 가이드. |
| 7 | `applications/*/cover_letter.md`, `application-guide.md` | 역할별 지원서 작성 규칙. |

## 엔트리 포인트와 API

| 심볼 | 종류 | 위치 | 역할 |
| --- | --- | --- | --- |
| `worker.js` | Cloudflare Worker (생성) | `apps/portfolio/worker.js` | 공개 포트폴리오의 요청 라우터. 직접 편집 금지. |
| `entry.js` | Worker 소스 | `apps/portfolio/entry.js` | 포트폴리오 + 인프로세스 `/job/*` 대시보드 라우터 입력. |
| `generate-worker.js` | 빌드 스크립트 | `apps/portfolio/` | HTML·데이터·lib 모듈을 합쳐 `worker.js` 생성. |
| `main()` | MCP 부트스트랩 | `apps/job-server/src/index.js` | 잡 자동화 프로세스 진입점, 셧다운 처리. |
| 서버 부트스트랩 | Node / Fastify | `apps/job-server/src/server/index.js` | Docker `CMD` 의 진입점. |
| `fetch` / `queue` / `scheduled` | Worker 핸들러 | `apps/job-dashboard/src/index.js` | 대시보드 요청·큐·예약 오케스트레이션. |
| 헬스 엔드포인트 | HTTP | `GET /health` (포트 3000) | Docker `HEALTHCHECK` 가 폴링. |

## 빠른 시작

사전 준비:

- Node.js 22 이상, npm 10 이상.
- Docker / Docker Compose (컨테이너 실행 시).
- 1Password CLI 와 본 저장소용 1Password 항목 (잡코리아 동기화, 시드 복구 시).
- Cloudflare 계정과 Wrangler (`wrangler.jsonc` 사용).

로컬에서 컨테이너 실행:

```bash
cp .env.example .env       # 값은 본인 1Password / Vault 에서 채움
docker compose up -d --build
curl -fsS http://localhost:3000/health
```

워크스페이스 의존성 설치와 데이터 동기화:

```bash
npm ci
npm run sync:data
```

포트폴리오 Worker 로컬 미리보기:

```bash
cd apps/portfolio
wrangler dev
```

잡 동기화(드라이런 권장 후 실제 적용):

```bash
npm run sync:jobkorea:dry
npm run sync:jobkorea
```

## 구성

| 항목 | 위치 | 설명 |
| --- | --- | --- |
| 워크스페이스 멤버 | 루트 `package.json` 의 `workspaces` | 10개 패키지. |
| Worker 환경 계약 | `packages/contracts/` | OpenAPI 와 Worker env 계약. |
| 런타임 환경 검증 | `packages/env/` | 컨테이너/로컬 모두 이 검증기를 통과해야 부팅. |
| 시크릿 | `tools/scripts/onepassword/` | `npm run op:seed:resume`, `op:seed:sessions`, `op:restore:sessions` 으로 시드/복구. |
| 컨테이너 헬스 | `Dockerfile` HEALTHCHECK, `docker-compose.yml` healthcheck | `GET /health` 기준, 30s 간격, 3회 재시도, 20s 시작 지연. |
| D1 스키마 | `apps/job-dashboard/schema.sql`, `migrations/` | 순번대로 누적 적용. |
| 링크 검사 | `lychee.toml` | 저장소 전체 링크 검사. |
| API 린트 | `redocly.yaml` | OpenAPI 명세 린트. |
| 포맷/린트 | `eslint.config.cjs`, `tsconfig.base.json` | 코드 스타일과 TypeScript 기준. |

> 네트워크 호스트·포트 등 환경별 값은 `.env` 와 `wrangler.jsonc` 의 placeholder 를 채워 사용한다. 사설 IP 대역(RFC1918)이나 컨테이너 번호는 하드코딩하지 않는다.

## 명령 참조

루트 `package.json` 에서 노출되는 운영 명령.

| 명령 | 용도 |
| --- | --- |
| `npm run sync:data` | `packages/data` JSON 을 다른 패키지로 동기화. |
| `npm run sync:pdf` | Go 기반 PDF 생성기 실행 (마스터 산출물). |
| `npm run sync:pptx` | Python 기반 PPTX 생성기 실행. |
| `npm run sync:all` | 위 세 단계를 순차 실행. |
| `npm run sync:jobkorea:dry` | 잡코리아 프로필 동기화 드라이런(diff). |
| `npm run sync:jobkorea` | 잡코리아 프로필 동기화 실제 적용. |
| `npm run sync:proposals` | 제안 리뷰 CLI 실행 후 Go 어플라이어로 적용. |
| `npm run op:run` | 1Password 환경 파일로 자식 프로세스 실행. |
| `npm run op:native:run` | 1Password 네이티브 경로 실행. |
| `npm run op:seed:resume` | 이력서 시크릿 시드. |
| `npm run op:seed:sessions` / `op:restore:sessions` | 세션 파일 시드/복구. |
| `npm run enrich:github` | GitHub 프로필 인리치먼트. |
| `npm run strip-exif` | 포트폴리오 이미지의 EXIF 제거. |

## 로컬 개발

1. 저장소를 클론하고 `npm ci` 로 워크스페이스 의존성을 설치한다.
2. `packages/data/` 의 JSON 을 수정하면 `npm run sync:data` 로 다른 패키지에 반영한다.
3. 포트폴리오 변경은 `apps/portfolio/src/` 의 HTML/lib 모듈만 수정하고, `generate-worker.js` 가 `worker.js` 를 재생성하도록 한다.
4. 잡 자동화 로직은 `apps/job-server/src/` 에서 작업하고, 외부 호출은 `packages/shared/` 의 클라이언트를 우선 사용한다.
5. 대시보드 라우팅·큐는 `apps/job-dashboard/` 에서 작업하며, D1 스키마는 `schema.sql` 와 `migrations/` 의 순번대로 추가한다.
6. 환경 변수는 `packages/env/` 의 검증기를 통과하도록 `.env` 를 채운다. 누락 시 부팅 실패가 의도된 동작이다.

## 테스트

| 영역 | 명령/도구 | 설정 파일 |
| --- | --- | --- |
| 단위/통합 (Jest) | `npm test` | `jest.config.cjs` |
| E2E (Playwright) | `npx playwright test` | `playwright.config.js` |
| 링크 검사 | `lychee` | `lychee.toml` |
| OpenAPI 린트 | `redocly lint` | `redocly.yaml` |
| 코드 스타일 | `eslint` | `eslint.config.cjs` |

`tests/` 하위 디렉터리의 가이드가 테스트 레이어별 세부 규칙을 정의한다.

## 운영자 관측 가능성

| 신호 | 위치 | 의미 |
| --- | --- | --- |
| 컨테이너 헬스 | `GET /health` (포트 3000) | Docker `HEALTHCHECK` 가 폴링, 실패 시 `restart: unless-stopped` 로 재기동. |
| 시작 지연 | `start-period: 20s` | 콜드스타트 워밍업 시간. |
| 재시도 정책 | `retries: 3`, `timeout: 5s`, `interval: 30s` | 헬스체크 정책. |
| 데이터 볼륨 | `job_automation_data` (Docker named volume) | 잡 자동화 상태 보존. |
| 외부 상태 | Cloudflare Workers 대시보드 | 배포 결과와 요청 지표. |
| 변경 이력 | `CHANGELOG.md` | 릴리스 단위 변경 추적. |

## 유지보수자와 연락처

| 항목 | 위치 |
| --- | --- |
| 저장소 소유자 | `OWNERS` |
| 도움·지원 채널 | 본 저장소 이슈 트래커 또는 `OWNERS` 의 연락처 |
| 변경 이력 | `CHANGELOG.md` |
| 기여 절차 | `CONTRIBUTING.md` |

## 추가 문서

| 주제 | 경로 |
| --- | --- |
| 저장소 지식 베이스 | `AGENTS.md` |
| 앱별 운영/개발 가이드 | `apps/job-dashboard/DEVELOPMENT_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `API_REFERENCE.md`, `SECRETS.md`, `DIAGRAMS.md` |
| 디자인 원칙 | `design-state.md` |
| OpenAPI/Worker 계약 | `packages/contracts/` |
| 보안/시크릿 정책 | `docs/security/`, `tools/scripts/onepassword/` |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |
| PPTX 프로필 빌드 | `ta/improve_visual.py`, `ta/inspect.py`, `ta/verify.py`, `ta/output/` |
| 지원 패키지 | `applications/*/application-guide.md`, `cover_letter.md` |

## 기여

`CONTRIBUTING.md` 와 각 패키지의 `AGENTS.md` 를 따른다. 일반 원칙:

- 워크스페이스 경계와 200 LOC 규칙(`docs/conventions/architecture-rules.md`)을 지킨다.
- 데이터 수정은 `packages/data/` 의 권위 JSON 만 변경하고, `sync:*` 명령으로만 다른 산출물에 전파한다.
- 시크릿은 코드에 두지 않고 1Password CLI 어댑터를 통해 주입한다.
- 공개 사이트 변경은 `worker.js` 를 직접 수정하지 않고 `entry.js` 와 소스 모듈을 수정한다.

## 라이선스

저장소 루트의 `LICENSE` 파일을 따른다. 외부 배포·재사용 전 `OWNERS` 의 사전 동의가 필요하다.