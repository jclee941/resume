<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the project structure and information provided:

1. **Project Name**: resume.jclee.me
2. **Type**: DevSecOps/SRE portfolio monorepo
3. **Purpose**: Cloudflare Workers portfolio, job automation pipeline, self-hosted observability
4. **Key Components**:
   - apps/portfolio - Cloudflare Worker edge site
   - apps/job-server - MCP/job automation runtime
   - apps/job-dashboard - dashboard worker + workflows
   - packages/ - shared packages (cli, env, data, shared, types, schemas, contracts)
   - tools/ - CI, build, deploy scripts

5. **Workflows**: 34 total GitHub Actions workflows
   - Branch/PR management: 01_branch-to-pr.yml, 02_issue-to-branch.yml, 03_pr-checks.yml, etc.
   - Security: 05_gitleaks.yml, 06_codeql.yml, 07_dependency-review.yml, 08_scorecard.yml
   - Release: 24_release-notes.yml, 25_release-publish.yml, release.yml
   - etc.

6. **Build tools**: Node.js based (package.json shows Node 22, npm scripts)

7. **Deployment**: Cloudflare Workers, Docker containerized

Let me create a comprehensive bilingual README.md in Korean and English.

</think>

# resume.jclee.me

# 이력서 포트폴리오 모노레포 / Resume Portfolio Monorepo

## DevSecOps / SRE 이력서 자동화 모노레포 / DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability  
Cloudflare Workers Portfolio · Job Automation Pipeline · Self-hosted Observability

---

## Badges / 배지

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-34workflows-2088FF?logo=github-actions&logoColor=white)](.github/workflows/)
[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go&logoColor=white)](https://go.dev)

[Portfolio](https://resume.jclee.me) · [English](https://resume.jclee.me/en) · [日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) · [Metrics](https://resume.jclee.me/metrics)

---

## Overview / 개요

> **EN**: This repository is a **DevSecOps/SRE portfolio monorepo** that generates multiple artifacts from a Single Source of Truth (SSoT) resume data file. It includes a Cloudflare Workers edge portfolio, job automation pipelines (Wanted/JobKorea), and self-hosted observability.

> **KO**: 이 저장소는 **DevSecOps/SRE 포트폴리오 모노레포**로, 단일 진실원(SSoT) 이력서 데이터 파일에서 다중 산출물을 생성합니다. Cloudflare Workers 엣지 포트폴리오, 구직 자동화 파이프라인(Wanted/JobKorea), 셀프호스팅 옵저버빌리티를 포함합니다.

### Architecture Overview / 아키텍처 개요

```text
┌─────────────────────────────────────────────────────────────────┐
│              packages/data/resumes/master/resume_data.json      │
│                        ← Single Source of Truth (SSoT)           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Edge Portfolio │   │ Job Automation  │   │ Profile Sync    │
│  (CF Workers)   │   │  (n8n/MCP)      │   │ (Wanted CV +    │
│  resume.jclee.me│   │ Wanted/JobKorea │   │   Social Sync)  │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Features / 주요 기능

| Feature | Description |
|---------|-------------|
| **Edge Portfolio** | Cloudflare Workers 기반 다국어 포트폴리오 사이트 (EN/JP/KO) |
| **Job Automation** | Wanted/JobKorea 구직 자동화 (MCP 런타임, n8n 워크플로우) |
| **SSoT Data** | 단일 JSON 기반 이력서 데이터에서 다중 산출물 생성 |
| **Profile Sync** | Wanted CV, GitHub, Social 프로필 자동 동기화 |
| **Observability** | 셀프호스팅 모니터링 + Prometheus/Grafana 대시보드 |
| **GitHub Automation** | 34개 GitHub Actions 워크플로우 (PR/릴리스/보안/배포) |

---

## Repository Structure / 저장소 구조

```
resume/
├── apps/
│   ├── portfolio/           # Cloudflare Worker 엣지 포트폴리오
│   ├── job-server/          # MCP/구직 자동화 런타임 (Node.js)
│   └── job-dashboard/       # 대시보드 Worker + API 엔드포인트
├── packages/
│   ├── cli/                 # 이력서 CLI 도구
│   ├── env/                 # 환경 변수 검증 + 타입 안전 시크릿
│   ├── data/                # SSoT 이력서 JSON + 스키마
│   ├── shared/              # 크로스 패키지 유틸리티
│   ├── types/               # JSDoc/TS 캐노니컬 타입 정의
│   ├── schemas/             # 런타임 Zod 검증 스키마
│   └── contracts/           # OpenAPI 스펙 + Worker Env 인터페이스
├── tools/
│   ├── scripts/             # 빌드/배포/검증/동기화 스크립트 (Go + JS)
│   ├── ci/                  # CI 검증 도구
│   └── enrichment/          # GitHub/Skills/AI 데이터 증강
├── tests/
│   ├── unit/                # Jest 유닛 테스트
│   ├── integration/         # 통합 테스트
│   └── e2e/                 # Playwright E2E 테스트
├── infrastructure/
│   ├── cloudflare/          # CF Workers 설정, n8n 바이너리
│   └── monitoring/          # Prometheus/Grafana 설정
├── docs/
│   ├── architecture/         # 아키텍처 문서
│   ├── guides/              # 운영 가이드
│   ├── adr/                 # ADR (Architecture Decision Records)
│   └── security/             # 보안 문서
└── .github/
    └── workflows/           # 34개 GitHub Actions 워크플로우
```

---

## Automation Inventory / 자동화 인벤토리

### GitHub Actions Workflows (34 총) / GitHub Actions 워크플로우 (34개)

#### Branch & PR Management / 브랜치 및 PR 관리

| Workflow | File | Description |
|----------|------|-------------|
| Branch to PR | `01_branch-to-pr.yml` | 브랜치를 PR로 자동 변환 |
| Issue to Branch | `02_issue-to-branch.yml` | 이슈 기반 브랜치 생성 |
| PR Checks | `03_pr-checks.yml` | PR 빌드/테스트/린트 검사 |
| PR Review | `10_pr-review.yml` | 자동 PR 리뷰 |
| PR Auto Merge | `13_pr-auto-merge.yml` | 자동 병합 |
| Bot Auto Fix | `14_bot-auto-fix.yml` | 봇 자동 수정 |
| Merged PR Cleanup | `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| Labeler | `labeler.yml` | 라벨 자동 분류 |
| Welcome | `welcome.yml` | 신규 기여자 환영 |

#### Security & Compliance / 보안 및 규정 준수

| Workflow | File | Description |
|----------|------|-------------|
| Actionlint | `04_actionlint.yml` | GitHub Actions YAML lint |
| Gitleaks | `05_gitleaks.yml` | 시크릿 스캔 |
| CodeQL | `06_codeql.yml` | 코드 보안 분석 |
| Dependency Review | `07_dependency-review.yml` | 의존성 보안 검토 |
| Scorecard | `08_scorecard.yml` | OSS 보안 점수 |

#### Release & Version / 배포 및 버전 관리

| Workflow | File | Description |
|----------|------|-------------|
| Semantic PR | `09_semantic-pr.yml` | 시맨틱 PR 검증 |
| Release Notes | `24_release-notes.yml` | 자동 릴리스 노트 생성 |
| Release Publish | `25_release-publish.yml` | 릴리스 게시 |
| Release | `release.yml` | 릴리스 워크플로우 |
| Auto Merge | `auto-merge.yml` | 자동 병합 |

#### Documentation & Sync / 문서화 및 동기화

| Workflow | File | Description |
|----------|------|-------------|
| README Generator | `20_readme-gen.yml` | README 자동 생성 |
| Docs Sync | `21_docs-sync.yml` | 문서 동기화 |
| Reusable Docs Sync | `42_reusable-docs-sync.yml` | 재사용 가능 문서 동기화 |
| Auto Sync Data | `auto-sync-data.yml` | 데이터 자동 동기화 |

#### Issue Management / 이슈 관리

| Workflow | File | Description |
|----------|------|-------------|
| Issue Management | `18_issue-management.yml` | 이슈 자동 관리 |
| Reusable Issue Management | `43_reusable-issue-management.yml` | 재사용 가능 이슈 관리 |
| Issue Backfill | `19_issue-backfill.yml` | 이슈 백필 |
| CI Failure Issues | `37_ci-failure-issues.yml` | CI 실패 시 이슈 생성 |

#### Maintenance & Health / 유지보수 및 상태 확인

| Workflow | File | Description |
|----------|------|-------------|
| Dependabot Auto Merge | `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| Downstream Health Check | `29_downstream-health-check.yml` | 하위 서비스 상태 확인 |
| CI Auto Heal | `60_ci-auto-heal.yml` | CI 자동 복구 |
| Provision Queues | `provision-queues.yml` | 큐 프로비저닝 |
| Delete Standalone Job Worker | `delete-standalone-job-worker.yml` | 작업자 정리 |

#### CI/CD Core / CI/CD 핵심

| Workflow | File | Description |
|----------|------|-------------|
| CI | `ci.yml` | 메인 CI 파이프라인 |
| Reusable PR Checks | `44_reusable-pr-checks.yml` | 재사용 가능한 PR 검사 |

### AI Models / AI 모델

| Model | Provider | Purpose |
|-------|----------|---------|
| `minimax-m2.7` | MiniMax | CLI 프록시 API |
| `gpt-5.5` | OpenAI | CLI 프록시 API |

---

## Quick Start / 빠른 시작

### Prerequisites / 필수 조건

- Node.js ≥ 22
- npm ≥ 10
- Docker & Docker Compose (for MCP server)
- Wrangler v3 (for Cloudflare Workers local dev)
- Go 1.22+ (for Go-based tools)

### Installation / 설치

```bash
# Clone the repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install
```

### Development / 개발

```bash
# Start MCP server (Docker)
docker compose up -d

# Local portfolio development
npm run dev

# Or use Wrangler directly
cd apps/portfolio
npx wrangler dev
```

### Automation Scripts / 자동화 스크립트

```bash
# Sync SSoT data (resume JSON → all outputs)
npm run sync:data

# Generate PPTX reports
npm run sync:pptx

# Sync all data sources
npm run sync:all

# AI-powered enrichment
npm run enrich:github    # GitHub profile data
npm run enrich:skills    # Skills analysis
npm run enrich:ai        # AI matching
npm run enrich:all        # All enrichments

# SSoT automation pipeline
npm run automate:ssot     # sync + build + typecheck + test

# Full automation pipeline
npm run automate:full     # sync + lint + typecheck + test + build + CF validation
```

---

## Commands Reference / 명령어 참조

### Build & Development / 빌드 및 개발

| Script | Description |
|--------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio worker |
| `npm run build:full` | Build portfolio + CLI |
| `npm run build:all` | Full build |
| `npm run dev` | Miniflare local development |
| `npm run strip-exif` | Strip EXIF data from images |

### Testing / 테스트

| Script | Description |
|--------|-------------|
| `npm test` | Jest unit tests |
| `npm run test:node` | Node.js native tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:integration` | Integration tests |

### Quality Assurance / 품질 관리

| Script | Description |
|--------|-------------|
| `npm run lint` | ESLint linting |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Code formatting |
| `npm run version:bump` | Version bump (patch) |

### Deployment / 배포

| Script | Description |
|--------|-------------|
| `npm run deploy` | Manual deploy (disabled - use git push to master) |

### Automation / 자동화

| Script | Description |
|--------|-------------|
| `npm run sync:data` | Sync SSoT resume data |
| `npm run sync:pptx` | Generate PPTX reports |
| `npm run sync:all` | Sync all data |
| `npm run enrich:github` | Enrich GitHub data |
| `npm run enrich:skills` | Enrich skills data |
| `npm run enrich:ai` | AI enrichment |
| `npm run enrich:all` | All enrichments |
| `npm run automate:ssot` | SSoT pipeline |
| `npm run automate:full` | Full automation pipeline |

---

## Local Development / 로컬 개발

### Portfolio (Cloudflare Workers) / 포트폴리오

```bash
cd apps/portfolio
npx wrangler dev
```

### Job Server (MCP Runtime) / 잡 서버

```bash
# Using Docker Compose
docker compose up -d

# Or directly
cd apps/job-server
npm run build
node src/server/index.js
```

### Dashboard / 대시보드

```bash
cd apps/job-dashboard
npx wrangler dev
```

---

## Deployment / 배포

### Cloudflare Workers / Cloudflare Workers

```bash
# Push to master branch triggers automatic deployment
git push origin master
```

### MCP Server (Docker) / MCP 서버 (Docker)

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Manual Deployment / 수동 배포

> **Warning**: 수동 배포는 비활성화되어 있습니다. Cloudflare Workers 자동 배포를 사용하세요.

```bash
npm run deploy
# => "Manual deploy is disabled. Use git push to master for Cloudflare Workers Builds."
```

---

## Documentation / 문서

| Document | Path | Description |
|----------|------|-------------|
| Architecture | `docs/ARCHITECTURE.md` | 시스템 아키텍처 |
| Deployment Guide | `docs/deployment-guide.md` | 배포 가이드 |
| Cloudflare Auth | `docs/guides/CLOUDFLARE_AUTH_METHODS.md` | CF 인증 방법 |
| CI/CD Automation | `docs/guides/CI_CD_AUTOMATION.md` | CI/CD 자동화 |
| Security | `docs/security/SECURITY_AUDIT_TASK_4.3.md` | 보안 감사 |
| ADR | `docs/adr/*.md` | 아키텍처 결정 기록 |

---

## Contribution / 기여

### Development Workflow / 개발 워크플로우

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Commit changes**: `git commit -m 'feat: add something'`
4. **Push**: `git push origin feature/your-feature`
5. **Open a PR** → 自动检查 → 自动合并

### Code Style / 코딩 스타일

```bash
# Format
npm run format

# Lint
npm run lint

# Type check
npm run typecheck
```

### Testing / 테스트

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Commit Convention / 커밋 규칙

We use **Semantic PR** with the following format:

```
feat: add new feature
fix: bug fix
docs: documentation change
style: formatting change
refactor: code refactoring
test: test change
chore: maintenance change
```

---

## License / 라이선스

MIT License - See [LICENSE](LICENSE) for details.

---

## Author / 작성자

**Jaecheol Lee (이재철)**  
DevSecOps / SRE Engineer  
[resume.jclee.me](https://resume.jclee.me)  
[GitHub](https://github.com/jclee941)

---

## Related Documents / 관련 문서

- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
- [CONTRIBUTING.md](CONTRIBUTING.md) - 기여 가이드
- [AGENTS.md](AGENTS.md) - AI 에이전트 정보
- [SECURITY_WARNING.md](docs/security