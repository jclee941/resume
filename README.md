# 이재철 포트폴리오 & 잡 어플리케이션 자동화 워크스페이스

> Resume & Portfolio Automation Workspace — Cloudflare Worker 기반 포트폴리오, 잡 자동화 런타임, SSoT 콘텐츠, 그리고 자기-호스팅 옵저버빌리티를 한 워크스페이스에서 운영하기 위한 개인 작업 공간입니다.

![Version](https://img.shields.io/badge/version-1.40.11-blue)
![Node](https://img.shields.io/badge/node-22-green)
![Cloudflare Workers](https://img.shields.io/badge/edge-Cloudflare%20Workers-orange)
![Private](https://img.shields.io/badge/private-yes-lightgrey)
![Status](https://img.shields.io/badge/status-active-success)

## 한눈에 보기 (Korean Summary)

이 저장소는 다음 네 가지 사용 사례를 한 워크스페이스에서 묶어 둡니다.

- **공개 포트폴리오**: Cloudflare Worker(`apps/portfolio/`)로 정적·동적 페이지를 엣지에서 서빙
- **잡 자동화**: `apps/job-server/` 의 MCP 런타임 + Wanted/JobKorea 크롤러·자동 지원 스크립트
- **대시보드/API**: `apps/job-dashboard/` 의 Worker(fetch/queue/scheduled) + SQLite/D1 마이그레이션
- **콘텐츠 SSoT**: `packages/data/resumes/master/resume_data.json` 을 단일 진실 공급원으로 PDF/PPTX/HTML 동기화

`ta/` 폴더는 Python 기반의 자기소개서용 PPTX 생성 스크립트를, `applications/` 는 기업별(에어프레미아·쿠팡·클라우드플레어·GitLab·OpenAI 등) 지원 패키지를 보관합니다.

## Quick-Glance Status

| 영역 | 위치 | 상태 | 다음 명령 |
| --- | --- | --- | --- |
| Edge 포트폴리오 | `apps/portfolio/` | 활성 (Cloudflare Worker) | `wrangler deploy` |
| 잡 자동화 런타임 | `apps/job-server/` | 활성 (Docker) | `docker compose up -d mcp-server` |
| 대시보드 API | `apps/job-dashboard/` | 활성 (Worker + Queue) | `npm run -w apps/job-dashboard deploy` |
| 콘텐츠 동기화 | `packages/data/` | SSoT | `npm run automate:ssot` |
| TA 프로필 PPTX | `ta/` | 보조 도구 | `python3 ta/improve_visual.py` |

## 운영 흐름 (Compact Flow)

1. `packages/data/resumes/master/resume_data.json` 을 단일 진실 공급원으로 편집
2. `npm run automate:ssot` 으로 데이터 → PDF → PPTX → 빌드 → 타입체크 → 테스트를 한 번에 동기화
3. 포트폴리오와 대시보드는 각각 Cloudflare Worker 로 배포 (`wrangler deploy`)
4. 잡 자동화 런타임은 Docker Compose 로 띄우고 MCP 엔드포인트(`http://<host>:3000`)에서 호출
5. 지원 결과·히스토리는 `applications/<역할>/` 의 런 로그·점수표로 누적

## 목차 (Table of Contents)

- [Purpose / Package Contents](#purpose--package-contents)
- [Status](#status)
- [First Files to Read](#first-files-to-read)
- [API or Entry Points](#api-or-entry-entries)
- [Quickstart / Usage](#quickstart--usage)
- [Maintainers / Points of Contact](#maintainers--points-of-contact)
- [Further Documentation](#further-documentation)

---

## Purpose / Package Contents

이 워크스페이스는 개인 포트폴리오와 잡 서치 활동을 코드와 데이터로 한 곳에 통합하기 위한 공간입니다. 다음과 같이 구성됩니다.

- **`apps/portfolio/`** — Cloudflare Worker 로 배포되는 공개 포트폴리오. HTML/data/lib 모듈을 `worker.js` 로 빌드 (`generate-worker.js`).
- **`apps/job-server/`** — Node/Fastify 기반 잡 자동화 MCP 런타임. Wanted/JobKorea 크롤러, 자동 지원, 동기화 스크립트.
- **`apps/job-dashboard/`** — 대시보드 Worker. fetch/queue/scheduled 핸들러, D1 마이그레이션, 워크플로, 인증 미들웨어.
- **`packages/data/`** — 이력서·지원서 콘텐츠의 단일 진실 공급원(SSoT).
- **`packages/{shared,schemas,types,contracts,cli,env}/`** — 공유 유틸, Zod 스키마, JSDoc/TS 타입, OpenAPI 계약, 운영 CLI, 런타임 환경 검증.
- **`applications/`** — 기업별 지원 패키지 (PDF 이력서, 자기소개서, 가이드, 점수표, 면접 Q&A).
- **`ta/`** — Python 기반 PPTX 프로필 생성 보조 도구.
- **`tools/`** — Go-first 빌드·동기화·배포·검증 스크립트.
- **`infrastructure/`, `docs/`, `supabase/functions/`** — 인프라 정의, ADRs, 컨벤션, Deno 엣지 함수.

## Status

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 버전 | `1.40.11` | 루트 `package.json` |
| 라이선스 | 저장소 `LICENSE` 참조 | 사적 워크스페이스 (`"private": true`) |
| 프로덕션 준비 | 활성 운영 중 | 포트폴리오·대시보드 Cloudflare 배포 |
| 자동화 | 동기화/검증 자동화 존재 | `npm run automate:*` 시리즈 |
| 지원 중단 여부 | 해당 없음 | 지속 업데이트 |

## First Files to Read

운영자 또는 신규 기여자가 가장 먼저 읽어야 할 파일입니다.

- `AGENTS.md` — 프로젝트 지식 베이스 (구조, 심볼 맵, 작업 위치)
- `package.json` — 루트 스크립트 허브와 워크스페이스 정의
- `apps/job-dashboard/README.md` — 대시보드 로컬 개발·배포 진입점
- `apps/job-dashboard/API_REFERENCE.md` — 대시보드 API 명세
- `apps/job-dashboard/DEPLOYMENT_GUIDE.md` — Cloudflare 배포 절차
- `packages/data/resumes/master/resume_data.json` — 콘텐츠 SSoT
- `applications/job-search-2026-07/README.md` — 잡 서치 운영 플레이북

## API or Entry Points

| 진입점 | 위치 | 설명 |
| --- | --- | --- |
| 포트폴리오 Worker fetch | `apps/portfolio/entry.js` | 공개 사이트 + 인-프로세스 `/job/*` 라우터 |
| 워커 빌드 생성기 | `apps/portfolio/generate-worker.js` | HTML/data/lib → `worker.js` |
| 잡-서버 MCP 부트스트랩 | `apps/job-server/src/index.js` | 프로세스 진입·셧다운 |
| 잡-서버 Fastify 부트스트랩 | `apps/job-server/src/server/index.js` | HTTP/MCP 엔드포인트 |
| 대시보드 Worker 핸들러 | `apps/job-dashboard/src/index.js` | fetch / queue / scheduled 오케스트레이션 |
| 대시보드 라우터 | `apps/job-dashboard/src/router.js` | URL 라우팅 |
| 큐 컨슈머 | `apps/job-dashboard/src/queue-consumer.js` | 비동기 잡 처리 |
| 헬스체크 | `GET /health` (포트폴리오/잡-서버) | 컨테이너 헬스체크에서도 호출 |

## Quickstart / Usage

### 사전 요구 사항

- Node.js 22+ 및 npm 10+
- Docker / Docker Compose (잡-서버 컨테이너 실행 시)
- Python 3 (TA PPTX 생성 시)
- Go 1.22+ (운영 스크립트 실행 시)
- Cloudflare 계정 + Wrangler (`apps/portfolio/`, `apps/job-dashboard/` 배포 시)

### 로컬 설치

```bash
npm ci
```

### 콘텐츠 동기화 + 검증

```bash
npm run automate:ssot
```

데이터 → PDF → PPTX → 빌드 → 타입체크 → Node 테스트를 순차 실행합니다.

### 포트폴리오 로컬 개발

```bash
cd apps/portfolio
npx wrangler dev
```

### 대시보드 로컬 개발

```bash
cd apps/job-dashboard
npm install
npx wrangler dev
```

자세한 절차는 [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) 참조.

### 잡-서버 컨테이너 기동

```bash
docker compose up -d mcp-server
```

`http://<host>:3000/health` 로 헬스체크합니다. 호스트·포트 바인딩은 `docker-compose.yml` 의 `ports` 항목에서 조정합니다.

### 주요 npm 스크립트

| 스크립트 | 용도 |
| --- | --- |
| `npm run sync:data` | SSoT JSON 데이터 동기화 |
| `npm run sync:pdf` | Go 기반 PDF 생성 |
| `npm run sync:pptx` | PPTX 생성 |
| `npm run sync:all` | data + pdf + pptx 일괄 동기화 |
| `npm run automate:ssot` | 동기화 + 빌드 + 타입체크 + 테스트 |
| `npm run op:run` | 1Password 기반 자격증명 주입 |
| `npm run enrich:all` | GitHub/Skills/AI 메타데이터 enrichment |

전체 스크립트 목록은 루트 `package.json` 참조.

### 환경 변수 / 시크릿

런타임 환경 검증 패키지(`packages/env/`)와 1Password 통합(`tools/scripts/onepassword/`)을 통해 시크릿을 주입합니다. 로컬 시크릿 관리 절차는 [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) 와 `tools/scripts/onepassword/` 하위 가이드를 참조하세요. 저장소에는 실제 시크릿을 커밋하지 마세요.

## Architecture

워크스페이스는 “콘텐츠 SSoT → 빌드/동기화 → 엣지 배포/컨테이너 실행 → 지원 운영”의 단방향 흐름을 따릅니다.

| 계층 | 역할 | 산출물 |
| --- | --- | --- |
| 콘텐츠 | `packages/data/resumes/master/resume_data.json` | 단일 JSON SSoT |
| 빌드 | `tools/scripts/` (Go) + `apps/portfolio/generate-worker.js` | PDF, PPTX, `worker.js` |
| 검증 | `packages/schemas/` (Zod), `packages/types/`, `packages/contracts/` (OpenAPI) | 스키마·타입·계약 |
| 엣지 | `apps/portfolio/`, `apps/job-dashboard/` | Cloudflare Workers |
| 런타임 | `apps/job-server/` (Docker), `supabase/functions/` (Deno) | MCP/Edge 함수 |
| 운영 | `applications/`, `ta/` | 지원 패키지·TA 산출물 |

세부 아키텍처 규칙과 ADR은 `docs/conventions/architecture-rules.md` 및 `docs/architecture/` 에 정리되어 있습니다. 자세한 다이어그램은 각 앱의 `DIAGRAMS.md` 를 참조하세요.

## Configuration

| 영역 | 설정 위치 | 비고 |
| --- | --- | --- |
| 루트 워크스페이스 | `package.json` (`workspaces`) | npm workspaces |
| TypeScript 베이스 | `tsconfig.base.json`, `tsconfig.json` | 패키지별 `tsconfig.json` |
| ESLint | `eslint.config.cjs` | 평면 설정 |
| Jest | `jest.config.cjs` | 루트 테스트 설정 |
| Playwright | `playwright.config.js` | E2E 설정 |
| Wrangler (포트폴리오) | `wrangler.jsonc` | 엣지 배포 |
| Redocly | `redocly.yaml` | OpenAPI 린트 |
| Lychee 링크 검사 | `lychee.toml` | 문서/링크 검사 |
| Docker | `Dockerfile`, `docker-compose.yml` | 멀티 스테이지, 잡-서버 런타임 |

## Commands Reference

요약은 [Quickstart / Usage](#quickstart--usage) 의 표 참조. 전체 명령은 루트 `package.json` 의 `scripts` 섹션이 단일 진실 공급원입니다.

## Local Development

- 워크스페이스 의존성은 루트 `npm ci` 한 번으로 설치됩니다.
- 패키지 로컬 가이드는 `apps/*/AGENTS.md`, `packages/*/AGENTS.md`(존재 시) 를 우선하세요.
- 워커 로컬 실행은 `wrangler dev`, 노드 런타임 로컬 실행은 `node apps/job-server/src/server/index.js` 입니다.
- 변경 전후에는 `npm run lint`, `npm run typecheck`, `npm run test:node` 를 실행하세요.

## Testing

| 레이어 | 도구 | 위치 |
| --- | --- | --- |
| 단위/통합 (Node) | Jest | `jest.config.cjs`, `tests/` |
| E2E | Playwright | `playwright.config.js` |
| 링크/Docs | Lychee | `lychee.toml` |
| OpenAPI | Redocly | `redocly.yaml` |

## Maintainers / Points of Contact

- 저장소 소유자: `OWNERS` 파일 참조
- 이슈·기여 절차: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- 변경 이력: [`CHANGELOG.md`](CHANGELOG.md)
- 프로젝트 지식 베이스: [`AGENTS.md`](AGENTS.md)
- 디자인 결정 컨텍스트: [`design-state.md`](design-state.md)

## Further Documentation

| 문서 | 위치 |
| --- | --- |
| 대시보드 API 레퍼런스 | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 대시보드 배포 가이드 | [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 개발 가이드 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 대시보드 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| 대시보드 시크릿 관리 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 잡 서치 운영 플레이북 | [`applications/job-search-2026-07/README.md`](applications/job-search-2026-07/README.md) |
| 지원 점수표 | [`applications/job-search-2026-07/application-scorecard.md`](applications/job-search-2026-07/application-scorecard.md) |
| 다음 액션 | [`applications/job-search-2026-07/next-actions.md`](applications/job-search-2026-07/next-actions.md) |
| 면접 답변 | [`applications/job-search-2026-07/interview-answers.md`](applications/job-search-2026-07/interview-answers.md) |
| 아웃리치 템플릿 | [`applications/job-search-2026-07/outreach-templates.md`](applications/job-search-2026-07/outreach-templates.md) |
| 프로필 카피 | [`applications/job-search-2026-07/profile-copy.md`](applications/job-search-2026-07/profile-copy.md) |
| 에어프레미아 지원 가이드 | [`applications/airpremia-security-2026/application-guide.md`](applications/airpremia-security-2026/application-guide.md) |
| 에어프레미아 자기소개서 | [`applications/airpremia-security-2026/cover_letter.md`](applications/airpremia-security-2026/cover_letter.md) |
| 홈랩 인프라 아키텍처 | [`applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md`](applications/infrastructure-architecture-2026/homelab-infrastructure-architecture.md) |
| 쿠팡 자기소개서 | [`applications/coupang-fintech-sre-2026/cover_letter.md`](applications/coupang-fintech-sre-2026/cover_letter.md) |
| 클라우드플레어 지원 가이드 | [`applications/cloudflare-one-se-2026/greenhouse-application-guide.md`](applications/cloudflare-one-se-2026/greenhouse-application-guide.md) |
| 클라우드플레어 면접 Q&A | [`applications/cloudflare-one-se-2026/interview-qa-10.md`](applications/cloudflare-one-se-2026/interview-qa-10.md) |
| 클라우드플레어 LinkedIn 최적화 | [`applications/cloudflare-one-se-2026/linkedin-profile-optimization.md`](applications/cloudflare-one-se-2026/linkedin-profile-optimization.md) |
| OpenAI 지원 가이드 | [`applications/openai-codex-korea-2026/application-guide.md`](applications/openai-codex-korea-2026/application-guide.md) |
| OpenAI 자기소개서 | [`applications/openai-codex-korea-2026/cover_letter.md`](applications/openai-codex-korea-2026/cover_letter.md) |
| GitLab 자기소개서 | [`applications/gitlab-apac-security-2026/cover_letter.md`](applications/gitlab-apac-security-2026/cover_letter.md) |

> 권한·시크릿·런타임 상태 등 운영자용 옵저버빌리티는 각 패키지의 README 와 `apps/job-dashboard/` 하위 문서가 단일 진실 공급원입니다. 본 README 는 워크스페이스 전체의 첫 진입점 역할을 하므로, 세부 운영 수치는 반드시 위 문서들과 `package.json` 스크립트로 다시 확인하세요.