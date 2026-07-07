# Resume — 포트폴리오 & 취업 자동화 워크스페이스

Cloudflare Workers 기반 공개 포트폴리오, Wanted/JobKorea 자동 지원, 대시보드 API, 콘텐츠 SSoT, 자체 호스팅 옵저버빌리티를 한 저장소에서 운영하는 개인 이력서/취업 자동화 프로젝트입니다.

A personal resume workspace that runs a public Cloudflare Worker portfolio, job-application automation (Wanted/JobKorea), a dashboard API, a content SSoT, and self-hosted observability.

![version](https://img.shields.io/badge/version-1.40.11-informational)
![node](https://img.shields.io/badge/node-22-blue)
![workers](https://img.shields.io/badge/cloudflare-workers-orange)
![private](https://img.shields.io/badge/visibility-private-lightgrey)

## 한눈에 보기 / At a Glance

| 항목 | 값 |
| --- | --- |
| 런타임 | Node.js 22, Cloudflare Workers, Deno (Supabase Functions), Python 3, Go |
| 워크스페이스 멤버 | `apps/portfolio`, `apps/job-server`, `apps/job-dashboard`, `packages/cli`, `packages/data`, `packages/env`, `packages/shared`, `packages/types`, `packages/schemas`, `packages/contracts` |
| 컨테이너 | 멀티 스테이지 `Dockerfile` + `docker-compose.yml` (`mcp-server`, 포트 3000) |
| 데이터 SSoT | `packages/data/resumes/master/resume_data.json` |
| 메인 엔트리 | `apps/portfolio/entry.js` · `apps/job-server/src/server/index.js` · `apps/job-dashboard/src/index.js` |
| 버전 | 1.40.11 |
| 상태 | 활발히 운영 중 (기본 브랜치 `master`) |
| 라이선스 | 저장소 `LICENSE` 참조 |

## 흐름 요약 / Flow Summary

1. **콘텐츠 SSoT**: `packages/data/resumes/master/resume_data.json`을 단일 출처로 사용합니다.
2. **동기화**: `npm run sync:all`이 데이터 동기화 → PDF → PPTX를 순차 실행합니다.
3. **포트폴리오**: `apps/portfolio`의 `entry.js`가 Cloudflare Worker 페치 라우터이며, 빌드 시 `worker.js`로 머지됩니다.
4. **취업 자동화**: `apps/job-server`의 MCP/Fastify 서버가 Wanted/JobKorea 크롤링과 자동 지원 큐를 처리합니다.
5. **대시보드**: `apps/job-dashboard`의 Worker가 `fetch`/`queue`/`scheduled` 핸들러로 결과를 집계하고 D1 스키마로 영속화합니다.
6. **운영 도구**: `tools/scripts`(Go 우선, Python/Node 보조)에서 1Password 시드, 제안 동기화, 데이터 보강, 보안 점검을 수행합니다.

## 목차 / Table of Contents

- [목적과 구성 / Purpose and Layout](#목적과-구성--purpose-and-layout)
- [상태와 책임자 / Status and Maintainers](#상태와-책임자--status-and-maintainers)
- [처음 읽을 파일 / First Files to Read](#처음-읽을-파일--first-files-to-read)
- [API 및 엔트리 포인트 / API and Entry Points](#api-및-엔트리-포인트--api-and-entry-points)
- [빠른 시작 / Quickstart](#빠른-시작--quickstart)
- [명령 레퍼런스 / Commands Reference](#명령-레퍼런스--commands-reference)
- [로컬 개발 / Local Development](#로컬-개발--local-development)
- [테스트 / Testing](#테스트--testing)
- [설정과 시크릿 / Configuration and Secrets](#설정과-시크릿--configuration-and-secrets)
- [기여와 연락처 / Contributing and Contact](#기여와-연락처--contributing-and-contact)
- [추가 문서 / Further Documentation](#추가-문서--further-documentation)
- [라이선스 / License](#라이선스--license)

## 목적과 구성 / Purpose and Layout

Resume 워크스페이스는 개인 포트폴리오 웹사이트와 취업 준비 자동화를 한 저장소에서 함께 운영하기 위한 프로젝트입니다. 공개용 포트폴리오는 Cloudflare Workers에서, 자동 지원·크롤링은 Node.js MCP/Fastify 서버에서, 지원 결과 대시보드는 별도 Worker에서 동작하며 콘텐츠·타입·스키마·CLI는 공유 패키지로 분리되어 있습니다.

The workspace bundles a public portfolio site, job-application automation, a results dashboard, and the supporting shared packages (types, schemas, contracts, CLI, env, data) so that a single content source drives every surface.

핵심 디렉터리:

- `apps/portfolio` — Cloudflare Worker 기반 공개 포트폴리오. `entry.js`가 빌드 입력, `worker.js`는 생성 산출물.
- `apps/job-server` — Node.js/Fastify MCP 서버, Wanted·JobKorea 크롤러, 자동 지원 스크립트, 동기화 CLI.
- `apps/job-dashboard` — Cloudflare Worker 대시보드, `fetch`/`queue`/`scheduled` 핸들러, D1 마이그레이션.
- `packages/data` — 이력서·지원 콘텐츠 SSoT (`resumes/master/resume_data.json`).
- `packages/types`, `packages/schemas`, `packages/contracts` — JSDoc/TS 도메인 타입, Zod 런타임 스키마, OpenAPI/Worker env 계약.
- `packages/cli`, `packages/shared`, `packages/env` — 운영 CLI, 공용 유틸(에러·로거·재시도·암호화·레이트리밋·인증·브라우저·클라이언트), 런타임 환경 검증.
- `applications/` — 회사·직무별 이력서·자기소개서·미리보기 묶음(예: `coupang-fintech-sre-2026/`, `cloudflare-one-se-2026/`, `gitlab-apac-security-2026/`, `openai-codex-korea-2026/`, `airpremia-security-2026/`, `security-ir-2026/`, `infrastructure-architecture-2026/`, `job-search-2026-07/`).
- `tools/scripts` — Go 우선 빌드·동기화·배포·검증 스크립트(1Password, PDF 생성기, 제안 동기화, 데이터 보강, 보안 점검).
- `ta/` — Python 기반 PPTX 프로필 생성 도구와 출력 디렉터리.
- `infrastructure/` — Cloudflare, DB, 모니터링, 시스템 자동화 설정.
- `docs/` — ADR, 아키텍처, 규약, 가이드, 보안 문서.
- `supabase/functions/` — Deno 엣지 함수.
- `third_party/` — npm으로 관리되는 벤더 자료.

## 상태와 책임자 / Status and Maintainers

- 현재 버전: **1.40.11** (`package.json` 기준).
- 기본 브랜치: `master`. 이 저장소는 활발히 운영 중이며 더 이상 사용하지 않는 상태가 아닙니다.
- 운영 배포 권한: Cloudflare Workers Builds (저장소 내 GitHub Actions는 검증과 릴리스 보조).
- 책임자와 의사결정 권한은 `OWNERS` 파일을 참조하세요.
- 기여 절차와 PR 규칙은 `CONTRIBUTING.md`를 따릅니다.

Active and production-oriented on the `master` branch. Production deploys are driven by Cloudflare Workers Builds; repository workflows provide validation and release support only.

## 처음 읽을 파일 / First Files to Read

운영자 또는 신규 기여자가 가장 먼저 열어야 할 파일은 다음과 같습니다.

- `package.json` — 워크스페이스 정의와 `sync:*`, `enrich:*`, `op:*`, `automate:*` 등 명령 표면.
- `Dockerfile` + `docker-compose.yml` — `job-server` 멀티 스테이지 이미지와 헬스체크·볼륨 구성.
- `apps/portfolio/` — 공개 포트폴리오 진입점(`entry.js`)과 빌드 생성기. `worker.js`는 직접 수정 금지.
- `apps/job-server/src/server/index.js` — 취업 자동화 서버 부트스트랩.
- `apps/job-dashboard/src/index.js` — 대시보드 Worker의 `fetch`/`queue`/`scheduled` 핸들러.
- `packages/data/resumes/master/resume_data.json` — 콘텐츠 SSoT.
- `docs/conventions/architecture-rules.md` — 200 LOC 규칙, 명명, 자동화 SSoT, 스크립트 언어 정책.
- `AGENTS.md` — 워크스페이스 지식 베이스와 "어디를 볼 것인가" 안내.

## API 및 엔트리 포인트 / API and Entry Points

### 공개 포트폴리오 — Cloudflare Worker

- 진입점 소스: `apps/portfolio/entry.js` (`package.json`의 `main`은 빌드 산출물 `apps/portfolio/worker.js`).
- 빌드 산출물: `apps/portfolio/worker.js` — 생성 파일이므로 직접 수정하지 마세요.
- 라우팅: HTML/데이터/lib 모듈을 머지한 엣지 페치 라우터.

### 취업 자동화 MCP 서버 — Node.js / Fastify

- 부트스트랩: `apps/job-server/src/index.js`의 `main()`이 프로세스 시작·종료를 처리.
- 서버: `apps/job-server/src/server/index.js` (`Dockerfile`의 CMD 타깃).
- 헬스체크: `GET /health` → 200 OK. `Dockerfile`과 `docker-compose.yml`의 헬스체크가 동일 엔드포인트를 30초 간격으로 폴링합니다.
- 도커 컴포즈 서비스명: `mcp-server`, 포트 매핑 `3000:3000`, 볼륨 `job_automation_data`(`apps/job-server/.data` 지속화), 재시작 정책 `unless-stopped`.

### 대시보드 — Cloudflare Worker

- 진입점: `apps/job-dashboard/src/index.js`.
- 핸들러 종류: `fetch`, `queue`, `scheduled`.
- 부속 모듈: `src/router.js`, `src/queue-consumer.js`, `src/middleware/`.
- 영속화: `schema.sql`, `migrations/0002_add_approval_metadata.sql`, `migrations/0003_add_auto_apply_application_metadata.sql`, 마이그레이션 러너 `migrate-json-to-d1.cjs`.
- 문서: `API_REFERENCE.md`, `DEPLOYMENT_GUIDE.md`, `DEVELOPMENT_GUIDE.md`, `DIAGRAMS.md`, `SECRETS.md`.

### 계약 / 명세

- 위치: `packages/contracts/`.
- 포함: OpenAPI 명세, Cloudflare Worker env 계약.

## 빠른 시작 / Quickstart

### 1. 의존성 설치

루트에서 워크스페이스 전체 의존성을 설치합니다.

```bash
npm ci
```

### 2. 콘텐츠 SSoT → 산출물 동기화

이력서 데이터 변경 후 PDF/PPTX를 한 번에 갱신합니다.

```bash
npm run sync:all
```

### 3. 포트폴리오 로컬 실행

```bash
cd apps/portfolio
npm run dev
```

### 4. job-server 컨테이너 실행

Docker가 설치된 환경에서 MCP 서버와 헬스체크를 함께 기동합니다.

```bash
docker compose up -d mcp-server
docker compose ps
curl -fsS http://localhost:3000/health
```

### 5. 대시보드 로컬 실행

```bash
cd apps/job-dashboard
npm run dev
```

## 명령 레퍼런스 / Commands Reference

루트 `package.json` 스크립트 중 운영자가 자주 쓰는 명령입니다.

- **동기화 / 빌드**
  - `npm run sync:data` — SSoT JSON에서 도메인 데이터 동기화.
  - `npm run sync:pdf` — Go 기반 PDF 생성기 실행.
  - `npm run sync:pptx` — Python 기반 PPTX 생성.
  - `npm run sync:all` — 위 세 명령을 순차 실행.
  - `npm run sync:proposals` — 제안 동기화 CLI + Go 어플라이어.
- **1Password / 시크릿**
  - `npm run op:run` — 1Password CLI 러너(Go).
  - `npm run op:native:run` — 네이티브 1Password 러너.
  - `npm run op:seed:resume` — 1Password에 이력서 시드.
  - `npm run op:seed:sessions` / `npm run op:restore:sessions` — 세션 파일 시드/복원.
- **데이터 보강**
  - `npm run enrich:github` / `npm run enrich:skills` / `npm run enrich:ai` — 각 보강 파이프라인.
  - `npm run enrich:all` — 세 파이프라인 일괄 실행.
- **자동화 파이프라인**
  - `npm run automate:ssot` — 동기화 → 빌드 → 타입체크 → Node 테스트.
  - `npm run automate:full` — 동기화 → 린트 → … (저장소 정책에 따라 추가 단계 정의).
- **유틸리티**
  - `npm run strip-exif` — 이미지에서 EXIF 제거(exiftool 의존, 없으면 스킵).

각 워크스페이스 디렉터리의 자체 `README.md`, `DEVELOPMENT_GUIDE.md`, `DEPLOYMENT_GUIDE.md`에 워크플로 세부 단계가 정리되어 있습니다.

## 로컬 개발 / Local Development

- 권장 도구: Node.js 22 LTS, Python 3.x, Go 1.22 이상.
- 워크스페이스 패키지 경계는 각 패키지의 `AGENTS.md` 또는 자체 가이드를 따릅니다.
- 새 코드는 `docs/conventions/architecture-rules.md`의 200 LOC 규칙과 명명·자동화 SSoT 규칙을 준수합니다.
- 스크립트 언어 정책: 빌드·동기화·배포·검증은 Go 우선, 보조로 Python과 Node 사용.
- 자격 증명은 1Password CLI 또는 시크릿 매니저를 통해 주입하며 평문 커밋을 금지합니다.

## 테스트 / Testing

- 단위/통합 테스트: `tests/`, 워크스페이스별 `jest.config.cjs`.
- E2E 테스트: Playwright (`playwright.config.js`).
- 링크 무결성: `lychee.toml`.
- API 명세 lint: `redocly.yaml`.
- 코드 스타일: `eslint.config.cjs`.
- TypeScript 베이스: `tsconfig.base.json`, `tsconfig.json`.
- Cloudflare 설정: `wrangler.jsonc`.
- 이미지 위생: `npm run strip-exif`(EXIF 제거).

## 설정과 시크릿 / Configuration and Secrets

- 환경 변수 검증: `packages/env/`.
- 시크릿 운영 도구: `tools/scripts/onepassword/`(시드, 복원, 네이티브 실행).
- 컨테이너 환경 변수: `docker-compose.yml`의 `env_file: .env`로 주입.
- 절차 상세: `apps/job-dashboard/SECRETS.md` 및 `docs/security/`.
- 설계 메모와 미결정 사항: `design-state.md`.
- 변경 이력: `CHANGELOG.md`.

## 기여와 연락처 / Contributing and Contact

- 절차: `CONTRIBUTING.md`.
- 책임자: `OWNERS`.
- 지식 베이스: `AGENTS.md`(루트 및 각 워크스페이스/도메인 디렉터리).
- 지원 채널: 저장소 이슈 트래커와 PR 흐름을 따릅니다.

## 추가 문서 / Further Documentation

- `docs/conventions/architecture-rules.md` — 아키텍처 규칙, 200 LOC, 명명, 자동화 SSoT.
- `docs/architecture/` — 시스템 구조와 결정 기록.
- `docs/guides/` — 운영/개발 가이드.
- `docs/security/` — 보안 정책과 시크릿 운영.
- 워크스페이스 가이드
  - `apps/portfolio/` 내부 문서
  - `apps/job-server/` 내부 문서
  - `apps/job-dashboard/API_REFERENCE.md`, `DEPLOYMENT_GUIDE.md`, `DEVELOPMENT_GUIDE.md`, `DIAGRAMS.md`, `SECRETS.md`
- 회사·직무별 지원 묶음: `applications/<role>-<year>/` 아래 자기소개서, 이력서, 미리보기, 가이드.

## 라이선스 / License

저장소 루트의 `LICENSE` 파일을 참조하세요.