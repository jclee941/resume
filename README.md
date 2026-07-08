# 이력서 자동화 워크스페이스 / Resume Automation Workspace

[![status: active](https://img.shields.io/badge/status-active-2ea44f)](#status)
[![node: 22](https://img.shields.io/badge/node-22-339933)](https://nodejs.org)
[![wrangler](https://img.shields.io/badge/cloudflare-workers-F38020)](https://workers.cloudflare.com)
[![license: private](https://img.shields.io/badge/license-private-lightgrey)](#license)

> Cloudflare Worker 기반 공개 포트폴리오, Wanted/JobKorea 잡 자동화 런타임,
> D1 기반 대시보드, 그리고 공유 패키지로 구성된 단일 출처(SSoT) 이력서 워크스페이스.

## 한 줄 요약

`apps/portfolio`는 Cloudflare Worker로 호스팅되는 공개 이력서 사이트이고,
`apps/job-server`는 잡 자동화(MCP) 런타임, `apps/job-dashboard`는 운영 대시보드,
`packages/data`는 콘텐츠 단일 출처입니다. `ta/`는 Python으로 작성된
PPTX 프로필 생성 도구입니다.

## 빠른 상태 표

| 영역 | 위치 | 상태 | 진입점 / 빌더 |
| --- | --- | --- | --- |
| 공개 포트폴리오 | `apps/portfolio/` | active (edge) | `entry.js` → `generate-worker.js` → `worker.js` |
| 잡 자동화 런타임 | `apps/job-server/` | active (MCP) | `src/server/index.js` (Node/Fastify) |
| 운영 대시보드 | `apps/job-dashboard/` | active (Workers) | `src/index.js` (`fetch`/`queue`/`scheduled`) |
| 콘텐츠 SSoT | `packages/data/` | authoritative | `resumes/master/resume_data.json` |
| 타입 / 스키마 | `packages/types`, `packages/schemas` | active | JSDoc 도메인 타입 + Zod |
| 계약 / OpenAPI | `packages/contracts/` | active | OpenAPI, Worker env contract |
| 운영 CLI | `packages/cli/` | active | `resume` 운영자 CLI |
| PPTX 프로필 | `ta/` | active (Python) | `ta/improve_visual.py`, `ta/verify.py` |
| 컨테이너 | `Dockerfile`, `docker-compose.yml` | active | `mcp-server` (job-server) |

## 운영 흐름 한 눈에 보기

1. 콘텐츠 편집 → `packages/data/resumes/master/resume_data.json` 갱신
2. 데이터 동기화 → `npm run sync:data` (Node), `npm run sync:pdf` (Go), `npm run sync:pptx` (Python)
3. 외부 enrichment → `npm run enrich:github | enrich:skills | enrich:ai`
4. 빌드 / 검증 → `npm run build`, `npm run typecheck`, `npm run test:node`
5. 엣지 배포 → Cloudflare Workers Builds (production 배포 권한 단일화)
6. 잡 자동화 런타임 → `docker compose up mcp-server` (로컬 3000 포트)
7. 대시보드 → `apps/job-dashboard` Worker (`/health`, 큐, 스케줄 오케스트레이션)

## 목차

- [목적과 구성 (Purpose / Package Contents)](#목적과-구성-purpose--package-contents)
- [상태 (Status)](#상태-status)
- [먼저 읽을 파일 (First Files to Read)](#먼저-읽을-파일-first-files-to-read)
- [진입점 / API (API or Entry Points)](#진입점--api-api-or-entry-points)
- [빠른 시작 (Quickstart)](#빠른-시작-quickstart)
- [아키텍처 (Architecture)](#아키텍처-architecture)
- [설정 (Configuration)](#설정-configuration)
- [명령어 레퍼런스 (Commands Reference)](#명령어-레퍼런스-commands-reference)
- [로컬 개발 (Local Development)](#로컬-개발-local-development)
- [테스트 (Testing)](#테스트-testing)
- [기여 (Contributing)](#기여-contributing)
- [유지보수 / 연락처 (Maintainers)](#유지보수--연락처-maintainers)
- [추가 문서 (Further Documentation)](#추가-문서-further-documentation)
- [라이선스 (License)](#라이선스-license)

## 목적과 구성 (Purpose / Package Contents)

이 저장소는 단일 인물의 이력서, 포트폴리오, 그리고 잡 서치를 위한
운영 자동화를 한 곳에서 다루는 워크스페이스입니다. 세 가지 핵심 산출물이 있습니다.

| 산출물 | 위치 | 사용 대상 | 비고 |
| --- | --- | --- | --- |
| 공개 포트폴리오 사이트 | `apps/portfolio/` | 채용 담당자, 일반 방문자 | Cloudflare Worker, HTML/CSS/JS 번들 |
| 잡 자동화 런타임 (MCP) | `apps/job-server/` | 본인, 운영자 | Wanted/JobKorea 크롤러, 자동 지원 스크립트 |
| 운영 대시보드 | `apps/job-dashboard/` | 본인, 운영자 | Cloudflare Worker + D1 + Queue + Workflow |
| 회사별 지원 패키지 | `applications/` | 지원 회사 | 역할별 이력서 / 커버레터 / 면접 Q&A / 프리뷰 |
| PPTX 프로필 생성기 | `ta/` | 본인, 발표/미팅 | `python-pptx` 기반, verify 리포트 동봉 |
| 운영 도구 / 빌더 | `tools/scripts/`, `ta/` | 운영자 | Go 우선 빌드/검증, Python 보조 |

콘텐츠는 `packages/data/resumes/master/resume_data.json` 한 곳에서
관리되며, `sync:data` / `sync:pdf` / `sync:pptx`로 정적 자산과 동기화됩니다.

## 상태 (Status)

- 활성(Active) — 위의 빠른 상태 표 참조
- 공개 사이트: Cloudflare Worker Builds로 운영
- 잡 자동화 런타임: `Dockerfile` 멀티 스테이지 빌드 + `docker-compose.yml`의
  `mcp-server` 서비스로 self-host 가능
- 대시보드: `wrangler.jsonc` + D1 스키마(`apps/job-dashboard/schema.sql`),
  마이그레이션 3종 커밋
- TA 프로필: `ta/inspect.py` / `ta/improve_visual.py` / `ta/verify.py`
  스크립트와 `ta/output/verify_report_YYYYMMDD.txt` 결과물로 운영

## 먼저 읽을 파일 (First Files to Read)

| 우선순위 | 파일 | 이유 |
| --- | --- | --- |
| 1 | `package.json` | 워크스페이스 멤버와 `scripts` 허브 |
| 2 | `AGENTS.md` | 프로젝트 지식 베이스 (구조, 위치, 규칙) |
| 3 | `wrangler.jsonc` | Cloudflare Workers / D1 / 큐 설정 |
| 4 | `docker-compose.yml` | self-host 잡 자동화 런타임 |
| 5 | `apps/portfolio/entry.js` | 공개 포트폴리오 fetch 진입점 |
| 6 | `apps/job-dashboard/src/index.js` | 대시보드 fetch/queue/scheduled 오케스트레이션 |
| 7 | `apps/job-server/src/server/index.js` | 잡 자동화 서버 부트스트랩 |
| 8 | `packages/data/resumes/master/resume_data.json` | 콘텐츠 단일 출처 |
| 9 | `docs/conventions/architecture-rules.md` | 200-LOC 규칙 등 아키텍처 규약 |
| 10 | `ta/README` (없을 경우 `ta/inspect.py`) | PPTX 프로필 도구 사용법 |

## 진입점 / API (API or Entry Points)

### Worker 진입점 (엣지)

| 엔트리 | 핸들러 | 위치 |
| --- | --- | --- |
| `fetch` | `apps/portfolio/entry.js` | `apps/portfolio/` (포트폴리오 + 인프로세스 `/job/*`) |
| `fetch` | `apps/job-dashboard/src/index.js` | 대시보드 HTTP 핸들러 |
| `queue` | `apps/job-dashboard/src/index.js` | 비동기 잡 큐 |
| `scheduled` | `apps/job-dashboard/src/index.js` | 크론 트리거 오케스트레이션 |

### Node 진입점 (self-host)

| 엔트리 | 프레임워크 | 위치 |
| --- | --- | --- |
| `main()` | MCP 부트 | `apps/job-server/src/index.js` |
| 서버 부트 | Node/Fastify | `apps/job-server/src/server/index.js` |
| 헬스 체크 | HTTP | `GET /health` (컨테이너 healthcheck과 동일) |

### HTTP 표면 (요약)

| 경로 / 메서드 | 출처 | 비고 |
| --- | --- | --- |
| `GET /` (포트폴리오) | `apps/portfolio` | `worker.js`는 생성물, `entry.js`만 편집 |
| `GET /job/*` | `apps/portfolio` (인프로세스) | 대시보드 일부를 동일 Worker로 라우팅 |
| `GET /health` | `apps/job-server` | Docker healthcheck, 헬스체크 응답 |
| 대시보드 API | `apps/job-dashboard` | 상세: `apps/job-dashboard/API_REFERENCE.md` |

## 빠른 시작 (Quickstart)

### 사전 요구사항

- Node.js 22 (컨테이너 이미지와 동일)
- npm 워크스페이스 지원 (npm 10+)
- Cloudflare 계정 + `wrangler` (엣지 배포 시)
- Python 3 + `python-pptx` (TA 사용 시)
- Go 1.22+ (운영 스크립트 / PDF 생성 시)
- Docker / Docker Compose (self-host 잡 자동화 런타임)

### 1. 의존성 설치

```bash
npm ci
```

### 2. 콘텐츠 동기화 (선택)

```bash
npm run sync:data     # Node: resume_data.json → 정적 자산
npm run sync:pdf      # Go: PDF 마스터 생성
npm run sync:pptx     # Python: PPTX 생성
```

### 3. 포트폴리오 빌드 (로컬 미리보기)

```bash
npm --workspace apps/portfolio run dev
# 또는
npx wrangler dev --config apps/portfolio/wrangler.jsonc
```

### 4. 잡 자동화 런타임 (self-host)

```bash
docker compose up --build mcp-server
# http://127.0.0.1:3000/health 에서 헬스 체크
```

### 5. 대시보드 워커

```bash
npm --workspace apps/job-dashboard run dev
# 또는
npx wrangler dev --config apps/job-dashboard/wrangler.jsonc
```

## 아키텍처 (Architecture)

| 계층 | 책임 | 위치 |
| --- | --- | --- |
| 엣지 (공개) | 정적 포트폴리오 + 인프로세스 라우팅 | `apps/portfolio/` |
| 엣지 (운영) | 대시보드, 큐, 스케줄, D1 | `apps/job-dashboard/` |
| 런타임 (self-host) | MCP/잡 자동화, 크롤러, 자동 지원 | `apps/job-server/` |
| 도메인 콘텐츠 | 이력서/지원서 데이터 SSoT | `packages/data/` |
| 도메인 규약 | 타입, 스키마, OpenAPI, Worker env | `packages/types`, `packages/schemas`, `packages/contracts` |
| 공유 유틸 | 에러, 로거, 재시도, rate-limit, crypto, auth, clients | `packages/shared/` |
| 환경 검증 | 부트타임 env 검증 | `packages/env/` |
| 운영자 CLI | `resume` 운영 CLI | `packages/cli/` |
| 오프라인 도구 | PDF/PPTX 생성, 검증 | `ta/`, `tools/scripts/` |
| 회사별 패키지 | 역할별 지원 자산 | `applications/` |

### 요청 흐름 (요약)

1. 방문자가 `apps/portfolio`의 fetch 핸들러에 도달합니다.
2. 동일 Worker가 `/job/*` 경로를 인프로세스로 라우팅하여 대시보드 일부를 처리합니다.
3. 운영 대시보드의 쓰기/큐 작업은 `apps/job-dashboard`의 `queue` 핸들러로 전달됩니다.
4. `scheduled` 핸들러가 크론 작업을 트리거하고, 필요 시 `apps/job-server`의 MCP API를 호출합니다.
5. `apps/job-server`는 크롤러/자동 지원 스크립트를 실행하고 결과를 D1 / 파일 스토리지에 기록합니다.
6. 모든 결과는 대시보드의 `fetch` 핸들러를 통해 다시 표면화됩니다.

### 데이터 단일 출처 (SSoT)

| 원천 | 소비처 | 도구 |
| --- | --- | --- |
| `packages/data/resumes/master/resume_data.json` | 포트폴리오 HTML, PDF, PPTX, 지원서 | `sync:data`, `sync:pdf`, `sync:pptx` |
| `applications/<role>/` | 회사별 이력서/커버레터, 면접 Q&A | `applications/AGENTS.md` |

## 설정 (Configuration)

### 환경 변수 (요약)

| 이름 | 사용처 | 비고 |
| --- | --- | --- |
| `NODE_ENV` | 모든 Node 워크스페이스 | `production` 권장 (Dockerfile 기본값) |
| `PORT` | `apps/job-server` | Docker 기본 `3000` |
| Cloudflare Workers secrets | `apps/portfolio`, `apps/job-dashboard` | `wrangler secret put` 또는 CI에서 주입 |
| DB / D1 바인딩 | `apps/job-dashboard` | `wrangler.jsonc`에 선언 |
| 1Password | 운영자 도구 | `tools/scripts/onepassword/`, `op:run`, `op:seed:*` |

상세 비공개 시크릿 목록은 `apps/job-dashboard/SECRETS.md`와
`docs/security/`를 참조하세요.

### Wrangler 설정

- `wrangler.jsonc` (루트) — 기본 Cloudflare 컨텍스트
- 워크스페이스별 `wrangler.jsonc` — 각 Worker의 env / 바인딩 정의
- D1 마이그레이션: `apps/job-dashboard/schema.sql`,
  `apps/job-dashboard/migrations/0002_add_approval_metadata.sql`,
  `apps/job-dashboard/migrations/0003_add_auto_apply_application_metadata.sql`
- JSON → D1 백필: `apps/job-dashboard/migrate-json-to-d1.cjs`

## 명령어 레퍼런스 (Commands Reference)

루트 `package.json`의 `scripts`가 모든 워크스페이스의 단일 진입점입니다.

| 명령 | 목적 | 구현 언어 |
| --- | --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지 메타데이터 제거 | shell + exiftool |
| `npm run sync:data` | SSoT JSON → 정적 자산 | Node |
| `npm run sync:pptx` | Shinhan PPTX 생성 | Python |
| `npm run sync:pdf` | PDF 마스터 생성 | Go |
| `npm run sync:all` | data + pdf + pptx 일괄 | 복합 |
| `npm run op:run` | 1Password 런처 | Go |
| `npm run op:native:run` | 1Password 네이티브 | Go |
| `npm run op:seed:resume` | 이력서 시드 | Go |
| `npm run op:seed:sessions` | 세션 시드 | Go |
| `npm run op:restore:sessions` | 세션 복원 | Go |
| `npm run sync:proposals` | 제안 리뷰 동기화 | Node + Go |
| `npm run enrich:github` | GitHub enrichment | Go |
| `npm run enrich:skills` | 스킬 enrichment | Go |
| `npm run enrich:ai` | AI enrichment | Go |
| `npm run enrich:all` | 모든 enrichment | 복합 |
| `npm run automate:ssot` | SSoT 동기화 + 빌드 + 타입체크 + Node 테스트 | 복합 |
| `npm run automate:full` | 전체 자동화 파이프라인 | 복합 |
| `npm run build` | 워크스페이스 빌드 | Node |
| `npm run typecheck` | 타입 검사 | TypeScript |
| `npm run test:node` | Node 테스트 | Jest/Node |
| `npm run lint` | 린트 | ESLint |

> 일부 명령은 환경에 따라 `go` / `python3` / `exiftool` / `op` 바이너리가 필요합니다.
> 자세한 절차는 `tools/scripts/`의 각 자식 안내 문서를 참조하세요.

## 로컬 개발 (Local Development)

| 시나리오 | 절차 |
| --- | --- |
| 포트폴리오만 수정 | `apps/portfolio/`의 `entry.js` / `src/` / `lib/` 편집, `npm --workspace apps/portfolio run dev` |
| 콘텐츠만 수정 | `packages/data/resumes/master/resume_data.json` 편집 후 `npm run sync:data` |
| 대시보드 수정 | `apps/job-dashboard/` 편집 + `wrangler dev` + D1 마이그레이션 적용 |
| 잡 자동화 런타임 | `docker compose up --build mcp-server` (헬스: `GET /health`) |
| PPTX 프로필 | `python3 ta/inspect.py` → `python3 ta/improve_visual.py` → `python3 ta/verify.py` |
| 계약 갱신 | `packages/contracts/` (OpenAPI, Worker env) 변경 후 `npm run build` |
| 시크릿 | 1Password 도구 사용 — `tools/scripts/onepassword/` 안내 참조 |

### 워크스페이스 멤버 (참고)

`apps/portfolio`, `apps/job-server`, `apps/job-dashboard`,
`packages/cli`, `packages/data`, `packages/shared`, `packages/types`,
`packages/schemas`, `packages/contracts`, `packages/env`

> 워크스페이스 구조는 내부 구성상 다중 패키지를 가지지만, 사용자 면에서 이
> 저장소는 "포트폴리오 + 잡 자동화 + 대시보드 + TA"의 네 가지 산출물로
> 보는 것이 자연스럽습니다.

## 테스트 (Testing)

| 계층 | 도구 | 위치 |
| --- | --- | --- |
| Node 유닛/통합 | Jest (`jest.config.cjs`) | `tests/`, 워크스페이스 `__tests__` |
| 정적 분석 | TypeScript (`tsconfig.base.json`), ESLint (`eslint.config.cjs`) | 루트 |
| 엔드투엔드 | Playwright (`playwright.config.js`) | `tests/e2e` |
| OpenAPI 린트 | Redocly (`redocly.yaml`) | `packages/contracts/openapi` |
| 링크 검증 | `lychee.toml` | CI / docs |
| PPTX 검증 | `ta/verify.py` → `ta/output/verify_report_YYYYMMDD.txt` | `ta/` |

```bash
npm run typecheck
npm run lint
npm run test:node
# 워크스페이스 단위 실행
npm --workspace apps/job-server run test
```

## 기여 (Contributing)

기여 가이드는 [`CONTRIBUTING.md`](./CONTRIBUTING.md)를 참조하세요. 주요 원칙:

- 콘텐츠 단일 출처: `packages/data/resumes/master/resume_data.json` 외에
  본문에 해당하는 JSON을 두지 않습니다.
- 200-LOC 규칙: 모듈은 작게 유지하고, 규칙은 `docs/conventions/architecture-rules.md`를 따릅니다.
- 스크립트 언어 정책: 빌드/검증/동기화는 Go 우선, 보조 도구는 Python.
- 워커 진입점: `worker.js`는 생성물, `entry.js`만 직접 편집합니다.
- 보안: 시크릿은 절대 커밋하지 않으며, 1Password 도구 경로만 사용합니다.

변경 이력은 [`CHANGELOG.md`](./CHANGELOG.md)를, 작업 전 컨텍스트는
[`AGENTS.md`](./AGENTS.md)와 [`design-state.md`](./design-state.md)를
참조하세요.

## 유지보수 / 연락처 (Maintainers)

- 소유자 명단: [`OWNERS`](./OWNERS)
- 도메인별 안내: `apps/portfolio/OWNERS`, `apps/job-dashboard/OWNERS`,
  `applications/AGENTS.md`, `ta/AGENTS.md`, `apps/job-dashboard/AGENTS.md`
- 이슈/요청은 저장소 이슈 트래커 또는 운영자 연락 채널을 사용하세요.

## 추가 문서 (Further Documentation)

| 주제 | 위치 |
| --- | --- |
| 프로젝트 지식 베이스 | [`AGENTS.md`](./AGENTS.md) |
| 디자인 상태 | [`design-state.md`](./design-state.md) |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |
| 보안 운영 | `docs/security/`, `apps/job-dashboard/SECRETS.md` |
| 대시보드 API | `apps/job-dashboard/API_REFERENCE.md` |
| 대시보드 배포 | `apps/job-dashboard/DEPLOYMENT_GUIDE.md` |
| 대시보드 개발 | `apps/job-dashboard/DEVELOPMENT_GUIDE.md` |
| 대시보드 다이어그램 | `apps/job-dashboard/DIAGRAMS.md` |
| 회사별 지원 패키지 | `applications/<role>/application-guide.md`, `cover_letter.md` |
| 인프라 | `infrastructure/`, `docs/` |
| ADRs | `docs/adr/` (있는 경우) |

## 라이선스 (License)

개인 운영용 비공개 워크스페이스입니다. 외부 배포/재배포 정책은
[`LICENSE`](./LICENSE)를 참조하세요. 회사별 지원 패키지의
PDF/HTML은 해당 회사의 채용 검토 용도로만 사용됩니다.