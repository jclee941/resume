# 포트폴리오 자동화 워크스페이스 / Portfolio Automation Workspace

[![Version](https://img.shields.io/badge/version-1.40.11-blue.svg)](package.json)
[![Node 22](https://img.shields.io/badge/node-22-green.svg)](Dockerfile)
[![Docker Compose](https://img.shields.io/badge/docker-compose-blue.svg)](docker-compose.yml)
[![Cloudflare Worker](https://img.shields.io/badge/cloudflare-worker-orange.svg)](wrangler.jsonc)
[![TypeScript strict](https://img.shields.io/badge/typescript-strict-blue.svg)](tsconfig.base.json)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](LICENSE)

| 항목 / Item | 값 / Value |
| --- | --- |
| 제품 / Product | 개인 포트폴리오 + 채용 자동화 워크스페이스 |
| 버전 / Version | `1.40.11` ([`package.json`](package.json)) |
| 노드 런타임 / Runtime | Node 22 (Alpine) |
| 컨테이너 / Container | `Dockerfile` · `docker-compose.yml` (`mcp-server`) |
| 엣지 배포 / Edge | Cloudflare Workers (`wrangler.jsonc`) |
| 라이선스 / License | Private / Proprietary ([`LICENSE`](LICENSE)) |
| 상태 / Status | 사설 운영 중 · `private: true` |

---

## 요약 / Summary

이 저장소는 개인 포트폴리오 사이트, 채용 자동화 워크플로, 단일 진실 공급원(SSoT) 데이터 레이어, 운영 대시보드를 하나의 버전 관리 워크스페이스로 통합한 사설 자동화 환경입니다. Cloudflare Workers 기반의 공개 사이트와 Wanted/JobKorea 자동화 런타임을 동시에 운영하며, 모든 산출물(이력서 PDF, PT, 지원 패키지)은 `packages/data`의 단일 데이터 정의에서 자동 생성됩니다.

This repository is a private automation workspace that unifies a personal portfolio site, job-automation tooling, a Single Source of Truth (SSoT) data layer, and an operations dashboard under a single, versioned codebase. The public edge site and the Wanted/JobKorea automation runtime are co-located, and every downstream artifact (resume PDF, slides, application packet) is generated from the authoritative data in `packages/data`.

---

## 1. 제품 목적 / Purpose

| 목표 / Goal | 구현 위치 / Where it lives |
| --- | --- |
| 한 곳에서 정의된 이력/프로필 데이터로 모든 산출물 자동 생성 | [`packages/data/`](packages/data/) |
| Cloudflare 엣지에 호스팅되는 공개 포트폴리오 | [`apps/portfolio/`](apps/portfolio/) |
| 채용 플랫폼 자동화(MCP, 크롤러, auto-apply) | [`apps/job-server/`](apps/job-server/) |
| 운영 대시보드 + 큐/스케줄 워크플로 | [`apps/job-dashboard/`](apps/job-dashboard/) |
| 직무별 지원 패키지(PDF, 표지, 커버레터) | [`applications/`](applications/) |
| Slack/Notion/1Password/observability 운영 스크립트 | [`tools/scripts/`](tools/) |

---

## 2. 워크스페이스 구성 / Package Contents

| 경로 / Path | 종류 / Type | 역할 / Role |
| --- | --- | --- |
| `apps/portfolio/` | Cloudflare Worker | 공개 포트폴리오 사이트의 빌드 산출물과 엔트리 |
| `apps/job-server/` | Node/Fastify | MCP 서버, 크롤러, 자동 지원 스크립트, 세션/데이터 저장 |
| `apps/job-dashboard/` | Cloudflare Worker | 대시보드 라우팅, 큐 컨슈머, 스케줄 핸들러, 워크플로 |
| `packages/cli/` | Node CLI | 운영자용 CLI (`resume` operator) |
| `packages/data/` | SSoT 데이터 | `resumes/master/resume_data.json` 등 권위 데이터 |
| `packages/env/` | 검증 | 런타임 환경 변수 검증(zod 기반) |
| `packages/shared/` | 공용 라이브러리 | 에러, 로거, retry, crypto, rate-limit, auth, 클라이언트 |
| `packages/types/` | JSDoc/TS 타입 | 도메인 타입 단일 정의 |
| `packages/schemas/` | Zod 스키마 | 런타임 검증 스키마 |
| `packages/contracts/` | 계약 정의 | OpenAPI, Worker env 계약 |
| `applications/` | 산출물 묶음 | 직무별 이력서 PDF, 커버레터, 프리뷰 |
| `tools/scripts/` | 운영 스크립트 | 빌드, 동기화, 1Password, enrichment, 검증 |
| `tests/` | 테스트 | Jest, Node, Playwright 스위트 |
| `docs/` | 문서 | ADRs, 아키텍처 규칙, 보안 가이드 |
| `ta/` | PT 생성 | Python/PPTX TA 프로필 생성 파이프라인 |

상세 구조는 [`AGENTS.md`](AGENTS.md) 및 각 하위 패키지의 로컬 안내를 따릅니다.

---

## 3. 상태 / Status

| 영역 / Area | 상태 / Status | 비고 / Notes |
| --- | --- | --- |
| 운영 / Production | 활성 (사설) | Cloudflare Workers 배포, Fastify 런타임 동시 운영 |
| 공개 사이트 | 활성 | `apps/portfolio` Worker |
| 자동화 스크립트 | 활성 | `apps/job-server` |
| 신규 기여 | 제한적 | 사설 저장소, 외부 PR 비공개 |
| 안정성 표지 | 자체 검증 | `tools/scripts`에 검증/동기화 명령 포함 |

> 본 저장소는 사설 작업물이며 안정성 보장은 제공되지 않습니다. 운영 중 장애는 [`OWNERS`](OWNERS) 문서의 담당자에게 보고해 주세요.

---

## 4. 첫 번째로 읽을 파일 / First Files to Read

1. [`package.json`](package.json) — 워크스페이스 정의와 명령어 허브.
2. [`AGENTS.md`](AGENTS.md) — 저장소 탐색 맵과 코드 위치 가이드.
3. [`apps/portfolio/entry.js`](apps/portfolio/entry.js) — 엣지 라우터의 진실 공급원. `worker.js`는 빌드 산출물이므로 직접 수정하지 않습니다.
4. [`packages/data/resumes/master/resume_data.json`](packages/data/) — 이력/스킬의 권위 정의(SSOT).
5. [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md) — 200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책.
6. [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md) 및 [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) — 대시보드 운영 가이드.

---

## 5. 아키텍처 / Architecture

### 5.1 상위 흐름

| 단계 / Step | 설명 / Description |
| --- | --- |
| 1 | `packages/data`의 JSON/SSOT 변경이 [`sync:data`](package.json), [`sync:pdf`](package.json), [`sync:pptx`](package.json) 트리거 |
| 2 | 데이터가 포트폴리오 HTML/PDF/PPTX로 변환되어 각 산출물에 반영 |
| 3 | `apps/portfolio`의 빌드 산출물(`worker.js`)이 Cloudflare Worker에 배포 |
| 4 | `apps/job-server`가 MCP/크롤러/auto-apply 스크립트를 수행하고 큐 이벤트 발행 |
| 5 | `apps/job-dashboard`의 Worker(`fetch`/`queue`/`scheduled`)가 이벤트를 받아 대시보드/웹훅 처리 |
| 6 | 운영 스크립트(`tools/scripts`)가 1Password·Notion·Slack·observability 갱신 |

### 5.2 런타임 컴포넌트

| 컴포넌트 / Component | 책임 / Responsibility | 비고 / Notes |
| --- | --- | --- |
| 공개 포트폴리오 | Cloudflare Workers, 정적/SSR 라우팅 | `apps/portfolio/entry.js`가 단일 페치 라우터 |
| Fastify MCP 런타임 | 로컬/컨테이너 기반 잡 자동화 | Dockerfile 2-스테이지 빌드, Node 22-alpine |
| 대시보드 Worker | 요청 라우팅 + 큐 컨슈머 + 스케줄 | `apps/job-dashboard/src/{index,router,queue-consumer}.js` |
| 데이터 SSoT | JSON 권위 데이터 + zod 검증 | `packages/data` |
| 계약 레이어 | OpenAPI, Worker env 계약 | `packages/contracts` |
| 공용 라이브러리 | crypto, retry, auth 등 | `packages/shared` |

### 5.3 컨테이너

`docker-compose.yml`은 `resume-mcp-server` 한 개 서비스를 정의합니다.

| 항목 / Item | 값 / Value |
| --- | --- |
| 이미지 / Image | `Dockerfile` (multi-stage, node:22-alpine) |
| 포트 / Port | 호스트 : 컨테이너 `3000 : 3000` (`<placeholder>`) |
| 환경 / Env | `.env` + `NODE_ENV=production`, `PORT=3000` |
| 볼륨 / Volume | `job_automation_data:/app/apps/job-server/.data` |
| 헬스 체크 / Health | `http://127.0.0.1:3000/health` 30s 주기 |
| 재시작 정책 / Restart | `unless-stopped` |

로컬에서 노출 포트와 데이터 경로는 실제 호스트 환경에 맞춰 변경합니다. 사설 IP는 의도적으로 노출하지 않습니다.

---

## 6. API 및 엔트리 포인트 / API & Entry Points

| 종류 / Kind | 위치 / Location | 기본 경로 / Default path |
| --- | --- | --- |
| Worker fetch | `apps/portfolio/entry.js` | `/`, `/job/*` (in-process) |
| Worker fetch/queue/scheduled | `apps/job-dashboard/src/index.js` | 대시보드 라우터 |
| Fastify HTTP | `apps/job-server/src/server/index.js` | `/health`, MCP 엔드포인트 |
| CLI | `packages/cli/` | `resume …` |
| CLI 보조 | `tools/scripts/onepassword/` | 1Password 시드/복원 |

상세 시그니처는 [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md), [`packages/contracts/`](packages/contracts/), [`redocly.yaml`](redocly.yaml)을 참고합니다.

---

## 7. 빠른 시작 / Quick Start

요구 사항:

| 도구 / Tool | 권장 버전 / Version |
| --- | --- |
| Node.js | 22 이상 |
| npm | workspaces 활성화 |
| Docker / Compose | 선택(컨테이너 런타임 사용 시) |
| Go | 운영 스크립트 실행 시 (enrichment/sync/pdf) |
| Python 3 | `ta/` 패키지 사용 시 |

로컬 설치:

```bash
git clone <repository-url>
cd <repo>
npm ci
npm run sync:data
npm run sync:all
```

Dev 서버(예시):

```bash
# 포트폴리오 빌드 + 로컬 미리보기
npm --workspace apps/portfolio run dev

# 잡 서버
npm --workspace apps/job-server run dev

# 대시보드
npm --workspace apps/job-dashboard run dev
```

Docker:

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:3000/health
```

상세 절차는 각 앱의 안내를 따릅니다.

---

## 8. 설정 / Configuration

| 항목 / Item | 위치 / Location | 비고 / Notes |
| --- | --- | --- |
| Worker 환경 변수 | [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare Workers env 정의 |
| 런타임 검증 | [`packages/env/`](packages/env/) | zod로 검증 |
| 컨테이너 환경 | `.env` (gitignore) | `docker-compose.yml`에서 `env_file`로 주입 |
| 시크릿 관리 | [`tools/scripts/onepassword/`](tools/scripts/) | 로컬 1Password CLI 기반 |
| 데이터 SSoT | [`packages/data/`](packages/data/) | resume_data.json 등 |
| `services.backup` 같은 외부 통합 | `.env` | API 키, 토큰 등 |

자격 증명을 저장소에 커밋하지 않습니다. 시크릿 회전 절차는 [`docs/security/`](docs/security/)를 따릅니다.

---

## 9. 명령어 레퍼런스 / Commands Reference

루트 [`package.json`](package.json)에서 노출되는 주요 스크립트:

| 명령어 / Command | 용도 / Purpose |
| --- | --- |
| `npm run strip-exif` | 포트폴리오 이미지에서 EXIF 제거 |
| `npm run sync:data` | resume_data SSOT → 산출물 동기화 |
| `npm run sync:pptx` | PTX 자동 생성 (`tools/scripts/build/generate_shinhan_pptx.py`) |
| `npm run sync:pdf` | PDF 생성 (`tools/scripts/build/pdf-generator.go`) |
| `npm run sync:all` | sync:data → sync:pdf → sync:pptx |
| `npm run op:run` / `op:native:run` | 1Password 도구 실행 |
| `npm run op:seed:resume` / `op:seed:sessions` | 시드 데이터/세션 생성 |
| `npm run op:restore:sessions` | 세션 복원 |
| `npm run sync:proposals` | 제안 동기화 + 적용 |
| `npm run enrich:github` / `enrich:skills` / `enrich:ai` | GitHub/스킬/AI 프로필 보강 |
| `npm run enrich:all` | 전체 보강 |
| `npm run automate:ssot` | sync:data → sync:pdf → build → typecheck → test:node |
| `npm run automate:full` | sync:all → lint → ... |

> 일부 명령은 `tools/` 하위 Go/Node/Python 스크립트로 위임됩니다. 자세한 사용법은 각 디렉터리 안내를 따릅니다.

---

## 10. 로컬 개발 / Local Development

| 작업 / Task | 위치 / Location |
| --- | --- |
| 포트폴리오 디자인/콘텐츠 수정 | `apps/portfolio/{src,lib}/`, HTML 템플릿, `entry.js` |
| 잡 자동화 로직 추가 | `apps/job-server/src/` |
| 대시보드 라우팅/워크플로 | `apps/job-dashboard/src/{router,middleware,workflows}/` |
| 데이터 SSOT 갱신 | `packages/data/` |
| 공용 유틸 추가 | `packages/shared/` (사전 합의 후) |
| 운영 스크립트 | `tools/scripts/` (가능하면 Go-first 정책 준수) |
| TA 프로필/프레젠테이션 | `ta/` (Python 3, `improve_visual.py`, `verify.py`) |

규칙 요약:

- 200 LOC 규칙을 권장합니다(상세는 [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md)).
- `apps/portfolio/worker.js`는 빌드 산출물이므로 직접 수정하지 않습니다.
- 도메인 타입은 [`packages/types/`](packages/types/)에 한 번만 정의하고, [`packages/schemas/`](packages/schemas/)에서 zod로 검증합니다.
- Cloudflare Worker 빌드는 Cloudflare Workers Builds가 권위 배포 경로입니다.

---

## 11. 테스트 / Testing

| 계층 / Layer | 위치 / Location | 도구 / Tool |
| --- | --- | --- |
| 단위 / Unit | `tests/unit/` | Jest ([`jest.config.cjs`](jest.config.cjs)) |
| 통합 / Integration | `tests/integration/` | Jest + Node |
| 종단 / E2E | `tests/e2e/` | Playwright ([`playwright.config.js`](playwright.config.js)) |
| 계약 / Contract | [`packages/contracts/`](packages/contracts/) | OpenAPI / Redocly([`redocly.yaml`](redocly.yaml)) |
| 링크 검증 | 루트 | `lychee.toml` |
| `ta/` 산출물 | [`ta/verify.py`](ta/verify.py), [`ta/output/`](ta/output/) | Python |

자주 쓰는 명령:

```bash
npm run lint
npm run typecheck
npm run test:node
npm --workspace apps/job-dashboard run test
```

---

## 12. 배포 / Deployment

| 대상 / Target | 트리거 / Trigger | 비고 / Notes |
| --- | --- | --- |
| Cloudflare Worker(포트폴리오) | [`wrangler.jsonc`](wrangler.jsonc) + Cloudflare Workers Builds | `worker.js`는 빌드 산출물 |
| Cloudflare Worker(대시보드) | `apps/job-dashboard/` 빌드 | 큐/스케줄 권한 필요 |
| Fastify 잡 서버 | [`Dockerfile`](Dockerfile) + [`docker-compose.yml`](docker-compose.yml) | 헬스 체크 `/health` |
| 보조 스크립트 | `tools/scripts/` Go 모듈 | 필요 시 컨테이너 외부 실행 |
| Edge Functions | `supabase/functions/` | Deno 런타임 |

운영 배포는 [`OWNERS`](OWNERS)가 권한을 가진 Cloudflare 계정에서 수행합니다. 사설 정보(내부 IP, 컨테이너 번호 등)는 배포 문서에 노출하지 않습니다.

---

## 13. 기여 / Contribution

사설 저장소이므로 외부 기여는 제한됩니다. 내부 절차는 [`CONTRIBUTING.md`](CONTRIBUTING.md)와 다음을 따릅니다.

| 규칙 / Rule | 문서 / Doc |
| --- | --- |
| 커밋/PR 컨벤션 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 릴리스 노트 | [`CHANGELOG.md`](CHANGELOG.md) |
| 의존성 정책 | [`package.json`](package.json) workspaces + [`npm-shrinkwrap`](package-lock.json) |
| 시크릿 정책 | [`docs/security/`](docs/security/) |
| QA/리뷰 정책 | [`OWNERS`](OWNERS) |

기능 작업 전 다음을 확인합니다.

1. 변경 영향이 [`packages/data/`](packages/data/)의 SSOT와 일치하는지 검증.
2. 워크플로 영향이 [`apps/job-dashboard/`](apps/job-dashboard/)의 큐/스케줄과 일치하는지 확인.
3. 도메인 타입/스키마가 [`packages/types/`](packages/types/), [`packages/schemas/`](packages/schemas/)에 정확히 반영되었는지 확인.
4. 테스트가 [`tests/`](tests/) 및 각 앱의 테스트 가이드를 따라 갱신되었는지 확인.

---

## 14. 관리자 및 문의 / Maintainers & Contact

| 역할 / Role | 위치 / Location |
| --- | --- |
| 저장소 소유 / Owners | [`OWNERS`](OWNERS) |
| 패키지별 책임자 | [`apps/job-dashboard/OWNERS`](apps/job-dashboard/OWNERS) 및 각 패키지 안내 |
| 운영 인시던트 | [`OWNERS`](OWNERS) 문서 연락처 |

---

## 15. 추가 문서 / Further Documentation

| 주제 / Topic | 경로 / Path |
| --- | --- |
| 프로젝트 탐색 가이드 | [`AGENTS.md`](AGENTS.md), [`apps/job-dashboard/AGENTS.md`](apps/job-dashboard/AGENTS.md) |
| 대시보드 운영/배포 | [`apps/job-dashboard/README.md`](apps/job-dashboard/README.md), [`apps/job-dashboard/DEPLOYMENT_GUIDE.md`](apps/job-dashboard/DEPLOYMENT_GUIDE.md) |
| 대시보드 개발 | [`apps/job-dashboard/DEVELOPMENT_GUIDE.md`](apps/job-dashboard/DEVELOPMENT_GUIDE.md) |
| 대시보드 다이어그램 | [`apps/job-dashboard/DIAGRAMS.md`](apps/job-dashboard/DIAGRAMS.md) |
| 대시보드 API | [`apps/job-dashboard/API_REFERENCE.md`](apps/job-dashboard/API_REFERENCE.md) |
| 시크릿 운영 | [`apps/job-dashboard/SECRETS.md`](apps/job-dashboard/SECRETS.md) |
| 직무별 지원 패키지 | [`applications/`](applications/) |
| ADRs / 규칙 / 보안 | [`docs/`](docs/) |
| TA 프로필/슬라이드 | [`ta/`](ta/) |
| 외부 vendored | [`third_party/`](third_party/) |

---

## 16. 라이선스 / License

본 저장소는 사설 라이선스 하에 운영됩니다. 자세한 조건은 [`LICENSE`](LICENSE)를 참고하세요. 무단 배포, 역컴파일, 외부 공개를 금합니다.