# Resume / Portfolio Automation Workspace

[![version](https://img.shields.io/badge/version-1.40.11-blue)](#changelog)
[![node](https://img.shields.io/badge/node-22%2B-339933?logo=node.js&logoColor=white)](#quickstart)
[![cloudflare workers](https://img.shields.io/badge/edge-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](#architecture)
[![license](https://img.shields.io/badge/license-see%20LICENSE-lightgrey)](#license)
[![tests](https://img.shields.io/badge/tests-jest%20%2B%20playwright-success)](#testing)

> 작업 전(前) 단계에서 콘텐츠 SSoT(단일 진실 출처)를 한 번만 갱신하면, Cloudflare Worker 포트폴리오, 대시보드 API, 지원서 패키지, 자소서/PDF/PPTX 아티팩트가 동일한 소스에서 파생되는 워크스페이스입니다.

이 저장소는 개인 포트폴리오 자동화를 위한 워크스페이스입니다. `apps/portfolio`에 공개 Workers 사이트, `apps/job-server`에 잡 자동화 런타임(MCP 서버, 크롤러, 원클릭 지원), `apps/job-dashboard`에 운영 대시보드 Workers를 두고, `packages/` 하위의 타입·스키마·계약·공유 유틸 패키지가 모든 앱의 경계를 묶어 줍니다. `applications/` 폴더에는 역할별 이력서/자소서/면접 답변 패키지가, `ta/` 폴더에는 Python 기반 PPTX 프로필 생성 도구가 들어 있습니다.

## 빠른 상태 확인

| 항목 | 값 |
| --- | --- |
| 버전 | 1.40.11 (`package.json`) |
| Node 런타임 | 22 LTS (Alpine 이미지, Worker 런타임 동일) |
| 공개 엔드포인트 | Cloudflare Worker (`apps/portfolio/entry.js` → 빌드 산출물 `worker.js`) |
| 운영 대시보드 | Cloudflare Worker (fetch + queue + scheduled, `apps/job-dashboard/src/index.js`) |
| 잡 자동화 런타임 | Node 22 컨테이너 (`mcp-server`, 포트 3000) |
| 데이터 저장소 | D1 / Workers KV / SQLite(런타임) / `.data` 볼륨 (Docker) |
| 상태 모니터링 | `GET /health` (Docker `HEALTHCHECK` 동일 구현) |
| 운영자 첫 액션 | `npm install && npm run sync:data` |

## 흐름 요약

1. 편집자가 `packages/data/resumes/master/resume_data.json`(SSoT)을 수정합니다.
2. `npm run sync:all` 또는 개별 `sync:data` / `sync:pdf` / `sync:pptx` 가 산출물(이력서 PDF, PPTX, HTML 리졸브)을 재생성합니다.
3. `apps/portfolio/generate-worker.js`가 HTML/데이터/모듈을 머지해 `apps/portfolio/worker.js`(정확한 검수 통과 후 배포 가능한 번들)를 생성합니다.
4. `apps/job-dashboard`의 fetch/queue/scheduled 핸들러가 상태 변경·자동화 큐·예약 작업을 처리합니다.
5. `apps/job-server`의 MCP 서버와 크롤러가 잡 자동화(원드·잡코리아 등) 작업을 실행하고, `applications/<role>/`에 산출물을 기록합니다.

목차:

- [아키텍처](#architecture)
- [Quickstart](#quickstart)
- [명령어 레퍼런스](#commands-reference)
- [로컬 개발](#local-development)
- [테스트](#testing)
- [설정 및 시크릿](#configuration-and-secrets)
- [지원서 패키지](#application-packets)
- [유지보수 · 연락처](#maintainers)
- [라이선스](#license)
- [추가 문서](#further-documentation)

## Architecture

본 워크스페이스는 다중 워크스페이스 npm 저장소입니다. 단일 `package.json`이 빌드/테스트/배포 명령의 진입점 역할을 합니다.

| 영역 | 경로 | 책임 |
| --- | --- | --- |
| 공개 포트폴리오 | `apps/portfolio/` | Cloudflare Worker 엣지 사이트; `entry.js` 편집, `worker.js`는 생성 산출물 |
| 잡 자동화 런타임 | `apps/job-server/` | MCP 서버, 크롤러, 자동 지원 스크립트, 플랫폼 클라이언트 |
| 운영 대시보드 | `apps/job-dashboard/` | 대시보드 Worker, 큐/스케줄 핸들러, 미들웨어, 워크플로 |
| 콘텐츠 SSoT | `packages/data/` | 이력서/지원 데이터 원본 |
| 도메인 타입 | `packages/types/` | JSDoc/TS 표준 도메인 타입 |
| 런타임 검증 | `packages/schemas/` | Zod 스키마 |
| 계약 정의 | `packages/contracts/` | OpenAPI, Worker 환경 계약 |
| 공유 유틸 | `packages/shared/` | 에러/로거/재시도/암호/레이트리밋/인증/브라우저/클라이언트 |
| 환경 검증 | `packages/env/` | 런타임 환경 변수 검증 |
| 운영 CLI | `packages/cli/` | resume 운영자 CLI |
| 지원서 패키지 | `applications/` | 역할별 이력서·자소서·런 로그 |
| 빌드/배포 도구 | `tools/scripts/` | Go 우선 빌드·동기화·배포·검증·보안 도구 |
| 테스트 | `tests/` | Jest, Node, Playwright 스위트 |
| 인프라 정의 | `infrastructure/` | Cloudflare, DB, 모니터링, 시스템 자동화 |
| 문서 | `docs/` | ADR, 아키텍처, 컨벤션, 가이드, 보안 |
| TA 프로필 생성 | `ta/` | Python/PPTX 프로필 생성 도구와 산출물 |
| Supabase Edge | `supabase/functions/` | Deno 기반 엣지 함수 |
| 벤디드 자료 | `third_party/` | npm으로 관리되는 외부 자료 |
| CI/릴리스 | `.github/workflows/` | 검증/릴리스 잡; 프로덕션 배포는 Cloudflare Workers Builds 권한 |

요청 흐름 요약:

1. 클라이언트가 Workers 엣지에 도달하면 `apps/portfolio/entry.js` 라우터가 요청을 분배합니다.
2. HTML/정적 자산 경로는 `lib/`, `src/images/`에서 미리 렌더링된 콘텐츠 또는 생성형 어댑터로 응답합니다.
3. 대시보드 경로(`/job/*` 등)는 동일 프로세스 내의 핸들러 또는 `apps/job-dashboard` Worker로 위임되어 상태 변경을 반영합니다.
4. 자동화 큐/예약 작업은 대시보드 핸들러가 트리거하고, `apps/job-server`의 클라이언트가 외부 플랫폼과 동기화합니다.
5. 운영 스크립트(`tools/scripts/build`, `sync`, `onepassword`)는 빌드 산출물과 시크릿을 갱신합니다.

## Quickstart

요구 사항: Node 22+, npm 10+, Python 3 (TA 생성용 선택), Docker (컨테이너 런타임 사용 시).

```bash
# 1) 의존성 설치
npm install

# 2) 콘텐츠 SSoT 동기화 (선택: PDF/PPTX 포함)
npm run sync:data
# 전체 동기화
# npm run sync:all

# 3) 포트폴리오 Worker 번들 생성
node apps/portfolio/generate-worker.js    # apps/portfolio/worker.js 산출

# 4) 로컬 미리보기 (Workers 로컬 런타임)
cd apps/portfolio && wrangler dev

# 5) 잡 대시보드 로컬 실행
cd apps/job-dashboard && wrangler dev

# 6) 잡 자동화 서버(Docker) 실행
docker compose up --build
```

`sync:all`은 `sync:data → sync:pdf → sync:pptx` 순서로 실행되며, Go 기반 PDF 생성과 Python 기반 PPTX 생성을 차례로 호출합니다.

## Commands Reference

루트 `package.json`은 작업의 단일 진입점입니다. 주요 스크립트는 다음과 같습니다.

| 명령 | 용도 |
| --- | --- |
| `npm run sync:data` | SSoT 데이터를 앱/패키지가 읽는 형태로 동기화 |
| `npm run sync:pdf` | Go 스크립트로 마스터 이력서 PDF 생성 |
| `npm run sync:pptx` | Python 스크립으로 신한용 PPTX 생성 |
| `npm run sync:all` | 세 동기화를 차례로 실행 |
| `npm run sync:jobkorea` | 1Password 환경에서 잡코리아 프로필 동기화(실제 적용) |
| `npm run sync:jobkorea:dry` | 잡코리아 동기화 드라이런(diff만 출력) |
| `npm run sync:proposals` | 제안 검토 CLI 실행 후 Go 적용 스크립트 호출 |
| `npm run op:run` | 1Password 경유 시크릿 로딩 후 명령 실행 |
| `npm run op:seed:resume` | 1Password 비트로 이력서 비트가 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run strip-exif` | 포트폴리오 이미지의 EXIF 제거 |
| `npm run enrich:github` | GitHub 활동/스킬 enrich 데이터 갱신 |
| `npm run enrich:skills` | 스킬 enrich 데이터 갱신 |
| `npm test` | 테스트 스위트 실행(Jest 기본) |
| `npm run lint` | ESLint 검사(`eslint.config.cjs`) |
| `npm run typecheck` | TypeScript 베이스 검사(`tsconfig.base.json`) |

모든 스크립트 정의는 루트 `package.json`에서 직접 확인할 수 있습니다.

## Local Development

워크스페이스 멤버는 `apps/portfolio`, `apps/job-server`, `apps/job-dashboard`, `packages/{cli,data,shared,types,schemas,contracts,env}`입니다. 변경 시 다음 경계를 유지해 주세요.

- `packages/data`는 읽기 전용 SSoT로 다루고, 자동화 산출물은 캐시/생성 폴더로만 기록합니다.
- `apps/portfolio/worker.js`는 생성 산출물이므로 수동 편집하지 않습니다.
- 도메인 타입 변경은 `packages/types`에서 시작하고 `packages/schemas`로 Zod 동기화합니다.
- 새 환경 변수는 `packages/env`에 선언한 뒤 모든 앱의 `wrangler.jsonc` / `.env`에 반영합니다.

자주 쓰는 부속 도구:

- `wrangler.jsonc` — Cloudflare Worker 배포 설정.
- `redocly.yaml` — OpenAPI 린트(`packages/contracts`).
- `lychee.toml` — 링크 검사 설정.
- `playwright.config.js` — E2E 스위트 구성.
- `jest.config.cjs` — 단위/통합 테스트 구성.

## Testing

테스트는 `tests/` 하위에 레이어별로 정리되어 있으며, 각 하위 폴더의 `AGENTS.md`가 레이어 규칙을 정의합니다.

| 레이어 | 도구 | 위치 |
| --- | --- | --- |
| 단위 | Jest | `tests/**`, 각 패키지/앱 내부 `*.test.*` |
| 통합 | Jest + Node | `apps/*/src/**/__tests__` |
| E2E | Playwright | `tests/e2e`, `playwright.config.js` |
| 계약/OpenAPI | Redocly | `packages/contracts`, `redocly.yaml` |
| 링크 | lychee | `lychee.toml` |

연결된 클라이언트 라이브러리: ESLint(`eslint.config.cjs`), TypeScript 베이스 설정(`tsconfig.base.json`). GitHub Actions 검증 잡은 `.github/workflows/`에서 정의되며, 프로덕션 배포 권한은 Cloudflare Workers Builds에 있습니다.

## Configuration and Secrets

- 환경 변수와 시크릿은 `packages/env`의 스키마로 선언되며, `apps/job-dashboard`의 `wrangler.jsonc` 또는 컨테이너 환경(`docker-compose.yml`)에서 주입됩니다.
- `.env.1password` 등 시크릿 파일은 직접 커밋하지 않으며, `op:run`, `op:native:run`, `op:seed:*` 명령이 1Password CLI와 연동해 세션/비트를 관리합니다.
- 컨테이너 헬스 체크는 `GET /health`를 30초 주기로 확인합니다. 로컬 검증은 `curl 127.0.0.1:3000/health`로 충분합니다.
- 자세한 절차는 `apps/job-dashboard/SECRETS.md`, `docs/security/`, `tools/scripts/onepassword/`를 참고하세요.

## Application Packets

`applications/` 디렉터리에는 역할별 지원 패키지가 정리되어 있습니다. 각 하위 폴더는 자소서, 이력서 PDF/HTML, 면접 준비 자료, 지원 가이드를 포함합니다.

| 폴더 | 목적 |
| --- | --- |
| `airpremia-security-2026/` | AirPremia 보안/그리팅 지원 패키지 |
| `infrastructure-architecture-2026/` | 인프라·아키텍처 역할용 |
| `coupang-fintech-sre-2026/` | 쿠팡 페이 핀테크 SRE 지원 패키지 |
| `cloudflare-one-se-2026/` | Cloudflare One SE 지원(그린하우스 가이드, 링크드인 최적화, 면접 Q&A 포함) |
| `openai-codex-korea-2026/` | OpenAI Codex Korea 지원 패키지 |
| `gitlab-apac-security-2026/` | GitLab APAC InfraSec 지원 패키지 |
| `security-ir-2026/` | 보안 IR 역할 지원 패키지 |
| `job-search-2026-07/` | 7월 잡서치 트래커(점수카드, 액션, 아웃리치 템플릿 등) |

`ta/`는 별도의 PPTX 프로필 생성 라인입니다. `ta/inspect.py`, `ta/improve_visual.py`, `ta/verify.py`로 입력 PPTX를 검증·개선하고, 산출물은 `ta/output/`에 저장됩니다.

## Maintainers

- 메인테이너: 저장소 `OWNERS` 명단 (코드 오너십 매트릭스).
- 운영 절차/규칙: `docs/conventions/architecture-rules.md`(200 LOC 규칙, 명명 규칙, 자동화 SSoT, 스크립트 언어 정책).
- 가이드라인: `CONTRIBUTING.md`.
- 변경 이력: `CHANGELOG.md`.
- 에이전트 지침: 루트 및 각 하위 폴더의 `AGENTS.md`(예: `apps/`, `apps/job-dashboard/`, `applications/`, `ta/`).

기여 전 `CONTRIBUTING.md`와 `docs/conventions/architecture-rules.md`를 확인해 주세요. 패치 제출 시 동일한 워크스페이스 경계 규칙(예: SSoT는 `packages/data`만, 환경 키는 `packages/env`만)을 따라야 합니다.

## License

저장소 루트의 `LICENSE` 파일을 참고하세요. 외부 자료를 사용할 때는 각 원본 라이선스를 준수하고, `third_party/`에 명시적으로 분리합니다.

## Further Documentation

- 아키텍처/규칙: `docs/conventions/architecture-rules.md`, `docs/` 하위 ADR과 가이드
- 대시보드 가이드: `apps/job-dashboard/README.md`, `apps/job-dashboard/DEPLOYMENT_GUIDE.md`, `apps/job-dashboard/DEVELOPMENT_GUIDE.md`, `apps/job-dashboard/API_REFERENCE.md`, `apps/job-dashboard/DIAGRAMS.md`, `apps/job-dashboard/SECRETS.md`
- 잡 자동화 런타임: `apps/job-server/`, `tools/scripts/`
- 지원서별 가이드: `applications/<role>/application-guide.md`, `cover_letter.md`, 인터뷰 자료
- TA 생성 도구: `ta/AGENTS.md`, `ta/verify.py`, `ta/improve_visual.py`
- 인프라: `infrastructure/`, `docker-compose.yml`, `Dockerfile`, `wrangler.jsonc`
- 에이전트 지침: 루트 `AGENTS.md` 및 각 하위 `AGENTS.md`