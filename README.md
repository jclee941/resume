# Resume

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](./package.json)
![Node 22+](https://img.shields.io/badge/node-%E2%89%A522-339933.svg)
![Wrangler](https://img.shields.io/badge/deploy-wrangler-F38020.svg)
![Self-hosted MCP](https://img.shields.io/badge/self--hosted-mcp--server-1488C6.svg)
![License](./LICENSE)

> 이 저장소는 Cloudflare Worker 기반 이력 포트폴리오, Wanted/JobKorea 잡
> 자동화, 대시보드 API, SSoT 데이터를 한 워크스페이스에서 운영하는 개인용
> 자동화 워크스페이스입니다. 운영자는 [`OWNERS`](./OWNERS)에 기록된 한 명
> 이며, 동일 워크스페이스에서 포트폴리오 배포, 지원 자동화, 이력서·자소서
> 파생 산출물 재생성을 다룹니다.

> This repository is a single-tenant automation workspace that ships a
> Cloudflare Worker portfolio, Wanted/JobKorea job automation, a Worker-backed
> dashboard, and the resume Single Source of Truth (SSoT) data that feeds
> every generated artifact.

## 빠른 상태 / Quick Status

| 영역 | 상태 | 진입점 | 핵심 명령 | 비고 |
| --- | --- | --- | --- | --- |
| Portfolio (edge) | 운영 중 | `apps/portfolio/entry.js` | `wrangler deploy` | `worker.js`는 빌드 산출물 |
| Job automation | 운영 중 | `apps/job-server/src/index.js` | `node src/server/index.js` | MCP + Wanted/JobKorea 크롤러 |
| Dashboard | 운영 중 | `apps/job-dashboard/src/index.js` | `wrangler deploy` | fetch/queue/scheduled 오케스트레이션 |
| Resume SSoT | 운영 중 | `packages/data/resumes/master/resume_data.json` | `npm run sync:data` | 모든 파생물의 단일 권위 원본 |
| Self-hosted MCP | 운영 중 | `docker-compose.yml` | `docker compose up -d mcp-server` | `resume-mcp-server` 컨테이너 |
| TA PPTX | 보조 도구 | `ta/improve_visual.py` | `python3 ta/improve_visual.py` | 핵심 워크플로우와 분리 |

## 흐름 요약 / Compact Flow

1. `packages/data/resumes/master/resume_data.json` SSoT를 수정한다.
2. `npm run sync:data`로 JSON을 워크스페이스에 반영하고,
   `npm run sync:pdf`, `npm run sync:pptx`로 PDF/PPTX 파생 산출물을 만든다.
3. `apps/portfolio`가 SSoT와 HTML을 합쳐 `worker.js`를 생성한 뒤
   Cloudflare Worker에 배포한다.
4. `apps/job-server`의 MCP 서버가 Wanted/JobKorea 지원 흐름을 실행하고,
   결과를 `apps/job-dashboard`의 D1/Queue로 흘려보낸다.
5. 운영자는 `apps/job-dashboard` 대시보드와 self-hosted MCP 컨테이너로
   현황을 확인한다.

## 목차 / Table of Contents

- [목적 / Purpose](#목적--purpose)
- [저장소 구성 / Repository Layout](#저장소-구성--repository-layout)
- [상태 및 준비도 / Status & Readiness](#상태-및-준비도--status--readiness)
- [먼저 읽을 파일 / First Files to Read](#먼저-읽을-파일--first-files-to-read)
- [진입점 / Entry Points](#진입점--entry-points)
- [빠른 시작 / Quickstart](#빠른-시작--quickstart)
- [아키텍처 / Architecture](#아키텍처--architecture)
- [설정 / Configuration](#설정--configuration)
- [명령 레퍼런스 / Commands Reference](#명령-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [기여 / Contributing](#기여--contributing)
- [유지보수 / Maintainers](#유지보수--maintainers)
- [라이선스 / License](#라이선스--license)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)

## 목적 / Purpose

이 워크스페이스는 한 사람의 이력·포트폴리오·지원 활동을 자동화하기 위해
설계되었습니다. 핵심 가치는 다음 세 가지입니다.

- **단일 진실 공급원 (SSoT)**: `packages/data`의 JSON이 포트폴리오, PDF,
  PPTX, 지원용 이력서의 모든 필드를 정의합니다.
- **엣지 우선 배포**: Cloudflare Worker에서 포트폴리오와 대시보드 API를
  운영하고, self-hosted MCP 서버는 Docker Compose로 보완합니다.
- **지원 흐름 자동화**: Wanted/JobKorea 대상 크롤러와 MCP 도구로 반복적인
  지원 작업을 줄이고, 그 결과를 동일한 대시보드에서 관측합니다.

주 사용자는 워크스페이스 운영자 한 명이며, 외부 기여자는
[`CONTRIBUTING.md`](./CONTRIBUTING.md) 규칙에 따라 패치를 보낼 수 있습니다.

## 저장소 구성 / Repository Layout

루트의 실제 트리는 다음과 같습니다. `apps/`, `packages/`, `tools/`, `docs/`,
`tests/`, `infrastructure/`, `supabase/`, `third_party/` 같은 하위 디렉터리는
[`AGENTS.md`](./AGENTS.md)가 안내하지만 이 README는 루트와 실제로 존재하는
디렉터리만 기록합니다.

```text
./
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
├── LICENSE
├── OWNERS
├── ProfileView.jpg
├── README.md
├── design-state.md
├── docker-compose.yml
├── eslint.config.cjs
├── jest.config.cjs
├── lychee.toml
├── package.json
├── package-lock.json
├── playwright.config.js
├── redocly.yaml
├── tsconfig.base.json
├── tsconfig.json
├── wrangler.jsonc
├── applications/         # 역할별 지원 패키지 (PDF, 자소서, 실행 로그)
│   ├── airpremia-security-2026/
│   ├── cloudflare-one-se-2026/
│   ├── coupang-fintech-sre-2026/
│   ├── gitlab-apac-security-2026/
│   ├── infrastructure-architecture-2026/
│   ├── job-search-2026-07/
│   ├── openai-codex-korea-2026/
│   └── security-ir-2026/
├── apps/
│   └── job-dashboard/    # Cloudflare Worker 대시보드
│       ├── AGENTS.md
│       ├── API_REFERENCE.md
│       ├── DEPLOYMENT_GUIDE.md
│       ├── DEVELOPMENT_GUIDE.md
│       ├── DIAGRAMS.md
│       ├── OWNERS
│       ├── README.md
│       ├── SECRETS.md
│       ├── migrate-json-to-d1.cjs
│       ├── migration-data.sql
│       ├── package.json
│       ├── schema.sql
│       ├── tsconfig.json
│       ├── migrations/
│       └── src/
└── ta/                   # Python/PPTX TA 프로필 생성
    ├── AGENTS.md
    ├── improve_visual.py
    ├── inspect.py
    ├── verify.py
    └── output/
```

`apps/portfolio`, `apps/job-server`, `packages/*`는 npm 워크스페이스 멤버이며
`package.json`의 `workspaces` 필드가 경계의 권위입니다. 각 하위 패키지의
세부 구조는 [`AGENTS.md`](./AGENTS.md)와 그 패키지 내부의 가이드를 따릅니다.

## 상태 및 준비도 / Status & Readiness

- 본 워크스페이스는 운영자 1인 기준으로 운영 중이며, 외부 프로덕션 다중
  테넌트 사용을 보장하지 않습니다.
- Cloudflare Worker 쪽 배포는 [`wrangler.jsonc`](./wrangler.jsonc)와
  `apps/portfolio`의 빌드 산출물(`worker.js`)을 기준으로 합니다.
  `worker.js`는 직접 수정하지 마세요.
- Self-hosted MCP 서버는 [`docker-compose.yml`](./docker-compose.yml)로
  기동하며, `.env`로 비밀을 주입받습니다. 컨테이너는 `127.0.0.1:3000`
  헬스 체크로 상태를 보고합니다 (호스트 포트는 `3000:3000`).
- `ta/` 디렉터리의 PPTX 생성 스크립트는 보조 도구이며 핵심 워크플로우와
  분리되어 있습니다.

## 먼저 읽을 파일 / First Files to Read

운영자가 새 작업을 시작할 때 권장하는 읽기 순서입니다.

1. [`AGENTS.md`](./AGENTS.md) — 워크스페이스 규칙, 디렉터리 역할, 코드 맵.
2. [`package.json`](./package.json) — 루트 스크립트와 워크스페이스 멤버.
3. [`docker-compose.yml`](./docker-compose.yml) — self-hosted MCP 구성.
4. [`Dockerfile`](./Dockerfile) — 멀티 스테이지 빌드와 헬스 체크 정의.
5. [`wrangler.jsonc`](./wrangler.jsonc) — Cloudflare Worker 배포 설정.
6. [`applications/<role>-<year>/application-guide.md`](./applications/) —
   역할별 지원 절차와 산출물 위치.

## 진입점 / Entry Points

| 영역 | 파일/심볼 | 역할 |
| --- | --- | --- |
| Portfolio edge | `apps/portfolio/entry.js` (빌드 입력) | `worker.js`로 빌드되는 fetch 라우터 |
| Portfolio build | `apps/portfolio/generate-worker.js` | HTML/데이터/lib 합성 |
| Job server MCP | `apps/job-server/src/index.js` | MCP 부트스트랩 및 shutdown |
| Job server HTTP | `apps/job-server/src/server/index.js` | 대시보드/잡 자동화 HTTP 진입 |
| Dashboard Worker | `apps/job-dashboard/src/index.js` | fetch/queue/scheduled 핸들러 |
| Dashboard queue | `apps/job-dashboard/src/queue-consumer.js` | Cloudflare Queue 컨슈머 |
| Dashboard router | `apps/job-dashboard/src/router.js` | 경로 라우팅 |
| SSoT 데이터 | `packages/data/resumes/master/resume_data.json` | 모든 파생물의 권위 원본 |
| CLI | `packages/cli/` | 운영자용 CLI |
| 타입 | `packages/types/` | JSDoc/TS 도메인 타입 |
| 스키마 | `packages/schemas/` | Zod 런타임 검증 |
| 계약 | `packages/contracts/` | OpenAPI 및 Worker env 계약 |

## 빠른 시작 / Quickstart

사전 요구사항: Node.js 22+, npm 10+, Docker(옵션), Wrangler. `ta/`를 쓸
때는 Python 3이 추가로 필요합니다.

```bash
# 1) 워크스페이스 의존성 설치
npm install

# 2) SSoT 동기화 및 파생 산출물 생성
npm run sync:data
npm run sync:pdf
npm run sync:pptx

# 또는 한 번에
npm run sync:all

# 3) Cloudflare Worker(포트폴리오) 로컬 미리보기
cd apps/portfolio
npx wrangler dev

# 4) Self-hosted MCP 서버 기동 (선택)
docker compose up -d mcp-server
curl -s http://127.0.0.1:3000/health
```

운영자는 `127.0.0.1`의 헬스 체크 엔드포인트로 컨테이너 상태를 확인할 수
있습니다. 원격 호스트명이나 사설 IP는 본 README에서 다루지 않습니다.

## 아키텍처 / Architecture

### 컴포넌트 역할

| 컴포넌트 | 책임 | 위치 |
| --- | --- | --- |
| Portfolio Worker | 공개 포트폴리오 렌더링, SSoT 소비 | `apps/portfolio/` |
| Job Server | 잡 자동화, MCP 도구, HTTP API | `apps/job-server/` |
| Job Dashboard | 지원 현황 조회, 큐/스케줄 오케스트레이션 | `apps/job-dashboard/` |
| Self-hosted MCP | Docker 기반 잡 자동화 런타임 | `docker-compose.yml`, `Dockerfile` |
| SSoT 데이터 | 이력/포트폴리오 JSON 권위 원본 | `packages/data/` |
| 지원 패키지 | 역할별 이력서/자소서/실행 로그 | `applications/<role>-<year>/` |
| TA 보조 | PPTX 프로필 생성 보조 도구 | `ta/` |

### 요청 흐름(예: 지원 작업)

1. 운영자가 SSoT 또는 `applications/<role>-<year>/`의 자소서를 갱신한다.
2. `npm run sync:all`이 SSoT→PDF/PPTX 파생을 재생성한다.
3. `apps/job-server`의 MCP 도구가 Wanted/JobKorea 크롤러를 호출한다.
4. 결과는 `apps/job-dashboard`의 큐로 들어가고 D1/메타데이터가 갱신된다.
5. 대시보드 Worker가 결과를 렌더링해 운영자에게 보여준다.
6. 보조 흐름: `ta/`의 Python 스크립트가 동일 SSoT의 일부를 사용해 PPTX
   프로필을 만든다.

### 경계 규칙

- 루트 `package.json`의 `workspaces`가 패키지 경계의 권위입니다.
- `apps/portfolio/worker.js`는 빌드 산출물이므로 직접 편집하지 않습니다.
- 공유 코드는 `packages/shared`, `packages/schemas`, `packages/types`,
  `packages/contracts`, `packages/env`에 둡니다.
- 스크립트는 루트 정책상 Go가 우선이며, `ta/`는 Python 보조 도구입니다.

## 설정 / Configuration

| 파일 | 용도 | 비고 |
| --- | --- | --- |
| `package.json` | 워크스페이스 정의, 루트 스크립트 | 단일 권위 |
| `wrangler.jsonc` | Cloudflare Worker 배포 설정 | 포트폴리오/대시보드 |
| `docker-compose.yml` | self-hosted MCP 컨테이너 정의 | `mcp-server` 서비스 |
| `Dockerfile` | 멀티 스테이지 빌드 | `deps` → `runtime` |
| `tsconfig.base.json` | 공유 TypeScript 베이스 | 자식 `tsconfig.json`이 확장 |
| `eslint.config.cjs` | ESLint 평면 구성 | 워크스페이스 공통 |
| `jest.config.cjs` | Jest 구성 | `tests/` 자식 가이드 우선 |
| `playwright.config.js` | Playwright E2E 구성 | UI 흐름 검증 |
| `redocly.yaml` | OpenAPI 린트 | `packages/contracts/` |
| `lychee.toml` | 링크 검사 | CI 보조 |
| `.env` | 런타임 비밀 | 커밋 금지, 1Password 사용 |

비밀은 1Password CLI 경유로 주입되며, 자세한 절차는
[`AGENTS.md`](./AGENTS.md)와 `docs/security/`를 따릅니다.

## 명령 레퍼런스 / Commands Reference

루트 [`package.json`](./package.json)이 노출하는 주요 스크립트는 다음과
같습니다. 전체 목록은 `npm run`으로 확인하세요.

| 명령 | 용도 |
| --- | --- |
| `npm run sync:data` | SSoT JSON을 워크스페이스 전반에 반영 |
| `npm run sync:pdf` | PDF 파생 산출물 생성 |
| `npm run sync:pptx` | PPTX 파생 산출물 생성 |
| `npm run sync:all` | 위 세 단계를 순차 실행 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + 노드 테스트 |
| `npm run automate:full` | 동기화 + 린트 등 전체 자동화 체인 |
| `npm run op:run` | 1Password 래퍼 실행 |
| `npm run op:native:run` | 1Password 네이티브 실행 |
| `npm run op:seed:resume` | 이력서용 1Password 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run sync:proposals` | 제안 동기화 + 적용 |
| `npm run enrich:github` | GitHub 프로필 enrich |
| `npm run enrich:skills` | 스킬 enrich |
| `npm run enrich:ai` | AI 필드 enrich |
| `npm run enrich:all` | enrich 체인 전체 실행 |
| `npm run strip-exif` | 이미지 EXIF 제거 |

Docker 운영은 다음을 사용합니다.

```bash
docker compose up -d mcp-server
docker compose logs -f mcp-server
docker compose down
```

## 로컬 개발 / Local Development

- Node 22+, npm 10+ 환경을 권장합니다.
- 워크스페이스 전체 의존성은 `npm install` 한 번으로 설치됩니다.
- 포트폴리오 로컬 미리보기는 `apps/portfolio/`에서 `npx wrangler dev`로
  기동합니다.
- 잡 자동화 로컬 실행은 `apps/job-server/`의 `node src/index.js` 또는
  `node src/server/index.js`를 사용합니다.
- 대시보드 로컬 미리보기는 `apps/job-dashboard/`의 `npx wrangler dev`로
  기동합니다.
- 1Password 시드가 필요한 작업은 `npm run op:seed:resume` 또는
  `npm run op:seed:sessions`를 먼저 실행하세요.
- 공유 규칙(200 LOC 제한, 명명 규칙, 스크립트 언어 정책)은
  [`AGENTS.md`](./AGENTS.md)와 `docs/conventions/architecture-rules.md`를
  따릅니다.

## 테스트 / Testing

- 단위/통합 테스트: `npm test` ([`jest.config.cjs`](./jest.config.cjs) 기준).
- 노드 전용 테스트: `npm run test:node`.
- E2E 테스트: `npm run test:e2e`
  ([`playwright.config.js`](./playwright.config.js)).
- OpenAPI 린트: `npx redocly lint` ([`redocly.yaml`](./redocly.yaml) 기준).
- 링크 검사: `npx lychee` ([`lychee.toml`](./lychee.toml) 기준).
- 회귀 검증 후 PR 전 다음 시퀀스를 권장합니다.

  ```bash
  npm run sync:all
  npm run lint
  npm run typecheck
  npm test
  ```

## 기여 / Contributing

- 본 워크스페이스는 단일 운영자 중심으로 운영되며, 외부 기여 절차는
  [`CONTRIBUTING.md`](./CONTRIBUTING.md)를 따릅니다.
- 변경 전 [`AGENTS.md`](./AGENTS.md)의 "WHERE TO LOOK" 표에서 영향
  영역을 확인하세요.
- 커밋 메시지와 PR 제목은 저장소 기존 컨벤션을 따릅니다.
- 비밀, 토큰, 세션 파일은 커밋하지 마세요. 1Password CLI 경유로만
  주입합니다.

## 유지보수 / Maintainers

- 책임 유지보수: [`OWNERS`](./OWNERS) 파일에 기록된 인원.
- 인시던트 연락처: 저장소 운영 정책에 따라 GitHub Issues를 기본 채널로
  사용합니다. 외부 보안 이슈는 비공개 채널을 우선합니다.
- 디자인 결정 기록: [`design-state.md`](./design-state.md),
  [`CHANGELOG.md`](./CHANGELOG.md).

## 라이선스 / License

[`LICENSE`](./LICENSE) 파일에 명시된 라이선스를 따릅니다. 외부 배포 또는
재사용 전 라이선스 전문을 확인하세요.

## 추가 문서 / Further Documentation

- [`AGENTS.md`](./AGENTS.md) — 워크스페이스 규칙, 디렉터리 역할, 코드 맵.
- [`CHANGELOG.md`](./CHANGELOG.md) — 릴리스 노트.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — 기여 절차.
- [`design-state.md`](./design-state.md) — 디자인/아키텍처 상태 메모.
- [`applications/`](./applications/) — 역할별 지원 패키지 모음.
- [`apps/job-dashboard/AGENTS.md`](apps/job-dashboard/AGENTS.md) —
  대시보드 패키지 규칙.
- [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md)
  — 대시보드 API 명세.
- [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md)
  — 대시보드 개발 가이드.
- [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md)
  — 대시보드 배포 가이드.
- [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) —
  대시보드 비밀 정책.
- [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) —
  대시보드 상세 다이어그램.
- [`ta/AGENTS.md`](ta/AGENTS.md) — TA 보조 도구 규칙.