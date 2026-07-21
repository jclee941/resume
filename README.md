# 이재철 이력서·포트폴리오·채용 지원 워크스페이스

> Jaecheol Lee — Resume, Portfolio & Job Application Workspace
> Version 1.40.11 · 개인 운영 워크스페이스

이 저장서는 개인 이력서·포트폴리오 사이트, 채용 자동화 런타임, 지원 대시보드,
회사별 지원 패키지, 그리고 운영 도구를 한 워크스페이스에서 통합 관리하는 개인 작업장입니다.

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 성격 | 개인 포트폴리오 / 채용 자동화 워크스페이스 |
| 운영 상태 | 개인 운영 중 — 활발히 개발 (1.40.x) |
| 공개 사이트 | Cloudflare Worker 기반 포트폴리오 |
| 자동화 런타임 | Node 22 / Fastify 잡 서버 + Worker 대시보드 |
| 데이터 진실 | `packages/data/resumes/master/` |
| 지원 채널 | Wanted, JobKorea, GitHub, 1Password, Cloudflare |
| Docker 런타임 | 지원 (`docker-compose.yml`) |
| 공개 OpenAPI | 없음 (내부/개인 워크스페이스) |
| 라이선스 | `LICENSE` 참조 |

## 핵심 흐름 요약

1. `packages/data/resumes/master/resume_data.json`이 이력서/지원 데이터의 단일 진실입니다.
2. 빌드 스크립트가 PDF, PPTX, 정적 자산, 대시보드 입력으로 데이터를 동기화합니다.
3. `apps/portfolio`가 Cloudflare Worker로 공개 포트폴리오를 서비스합니다.
4. `apps/job-server`가 Wanted/JobKorea 동기화·자동 지원·세션 복원을 수행합니다.
5. `apps/job-dashboard`가 지원 현황·검토 항목을 워커 큐/워크플로우로 보여줍니다.

## 목차

- [목적 / 구성물](#목적--구성물)
- [사용 사례](#사용-사례)
- [상태](#상태)
- [먼저 읽을 파일](#먼저-읽을-파일)
- [진입점 / API 표면](#진입점--api-표면)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [설정](#설정)
- [명령어 레퍼런스](#명령어-레퍼런스)
- [로컬 개발](#로컬-개발)
- [테스트](#테스트)
- [기여 가이드](#기여-가이드)
- [유지보수자 / 문의처](#유지보수자--문의처)
- [추가 문서](#추가-문서)
- [라이선스](#라이선스)

## 목적 / 구성물

| 영역 | 위치 | 역할 |
| --- | --- | --- |
| 공개 포트폴리오 | `apps/portfolio` | Cloudflare Worker로 배포되는 사이트 |
| 잡 자동화 런타임 | `apps/job-server` | Fastify + MCP, 크롤러, 스크립트 |
| 잡 대시보드 | `apps/job-dashboard` | 지원 현황 Worker, 큐·워크플로우 |
| 이력서 SSoT | `packages/data` | 진실 데이터 (`master/`) |
| 공유 패키지 | `packages/*` | cli, env, shared, types, schemas, contracts |
| 회사별 지원 패키지 | `applications/` | 회사별 이력서·자기소개서·실행 로그 |
| TA 프로필 | `ta/` | Python/PPTX TA 프로필 생성 |
| 운영 도구 | `tools/scripts` | 빌드·동기화·배포·1Password 연동 |

## 사용 사례

- 공개용 포트폴리오 페이지를 데이터 진실에서 자동 생성·배포
- 같은 진실 데이터에서 PDF, PPTX, 회사별 맞춤 이력서까지 1회 변경으로 동기화
- Wanted/JobKorea 프로필과 포트폴리오 데이터를 1Password 비밀로 안전하게 동기화
- 자동 지원 흐름을 대시보드에서 검토·승인·추적
- 회사별 지원 패키지를 `applications/` 한 곳에 누적해 재사용

## 상태

| 영역 | 상태 | 비고 |
| --- | --- | --- |
| 공개 포트폴리오 | 운영 중 | Cloudflare Worker로 개인 도메인 배포 |
| 잡 자동화 | 개인 운영 | Wanted/JobKorea 동기화 + 자동 지원 |
| 대시보드 | 운영 중 | Worker fetch/queue/scheduled 연동 |
| SSoT 데이터 | 단일 진실 | `packages/data/resumes/master/` |
| Docker 런타임 | 빌드 가능 | `Dockerfile`, `docker-compose.yml` |
| 1Password 연동 | 운영 중 | `tools/scripts/onepassword/` |
| 외부 공개 API | 없음 | 개인/내부 사용 |

이 워크스페이스는 개인 운영이 1차 목표입니다.
운영 전 `docs/security/` 및 회사별 `application-guide.md`를 우선 확인하세요.

## 먼저 읽을 파일

1. `AGENTS.md` — 저장소 지식 베이스와 코드 맵
2. `package.json` — 워크스페이스 명령어 허브
3. `apps/portfolio/README.md` — 공개 포트폴리오 빌드/배포
4. `apps/job-server/README.md` — 잡 자동화 런타임 진입점
5. `apps/job-dashboard/README.md` — 대시보드 Worker
6. `packages/data/resumes/master/` — 이력서 SSoT
7. `applications/AGENTS.md` — 회사별 지원 패키지 규약
8. `ta/AGENTS.md` — TA PPTX 생성 규약

## 진입점 / API 표면

| 진입점 | 위치 | 역할 |
| --- | --- | --- |
| 포트폴리오 fetch 라우터 | `apps/portfolio/entry.js` | 통합 라우터 + `/job/*` 대시보드 위임 |
| 잡 서버 부트스트랩 | `apps/job-server/src/index.js` | MCP/잡 자동화 프로세스 진입 |
| 잡 서버 Fastify | `apps/job-server/src/server/index.js` | 대시보드/잡 자동화 HTTP 진입 |
| 대시보드 Worker | `apps/job-dashboard/src/index.js` | fetch/queue/scheduled 핸들러 |
| 마이그레이션 | `apps/job-dashboard/migrate-json-to-d1.cjs` | JSON → D1 이전 |
| D1 스키마 | `apps/job-dashboard/schema.sql` | 데이터베이스 스키마 |
| Docker 헬스체크 | `Dockerfile` / `docker-compose.yml` | `GET /health` |

## 빠른 시작

사전 요구 사항: Node 22+, npm 10+.
선택 사항: Go 1.22+, Python 3.11+, Docker, 1Password CLI.

```bash
git clone <repo>
cd <repo>
npm install
npm run sync:data
```

상세 절차는 `apps/portfolio/README.md`와 `apps/job-server/README.md`를 참고하세요.

## 아키텍처

| 계층 | 책임 | 위치 |
| --- | --- | --- |
| 데이터 | 이력서/지원 단일 진실 | `packages/data/resumes/master/` |
| 빌드 | Go 우선 빌드, PDF/PPTX/정적 자산 | `tools/scripts/build` |
| 엣지 | Cloudflare Worker 사이트/대시보드 | `apps/portfolio`, `apps/job-dashboard` |
| 런타임 | 잡 자동화, MCP, 크롤러 | `apps/job-server` |
| 비밀/세션 | 1Password 연동 | `tools/scripts/onepassword` |
| 관측 | 자체 호스팅 관측성 | `infrastructure/`, `docs/observability` |
| 외부 함수 | Deno 엣지 함수 | `supabase/functions` |

요청 흐름:

1. 방문자가 포트폴리오에 접속하면 `apps/portfolio/entry.js`의 통합 라우터가 응답합니다.
2. `/job/*` 경로는 동일 라우터에서 `apps/job-dashboard` 핸들러로 위임됩니다.
3. 잡 서버는 Wanted/JobKorea 동기화, 자동 지원, 세션 복원 등 잡 작업을 실행합니다.
4. 모든 잡 데이터는 `packages/data`에서 읽어 SQLite/D1/JSON으로 저장합니다.
5. 외부 비밀은 1Password에서 주입되며 워크플로우/큐가 단계별로 처리합니다.

## 설정

| 항목 | 출처 | 비고 |
| --- | --- | --- |
| 워커 환경 변수 | `packages/env` | 런타임 환경 검증 |
| OpenAPI 계약 | `packages/contracts` | API/환경 계약 단일 출처 |
| 1Password | `tools/scripts/onepassword` | 비밀 주입, 세션 백업/복원 |
| Cloudflare Worker | `wrangler.jsonc` | 환경, 바인딩, 라우트 |
| TS 베이스 | `tsconfig.base.json` | 워크스페이스 공통 컴파일 옵션 |
| Docker | `docker-compose.yml` | 잡 서버 런타임, 헬스체크 |
| OpenAPI lint | `redocly.yaml` | API 사양 정적 검증 |
| 링크 검증 | `lychee.toml` | 문서/마크다운 링크 검증 |

민감 정보는 커밋하지 마세요. 비밀 주입 절차는 `docs/security/` 참조.

## 명령어 레퍼런스

루트 `package.json`에서 노출되는 핵심 명령어입니다.

| 명령 | 설명 |
| --- | --- |
| `npm run sync:data` | 이력서 JSON 동기화 |
| `npm run sync:pdf` | PDF 생성 (Go 빌드) |
| `npm run sync:pptx` | PPTX 생성 (Python 빌드) |
| `npm run sync:all` | 데이터 → PDF → PPTX 순서 동기화 |
| `npm run op:run` | 1Password 환경에서 명령 실행 |
| `npm run op:seed:resume` | 이력서 1Password 시드 |
| `npm run op:seed:sessions` | 세션 파일 시드 |
| `npm run op:restore:sessions` | 세션 복원 |
| `npm run sync:jobkorea` | 잡코리아 프로필 동기화 (apply) |
| `npm run sync:jobkorea:dry` | 잡코리아 dry-run (diff) |
| `npm run strip-exif` | 이미지 EXIF 제거 |

Docker:

```bash
docker compose build mcp-server
docker compose up -d mcp-server
```

## 로컬 개발

| 작업 | 절차 |
| --- | --- |
| 워크스페이스 설치 | `npm install` |
| 데이터 갱신 | `npm run sync:data` |
| 포트폴리오 빌드 | `apps/portfolio/README.md` 참조 |
| 잡 서버 실행 | `apps/job-server/README.md` 참조 |
| 대시보드 실행 | `apps/job-dashboard/README.md` 참조 |
| 1Password 연동 | `tools/scripts/onepassword/` 참조 |
| 마이그레이션 | `apps/job-dashboard/migrate-json-to-d1.cjs` |

## 테스트

| 종류 | 도구 | 설정 |
| --- | --- | --- |
| 단위/통합 | Jest | `jest.config.cjs` |
| 엔드투엔드 | Playwright | `playwright.config.js` |
| 링크 검증 | lychee | `lychee.toml` |
| OpenAPI lint | Redocly | `redocly.yaml` |
| TypeScript 컴파일 | tsc | `tsconfig.base.json` |
| ESLint | ESLint 9 | `eslint.config.cjs` |

```bash
npm test
npm run lint
```

## 기여 가이드

| 항목 | 위치 |
| --- | --- |
| 기여 정책 | `CONTRIBUTING.md` |
| 변경 이력 | `CHANGELOG.md` |
| 책임자 명단 | `OWNERS` |
| 코드 컨벤션 | `docs/conventions/` |
| 보안 정책 | `docs/security/` |
| 아키텍처 규칙 | `docs/conventions/architecture-rules.md` |

## 유지보수자 / 문의처

| 역할 | 출처 |
| --- | --- |
| 저장소 소유 | `OWNERS` |
| 운영 보조 | `ProfileView.jpg`, 개인 홈페이지 |
| 회사별 지원 패키지 | `applications/<회사>-<포지션>-<연도>/` |
| 채용 검색 운영 | `applications/job-search-2026-07/` |

## 추가 문서

- `AGENTS.md` — 저장소 지식 베이스, 코드 맵
- `docs/` — ADR, 아키텍처, 컨벤션, 가이드, 보안
- `applications/*/application-guide.md` — 회사별 지원 가이드
- `apps/*/README.md` — 워크스페이스별 상세 문서
- `ta/AGENTS.md` — TA PPTX 생성 규약
- `design-state.md` — 현재 디자인 상태 메모

## 라이선스

`LICENSE` 파일 참조.