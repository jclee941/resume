# Portfolio & Job Automation Workspace

[![Workspaces](https://img.shields.io/badge/workspaces-10-blue)]() [![Node](https://img.shields.io/badge/node-22-339933)]() [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)]() [![License](https://img.shields.io/badge/license-MIT-green)]() [![Status](https://img.shields.io/badge/status-active-success)]()

## 개요

이 워크스페이스는 Cloudflare Workers 기반 포트폴리오 사이트, Wanted/JobKorea 자동 지원 MCP 서버, 대시보드 Worker, 도메인 타입/Zod 스키마/OpenAPI 컨트랙트 패키지, 그리고 회사별 지원 패키지를 한 곳에서 운영하는 개인 이력·채용 자동화 환경입니다. 루트 `package.json`의 `workspaces`로 `apps/portfolio`, `apps/job-server`, `apps/job-dashboard`, `packages/{cli,data,env,shared,types,schemas,contracts}`를 묶고, `tools/scripts`에서 Go-우선 빌드/동기화/배포 스크립트를 제공합니다.

**English:** Personal career workspace that bundles a Cloudflare Worker portfolio, a job-automation MCP server (Wanted/JobKorea), a dashboard Worker, shared domain packages, role-specific application packets, and Go-first operational tooling under a single `npm` workspaces graph. Not a general-purpose library; deploy targets and runtime contracts are tailored to the author's portfolio site and automation pipeline.

## 한눈 상태표

| 영역 | 항목 | 현재 상태 |
| --- | --- | --- |
| 런타임 | Node 22 / Workers | 활성 (`apps/portfolio`, `apps/job-dashboard`) |
| 자동화 | job-server MCP + Wanted/JobKorea | 활성 (`apps/job-server`) |
| 컨테이너 | Docker Compose (`mcp-server`) | 활성, `/health` 30초 간격 헬스체크 |
| 데이터 SSoT | `packages/data/resumes/master/resume_data.json` | 활성, 단일 진실 원천 |
| 배포 권위 | Cloudflare Workers Builds | GitHub Actions는 검증 전용 |
| 보안 | 1Password CLI 경유 시크릿 주입 | 활성 (`tools/scripts/onepassword/`) |

## 운영 흐름 요약

1. **편집:** `packages/data`의 SSoT 또는 `apps/portfolio`의 HTML/JS를 수정합니다. `apps/portfolio/worker.js`는 생성물이므로 직접 편집하지 않습니다.
2. **검증:** 루트에서 `npm` 스크립트로 lint/test/type-check를 실행하고, 필요 시 Playwright e2e를 돌립니다.
3. **동기화:** `sync:data` → `sync:pdf` → `sync:pptx` 순으로 산출물을 재생성합니다.
4. **자동 지원:** 1Password env 파일을 로드한 뒤 `sync:jobkorea` 또는 `sync:proposals`로 제안 적용을 실행합니다.
5. **배포:** `apps/portfolio`/`apps/job-dashboard`는 Cloudflare Workers Builds가 배포 권한을 갖고, `apps/job-server`는 `Dockerfile`/`docker-compose.yml`로 컨테이너화됩니다.
6. **모니터링:** 컨테이너 `/health`, 대시보드 Worker 로그, `tools/scripts`의 검증 스크립트로 자가 진단합니다.

운영자가 가장 먼저 보는 명령은 `npm run` 목록 확인이며, 다음 명령은 역할에 따라 `npm run sync:all`(콘텐츠 동기화) 또는 `docker compose up -d mcp-server`(MCP 부팅)입니다.

## 목차

- [목적 / 패키지 구성](#목적--패키지-구성-purposepackage-contents)
- [상태](#상태-status)
- [먼저 읽을 파일](#먼저-읽을-파일-first-files-to-read)
- [API 및 엔트리 포인트](#api-및-엔트리-포인트-api-or-entry-points)
- [빠른 시작 / 사용법](#빠른-시작--사용법-quickstart--usage)
- [명령어 레퍼런스](#명령어-레퍼런스)
- [설정과 시크릿](#설정과-시크릿)
- [아키텍처](#아키텍처)
- [회사별 지원 패키지](#회사별-지원-패키지)
- [로컬 개발](#로컬-개발)
- [테스트](#테스트)
- [유지보수 / 운영](#유지보수--운영)
- [기여](#기여)
- [관리자 / 문의처](#관리자--문의처)
- [추가 문서](#추가-문서)
- [라이선스](#라이선스)

## 목적 / 패키지 구성 (Purpose / Package Contents)

워크스페이스는 네 개의 책임 영역으로 나뉘며, 각각 독립적으로 빌드·테스트·배포될 수 있습니다.

- **`apps/portfolio`** — Cloudflare Workers에 배포되는 공개 포트폴리오. `entry.js`가 `/job/*` 대시보드 라우트를 함께 흡수하는 병합 엣지 라우터이며, `worker.js`는 빌드 산출물입니다.
- **`apps/job-server`** — Node/Fastify MCP 서버, 잡코리아/원티드 크롤러, 자동 지원 스크립트, 플랫폼 클라이언트. `Dockerfile`이 이 앱만 컨테이너화합니다.
- **`apps/job-dashboard`** — 대시보드 Worker. fetch/queue/scheduled 핸들러, 워크플로, 미들웨어, D1 마이그레이션을 포함합니다.
- **`packages/`** — `cli`, `data`(SSoT), `env`(런타임 환경 검증), `shared`(에러·로거·재시도 등), `types`, `schemas`(Zod), `contracts`(OpenAPI/Worker env 계약).
- **`applications/`** — 회사별 지원 패키지(예: `cloudflare-one-se-2026/`, `gitlab-apac-security-2026/`, `coupang-fintech-sre-2026/`, `airpremia-security-2026/`, `infrastructure-architecture-2026/`, `openai-codex-korea-2026/`, `security-ir-2026/`, `job-search-2026-07/`).
- **`ta/`** — Python으로 작성한 PPTX 프로필/자기소개 자료 생성 파이프라인과 검증 스크립트.
- **`tools/`** — Go-우선 빌드/동기화/배포/검증/보안 스크립트 모음. 1Password 통합도 이 위치에 있습니다.

전체 트리는 [`AGENTS.md`](AGENTS.md)와 본 문서의 [아키텍처](#아키텍처) 절을 기준으로 합니다.

## 상태 (Status)

- **운영 준비도(Production-ready):** 포트폴리오 워커(`apps/portfolio`)와 대시보드 워커(`apps/job-dashboard`)는 Cloudflare Workers Builds로 배포 가능한 상태이며, MCP 컨테이너는 Docker Compose로 부팅됩니다.
- **지원 종료 여부:** 활성 유지 중입니다. 더 이상 쓰지 않는 워크스페이스 패키지는 `package.json`의 `workspaces` 배열에서 제외해 의존성 그래프를 가볍게 유지합니다.
- **권한 모델:** 배포 권한은 Cloudflare Workers Builds에 있고, GitHub Actions는 검증 작업에 한정됩니다. 시크릿은 1Password CLI 경유로만 주입합니다.

## 먼저 읽을 파일 (First Files to Read)

운영자/기여자가 본 워크스페이스에 진입할 때 순서대로 보면 좋은 파일은 다음과 같습니다.

1. [`AGENTS.md`](AGENTS.md) — 코드 맵, 어디를 봐야 하는지, 패키지 경계 규칙 요약.
2. [`package.json`](package.json) — 워크스페이스 선언과 운영 스크립트의 단일 창구.
3. [`Dockerfile`](Dockerfile) 및 [`docker-compose.yml`](docker-compose.yml) — 컨테이너 부팅과 `/health` 헬스체크 정의.
4. [`ta/AGENTS.md`](ta/AGENTS.md) 및 [`applications/AGENTS.md`](applications/AGENTS.md) — 부속 영역의 규칙.
5. [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) — 대시보드 Worker의 진입 설명.

## API 및 엔트리 포인트 (API or Entry Points)

| 엔트리 | 종류 | 위치 | 역할 |
| --- | --- | --- | --- |
| 포트폴리오 fetch 라우터 | Cloudflare Worker | `apps/portfolio/entry.js` | 공개 사이트 + `/job/*` 대시보드 라우트 흡수 |
| 포트폴리오 빌드 산출물 | 생성 스크립트 | `apps/portfolio/worker.js` (생성) | 직접 편집 금지 |
| job-server 메인 | Node/Fastify | `apps/job-server/src/server/index.js` (Docker의 CMD) | 대시보드용 잡 자동화 진입점 |
| job-server MCP 부트스트랩 | Node | `apps/job-server/src/index.js` | MCP 프로세스 진입 및 셧다운 |
| 대시보드 Worker | Cloudflare Worker | `apps/job-dashboard/src/index.js` | fetch/queue/scheduled 오케스트레이션 |
| 헬스 체크 | HTTP | `GET /health` (포트 3000) | 컨테이너/Compose healthcheck에서 사용 |
| CLI 진입 | Node | `packages/cli` | 워크스페이스 운영자 CLI |
| OpenAPI 컨트랙트 | 정적 자산 | `packages/contracts/` | 외부 클라이언트 계약 표면 |

요청 흐름 한 줄 요약: 브라우저/큐/크론 → 각 Worker의 fetch/queue/scheduled 핸들러 → Fastify MCP 또는 데이터 패키지 → 응답 직렬화 → SSoT/`packages/data` 갱신은 동기화 스크립트를 통해서만.

## 빠른 시작 / 사용법 (Quickstart / Usage)

사전 요구사항: Node 22, npm 10+, 선택적으로 Docker/Docker Compose, Go(운영 스크립트), Python 3(PPTX 생성), 1Password CLI(시크릿 주입).

1. **의존성 설치**

   ```bash
   npm ci
   ```

2. **포트폴리오 로컬 미리보기(Workers 로컬 모드)**

   ```bash
   npx wrangler dev --config apps/portfolio/wrangler.jsonc
   ```

   대시보드 워커도 같은 방식으로 `apps/job-dashboard`의 `wrangler` 진입점을 사용합니다.

3. **MCP/잡 자동화 컨테이너 기동**

   ```bash
   docker compose up -d mcp-server
   curl -fsS http://127.0.0.1:3000/health
   ```

   `.env`는 시크릿 주입용이며, 실제 키 값은 1Password 항목에서 가져옵니다(자세한 내용은 [설정과 시크릿](#설정과-시크릿)).

4. **콘텐츠 동기화**

   ```bash
   npm run sync:data
   npm run sync:pdf
   npm run sync:pptx
   # 또는 한 번에
   npm run sync:all
   ```

5. **잡코리아 동기화(시크릿 자동 주입, 실제 지원 적용은 `--apply` 사용에 주의)**

   ```bash
   npm run sync:jobkorea:dry   # 드라이런(diff만)
   npm run sync:jobkorea       # 실제 모드(원격 부수효과 발생)
   ```

6. **회사별 지원 패키지 생성**

   각 `applications/<role>-<year>/` 폴더의 안내(`application-guide.md`, `greenhouse-application-guide.md` 등)를 따라 이력서/자기소개서/링크드인 자료를 갱신하고, 검증 스크립트를 실행합니다.

## 명령어 레퍼런스

루트 `package.json`이 단일 명령 허브이며, 필요 시 `cd` 조합 스크립트도 포함되어 있습니다.

| 명령 | 목적 | 비고 |
| --- | --- | --- |
| `npm ci` | 워크스페이스 의존성 설치 | 권장 시작점 |
| `npm test` | Jest/Node 테스트 스위트 실행 | 자세한 분류는 [`tests/`](tests/) 하위 |
| `npm run lint` | ESLint 검사 | [`eslint.config.cjs`](eslint.config.cjs) 기준 |
| `npm run strip-exif` | 이미지 EXIF 제거 | `exiftool` 부재 시 경고만 출력 |
| `npm run sync:data` | `packages/data` → 다른 산출물 반영 | `node tools/scripts/utils/sync-resume-data.js` |
| `npm run sync:pdf` | PDF 이력서 마스터 재생성 | Go 스크립트 사용 |
| `npm run sync:pptx` | PPTX 산출물 재생성 | Python 스크립트 사용 |
| `npm run sync:all` | 위 세 단계를 순차 실행 | 가장 흔한 운영 진입 |
| `npm run sync:jobkorea` / `:dry` | 잡코리아 프로필 동기화 | 1Password env 경유 |
| `npm run sync:proposals` | 제안 검토/적용 | CLI + Go 적용기 조합 |
| `npm run op:run` / `op:native:run` | 1Password 경유 명령 실행 | `tools/scripts/onepassword` |
| `npm run op:seed:resume` / `op:seed:sessions` | 1Password 시드/복원 | 신규 머신 온보딩용 |

`wrangler.jsonc`와 `playwright.config.js`는 워커 배포/엔드투엔드 검증을 위한 별도 진입점입니다.

## 설정과 시크릿

| 항목 | 위치 | 비고 |
| --- | --- | --- |
| 워커 환경 변수/바인딩 | `apps/portfolio/wrangler.jsonc`, `apps/job-dashboard/wrangler.jsonc` | Cloudflare 대시보드와 동기화 필요 |
| 공유 환경 검증 스키마 | `packages/env/` | Zod 기반 런타임 검증 |
| 컨테이너 환경 | `docker-compose.yml`의 `mcp-server.env_file` | `.env` 사용 |
| 시크릿 주입 | `tools/scripts/onepassword/` (`op:run`) | 키 값을 git에 커밋하지 않음 |
| D1/DB 마이그레이션 | `apps/job-dashboard/migrations/`, `schema.sql` | 마이그레이션 도구 절차는 `SECRETS.md` 참조 |
| 시크릿 회전 절차 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) | 회전 후 `op:restore:sessions` |

운영자는 1Password 항목이 누락되면 `op:run`이 비-제로로 종료되도록 두어 누락을 조기 탐지합니다.

## 아키텍처

워크스페이스는 단방향 의존 그래프(`packages` ← `apps`)를 따르며, 200-LOC 규칙은 [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)에 정의되어 있습니다.

| 계층 | 책임 | 의존 방향 |
| --- | --- | --- |
| 데이터/타입 | `packages/data`, `packages/types`, `packages/schemas`, `packages/contracts` | 최하위, SSoT |
| 런타임 지원 | `packages/shared`, `packages/env`, `packages/cli` | 위 계층 사용 가능 |
| 워커 | `apps/portfolio`, `apps/job-dashboard` | 지원 패키지 사용 |
| 서버/컨테이너 | `apps/job-server` (Docker) | 지원 패키지 사용 |
| 운영/스크립트 | `tools/scripts/**`, `applications/**`, `ta/**` | 모든 패키지에 접근 가능, 단 생성된 산출물에 의존하지 않음 |

요청 처리 단계(요약):

1. 엣지 요청이 `apps/portfolio/entry.js` 또는 `apps/job-dashboard/src/index.js`로 들어옵니다.
2. 라우터/미들웨어가 인증·레이트리미트·로깅(`packages/shared`)을 수행합니다.
3. 핸들러가 `packages/data`의 SSoT와 `packages/schemas`의 Zod 검증을 거쳐 응답을 직렬화합니다.
4. 큐/크론은 job-server 측 동기화 스크립트가 결과를 갱신하고, 다음 요청에 반영합니다.
5. 컨테이너 헬스체크는 30초 간격으로 `/health`를 폴링해 가용성을 보고합니다.

생성 vs 수동 편집의 경계:

- 수동 편집: `entry.js`, `apps/**/src/**`, `packages/**`(자체 소스), `applications/**`의 원문, `ta/`의 파이썬 스크립트.
- 생성 전용: `apps/portfolio/worker.js`, PDF/PPTX 산출물, 동기화 결과로 만들어지는 `ta/output/**`.
- 자동화 SSoT는 [`design-state.md`](design-state.md)와 [`AGENTS.md`](AGENTS.md) 모두를 기준으로 정렬합니다.

## 회사별 지원 패키지

`applications/` 아래에는 회사-연도 단위로 패키지가 구성되어 있습니다. 각 패키지는 원본 이력서, 채용공고 분석, 자기소개서, 가이드, 검증 보고를 묶어 둡니다.

- `airpremia-security-2026/` — 보안 IR/모의해킹 지원 패키지.
- `cloudflare-one-se-2026/` — Cloudflare One SE 지원 패키지. 그린하우스 안내와 링크드인 최적화 포함.
- `coupang-fintech-sre-2026/` — 쿠팡페이 핀테크 SRE 지원 패키지.
- `gitlab-apac-security-2026/` — GitLab APAC InfraSec 지원 패키지.
- `openai-codex-korea-2026/` — OpenAI Codex Korea 지원 패키지.
- `security-ir-2026/` — 한국권 보안 IR 지원 패키지(미리보기 PNG 포함).
- `infrastructure-architecture-2026/` — 인프라 아키텍처 직무 보강용 패키지.
- `job-search-2026-07/` — 2026년 7월 기준 검색 파이프라인 운영 노트, 평가표, 면접 답변, 다음 액션, outreach 템플릿, 프로필 카피.

각 패키지 내부의 `cover_letter.md` 또는 `application-guide.md`가 운영 진입점이며, 산출물의 마지막 검증은 [`ta/output/verify_report_*.txt`](ta/output/)에 기록됩니다.

## 로컬 개발

1. 노드 22 설치, `npm ci` 실행.
2. 워커는 `wrangler dev`로 로컬 모드 진입. 필요 시 `.dev.vars`로 환경 변수 주입(파일은 git에서 제외).
3. job-server는 `apps/job-server/src/server/index.js`를 직접 실행하거나 Docker Compose로 기동.
4. 데이터 변경은 `packages/data`에서 시작해 `npm run sync:all`로 PDF/PPTX를 갱신하고, 회귀 테스트는 [`tests/`](tests/)에서 실행.
5. PPTX 자료 변경은 [`ta/`](ta/)에서 `improve_visual.py`/`verify.py`를 사용. 결과는 `ta/output/`에 저장됩니다.

## 테스트

| 계층 | 도구 | 위치 |
| --- | --- | --- |
| 단위/통합 | Jest | [`jest.config.cjs`](jest.config.cjs), `tests/` |
| 엔드투엔드 | Playwright | [`playwright.config.js`](playwright.config.js) |
| 타입/스키마 | TypeScript + Zod | [`tsconfig.base.json`](tsconfig.base.json), `packages/schemas/` |
| 링크 | lychee | [`lychee.toml`](lychee.toml) |
| API 컨트랙트 | Redocly lint | [`redocly.yaml`](redocly.yaml) |

새 테스트는 실패 시나리오를 1개 이상 포함하고, 결정적이어야 합니다(시크릿/네트워크 의존 금지).

## 유지보수 / 운영

- **변경 이력:** [`CHANGELOG.md`](CHANGELOG.md). 시맨틱 버전은 루트 `package.json`을 단일 원천으로 합니다.
- **기여 가이드:** [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **책임자 명단:** [`OWNERS`](OWNERS), 도메인별 보조 명단은 각 앱/패키지의 `OWNERS` 또는 가이드 문서 참조.
- **런타임 진단:** 컨테이너 `/health`, Workers 대시보드 로그, `tools/scripts`의 검증 스크립트.
- **릴리즈:** Cloudflare Workers Builds가 배포 권한을 갖고, GitHub Actions는 검증 작업에 한정됩니다.

## 기여

기여 절차는 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 정리되어 있습니다. PR 전 로컬에서 `npm run lint`, `npm test`, `npx playwright test`(해당 영역)을 통과시켜 주세요. 데이터 변경은 `packages/data` 단일 지점만 수정하고, 동기화 산출물은 PR에 포함하지 않습니다(자동 재생성).

## 관리자 / 문의처

- **책임자:** 이 재철 (`OWNERS` 참조).
- **연락 채널:** [`applications/job-search-2026-07/outreach-templates.md`](applications/job-search-2026-07/outreach-templates.md)의 템플릿을 참고하세요.
- **이슈 트래커:** 저장소 이슈 트래커. 보안 이슈는 공개 이슈 대신 운영자에게 직접 연락.

## 추가 문서

- [`AGENTS.md`](AGENTS.md) — 코드 맵과 규칙 요약.
- [`design-state.md`](design-state.md) — 자동화 SSoT 정렬 노트.
- [`docs/`](docs/) — ADR, 아키텍처, 컨벤션, 보안 가이드.
- [`infrastructure/`](infrastructure/) — Cloudflare/DB/모니터링/시스템 자동화 노트.
- [`tools/scripts/`](tools/scripts/) — 운영 스크립트 모음.
- [`ta/`](ta/) — PPTX 프로필 생성 파이프라인.

## 라이선스

[`LICENSE`](LICENSE) 파일의 조항을 따릅니다(저장소 표준은 MIT).