# 이재철 포트폴리오·채용 자동화 워크스페이스

[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6)](https://www.typescriptlang.org)
[![Wrangler](https://img.shields.io/badge/cloudflare-worker-F38020)](https://developers.cloudflare.com)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#license)

> 한 사람이 직접 운영하는 개인 포트폴리오 사이트, 채용 공고 자동 수집·지원 워크플로, 대시보드 API, 그리고 콘텐츠 단일 진실 공급원(SSoT)을 한 워크스페이스에서 묶어둔 저장소입니다.

---

## 한눈에 보기

| 항목 | 값 |
| --- | --- |
| 버전 | `1.40.11` (package.json 기준) |
| 기본 분기 | `master` |
| 실행 단위 | Cloudflare Worker(포트폴리오/대시보드), Node 22 MCP 서버(잡 자동화) |
| 패키지 매니저 | npm workspaces (Node 22) |
| 컨테이너 | `Dockerfile` (multi-stage) + `docker-compose.yml` (MCP 서버 1대) |
| 배포 표면 | Cloudflare Workers Builds가 프로덕션 배포 권한 |
| 콘텐츠 SSoT | `packages/data/resumes/master/resume_data.json` |
| 검색·테스트 | Jest(Node), Playwright(E2E), ESLint flat config, Redocly(API 명세) |
| 헬스 체크 | `GET /health` (`127.0.0.1:3000`, 컨테이너 내부) |

### 실행 흐름 요약

1. `packages/data`의 이력서·자기소개서 JSON이 단일 진실 공급원입니다.
2. `apps/portfolio`의 빌드 스크립트(`generate-worker.js`)가 HTML/데이터/모듈을 머지해 `apps/portfolio/worker.js`를 생성합니다.
3. Cloudflare Worker가 공개 포트폴리오를 서빙하고, 같은 워커에 내장된 `/job/*` 라우터가 대시보드 API로 연결됩니다.
4. `apps/job-dashboard`의 별도 Worker가 큐·스케줄러·워크플로를 통해 잡 동기화 작업의 후처리를 담당합니다.
5. `apps/job-server`의 MCP 서버가 Wanted/JobKorea 크롤러·자동 지원·세션 복원 스크립트를 노출하고 Docker로 운영됩니다.
6. 1Password CLI 래퍼(`tools/scripts/onepassword`)가 자격증명을 안전하게 주입합니다.

---

## 목차

1. [목적과 사용자](#목적과-사용자)
2. [저장소 구성](#저장소-구성)
3. [상태와 운영 정책](#상태와-운영-정책)
4. [먼저 읽을 파일](#먼저-읽을-파일)
5. [진입점과 패키지 경계](#진입점과-패키지-경계)
6. [빠른 시작](#빠른-시작)
7. [명령어 레퍼런스](#명령어-레퍼런스)
8. [로컬 개발과 테스트](#로컬-개발과-테스트)
9. [기여 가이드](#기여-가이드)
10. [유지보수자](#유지보수자)
11. [추가 문서](#추가-문서)

---

## 목적과 사용자

이 저장소는 한 개인의 다음 두 가지 흐름을 한 곳에서 운영하기 위한 워크스페이스입니다.

- **포트폴리오 사이트**: Cloudflare Worker에서 정적으로 머지된 HTML/JSON 기반 이력서 페이지.
- **채용 자동화**: 잡코리아·원티드 등 국내 채용 플랫폼 프로필 동기화, 자동 지원, 후속 추적.

대부분의 산출물은 자신의 커리어 운영을 위해 만들어졌으며, 워크플로 패턴(데이터 SSoT → 빌드 머지 → 엣지 배포 → 큐 후처리)은 다른 1인 워크스페이스의 참고 모델로도 활용 가능합니다.

---

## 저장소 구성

실제 최상위 구조만 반영했습니다. 워크스페이스 디렉터리는 npm workspaces로 묶여 있습니다.

| 경로 | 역할 |
| --- | --- |
| `apps/portfolio/` | 공개 포트폴리오 Worker. `worker.js`는 자동 생성 산출물. |
| `apps/job-server/` | MCP 서버, 크롤러, 자동 지원 스크립트, 플랫폼 클라이언트. |
| `apps/job-dashboard/` | 대시보드 Worker의 fetch/queue/scheduled 진입점. |
| `packages/data/` | 이력서·지원서 콘텐츠 SSoT. |
| `packages/{types,schemas,contracts,shared,env,cli}/` | 도메인 타입, Zod 스키마, OpenAPI/Worker env 계약, 공용 유틸, 환경 검증, 운영자 CLI. |
| `applications/` | 역할별 지원 패킷(맞춤 이력서, 자기소개서, 사전 면접 Q&A). |
| `tools/scripts/` | Go 우선 빌드/동기화/배포/검증 스크립트. 1Password 래퍼 포함. |
| `tests/` | Jest(Node), Playwright(E2E) 테스트 묶음. |
| `infrastructure/` | Cloudflare·DB·모니터링 설정. |
| `docs/` | ADR, 아키텍처, 컨벤션, 보안 가이드. |
| `ta/` | Python 기반 PPTX 프로필 생성 도구. |
| `supabase/functions/` | Deno 엣지 함수. |
| `third_party/` | npm으로 도입한 외부 자료. |

---

## 상태와 운영 정책

| 영역 | 상태 |
| --- | --- |
| 프로덕션 준비도 | 1인 운영 워크스페이스, 운영 중이지만 외부 사용자에게 안정성 보장 안 함 |
| 프로덕션 배포 권한 | Cloudflare Workers Builds (`.github/workflows/`) |
| 비공개 자격증명 주입 | 1Password CLI 래퍼(`tools/scripts/onepassword/`) |
| 자동화 정책 | 콘텐츠 자동화는 SSoT(JSON) → 빌드 머지 → 엣지 배포 순서를 따른다 |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` (200 LOC 룰, 명명, 스크립트 언어 정책) |
| 헬스 체크 엔드포인트 | `GET /health` (잡 서버) |

---

## 먼저 읽을 파일

저장소를 처음 볼 때 다음 순서로 살펴보길 권합니다.

1. `package.json` — 모든 빌드·테스트·동기화·배포 스크립트의 진입점.
2. `apps/portfolio/entry.js` — 엣지 라우터, `/job/*` 대시보드 경로 포함.
3. `apps/job-server/src/server/index.js` — 잡 자동화 HTTP/MCP 진입점.
4. `apps/job-dashboard/src/index.js` — 대시보드 fetch/queue/scheduled 핸들러.
5. `packages/data/resumes/master/resume_data.json` — 콘텐츠 단일 진실 공급원.
6. `docs/conventions/architecture-rules.md` — 코드/스크립트 작성 규칙.

---

## 진입점과 패키지 경계

| 패키지 | 노출 표면 | 비고 |
| --- | --- | --- |
| `apps/portfolio` | Cloudflare Worker fetch | `worker.js`는 `generate-worker.js`로 생성, 수동 편집 금지 |
| `apps/job-server` | Node HTTP, MCP, CLI 스크립트 | Docker 이미지의 CMD: `node src/server/index.js` |
| `apps/job-dashboard` | Cloudflare Worker fetch/queue/scheduled | 큐 후처리와 스케줄 작업 분리 |
| `packages/cli` | `resume` 운영자 CLI | 워크스페이스 공용 명령 |
| `packages/contracts` | OpenAPI, Worker env 계약 | `redocly.yaml`로 검증 |
| `packages/schemas` | Zod 런타임 스키마 | `packages/types`와 짝을 이뤄 검증 |
| `packages/shared` | 에러, 로거, 재시도, 암호화, rate-limit, 인증, 브라우저, 클라이언트 | 패키지 간 공용 유틸 |
| `packages/env` | 환경 변수 검증 | 부트스트랩 시점에 실패 빠르게 |

워크스페이스 의존성은 `packages/*`와 `apps/*`만 npm workspace로 묶이며, 그 외 디렉터리는 의존성 그래프 밖에서 운영됩니다.

---

## 빠른 시작

사전 요구 사항: Node 22, npm 10+, (선택) Docker, Go 1.22+, Python 3.11+ (PPTX 작업 시), 1Password CLI (자격증명 주입 시).

```bash
# 1. 의존성 설치
npm ci

# 2. 콘텐츠 동기화 (선택, 데이터 변경 후)
npm run sync:data
npm run sync:pdf
npm run sync:pptx

# 3. 잡 자동화 서버 로컬 실행
npm --workspace apps/job-server run dev

# 4. 포트폴리오 Worker 로컬 에뮬레이트
npm --workspace apps/portfolio run dev

# 5. Docker로 잡 서버 기동 (컨테이너 빌드 + /health 헬스체크)
docker compose up -d mcp-server
curl -fsS http://127.0.0.1:3000/health
```

> 실제 도메인·토큰·세션 경로는 비공개입니다. 로컬에서는 1Password CLI 래퍼(`npm run op:run …`)를 통해 주입하며, 평문 환경변수는 커밋하지 않습니다.

---

## 명령어 레퍼런스

| 명령어 | 용도 |
| --- | --- |
| `npm ci` | 워크스페이스 전체 의존성 설치 |
| `npm run sync:data` | 이력서·지원서 JSON 동기화 |
| `npm run sync:pdf` | Go 기반 PDF 생성 |
| `npm run sync:pptx` | Python 기반 PPTX 생성 |
| `npm run sync:all` | data → pdf → pptx 순서 일괄 동기화 |
| `npm run sync:jobkorea` | 잡코리아 프로필 동기화(실제 적용) |
| `npm run sync:jobkorea:dry` | 잡코리아 드라이런(diff만 출력) |
| `npm run sync:proposals` | 제안서 검토 후 적용 |
| `npm run enrich:github` | GitHub 활동 메타데이터 보강 |
| `npm run op:run` | 1Password 자격증명으로 래핑 실행 |
| `npm run op:seed:resume` | 1Password에 이력서 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 파일 복원 |
| `npm run strip-exif` | 포트폴리오 이미지 EXIF 제거 |
| `npm run lint` | ESLint flat config 검사 |
| `npm run test` | Jest + Playwright 스위트 실행 |

---

## 로컬 개발과 테스트

| 항목 | 위치 | 설명 |
| --- | --- | --- |
| 포트폴리오 빌드 | `apps/portfolio/` | `generate-worker.js` 실행 후 `worker.js` 생성, 수동 편집 금지 |
| 잡 서버 개발 | `apps/job-server/src/` | Node 22, Fastify 기반 진입점 |
| 대시보드 개발 | `apps/job-dashboard/src/` | 미들웨어/라우터/워크플로 분리 |
| 단위/통합 테스트 | `tests/`, `jest.config.cjs` | Jest 기반 |
| E2E 테스트 | `playwright.config.js` | Playwright |
| API 명세 검증 | `redocly.yaml` | OpenAPI 린트 |
| 링크 검사 | `lychee.toml` | 문서·마크다운 링크 점검 |
| 환경 변수 검증 | `packages/env` | 부트스트랩 시점에 스키마 검사 |

테스트 실행 예시:

```bash
npm run lint
npm test
npm --workspace apps/portfolio run build
```

---

## 기여 가이드

- 코드/스크립트 작성 규칙은 `docs/conventions/architecture-rules.md`를 우선합니다.
- 한 모듈은 200 LOC를 넘지 않도록 분리하고, 새 워크플로 도입 전 ADR을 `docs/`에 남깁니다.
- 1Password를 통한 비공개 자격증명만 사용하며, 평문 시크릿은 커밋하지 않습니다.
- PR 전 `npm run lint`, `npm test`, 해당 워크스페이스의 `npm run build`를 통과시켜 주세요.
- 자세한 절차는 `CONTRIBUTING.md`를 따릅니다.

---

## 유지보수자

| 역할 | 책임 | 채널 |
| --- | --- | --- |
| 저장소 오너 | 아키텍처·배포·보안 정책 | `OWNERS` 파일 |
| 애플리케이션 담당 | 역할별 지원 패킷(`applications/`) | 각 폴더별 README/가이드 |
| 기여자 | PR 리뷰, 컨벤션 준수 | `CONTRIBUTING.md` |

운영 문의는 저장소 이슈 트래커를 우선 사용하고, 보안 이슈는 비공개 채널로 별도 보고합니다.

---

## 추가 문서

| 주제 | 위치 |
| --- | --- |
| 아키텍처 결정 기록 | `docs/adr/` |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |
| 보안 가이드 | `docs/security/` |
| 배포 가이드 | `apps/job-dashboard/DEPLOYMENT_GUIDE.md` |
| 개발 가이드 | `apps/job-dashboard/DEVELOPMENT_GUIDE.md` |
| API 레퍼런스 | `apps/job-dashboard/API_REFERENCE.md` |
| 다이어그램 | `apps/job-dashboard/DIAGRAMS.md` |
| 시크릿 운용 | `apps/job-dashboard/SECRETS.md` |
| 홈랩 인프라 | `applications/infrastructure-architecture-2026/` |
| 디자인 상태 | `design-state.md` |
| 변경 이력 | `CHANGELOG.md` |

---

## License

저장소는 비공개 운영 워크스페이스입니다. 외부 배포·재배포는 허용되지 않으며, 자세한 조건은 `LICENSE`를 따릅니다.