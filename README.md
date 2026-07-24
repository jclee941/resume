# Resume Workspace

![version](https://img.shields.io/badge/version-1.40.12-blue.svg)
![node](https://img.shields.io/badge/node-22-339933.svg)
[![license](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

> **이력서·포트폴리오·지원 자동화를 한 곳에서 운영하는 개인 워크스페이스.**
> Cloudflare Worker 포트폴리오, 잡 자동화 런타임, 대시보드, 콘텐츠 단일 진실 공급원(SSoT), 자체 호스팅 옵저버빌리티를 포함합니다.

> **Personal workspace for resume, portfolio, and job-application automation.**
> Includes a Cloudflare Worker portfolio, job automation runtime, dashboard, single source of truth (SSoT) data, and self-hosted observability.

## Status

| 영역 | 런타임 | 진입점 | 운영 위치 |
| --- | --- | --- | --- |
| Portfolio site | Cloudflare Worker | `apps/portfolio/worker.js` | edge |
| Job automation server | Node.js 22 (Alpine) | `apps/job-server/src/server/index.js` | Docker (`mcp-server`) |
| Job dashboard | Cloudflare Worker + D1 / Queues / Workflows | `apps/job-dashboard/src/index.js` | edge |
| Resume SSoT | JSON | `packages/data/resumes/master/resume_data.json` | repo |
| TA PPTX builder | Python 3 | `ta/improve_visual.py`, `ta/verify.py` | local |
| Ops scripts | Go 1.22+ | `tools/scripts/**` | local |

## 한눈에 보기 / At a Glance

- **무엇이 실행되는가** — 포트폴리오는 Cloudflare Workers, 잡 서버는 Docker의 Node 22, 대시보드는 D1/Queues/Workflows 기반 Worker.
- **누가 운영 책임이 있는가** — 루트 `OWNERS`와 각 앱의 `OWNERS` 파일 참조.
- **다음에 실행할 명령** — `npm install` → `npm run sync:data` (SSoT 동기화) 또는 `docker compose up -d mcp-server` (잡 서버 기동).

## 목차 / Table of Contents

1. [패키지 구성 / Package Contents](#패키지-구성--package-contents)
2. [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
3. [API · 진입점 / Entry Points](#api--진입점--entry-points)
4. [빠른 시작 / Quickstart](#빠른-시작--quickstart)
5. [설정 / Configuration](#설정--configuration)
6. [명령 레퍼런스 / Commands Reference](#명령-레퍼런스--commands-reference)
7. [아키텍처 / Architecture](#아키텍처--architecture)
8. [로컬 개발 / Local Development](#로컬-개발--local-development)
9. [테스트 / Testing](#테스트--testing)
10. [기여 / Contributing](#기여--contributing)
11. [유지보수자 / Maintainers](#유지보수자--maintainers)
12. [추가 문서 / Further Documentation](#추가-문서--further-documentation)
13. [라이선스 / License](#라이선스--license)

## 패키지 구성 / Package Contents

루트는 npm 워크스페이스이며 `package.json`의 `workspaces` 필드가 다음 디렉터리를 선언합니다.

- `apps/portfolio/` — 공개 Cloudflare Worker 포트폴리오. `worker.js`는 빌드 산출물이므로 `entry.js`, HTML, `src/`, `lib/`만 직접 수정합니다.
- `apps/job-server/` — MCP/잡 자동화 런타임. 크롤러, 자동 지원, 플랫폼 클라이언트, 스크립트 포함.
- `apps/job-dashboard/` — 대시보드 Worker. fetch/큐/스케줄 핸들러, 미들웨어, 워크플로우, 마이그레이션 포함.
- `packages/cli/` — 워크스페이스 운영자 CLI.
- `packages/data/` — 이력서/지원 콘텐츠 SSoT. `resumes/master/resume_data.json`이 권위 데이터.
- `packages/env/` — 런타임 환경 검증.
- `packages/shared/` — 공용 유틸리티(에러, 로거, 재시도, 크립토, rate-limit, auth, 브라우저, 클라이언트).
- `packages/types/` — JSDoc/TS 도메인 타입.
- `packages/schemas/` — Zod 런타임 스키마.
- `packages/contracts/` — OpenAPI, Worker env 계약 표면.

루트 외부 디렉터리:

- `applications/` — 역할별 지원 패키지(에어프레미아 시큐리티, 쿠팡 파이낸스 SRE, Cloudflare One SE, GitLab APAC 인프라시큐리티, OpenAI Codex Korea 등)와 생성된 실행 로그.
- `ta/` — Python/PPTX TA 프로필 생성 도구와 산출물.
- `tools/`, `tests/`, `infrastructure/`, `docs/`, `third_party/` — CI/빌드/배포/검증 스크립트, 테스트, 인프라 정의, ADRs, 의존성 라이선스 정리.

## 먼저 읽을 파일 / First Files to Read

| 우선순위 | 경로 | 이유 |
| --- | --- | --- |
| 1 | `README.md` | 프로젝트 개요와 진입점 안내. |
| 2 | `AGENTS.md` | 디렉터리 구조, 워크스페이스 경계 규칙, "어디를 봐야 하는가" 표. |
| 3 | `design-state.md` | 현재 설계/상태 메모. |
| 4 | `apps/job-dashboard/README.md` | 대시보드 앱 전용 가이드(현재 트리에 노출된 유일한 앱). |
| 5 | `applications/*/cover_letter.md` | 지원서 작성 노트와 함께 역할별 의도 파악. |

## API · 진입점 / Entry Points

| 표면 | 위치 | 설명 |
| --- | --- | --- |
| Portfolio Worker | `apps/portfolio/worker.js` (생성), `apps/portfolio/entry.js` (소스) | 공개 포트폴리오 요청 처리. |
| Job server MCP | `apps/job-server/src/server/index.js` | 컨테이너 진입점. 헬스 체크 `/health` 제공. |
| Job dashboard | `apps/job-dashboard/src/index.js`, `apps/job-dashboard/src/router.js` | fetch 핸들러, 라우터. |
| CLI | `packages/cli/` | 워크스페이스 공통 운영 명령. |
| Contracts | `packages/contracts/` | OpenAPI 스펙과 Worker env 계약. |

## 빠른 시작 / Quickstart

요구 사항:

- Node.js 22 (Dockerfile 기준)
- npm 10+
- Python 3 (PPTX 빌드 시)
- Go 1.22+ (`tools/scripts/**` 운영 스크립트 사용 시)

```bash
# 1. 의존성 설치
npm install

# 2. SSoT 이력서 데이터 동기화
npm run sync:data

# 3. 잡 서버를 로컬에서 기동 (Docker)
docker compose up -d mcp-server

# 4. 헬스 체크
curl -fsS http://127.0.0.1:3000/health
```

포트폴리오와 대시보드는 `wrangler.jsonc`로 Cloudflare에 배포합니다. 자세한 절차는 `apps/job-dashboard/DEPLOYMENT_GUIDE.md`를 참고하세요.

> 이 워크스페이스는 운영 중인 1Password 기반 시크릿 주입, Docker 컨테이너 헬스 체크, CI 검증을 갖춘 프로덕션 구성입니다. 다만 개인 운영을 전제로 하므로 외부 다중 사용자 부하 테스트는 수행되지 않았습니다.

## 설정 / Configuration

| 계층      | 책임                              | 위치                                    |
| --------- | --------------------------------- | --------------------------------------- |
| 데이터    | 이력서/지원 단일 진실             | `packages/data/resumes/master/`         |
| 빌드      | Go 우선 빌드, PDF/PPTX/정적 자산  | `tools/scripts/build`                   |
| 엣지      | Cloudflare Worker 사이트/대시보드 | `apps/portfolio`, `apps/job-dashboard`  |
| 런타임    | 잡 자동화, MCP, 크롤러            | `apps/job-server`                       |
| 비밀/세션 | 1Password 연동                    | `tools/scripts/onepassword`             |
| 관측      | 자체 호스팅 관측성                | `infrastructure/`, `docs/observability` |

| 항목 | 출처 | 비고 |
| --- | --- | --- |
| Node 런타임 | `Dockerfile` (`node:22-alpine`) | 프로덕션 컨테이너 기준. |
| 컨테이너 포트 | `docker-compose.yml` (`3000:3000`) | 호스트에서 컨테이너 포트로 매핑. |
| 헬스 체크 | `/health` 엔드포인트, 30s 주기, start-period 20s, retries 3 | Dockerfile/compose 공통. |
| 데이터 볼륨 | `job_automation_data` → `/app/apps/job-server/.data` | 잡 자동화 영속 데이터. |
| 환경 변수 | `.env`, `wrangler.jsonc` | `packages/env/`에서 검증. |
| 시크릿 | `SECRETS.md`, `apps/job-dashboard/SECRETS.md` | 1Password 통합 사용. |

운영 시 비공개 IP, 컨테이너 번호 등은 본 README에 하드코딩하지 마세요. 환경 변수와 시크릿 매니저를 통해 주입합니다.

## 명령 레퍼런스 / Commands Reference

| 명령 | 설명 |
| --- | --- |
| `npm run sync:data` | SSoT 이력서 데이터를 다른 산출물로 동기화. |
| `npm run sync:pdf` | Go PDF 생성기로 master/full 변형 생성. |
| `npm run sync:pptx` | Python 스크립트로 PPTX 빌드. |
| `npm run sync:all` | 데이터 → PDF → PPTX 순서로 일괄 동기화. |
| `npm run sync:jobkorea` | 잡코리아 프로필 동기화 (apply 모드). |
| `npm run sync:jobkorea:dry` | 잡코리아 동기화 dry-run (diff만). |
| `npm run sync:proposals` | 제안 검토 후 적용. |
| `npm run enrich:github` | GitHub enrichment 수집. |
| `npm run strip-exif` | 포트폴리오 이미지에서 EXIF 제거. |
| `npm run op:run` | 1Password 통합으로 환경 변수 주입. |
| `npm run op:native:run` | 1Password 네이티브 모드 실행. |
| `npm run op:seed:resume` / `op:seed:sessions` / `op:restore:sessions` | 시크릿/세션 시드 및 복원. |

## 아키텍처 / Architecture

| 계층 | 책임 | 디렉터리 |
| --- | --- | --- |
| Edge 공개 | 정적 자산 + Workers 렌더링 포트폴리오 | `apps/portfolio/` |
| 잡 자동화 런타임 | MCP 서버, 크롤러, 자동 지원, 스크립트 | `apps/job-server/` |
| 대시보드 | fetch/큐/스케줄/워크플로우 핸들러, D1 마이그레이션 | `apps/job-dashboard/` |
| 공유 패키지 | 타입, 스키마, 계약, 환경, 공용 유틸리티 | `packages/` |
| 콘텐츠 SSoT | 이력서/지원서 원천 데이터 | `packages/data/` |
| 보조 도구 | PPTX 빌더, EXIF 제거, 옵저버빌리티 | `ta/`, `tools/` |
| 애플리케이션 팩 | 역할별 이력서·커버레터·QA | `applications/` |

요청 흐름(요약):

1. 방문자가 포트폴리오 Worker(`apps/portfolio/`)에 도달하면 `entry.js` → `worker.js`를 통해 페이지가 제공됩니다.
2. 운영자는 잡 대시보드 Worker(`apps/job-dashboard/`)에서 큐/워크플로우를 트리거하여 잡 서버 작업을 발화합니다.
3. 잡 서버(`apps/job-server/`)는 MCP 엔드포인트로 작업을 받아 크롤러/클라이언트를 실행하고 결과를 `.data` 볼륨에 기록합니다.
4. 결과는 다시 대시보드와 SSoT로 집계되어 다음 동기화 사이클에 반영됩니다.

## 로컬 개발 / Local Development

```bash
# 워크스페이스 전체 의존성 설치
npm install

# 잡 서버 컨테이너 실행 (헬스 체크 활성화)
docker compose up -d mcp-server

# 대시보드 로컬 개발
cd apps/job-dashboard
npm install
npm run dev
```

컨테이너는 `Dockerfile`의 멀티 스테이지 빌드를 사용합니다. `deps` 단계에서 루트 lockfile로 프로덕션 의존성만 설치하고, `runtime` 단계에는 잡 서버가 런타임에 필요로 하는 워크스페이스 패키지(`@resume/shared`, `schemas`, `types`, `data`, `env`)만 복사합니다.

## 테스트 / Testing

- 단위/통합 테스트: Jest (`jest.config.cjs`)
- E2E: Playwright (`playwright.config.js`)
- 링크 검증: `lychee.toml`
- API 스타일 검증: `redocly.yaml`
- 타입 검사: `tsconfig.base.json`, `tsconfig.strict.json`
- 린트: `eslint.config.cjs`

```bash
npm test
npx playwright test
```

## 기여 / Contributing

- `CONTRIBUTING.md`의 절차와 코딩 규칙을 따릅니다.
- 워크스페이스 경계 규칙은 루트 `AGENTS.md`와 각 패키지의 `AGENTS.md`를 우선합니다.
- 변경 전 `design-state.md`를 갱신해 현재 설계 결정을 함께 반영합니다.
- 변경 이력은 `CHANGELOG.md`에 누적합니다.

## 유지보수자 / Maintainers

- 책임자 목록은 루트 `OWNERS` 파일을 참조하세요.
- 대시보드 앱 책임자는 `apps/job-dashboard/OWNERS`를 참조하세요.
- 변경/릴리스 권한에 대한 정책은 `OWNERS`와 `AGENTS.md`를 따릅니다.
- 도움말: 저장소 이슈 트래커 또는 `docs/` 하위 가이드를 참고하세요.

## 추가 문서 / Further Documentation

- `docs/` — ADRs, 아키텍처, 컨벤션, 가이드, 보안 노트.
- `apps/job-dashboard/DEPLOYMENT_GUIDE.md` — 대시보드 배포 절차.
- `apps/job-dashboard/DEVELOPMENT_GUIDE.md` — 대시보드 개발 절차.
- `apps/job-dashboard/API_REFERENCE.md` — 대시보드 API 표면.
- `apps/job-dashboard/SECRETS.md` — 시크릿 운영.
- `apps/job-dashboard/DIAGRAMS.md` — 상세 다이어그램(Mermaid).
- `applications/*/application-guide.md` — 역할별 지원 가이드.

## 라이선스 / License

저장소 루트의 `LICENSE` 파일을 참조하세요.
