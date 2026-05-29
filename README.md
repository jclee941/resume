<think>
The user wants me to generate a comprehensive README.md for a repository based on the provided project structure, workflow files, package.json, Dockerfile, docker-compose.yml, existing README.md, and AGENTS.md content.

Let me analyze what's provided:

1. **Project Structure**: A monorepo with apps (portfolio, job-server, job-dashboard) and packages (cli, env, data, shared, types, schemas, contracts)

2. **Workflow Files (35 total)**: Various GitHub Actions workflows for CI, PR management, issue management, releases, etc.

3. **package.json**: Shows scripts for building, testing, deploying, and various automation tasks

4. **Dockerfile**: Multi-stage build for job-server runtime

5. **docker-compose.yml**: For running the MCP/job-server

6. **Existing README.md**: Brief existing README

7. **AGENTS.md**: Detailed knowledge base about the project

Key details from AGENTS.md:
- Resume monorepo: Cloudflare Worker portfolio, job automation runtimes, dashboard APIs
- SSoT is `packages/data/resumes/master/resume_data.json`
- Uses minimax-m2.7 and gpt-5.5 via CLIProxyAPI
- Apps: portfolio, job-server, job-dashboard
- Packages: cli, env, data, shared, types, schemas, contracts

The user specifically mentions:
- Current models: minimax-m2.7 and gpt-5.5 (via CLIProxyAPI)
- Need to list workflow names and tool names specifically

Let me structure the README.md with:
1. Title with badges
2. Overview
3. Features
4. Architecture
5. Automation Inventory (workflows + tools)
6. Quick Start
7. Local Development
8. Commands Reference
9. Contribution Guide

I'll make it bilingual (Korean and English) as requested.
</think>

# resume.jclee.me

**DevSecOps / SRE 이력서 자동화 모노레포**
*Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability*

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           resume.jclee.me                                    │
│  Single Source of Truth → Cloudflare Edge + Job Automation + Observability   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Badges / 배지

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Playwright](https://img.shields.io/badge/Playwright-45BAF4?logo=playwright&logoColor=white)](https://playwright.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)
[![n8n](https://img.shields.io/badge/n8n-EA1595?logo=n8n&logoColor=white)](https://n8n.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview / 개요

### English

This repository is a **monorepo** for the personal portfolio of Jaecheol Lee (이재철), a DevSecOps/SRE engineer with 8 years of experience in financial and public security infrastructure.

It is not merely a static portfolio site — it is a **Single Source of Truth (SSoT) system** where resume data in `packages/data/` is the authoritative source, from which multiple artifacts are derived:

- **Edge Portfolio** — Cloudflare Workers site (multi-language: Korean, English, Japanese)
- **Job Automation** — Wanted/JobKorea application pipeline via MCP tools and n8n workflows
- **Dashboard API** — Cloudflare Workers API for job tracking and analytics
- **Observability** — Self-hosted monitoring, alerting, and health endpoints

### 한국어

이 저장소는 DevSecOps/SRE 엔지니어 이재철(8년차, 금융·공공 보안 인프라)의 개인 포트폴리오 **모노레포**입니다.

단순 정적 포트폴리오 사이트가 아니라, `packages/data/`의 이력서 데이터가 **단일 진실원(SSoT)** 역할을 하며, 이를 기반으로 다수의 산출물이 파생됩니다:

- **Edge 포트폴리오** — Cloudflare Workers 멀티링구얼 사이트 (한국어, 영어, 일본어)
- **구직 자동화** — MCP 도구 및 n8n 워크플로우를 통한 Wanted/JobKorea 지원 파이프라인
- **대시보드 API** — 채용 추적 및 분석용 Cloudflare Workers API
- **Observability** — 셀프호스팅 모니터링, 알erta, 헬스 엔드포인트

---

## Features / 기능

### English

| Feature | Description |
|---------|-------------|
| **Cloudflare Workers Edge** | Global low-latency portfolio served from 300+ edge locations |
| **Multi-language Support** | Korean (default), English, Japanese |
| **SSoT Data Model** | `resume_data.json` is the single source; all outputs derived from it |
| **Job Automation Pipeline** | Wanted/JobKorea application automation via MCP tools and CLI |
| **Type-safe Environment** | Zod-validated env vars with JSDoc types in `packages/env` |
| **Runtime Validation** | Zod schemas for all API payloads, resume, auth in `packages/schemas` |
| **AI-Powered Enrichment** | GitHub stats, skills mapping, AI-generated summaries via CLIProxyAPI (minimax-m2.7, gpt-5.5) |
| **CI/CD Automation** | 35 GitHub Actions workflows for PR checks, merges, releases, health |
| **Self-hosted Observability** | Health endpoints, Prometheus metrics, alerting |
| **Docker & Compose** | Containerized job-server runtime with healthchecks |

### 한국어

| 기능 | 설명 |
|------|------|
| **Cloudflare Workers Edge** | 300+ 엣지 로케이션의 글로벌 저지연 포트폴리오 |
| **멀티링구얼 지원** | 한국어(기본), 영어, 일본어 |
| **SSoT 데이터 모델** | `resume_data.json` 단일 진실원; 모든 산출물이 여기서 파생 |
| **구직 자동화 파이프라인** | MCP 도구 및 CLI를 통한 Wanted/JobKorea 지원 자동화 |
| **타입 안전한 환경변수** | `packages/env`의 Zod 검증 환경변수 + JSDoc 타입 |
| **런타임 검증** | `packages/schemas`의 모든 API 페이로드, 이력서, 인증 Zod 스키마 |
| **AI 기반 데이터 enrichment** | GitHub 통계, 스킬 매핑, AI 생성 요약 (minimax-m2.7, gpt-5.5 via CLIProxyAPI) |
| **CI/CD 자동화** | PR 체크, 병합, 릴리스, 헬스 등을 위한 35개 GitHub Actions 워크플로우 |
| **셀프호스팅 Observability** | 헬스 엔드포인트, Prometheus 메트릭, 알erta |
| **Docker & Compose** | 헬스체크가 포함된 컨테이너화된 job-server 런타임 |

---

## Architecture / 아키텍처

### English

```
                           ┌─────────────────────────────────┐
                           │     packages/data/resumes/master │
                           │        resume_data.json          │  ← SSoT (Single Source of Truth)
                           └───────────────┬─────────────────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   apps/portfolio/       │   │    apps/job-server/     │   │  apps/job-dashboard/    │
│   Cloudflare Workers    │   │    MCP + Job Automation │   │  Dashboard API          │
│   Edge Site             │   │    Runtime              │   │  (Cloudflare Workers)   │
│   • Multi-language      │   │    • Wanted API         │   │  • Workflow handlers   │
│   • Generated worker.js │   │    • JobKorea API       │   │  • Middleware          │
│   • Miniflare dev       │   │    • CLIProxyAPI (AI)   │   │  • API routes          │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
           │                               │                               │
           └───────────────────────────────┼───────────────────────────────┘
                                           │
                   ┌───────────────────────┼───────────────────────┐
                   │         packages/     │       packages/       │
                   ▼                       ▼                       ▼
           ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
           │    types/     │       │   schemas/    │       │   shared/     │
           │  JSDoc/TS     │       │    Zod        │       │  Utilities    │
           │  (zero deps)  │       │  validation   │       │  • retry      │
           │  • Application│       │  • Application│       │  • errors     │
           │  • Resume     │       │  • Resume     │       │  • crypto     │
           │  • WantedJob  │       │  • Auth       │       │  • ua         │
           │  • WorkerEnv  │       │  • Portfolio  │       │  • wanted-    │
           └───────────────┘       └───────────────┘       │   client     │
                                                           └───────────────┘
```

### 한국어

```
                           ┌─────────────────────────────────┐
                           │     packages/data/resumes/master │
                           │        resume_data.json          │  ← SSoT (단일 진실원)
                           └───────────────┬─────────────────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   apps/portfolio/       │   │    apps/job-server/     │   │  apps/job-dashboard/    │
│   Cloudflare Workers    │   │    MCP + 구직 자동화     │   │  대시보드 API           │
│   엣지 사이트            │   │    런타임                │   │  (Cloudflare Workers)   │
│   • 멀티링구얼          │   │    • Wanted API          │   │  • 워크플로우 핸들러    │
│   • 생성된 worker.js    │   │    • JobKorea API       │   │  • 미들웨어             │
│   • Miniflare 개발      │   │    • CLIProxyAPI (AI)   │   │  • API 라우트           │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
           │                               │                               │
           └───────────────────────────────┼───────────────────────────────┘
                                           │
                   ┌───────────────────────┼───────────────────────┐
                   │         packages/     │       packages/       │
                   ▼                       ▼                       ▼
           ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
           │    types/     │       │   schemas/    │       │   shared/     │
           │  JSDoc/TS     │       │    Zod        │       │  유틸리티      │
           │  (의존성 없음) │       │  검증         │       │  • retry      │
           │  • Application│       │  • Application│       │  • errors     │
           │  • Resume     │       │  • Resume     │       │  • crypto     │
           │  • WantedJob  │       │  • Auth       │       │  • ua         │
           │  • WorkerEnv  │       │  • Portfolio  │       │  • wanted-    │
           └───────────────┘       └───────────────┘       │   client     │
                                                           └───────────────┘
```

---

## Automation Inventory / 자동화 인벤토리

### English

This project uses **35 GitHub Actions workflows** and **CLIProxyAPI** (minimax-m2.7, gpt-5.5) for AI-powered automation.

#### CI/CD & Quality (Workflows)

| Workflow | Description |
|----------|-------------|
| `01_branch-to-pr.yml` | Create PR from branch |
| `03_pr-checks.yml` | Run tests, lint, typecheck on PRs |
| `04_actionlint.yml` | Lint GitHub Actions YAML files |
| `05_gitleaks.yml` | Scan for secrets/credentials |
| `06_codeql.yml` | GitHub CodeQL security analysis |
| `07_dependency-review.yml` | Review dependency changes for vulnerabilities |
| `08_scorecard.yml` | OpenSSF Scorecard security assessment |
| `44_reusable-pr-checks.yml` | Reusable workflow for PR checks (tests, lint, build) |
| `ci.yml` | Main CI pipeline |
| `60_ci-auto-heal.yml` | Auto-heal failing CI runs |

#### PR Management (Workflows)

| Workflow | Description |
|----------|-------------|
| `09_semantic-pr.yml` | Enforce semantic PR titles |
| `10_pr-review.yml` | Automated PR review |
| `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| `13_pr-auto-merge.yml` | Auto-merge qualifying PRs |
| `14_bot-auto-fix.yml` | Auto-fix bot-detected issues |
| `15_merged-pr-cleanup.yml` | Cleanup after PR merge |

#### Release & Deployment (Workflows)

| Workflow | Description |
|----------|-------------|
| `24_release-notes.yml` | Generate release notes |
| `25_release-publish.yml` | Publish releases |
| `release.yml` | Main release workflow |
| `post-deploy-verify.yml` | Verify deployment success |
| `provision-queues.yml` | Provision job queues |

#### Issue Management (Workflows)

| Workflow | Description |
|----------|-------------|
| `18_issue-management.yml` | Manage issues |
| `19_issue-backfill.yml` | Backfill issue data |
| `37_ci-failure-issues.yml` | Create issues for CI failures |
| `43_reusable-issue-management.yml` | Reusable issue management workflow |

#### Documentation & Sync (Workflows)

| Workflow | Description |
|----------|-------------|
| `20_readme-gen.yml` | Generate README |
| `21_docs-sync.yml` | Sync documentation |
| `42_reusable-docs-sync.yml` | Reusable docs sync workflow |

#### Other Automation (Workflows)

| Workflow | Description |
|----------|-------------|
| `29_downstream-health-check.yml` | Check downstream service health |
| `auto-merge.yml` | Generic auto-merge workflow |
| `auto-sync-data.yml` | Auto-sync SSoT data |
| `delete-standalone-job-worker.yml` | Delete standalone job worker |
| `labeler.yml` | Auto-label PRs/issues |
| `welcome.yml` | Welcome new contributors |

#### AI/ML Automation (via CLIProxyAPI)

| Model | Purpose |
|-------|---------|
| `minimax-m2.7` | AI enrichment (GitHub stats, skills mapping) |
| `gpt-5.5` | AI-generated summaries, PR reviews |

#### Tools & Scripts

| Tool | Location | Purpose |
|------|----------|---------|
| **Go** | `tools/scripts/` | CI validation, proposal sync, enrichment |
| **Node.js** | `tools/scripts/utils/` | Data sync, build scripts |
| **Python** | `tools/scripts/build/` | PPTX generation (Shinhan proposals) |
| **n8n** | `infrastructure/` | Job automation workflows |
| **Miniflare** | `apps/portfolio/` | Local Cloudflare Workers dev |
| **Jest** | Root `jest.config.cjs` | Unit & integration tests |
| **Playwright** | `playwright.config.js` | E2E tests |
| **ESLint** | `eslint.config.cjs` | Linting |
| **Zod** | `packages/schemas/` | Runtime validation |
| **TypeScript** | `tsconfig.base.json` | Type checking |
| **wrangler** | `wrangler.jsonc` | Cloudflare Workers config |
| **Redocly** | `redocly.yaml` | OpenAPI documentation |
| **lychee** | `lychee.toml` | Markdown link checking |
| **Docker** | `Dockerfile` | Containerized job-server |
| **Docker Compose** | `docker-compose.yml` | Local job-server runtime |

### 한국어

이 프로젝트는 **35개의 GitHub Actions 워크플로우**와 **CLIProxyAPI** (minimax-m2.7, gpt-5.5)를 사용한 AI 자동화를 활용합니다.

#### CI/CD 및 품질 (워크플로우)

| 워크플로우 | 설명 |
|-----------|------|
| `01_branch-to-pr.yml` | 브랜치에서 PR 생성 |
| `03_pr-checks.yml` | PR에서 테스트, 린트, 타입체크 실행 |
| `04_actionlint.yml` | GitHub Actions YAML 파일 린트 |
| `05_gitleaks.yml` | 시크릿/크레덴셜 스캔 |
| `06_codeql.yml` | GitHub CodeQL 보안 분석 |
| `07_dependency-review.yml` | 취약점 검토 의존성 변경 |
| `08_scorecard.yml` | OpenSSF 점수카드 보안 평가 |
| `44_reusable-pr-checks