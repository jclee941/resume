# Resume Workspace

> Cloudflare Worker 포트폴리오, Wanted/JobKorea 잡 자동화, SSoT 콘텐츠, 자체 호스팅 관측성을 한 워크스페이스에서 운영하는 레주메 운영 환경입니다.
>
> A unified resume workspace combining a Cloudflare Worker portfolio, job-platform automation, single-source-of-truth content, and self-hosted observability.

## 빠른 요약

- **무엇인가**: 개인 포트폴리오와 채용 플랫폼 자동화를 한 저장소에서 운영하는 워크스페이스.
- **누가 사용하나**: 레주메 운영자, 잡 자동화 실행자, 데이터/콘텐츠 편집자.
- **어떻게 시작하나**: 루트 `package.json` 스크립트로 동기화 → 빌드 → 배포. 로컬 검증은 `docker compose up`.
- **현재 상태**: 활성 개발(`1.40.11`), `master` 브랜치 운영. 배포는 Cloudflare Workers Builds가 권위.

## Status

| 영역 | 값 | 비고 |
| --- | --- | --- |
| 버전 | `1.40.11` | `package.json` 기준 |
| 워크스페이스 | `apps/*`, `packages/*` 9개 | npm workspaces |
| 런타임 엔트리 | `apps/portfolio/worker.js` | 생성 파일(직접 수정 금지) |
| 컨테이너 런타임 | `mcp-server` | `Dockerfile` + `docker-compose.yml` |
| 배포 권위 | Cloudflare Workers Builds | 로컬 직접 배포 비권장 |
| 노드 런타임 | Node 22 (Alpine) | `Dockerfile` 기준 |

## First Files to Read

운영자가 가장 먼저 봐야 할 파일입니다.

| 우선순위 | 경로 | 역할 |
| --- | --- | --- |
| 1 | `package.json` | 루트 스크립트 허브, 워크스페이스 정의 |
| 2 | `apps/portfolio/entry.js` | 포트폴리오/잡 대시보드 엣지 라우터 |
| 3 | `apps/job-server/src/index.js` | 잡 자동화 MCP 부트스트랩 |
| 4 | `apps/job-dashboard/src/index.js` | 대시보드 Worker fetch/queue/scheduled |
| 5 | `packages/data/resumes/master/resume_data.json` | 레주메 콘텐츠 SSoT |
| 6 | `docs/architecture/system-overview.md` | 시스템 개요 |
| 7 | `docs/conventions/architecture-rules.md` | 200-LOC 규칙, 명명, 스크립트 언어 정책 |

## Architecture

### 구성요소

| 영역 | 위치 | 책임 |
| --- | --- | --- |
| Portfolio | `apps/portfolio/` | Cloudflare Worker 정적/동적 포트폴리오. `worker.js`는 빌드 산출물. |
| Job Server | `apps/job-server/` | MCP/잡 자동화 런타임, 크롤러, 자동 지원 스크립트. |
| Job Dashboard | `apps/job-dashboard/` | 대시보드 Worker, queue/scheduled 오케스트레이션. |
| Shared | `packages/shared/` | 에러, 로거, 재시도, 크립토, 레이트리밋, 브라우저, 클라이언트. |
| Types | `packages/types/` | JSDoc/TS 도메인 타입. |
| Schemas | `packages/schemas/` | Zod 런타임 스키마. |
| Data | `packages/data/` | 레주메/지원서 콘텐츠 SSoT. |
| Env | `packages/env/` | 런타임 환경 변수 검증. |
| Contracts | `packages/contracts/` | OpenAPI/Worker env 계약. |
| CLI | `packages/cli/` | 운영자용 CLI. |

### 요청 흐름 (요약)

1. 요청은 `apps/portfolio/entry.js`로 진입하거나 `apps/job-dashboard` Worker 핸들러로 라우팅됩니다.
2. 도메인 로직은 `packages/shared`의 클라이언트와 미들웨어를 통해 호출됩니다.
3. 데이터는 `packages/data`의 JSON SSoT를 단일 출처로 사용하며 `packages/schemas`로 검증됩니다.
4. 잡 자동화 호출은 `apps/job-server`로 전달되어 플랫폼 클라이언트(원티드/잡코리아)로 실행됩니다.
5. 관측 데이터는 자체 호스팅 대시보드로 노출됩니다.

자세한 다이어그램과 결정 기록은 [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md)와 [`docs/adr/`](docs/adr/)를 참조하세요.

## Quickstart

### 사전 요구사항

- Node.js 22+
- npm 10+(workspaces 지원)
- 선택: Docker, Docker Compose, Go 1.22+(운영 스크립트 실행 시)

### 로컬 검증

```bash
npm ci
npm run sync:data
npm run build
```

### 컨테이너 실행

```bash
docker compose up -d
curl http://127.0.0.1:3000/health
```

`mcp-server` 서비스는 `/health` 엔드포인트를 노출하며 30초 간격으로 헬스체크합니다.

## Configuration

| 환경 변수 | 용도 | 출처 |
| --- | --- | --- |
| `NODE_ENV` | 런타임 모드 | `Dockerfile`/`docker-compose.yml` |
| `PORT` | 잡 서버 포트(기본 3000) | `docker-compose.yml` |
| 워커 환경 | KV/시크릿 바인딩 | `wrangler.jsonc`, Cloudflare 대시보드 |

로컬 환경 변수 검증은 `packages/env`가 담당하며 잘못된 값은 부트스트랩 단계에서 거부합니다. 시크릿은 [`docs/security/SECRET_ROTATION_PLAYBOOK.md`](docs/security/SECRET_ROTATION_PLAYBOOK.md)와 [`docs/security/FOREIGN_APPLICATION_AUTOMATION.md`](docs/security/FOREIGN_APPLICATION_AUTOMATION.md) 절차로만 회전합니다.

## Commands Reference

| 스크립트 | 목적 |
| --- | --- |
| `npm run sync:data` | 레주메 JSON SSoT 동기화 |
| `npm run sync:pdf` | PDF 마스터 산출물 생성 |
| `npm run sync:pptx` | 신한 PDF용 PPTX 생성 |
| `npm run sync:all` | 데이터/PDF/PPTX 통합 동기화 |
| `npm run op:run` / `op:native:run` | 1Password CLI 실행 |
| `npm run op:seed:resume` | 1Password 레주메 시드 |
| `npm run op:seed:sessions` / `op:restore:sessions` | 세션 파일 시드/복원 |
| `npm run sync:proposals` | 제안 동기화 |
| `npm run enrich:github` / `enrich:skills` / `enrich:ai` | 프로필 보강 |
| `npm run enrich:all` | 전체 보강 파이프라인 |
| `npm run automate:ssot` | SSoT 동기화 → 빌드 → 타입체크 → 테스트 |
| `npm run automate:full` | 동기화 + 린트 전체 파이프라인 |
| `npm run strip-exif` | 이미지 메타데이터 제거 |

전체 스크립트 목록은 [`package.json`](package.json)을 참조하세요.

## Local Development

- 워크스페이스 루트에서 `npm ci`로 의존성 설치.
- 코드 스타일은 [`docs/CODE_STYLE.md`](docs/CODE_STYLE.md)와 [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md) 적용.
- 새 패키지/앱 추가 시 `apps/` 또는 `packages/` 하위에 위치시키고 `package.json` `workspaces`에 등록.
- Go 기반 운영 스크립트는 `tools/scripts/`에서 실행.

## Testing

| 도구 | 위치 | 용도 |
| --- | --- | --- |
| Jest | `jest.config.cjs`, `tests/` | 유닛/통합 테스트 |
| Playwright | `playwright.config.js` | E2E |
| ESLint | `eslint.config.cjs` | 정적 분석 |
| TypeScript | `tsconfig.base.json` | 타입체크 |
| Redocly | `redocly.yaml` | API 명세 린트 |
| Lychee | `lychee.toml` | 링크 검사 |

운영 린트 래칫 전략은 [`docs/lint-ratchet-strategy.md`](docs/lint-ratchet-strategy.md)를 참조하세요.

## Package Contents

| 패키지/앱 | 설명 |
| --- | --- |
| `apps/portfolio` | Cloudflare Worker 포트폴리오 사이트 |
| `apps/job-server` | 잡 자동화 MCP 런타임/크롤러 |
| `apps/job-dashboard` | 대시보드 Worker 및 워크플로우 |
| `packages/cli` | 운영자용 CLI |
| `packages/data` | 레주메/지원서 콘텐츠 SSoT |
| `packages/env` | 환경 변수 검증 |
| `packages/shared` | 공용 유틸리티/클라이언트 |
| `packages/types` | 도메인 타입 |
| `packages/schemas` | Zod 스키마 |
| `packages/contracts` | OpenAPI/Worker env 계약 |

## Maintainers / Points of Contact

- 저장소 소유자: [`OWNERS`](OWNERS) 명단 기준.
- 보안 이슈: [`docs/security/SECURITY_AUDIT_TASK_4.3.md`](docs/security/SECURITY_AUDIT_TASK_4.3.md) 절차에 따라 보고.
- 운영 액션 보류 항목: [`docs/runbooks/PENDING_OPERATOR_ACTIONS.md`](docs/runbooks/PENDING_OPERATOR_ACTIONS.md).

## Further Documentation

| 주제 | 경로 |
| --- | --- |
| 시스템 개요 | [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md) |
| 배포 파이프라인 | [`docs/architecture/DEPLOYMENT_PIPELINE.md`](docs/architecture/DEPLOYMENT_PIPELINE.md) |
| 배포 가이드 | [`docs/deployment-guide.md`](docs/deployment-guide.md) |
| 배포 준비 보고서 | [`docs/DEPLOYMENT_READINESS_REPORT.md`](docs/DEPLOYMENT_READINESS_REPORT.md) |
| GitHub Actions 배포 | [`docs/GITHUB_ACTIONS_DEPLOYMENT_GUIDE.md`](docs/GITHUB_ACTIONS_DEPLOYMENT_GUIDE.md) |
| GitHub Actions 시크릿 | [`docs/GITHUB_ACTIONS_SECRETS.md`](docs/GITHUB_ACTIONS_SECRETS.md) |
| ADR 인덱스 | [`docs/adr/`](docs/adr/) |
| 규약 | [`docs/conventions/architecture-rules.md`](docs/conventions/architecture-rules.md) |
| 보안 경고 | [`docs/SECURITY_WARNING.md`](docs/SECURITY_WARNING.md) |
| 시크릿 회전 플레이북 | [`docs/security/SECRET_ROTATION_PLAYBOOK.md`](docs/security/SECRET_ROTATION_PLAYBOOK.md) |
| Cloudflare 키 회전 런북 | [`docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`](docs/runbooks/CLOUDFLARE_KEY_ROTATION.md) |
| 기술 부채 해결 기록 | [`docs/architecture/TECH_DEBT_RESOLUTION_2026-07-06.md`](docs/architecture/TECH_DEBT_RESOLUTION_2026-07-06.md) |
| API 문서 | [`docs/api/README.md`](docs/api/README.md) |
| 변경 이력 | [`CHANGELOG.md`](CHANGELOG.md) |
| 기여 가이드 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 디자인 상태 | [`design-state.md`](design-state.md) |

## License

[`LICENSE`](LICENSE) 파일을 참조하세요.