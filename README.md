<think>
The user wants me to generate a comprehensive README.md for the repository. Let me analyze the project structure, workflow files, and other provided information to create a well-structured bilingual (Korean and English) README.

Key information from the provided files:
1. **Project Name**: resume.jclee.me - DevSecOps/SRE Resume Automation Monorepo
2. **Architecture**: Cloudflare Workers portfolio, job automation (Wanted/JobKorea), SSoT data, self-hosted observability
3. **Models**: minimax-m2.7 and gpt-5.5 (via CLIProxyAPI)
4. **Workspace packages**: apps/portfolio, apps/job-server, apps/job-dashboard, packages/cli, packages/data, packages/shared, packages/types, packages/schemas, packages/contracts, packages/env
5. **Workflow files**: 35 total workflows including CI, PR checks, auto-merge, docs sync, release notes, etc.
6. **Go automation tools**: 0 total (none found)
7. **Scripts**: build, test, sync:data, deploy, lint, typecheck, etc.

Let me create a comprehensive README with:
- Title
- Badges
- Overview
- Features
- Architecture
- Automation Inventory (workflows + tools)
- Quick Start
- Local Development
- Commands Reference
- Contribution Guide

I'll make it bilingual (Korean and English) asrequested.
</think>

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스트 Observability

| Branch | Status | Coverage |
|--------|--------|----------|
| `master` | [![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/jclee941/resume/actions/workflows/ci.yml) | [![Coverage](./badges/coverage.svg)](./badges/coverage.svg) |
| `develop` | [![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/jclee941/resume/actions/workflows/ci.yml) | — |

[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)

[Portfolio](https://resume.jclee.me) · [English](https://resume.jclee.me/en) · [日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) · [Metrics](https://resume.jclee.me/metrics)

---

## Overview

### 프로젝트 개요

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라 전문.

이 저장소는 **단일 포트폴리오 사이트가 아닌**, 단일 진실원(Single Source of Truth, SSoT) 이력서 데이터에서 파생되는 **다중 산출물 모노레포**입니다.

### Project Overview

This repository is not a simple portfolio site — it is a **monorepo that derives multiple artifacts from a Single Source of Truth (SSoT) resume**. The SSoT lives in `packages/data/resumes/master/resume_data.json`, and CI pipelines propagate changes across:

- **Edge Portfolio** — Cloudflare Workers bundle (`apps/portfolio/`)
- **Job Automation** — Wanted/JobKorea crawler + MCP runtime (`apps/job-server/`)
- **Dashboard API** — Cloudflare Workers workflows (`apps/job-dashboard/`)
- **CLI Tooling** — `@resume/cli` commands for build, deploy, verify
- **Profile Sync** — External services (Wanted CV, social profiles)

### AI Models Used

| Model | Provider | Use Case |
|-------|----------|----------|
| `minimax-m2.7` | CLIProxyAPI | Automation scripts, enrichment pipelines |
| `gpt-5.5` | CLIProxyAPI | Code generation, PR reviews, issue backfill |

---

## Features

### 주요 기능

- **Edge Portfolio Site** — Cloudflare Workers 기반 다국어 포트폴리오 (KR/EN/JA)
- **Job Automation Runtime** — Wanted·JobKorea 크롤링 및 MCP 도구 서버 (`apps/job-server/`)
- **Self-hosted Observability** — Cloudflare-native metrics +/health endpoints
- **SSoT Data Model** — JSON 스키마 기반 이력서 데이터 + Zod 검증
- **Multi-package Workspace** — 공유 타입, 스키마, contracts, 환경변수 검증
- **Automated Enrichment** — GitHub contributions, skills taxonomy, AI-generated content
- **GitHub Automation Suite** — 35개/workflows PR/issue/release 관리

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **SSoT Pipeline** | `resume_data.json` → generated `worker.js`, synced profiles |
| **Job Dashboard** | Cloudflare Workers API for job automation state |
| **CLI Commands** | `db`, `deploy`, `verify` via `@resume/cli` |
| **OpenAPI Contracts** | `openapi.yaml` defines all API boundaries |
| **Circuit Breaker Retry** | `@resume/shared` HTTP retry + circuit breaker |
| **Type-safe Env** | `@resume/env` Zod schema for all environment secrets |

---

## Architecture

### 모노레포 구조

```
resume/
├── apps/
│   ├── portfolio/          # public CF Workers edge bundle
│   ├── job-server/         # MCP/job automation runtime (Node.js)
│   └── job-dashboard/      # dashboard CF Workers + workflows
├── packages/
│   ├── cli/                # resume CLI (@resume/cli)
│   ├── env/                # env validation + type-safe secrets
│   ├── data/               # SSoT resumes and JSON schema
│   ├── shared/             # cross-package utilities
│   │   └── src/
│   │       ├── errors/     # custom error classes
│   │       ├── crypto/     # node.js + webcrypto implementations
│   │       └── retry/      # circuit-breaker, http-retry
│   ├── types/              # canonical JSDoc/TS type definitions
│   ├── schemas/            # runtime Zod validation schemas
│   └── contracts/          # OpenAPI spec + Env interface
├── tools/
│   ├── scripts/             # CI, build, deploy, verification (Go + JS)
│   └── ci/                 # Go CI utilities
├── infrastructure/         # Cloudflare, monitoring, n8n configs
├── tests/                  # Jest + Playwright E2E
├── .github/workflows/     # 35 GitHub Actions workflows
└── docs/                   # ADRs, architecture, conventions
```

### 데이터 흐름

```
packages/data/resumes/master/resume_data.json  (SSoT)
         │
         ├──► npm run sync:data ──► apps/portfolio/src/templates/
         │                                      │
         │                              npm run build
         │                                      │
         │                               worker.js
         │                                      │
         ├──► npm run enrich:github ──► GitHub contributions sync
         ├──► npm run enrich:skills ──► Skills taxonomy enrichment
         └──► npm run enrich:ai ──► AI-generated content via GPT-5.5
```

### AI Enrichment Pipeline

```
INPUT: resume_data.json
  │
  ├─► enrich:github  (minimax-m2.7)
  │        └─► tools/scripts/enrichment/github/main.go
  │             └─► OUTPUT: enriched GitHub stats

  ├─► enrich:skills  (minimax-m2.7)
  │        └─► tools/scripts/enrichment/skills/main.go
  │             └─► OUTPUT: normalized skills taxonomy

  └─► enrich:ai  (gpt-5.5)
           └─► tools/scripts/enrichment/ai/main.go
                └─► OUTPUT: AI-summarized experience bullets
```

---

## Automation Inventory

### GitHub Actions Workflows (35 Total)

#### Repository Maintenance & Auto-Fix

| Workflow File | Trigger | Purpose |
|--------------|---------|---------|
| `01_branch-to-pr.yml` | push to feature branches | Auto-create PR when branch is ready |
| `02_issue-to-branch.yml` | issue labeled | Generate feature branch from issue |
| `14_bot-auto-fix.yml` | pull_request | Bot-assisted auto-fix suggestions |
| `15_merged-pr-cleanup.yml` | PR merge | Clean up merged branches and labels |

#### Code Quality & Security

| Workflow File | Purpose |
|--------------|---------|
| `03_pr-checks.yml` | PR static checks (lint, typecheck, test) — calls `44_reusable-pr-checks.yml` |
| `04_actionlint.yml` | Validate all workflow YAML syntax |
| `05_gitleaks.yml` | Scan for secrets/credentials in commits |
| `06_codeql.yml` | GitHub CodeQL static analysis |
| `07_dependency-review.yml` | Audit dependencies for vulnerabilities |
| `08_scorecard.yml` | OpenSSF Security Scorecard metrics |
| `44_reusable-pr-checks.yml` | **Reusable workflow** — lint, typecheck, test, build |

#### PR Management

| Workflow File | Purpose |
|--------------|---------|
| `09_semantic-pr.yml` | Enforce semantic PR title format |
| `10_pr-review.yml` | Auto-request review from CODEOWNERS |
| `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs (patch/minor) |
| `13_pr-auto-merge.yml` | Auto-merge qualified PRs after CI pass |
| `auto-merge.yml` | Generic auto-merge coordinator |
| `labeler.yml` | Auto-label PRs based on changed paths |

#### Issue Management

| Workflow File | Purpose |
|--------------|---------|
| `18_issue-management.yml` | In我爱思s issue lifecycle automation — calls `43_reusable-issue-management.yml` |
| `19_issue-backfill.yml` | Backfill issue metadata (AI via GPT-5.5) |
| `37_ci-failure-issues.yml` | Create issue on CI failure with debug info |
| `43_reusable-issue-management.yml` | **Reusable workflow** — issue lifecycle state machine |

#### Documentation

| Workflow File | Purpose |
|--------------|---------|
| `20_readme-gen.yml` | Auto-regenerate README from AGENTS.md |
| `21_docs-sync.yml` | Sync documentation across branches |
| `42_reusable-docs-sync.yml` | **Reusable workflow** — cross-branch doc sync |

#### Release & Deployment

| Workflow File | Purpose |
|--------------|---------|
| `24_release-notes.yml` | Auto-generate release notes from conventional commits |
| `25_release-publish.yml` | Publish release artifacts |
| `release.yml` | Main release workflow coordinator |
| `post-deploy-verify.yml` | Smoke test after Cloudflare deployment |
| `delete-standalone-job-worker.yml` | Clean up orphaned workers |

#### Observability & Health

| Workflow File | Purpose |
|--------------|---------|
| `29_downstream-health-check.yml` | Monitor downstream service health |
| `60_ci-auto-heal.yml` | Auto-heal CI infrastructure issues |

#### Data & Operational Scripts

| Workflow File | Purpose |
|--------------|---------|
| `auto-sync-data.yml` | Periodic sync of SSoT resume data |
| `provision-queues.yml` | Provision Cloudflare Queues for job-server |
| `ci.yml` | Main CI pipeline |

#### Welcome & Onboarding

| Workflow File | Purpose |
|--------------|---------|
| `welcome.yml` | Welcome message for new contributors |

### Automation Tools

| Tool | Language | Location | Purpose |
|------|----------|----------|---------|
| `CLIProxyAPI` (minimax-m2.7) | — | `tools/scripts/enrichment/*/` | AI enrichment calls |
| `CLIProxyAPI` (gpt-5.5) | — | `tools/scripts/enrichment/*/` | AI content generation |
| `Go tooling` | Go | `tools/scripts/` | Sync, enrichment, build utilities |
| `n8n` | YAML/JSON | `infrastructure/` | Workflow automation orchestration |
| `Cloudflare Workers` | JS/TS | `apps/*/` | Edge compute runtime |

---

## Quick Start

### 시작하기

```bash
# 1. Clone and install dependencies
git clone https://github.com/jclee941/resume.git
cd resume
npm install

# 2. Verify SSoT data integrity (sync + typecheck + test:node)
npm run automate:ssot

# 3. Local development with Miniflare
npm run dev

# 4. Full pipeline (lint + typecheck + test + build + Cloudflare native validation)
npm run automate:full
```

### Quick Start

```bash
# Clone the repository
git clone https://github.com/jclee941/resume.git && cd resume

# Install all workspace dependencies
npm install

# Run SSoT pipeline (sync + build + typecheck + unit tests)
npm run automate:ssot

# Start portfolio locally (Miniflare)
npm run dev

# Run full CI pipeline
npm run automate:full
```

---

## Local Development

###要先确定已安装

- **Node.js** ≥ 22
- **npm** ≥ 10
- **Python** 3.11+ (for PPTX generation scripts)
- **Go** 1.21+ (for enrichment tools)
- **Docker** + **Docker Compose** (for `job-server` runtime)

### Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 22 | Runtime for all apps and packages |
| npm | ≥ 10 | Workspace package manager |
| Python | 3.11+ | PPTX generation (`sync:pptx`) |
| Go | 1.21+ | Enrichment scripts (`enrich:github`, etc.) |
| Docker | Latest | `job-server` container runtime |
| exiftool | Optional | EXIF stripping from images |

### Docker Compose (Job Server)

```bash
# Start the MCP/job-server container
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Environment Variables

Create a `.env` file at the root:

```env
# Cloudflare
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Wanted API
WANTED_API_EMAIL=your_email@example.com
WANTED_API_PASSWORD=your_password

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# AI Models (CLIProxyAPI)
CLIPROXY_API_KEY=your_api_key
MINIMAX_API_KEY=your_minimax_key
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Optional
NODE_ENV=development
PORT=3000
```

---

## Commands Reference

### npm Scripts

#### Build & Development

| Script | Description | Workspace |
|--------|-------------|-----------|
| `npm run build` | Generate `worker.js` from HTML templates | `apps/portfolio` |
| `npm run build:portfolio` | Same as `build` with explicit workspace | `apps/portfolio` |
| `npm run build:full` | Build portfolio + CLI | `apps/*`, `packages/cli` |
| `npm run dev` | Start Miniflare for local portfolio development | `apps/portfolio` |
| `npm run strip-exif` | Strip EXIF data from portfolio images | — |

#### Sync & Enrichment

| Script | Description |
|--------|-------------|
| `npm run sync:data` | Sync SSoT `resume_data.json` → generated assets |
| `npm run sync:pptx` | Generate Shinhan PPTX via Python |
| `npm run sync:all` | Run all sync scripts (`sync:data` + `sync:pptx`) |
| `npm run sync:proposals` | Sync proposal reviews + apply via Go |
| `npm run enrich:github` | Enrich GitHub contributions (Go, minimax-m2.7) |
| `npm run enrich:skills` | Enrich skills taxonomy (Go, minimax-m2.7) |
| `npm run enrich:ai` | AI content generation (Go, gpt-5.5) |
| `npm run enrich:all` | Run all enrichment scripts |

#### Quality Assurance

| Script | Description |
|------------|-------------|
| `npm test` | Run Jest + Node native tests + Playwright E2E |
| `npm run test:node` | Jest unit tests (Node environment) |
| `npm run lint` | Run ESLint on all workspaces |
| `npm run typecheck` | TypeScript type checking (no emit) |

#### SSoT Automation

| Script | Description |
|--------|-------------|
| `npm run automate:ssot` | sync:data + build + typecheck + test:node |
| `npm run automate:full` | sync:all + lint + typecheck + test + build + Cloudflare validation |

#### Release & Deployment

| Script | Description |
|--------|-------------|
| `npm run version:bump` | Bump patch version (`npm version patch`) |
| `npm run deploy` | **Disabled** — use GitHub Actions workflows instead |

### CLI Commands (`@resume/cli`)

```bash
# Database operations
npx resume db --help

# Deploy to Cloudflare
npx resume deploy --help

# Verify deployment
npx resume verify --help
```

### Go Scripts

```bash
# Enrich GitHub contributions
cd tools/scripts/enrichment/github && go run main.go

# Enrich skills taxonomy
cd tools/scripts/enrichment/skills && go run main.go

# AI enrichment
cd tools/scripts/enrichment/ai && go run main.go

# Sync and apply proposals
go run ./tools/scripts/sync/apply-proposals.go

# Cloudflare native CI validation
go run ./tools/ci/