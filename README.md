# Resume Portfolio & Job Automation Workspace

![Node.js](https://img.shields.io/badge/Node.js-22-339933)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)
![License](https://img.shields.io/badge/license-see%20LICENSE-blue)

공개 포트폴리오 사이트, 이력서 SSoT 데이터, 채용 플랫폼 자동화 런타임,
대시보드/API, 공유 스키마와 운영 스크립트를 한 작업공간에서 관리합니다.

English: This workspace powers a Cloudflare Worker portfolio, resume data
single source of truth, job-automation services, dashboards, shared contracts,
and operator tooling.

| 항목 | 현재 상태 | 다음 작업 |
| --- | --- | --- |
| 공개 포트폴리오 | Cloudflare Worker 기반, `apps/portfolio/worker.js`는 생성물 | `npm run sync:all` 후 Worker 빌드/배포 |
| 채용 자동화 서버 | Docker/Node 22 런타임, `/health` 헬스체크 | `docker compose up --build` |
| 대시보드/API | Worker `fetch`, `queue`, `scheduled` 진입점 | `docs/api/README.md`와 계약 확인 |
| 데이터 SSoT | `packages/data`의 이력서/지원 데이터가 기준 | `npm run sync:data` |
| 운영 책임 | 코드 소유자와 운영 문서는 `OWNERS`, `docs/runbooks/` | 변경 전 `CONTRIBUTING.md` 확인 |

## 흐름 요약

- 작성자는 `packages/data`에서 이력서와 지원 데이터를 갱신합니다.
  English: Resume/application content is updated from the data package.
- 운영자는 `npm run sync:all`로 포트폴리오 산출물과 문서를 동기화합니다.
- 자동화 런타임은 Docker로 실행하고 `/health`로 상태를 확인합니다.
- Cloudflare Worker 배포와 보안 작업은 `docs/deployment-guide.md`,
  `docs/security/` 문서를 기준으로 진행합니다.

## 목차

- [목적](#목적)
- [주요 기능](#주요-기능)
- [패키지 구성](#패키지-구성)
- [처음 읽을 파일](#처음-읽을-파일)
- [아키텍처](#아키텍처)
- [API와 진입점](#api와-진입점)
- [빠른 시작](#빠른-시작)
- [설정](#설정)
- [명령어](#명령어)
- [로컬 개발](#로컬-개발)
- [테스트와 품질 검사](#테스트와-품질-검사)
- [배포와 운영](#배포와-운영)
- [보안](#보안)
- [기여](#기여)
- [도움 요청과 유지보수](#도움-요청과-유지보수)
- [추가 문서](#추가-문서)
- [라이선스](#라이선스)

## 목적

이 저장소는 개인 포트폴리오와 채용 지원 운영을 자동화하기 위한
통합 작업공간입니다.

주요 목표는 다음과 같습니다.

- 포트폴리오 사이트를 Cloudflare Worker에서 빠르게 제공
- 이력서, 프로젝트, 지원 이력을 SSoT로 관리
- Wanted/JobKorea 등 채용 플랫폼 관련 자동화 런타임 운영
- 대시보드/API로 지원 현황과 작업 큐를 확인
- 공유 타입, Zod 스키마, OpenAPI 계약으로 런타임 간 데이터 일관성 유지
- Docker, Wrangler, Jest, Playwright 기반의 재현 가능한 운영 환경 제공

English: The repository keeps portfolio delivery, resume content, application
automation, runtime contracts, and operational scripts in one reproducible
workspace.

## 주요 기능

- Cloudflare Worker 기반 공개 포트폴리오
- Node.js 기반 채용 자동화 서버와 Docker 런타임
- 대시보드 Worker의 HTTP, queue, scheduled 처리
- 이력서 데이터 동기화, PDF/PPTX 생성, 제안서 반영 명령
- GitHub, 기술 스킬, AI 보강용 enrichment 스크립트
- 공유 패키지:
  - 공통 유틸리티와 클라이언트
  - 도메인 타입
  - Zod 런타임 스키마
  - OpenAPI/Worker 계약
  - 환경 변수 검증
- Jest, Playwright, Redocly, Lychee 설정을 통한 품질 검증
- 운영 런북과 보안 플레이북

## 패키지 구성

루트 `package.json`은 npm workspaces를 사용합니다.

주요 워크스페이스는 다음과 같습니다.

- `apps/portfolio`:
  공개 포트폴리오 Worker입니다. `worker.js`는 빌드 산출물이므로
  직접 수정하지 않습니다.
- `apps/job-server`:
  채용 자동화 서버, MCP 런타임, 크롤러, 플랫폼 클라이언트,
  서버 측 API를 포함합니다.
- `apps/job-dashboard`:
  대시보드 Worker입니다. `fetch`, `queue`, `scheduled` 이벤트를 처리합니다.
- `packages/cli`:
  운영자용 CLI 패키지입니다.
- `packages/data`:
  이력서와 지원 콘텐츠의 기준 데이터입니다.
- `packages/shared`:
  로거, 오류 처리, 재시도, 암호화, 인증, 브라우저, 클라이언트 등
  공통 기능을 제공합니다.
- `packages/types`:
  도메인 타입의 기준 정의입니다.
- `packages/schemas`:
  Zod 기반 런타임 검증 스키마입니다.
- `packages/contracts`:
  OpenAPI 스펙과 Cloudflare Worker 환경 계약입니다.
- `packages/env`:
  런타임 환경 변수 검증을 담당합니다.

보조 디렉터리:

- `docs/`: 아키텍처, ADR, 배포, 보안, 런북
- `tools/`: 빌드, 동기화, 배포, 검증, 보안 스크립트
- `tests/`: Jest, Node, Playwright 테스트
- `applications/`: 역할별 지원 패킷과 실행 로그
- `infrastructure/`: Cloudflare, DB, 모니터링, 시스템 자동화 구성
- `supabase/functions/`: Deno edge functions
- `ta/`: Python/PPTX 기반 TA 프로필 생성
- `third_party/`: npm 관리 벤더 자료

## 처음 읽을 파일

처음 기여하거나 운영할 때는 아래 순서로 읽는 것을 권장합니다.

1. `CONTRIBUTING.md`
   - 개발 흐름, 커밋/PR 기준, 기여 규칙
2. `OWNERS`
   - 코드 소유자와 리뷰 책임
3. `docs/ARCHITECTURE.md`
   - 시스템 구성과 주요 설계 의도
4. `docs/conventions/architecture-rules.md`
   - 패키지 경계, 파일 크기, 명명 규칙, 스크립트 정책
5. `docs/deployment-guide.md`
   - Cloudflare 배포와 운영 절차
6. `docs/security/SECRET_ROTATION_PLAYBOOK.md`
   - 시크릿 교체와 보안 운영
7. `docs/runbooks/PENDING_OPERATOR_ACTIONS.md`
   - 운영자가 확인해야 할 미완료 작업

English: Start with contribution rules, ownership, architecture, deployment,
and security runbooks before changing runtime behavior.

## 아키텍처

이 저장소는 여러 런타임을 공유 데이터와 계약으로 묶는 구조입니다.

### 요청/데이터 흐름

1. 작성자는 `packages/data`에서 이력서와 지원 데이터를 갱신합니다.
2. 동기화 스크립트가 포트폴리오, PDF, PPTX, 지원 패킷을 갱신합니다.
3. `apps/portfolio` 빌드가 공개 Worker 산출물을 생성합니다.
4. Cloudflare Worker가 포트폴리오와 일부 대시보드 경로를 제공합니다.
5. `apps/job-server`는 Docker/Node 런타임에서 자동화 작업을 수행합니다.
6. `apps/job-dashboard`는 HTTP 요청, 큐, 스케줄 이벤트를 처리합니다.
7. `packages/contracts`, `packages/types`, `packages/schemas`가
   런타임 간 데이터 계약을 고정합니다.
8. 테스트와 운영 스크립트가 변경 사항을 검증합니다.

### 설계 원칙

- 데이터 기준은 하나로 유지합니다.
- 생성 파일은 직접 수정하지 않습니다.
- 타입과 런타임 검증은 같은 도메인 모델을 바라봅니다.
- Worker와 Node 런타임의 책임을 분리합니다.
- 운영 작업은 문서화된 명령과 런북을 통해 재현 가능해야 합니다.

관련 ADR:

- `docs/adr/0001-monorepo-structure.md`
- `docs/adr/0002-zero-runtime-io.md`
- `docs/adr/0003-single-source-of-truth.md`
- `docs/adr/0005-cloudflare-workers.md`
- `docs/adr/0006-single-worker-architecture.md`
- `docs/adr/0009-single-worker-consolidation.md`

## API와 진입점

### 애플리케이션 진입점

- Portfolio Worker:
  - `apps/portfolio/entry.js`
  - `apps/portfolio/worker.js`는 생성된 Worker 파일입니다.
- Job server:
  - `apps/job-server/src/index.js`
  - `apps/job-server/src/server/index.js`
- Job dashboard Worker:
  - `apps/job-dashboard/src/index.js`
  - `fetch`, `queue`, `scheduled` 핸들러를 포함합니다.
- 계약과 API 문서:
  - `packages/contracts`
  - `docs/api/README.md`
  - `redocly.yaml`

### 운영자가 주로 사용하는 엔드포인트

- `GET /health`
  - Docker 런타임 헬스체크에 사용됩니다.
- 포트폴리오 Worker 경로
  - 공개 포트폴리오와 대시보드 관련 경로를 제공합니다.
- 대시보드/API 경로
  - 상세 계약은 `docs/api/README.md`와 `packages/contracts`를 확인합니다.

## 빠른 시작

### 요구 사항

- Node.js 22
- npm
- Docker와 Docker Compose
- Cloudflare 배포가 필요한 경우 Wrangler 설정
- PDF/PPTX 생성 작업이 필요한 경우 Go, Python 3
- 이미지 메타데이터 제거가 필요한 경우 `exiftool`

### 설치

```bash
npm ci
```

### 데이터 동기화

```bash
npm run sync:data
```

전체 산출물을 동기화하려면 다음을 실행합니다.

```bash
npm run sync:all
```

이 명령은 데이터, PDF, PPTX 생성을 순서대로 실행합니다.

### 채용 자동화 서버 실행

```bash
docker compose up --build
```

헬스체크:

```bash
curl http://localhost:3000/health
```

중지:

```bash
docker compose down
```

## 설정

### 로컬 환경 변수

Docker Compose는 루트의 `.env` 파일을 읽습니다.

```bash
cp .env.example .env
```

`.env.example`이 없는 환경에서는 필요한 키를 운영 문서와
`packages/env` 검증 로직에 맞춰 구성합니다.

주의:

- 실제 시크릿은 저장소에 커밋하지 않습니다.
- 로컬 세션과 1Password 관련 작업은 `tools/scripts/onepassword/`와
  보안 문서를 따릅니다.
- Cloudflare 배포 설정은 `wrangler.jsonc`와 배포 문서를 기준으로 합니다.

### Cloudflare

관련 파일:

- `wrangler.jsonc`
- `docs/deployment-guide.md`
- `docs/GITHUB_ACTIONS_DEPLOYMENT_GUIDE.md`
- `docs/GITHUB_ACTIONS_SECRETS.md`
- `docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`

### Docker

Docker 런타임은 `apps/job-server`를 실행합니다.

- 베이스 이미지: `node:22-alpine`
- 기본 포트: `3000`
- 런타임 명령:
  `node src/server/index.js`
- 영속 데이터 볼륨:
  `job_automation_data`
- 헬스체크:
  `GET /health`

## 명령어

루트 `package.json`의 주요 명령입니다.

### 데이터와 산출물

```bash
npm run sync:data
npm run sync:pdf
npm run sync:pptx
npm run sync:all
```

용도:

- `sync:data`: 이력서/지원 데이터 동기화
- `sync:pdf`: 기준 이력서 PDF 생성
- `sync:pptx`: PPTX 산출물 생성
- `sync:all`: 데이터, PDF, PPTX 전체 동기화

### 지원 제안과 enrichment

```bash
npm run sync:proposals
npm run enrich:github
npm run enrich:skills
npm run enrich:ai
npm run enrich:all
```

용도:

- 지원 제안 검토 결과 반영
- GitHub/스킬/AI 기반 보강 데이터 생성
- 전체 enrichment 파이프라인 실행

### 운영 시크릿과 세션

```bash
npm run op:run
npm run op:native:run
npm run op:seed:resume
npm run op:seed:sessions
npm run op:restore:sessions
```

용도:

- 1Password 기반 로컬 운영 작업
- 이력서 시크릿 seed
- 세션 파일 seed/restore

자세한 절차는 `docs/security/`와
`docs/runbooks/`를 확인합니다.

### 자동화 검증

```bash
npm run automate:ssot
```

이 명령은 데이터 동기화, 빌드, 타입 검사, Node 테스트를 묶어
SSoT 변경을 검증합니다.

`automate:full`도 정의되어 있으며, 전체 검증 범위는
루트 `package.json`의 최신 스크립트 정의를 확인합니다.

### 이미지 메타데이터 제거

```bash
npm run strip-exif
```

`apps/portfolio/src/images`의 PNG/WebP 파일에서 EXIF 메타데이터를
제거합니다. `exiftool`이 없으면 스킵됩니다.

## 로컬 개발

### 일반 작업 흐름

1. 의존성을 설치합니다.

   ```bash
   npm ci
   ```

2. 데이터 기준 파일을 수정합니다.

   ```bash
   npm run sync:data
   ```

3. 필요한 산출물을 생성합니다.

   ```bash
   npm run sync:all
   ```

4. 타입, 테스트, 린트를 실행합니다.

   ```bash
   npm run automate:ssot
   ```

5. 서버 런타임이 필요한 경우 Docker로 실행합니다.

   ```bash
   docker compose up --build
   ```

### 포트폴리오 개발 주의 사항

- `apps/portfolio/worker.js`는 생성물입니다.
- 소스는 `apps/portfolio/entry.js`, HTML, `src/`, `lib/`에서 수정합니다.
- 이미지 추가 후에는 `npm run strip-exif`를 실행합니다.
- Cloudflare 배포 전에는 `docs/deployment-guide.md`를 확인합니다.

### 채용 자동화 서버 개발

- 서버 진입점은 `apps/job-server/src/server/index.js`입니다.
- MCP 부트스트랩은 `apps/job-server/src/index.js`를 확인합니다.
- Docker 이미지는 런타임에 필요한 workspace 패키지만 복사합니다.
- 로컬 데이터는 Docker volume에 유지됩니다.

### 대시보드 개발

- Worker 진입점은 `apps/job-dashboard/src/index.js`입니다.
- HTTP 요청, 큐, 스케줄 이벤트를 함께 다룹니다.
- API 계약 변경 시 `packages/contracts`와 `docs/api/README.md`를
  함께 갱신합니다.

## 테스트와 품질 검사

이 저장소는 여러 검증 도구를 사용합니다.

- Jest:
  - 설정 파일: `jest.config.cjs`
  - Node/unit/integration 테스트에 사용
- Playwright:
  - 설정 파일: `playwright.config.js`
  - 브라우저 기반 e2e 테스트에 사용
- ESLint:
  - 설정 파일: `eslint.config.cjs`
- TypeScript:
  - 설정 파일: `tsconfig.json`, `tsconfig.base.json`
- Redocly:
  - 설정 파일: `redocly.yaml`
  - OpenAPI 계약 검증에 사용
- Lychee:
  - 설정 파일: `lychee.toml`
  - 문서 링크 검증에 사용

대표 명령:

```bash
npm run automate:ssot
```

개별 테스트 명령은 루트 `package.json`과 각 workspace의
`package.json`을 기준으로 실행합니다.

Playwright를 직접 실행해야 하는 경우:

```bash
npx playwright test
```

OpenAPI 문서 검증이 필요한 경우:

```bash
npx redocly lint
```

링크 검증이 필요한 경우:

```bash
npx lychee .
```

## 배포와 운영

### Cloudflare Worker 배포

배포 전 확인할 문서:

- `docs/deployment-guide.md`
- `docs/DEPLOYMENT_READINESS_REPORT.md`
- `docs/GITHUB_ACTIONS_DEPLOYMENT_GUIDE.md`
- `docs/GITHUB_ACTIONS_SECRETS.md`
- `docs/architecture/DEPLOYMENT_PIPELINE.md`

운영 절차:

1. SSoT 데이터를 동기화합니다.
2. 빌드와 테스트를 통과시킵니다.
3. Wrangler/Cloudflare 설정을 확인합니다.
4. 배포 후 헬스체크와 주요 경로를 확인합니다.
5. 문제가 있으면 `docs/runbooks/`의 런북을 우선 확인합니다.

### Docker 운영

실행:

```bash
docker compose up -d --build
```

로그 확인:

```bash
docker compose logs -f mcp-server
```

상태 확인:

```bash
docker compose ps
curl http://localhost:3000/health
```

중지:

```bash
docker compose down
```

데이터 볼륨까지 제거해야 하는 경우에는 Docker Compose의 volume 삭제
옵션을 사용하기 전에 반드시 백업 필요 여부를 확인합니다.

## 보안

보안 운영은 문서화된 절차를 따릅니다.

주요 문서:

- `docs/security/SECRET_ROTATION_PLAYBOOK.md`
- `docs/security/FOREIGN_APPLICATION_AUTOMATION.md`
- `docs/security/SECURITY_AUDIT_TASK_4.3.md`
- `docs/SECURITY_WARNING.md`
- `docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`

기본 원칙:

- 시크릿, 세션 파일, 개인 인증 정보는 커밋하지 않습니다.
- `.env`는 로컬에서만 사용합니다.
- 외부 플랫폼 자동화는 해당 플랫폼 정책과 보안 문서를 확인한 뒤 실행합니다.
- 생성된 이력서/지원 자료에 민감 정보가 포함될 수 있으므로
  배포 전 공개 범위를 확인합니다.
- 이미지 업로드 전 `npm run strip-exif`로 메타데이터를 제거합니다.
- 키 교체와 사고 대응은 런북을 기준으로 진행합니다.

## 기여

기여 전 확인:

1. `CONTRIBUTING.md`를 읽습니다.
2. 관련 소유자를 `OWNERS`에서 확인합니다.
3. 아키텍처 규칙을 확인합니다.
4. 변경 범위에 맞는 테스트를 실행합니다.
5. 생성 파일을 직접 수정하지 않았는지 확인합니다.

권장 PR 체크리스트:

- 데이터 변경 시 `npm run sync:data` 또는 `npm run sync:all` 실행
- 런타임 변경 시 관련 테스트 실행
- 계약 변경 시 `packages/contracts`와 문서 동시 갱신
- 보안 관련 변경 시 `docs/security/` 문서 확인
- 배포 관련 변경 시 `docs/deployment-guide.md` 확인

## 도움 요청과 유지보수

유지보수 책임과 리뷰 경로는 `OWNERS`를 기준으로 합니다.

도움이 필요할 때:

- 개발/기여 규칙:
  `CONTRIBUTING.md`
- 운영 미해결 작업:
  `docs/runbooks/PENDING_OPERATOR_ACTIONS.md`
- 배포 문제:
  `docs/deployment-guide.md`
- 보안/시크릿 문제:
  `docs/security/SECRET_ROTATION_PLAYBOOK.md`
- 아키텍처 판단:
  `docs/ARCHITECTURE.md`와 `docs/adr/`

English: Use OWNERS for maintainership, CONTRIBUTING for contribution rules,
and runbooks for operational decisions.

## 추가 문서

주요 문서 색인:

- `docs/README.md`
- `docs/index.md`
- `docs/ARCHITECTURE.md`
- `docs/api/README.md`
- `docs/conventions/architecture-rules.md`
- `docs/deployment-guide.md`
- `docs/bazel.md`
- `docs/test-oracle.md`
- `docs/lint-ratchet-strategy.md`

아키텍처 세부 문서:

- `docs/architecture/system-overview.md`
- `docs/architecture/project-context.md`
- `docs/architecture/component-inventory.md`
- `docs/architecture/kv-ownership.md`
- `docs/architecture/env-validation-plan.md`
- `docs/architecture/session-management-triage.md`
- `docs/architecture/rate-limiting-triage.md`
- `docs/architecture/TECH_DEBT_RESOLUTION_2026-07-06.md`

포트폴리오와 이력서 관련 문서:

- `docs/portfolio-requirements.md`
- `docs/wanted-resume-sync.md`
- `docs/resume-metric-prompts.md`
- `docs/wishket-portfolio.md`
- `docs/job-transition-storyboard.md`

운영 런북:

- `docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`
- `docs/runbooks/PENDING_OPERATOR_ACTIONS.md`

## 라이선스

라이선스는 `LICENSE` 파일을 확인하세요.

English: See `LICENSE` for licensing terms.