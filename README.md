<think>
The user wants me to generate a comprehensive README.md for a repository. Let me analyze the provided information:

1. **Project Structure**: A monorepo with apps (portfolio, job-server, job-dashboard), packages (cli, env, data, shared, types, schemas, contracts), and tools/scripts
2. **Workflow Files**: 35 total GitHub Actions workflows
3. **Package.json**: Shows npm scripts for building, testing, deploying, and various automation tasks
4. **Dockerfile**: Multi-stage build for job-server runtime
5. **docker-compose.yml**: For mcp-server service
6. **Existing README.md**: Already has some content about the project
7. **AGENTS.md**: Contains project knowledge base and structure

The user wants:
- Bilingual (Korean and English)
- Professional technical documentation
- Markdown format
- Structure: title, badges, overview, features, architecture, automation inventory (workflows + tools), quick start, local development, commands reference, and contribution guide
- Be specific about automation - list workflow names and tool names
- Current models: minimax-m2.7 and gpt-5.5 (via CLIProxyAPI)

Let me create a comprehensive README.md that covers all these aspects, being specific about the workflow names and tools mentioned.

Looking at the workflow files:
01_branch-to-pr.yml, 02_issue-to-branch.yml, 03_pr-checks.yml, 04_actionlint.yml, 05_gitleaks.yml, 06_codeql.yml, 07_dependency-review.yml, 08_scorecard.yml, 09_semantic-pr.yml, 10_pr-review.yml, 12_dependabot-auto-merge.yml, 13_pr-auto-merge.yml, 14_bot-auto-fix.yml, 15_merged-pr-cleanup.yml, 18_issue-management.yml, 19_issue-backfill.yml, 20_readme-gen.yml, 21_docs-sync.yml, 24_release-notes.yml, 25_release-publish.yml, 29_downstream-health-check.yml, 37_ci-failure-issues.yml, 42_reusable-docs-sync.yml, 43_reusable-issue-management.yml, 44_reusable-pr-checks.yml, 60_ci-auto-heal.yml, auto-merge.yml, auto-sync-data.yml, ci

.yml, delete-standalone-job-worker.yml, labeler.yml, post-deploy-verify.yml, provision-queues.yml, release.yml, welcome.yml

The project is a resume monorepo using Cloudflare Workers for the portfolio, with job automation for Wanted/JobKorea platforms. It includes a CLI tool, MCP/job automation runtime, and dashboard APIs. The system uses SSoT (Single Source of Truth) resume data and supports multiple languages with self-hosted observability.
</think>

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Jest-C23A22?logo=jest&logoColor=white)](https://jestjs.io)
[![Playwright](https://img.shields.io/badge/Playwright-45BA89?logo=playwright&logoColor=white)](https://playwright.dev)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![npm workspaces](https://img.shields.io/badge/npm-workspaces-CB3837?logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA339?logo=openapi-initiative&logoColor=white)](https://www.openapis.org/)
[![Zod](https://img.shields.io/badge/Zod-3B82F6?logo=zod&logoColor=white)](https://zod.dev)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

# resume.jclee.me

## DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Automation Inventory](#automation-inventory)
  - [GitHub Actions Workflows](#github-actions-workflows)
  - [CLI Commands & Tools](#cli-commands--tools)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Commands Reference](#commands-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Jaecheol Lee (이재철)** — DevSecOps/SRE Engineer. 8 years of experience in financial and public security infrastructure.

This repository is not a simple portfolio site — it is a **monorepo of multiple derivatives derived from a Single Source of Truth (SSoT) resume data**.

```text
                         ┌──────────────────────────────────────┐
                         │  packages/data/resumes/master/        │
                         │  resume_data.json                      │  ← Single Source of Truth
                         └─────────────────┬────────────────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                ▼                          ▼                          ▼
     ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
     │  Edge Portfolio     │    │  Job Automation     │    │  Profile Sync        │
     │  (CF Workers)       │    │  (job-server/MCP)   │    │  (Wanted + Social)   │
     └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                │                          │                          │
                ▼                          ▼                          ▼
     ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
     │  Multi-language     │    │  Wanted/JobKorea   │    │  GitHub Profile     │
     │  (KO/EN/JA)         │    │  Auto-apply         │    │  Auto-update         │
     └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js ≥22, Cloudflare Workers |
| **Language** | JavaScript (ES2024), TypeScript (JSDoc annotations) |
| **Validation** | Zod |
| **API Spec** | OpenAPI 3.1 (openapi.yaml) |
| **Testing** | Jest, Playwright |
| **Container** | Docker, docker-compose |
| **CI/CD** | GitHub Actions (35 workflows) |
| **Automation** | MCP (Model Context Protocol), n8n |
| **Monitoring** | Self-hosted observability stack |

---

## Features

### Core Features

- **Single Source of Truth (SSoT)** — All resume data stored in `packages/data/resumes/master/resume_data.json`
- **Multi-Platform Derivations** — Portfolio site, job applications, profile syncs all derived from SSoT
- **Edge-First Deployment** — Cloudflare Workers for global low-latency delivery
- **Multi-Language Support** — Korean (default), English, Japanese
- **Type-Safe Validation** — Zod schemas for runtime validation, JSDoc/TS types for compile-time safety
- **Comprehensive Testing** — Unit (Jest), E2E (Playwright), integration tests

### Automation Features

- **Automated Job Applications** — Wanted, JobKorea integration
- **Profile Synchronization** — Auto-update GitHub, Wanted CV
- **Release Automation** — Semantic versioning, auto-changelog, release notes
- **PR Lifecycle Automation** — Auto-merge, label management, cleanup
- **CI/CD Healing** — Auto-heal failing CI pipelines
- **Downstream Health Monitoring** — Check dependent services after deployment
- **Documentation Sync** — Auto-generate and sync README, docs

### Security Features

- **Secret Scanning** — Gitleaks integration (workflow `05_gitleaks.yml`)
- **Code Security Analysis** — CodeQL scanning (workflow `06_codeql.yml`)
- **Dependency Review** — Security audit on dependencies (workflow `07_dependency-review.yml`)
- **Supply Chain Security** — Scorecard assessment (workflow `08_scorecard.yml`)
- **Environment Validation** — Type-safe secrets via `packages/env`

---

## Architecture

```
resume/
├── apps/
│   ├── portfolio/          # Cloudflare Worker edge portfolio site
│   ├── job-server/         # MCP/job automation runtime (Node.js)
│   └── job-dashboard/      # Dashboard API & Cloudflare Workflows
├── packages/
│   ├── cli/                # @resume/cli - Operator CLI tools
│   ├── env/                # Environment validation + type-safe secrets
│   ├── data/               # SSoT resume data (JSON + schemas)
│   ├── shared/             # Cross-package utilities
│   │   ├── errors/         # Custom error classes
│   │   ├── crypto/         # Node.js + WebCrypto utilities
│   │   └── retry/          # Circuit breaker, HTTP retry
│   ├── types/              # JSDoc/TS type definitions (zero deps)
│   ├── schemas/            # Runtime Zod validation schemas
│   └── contracts/          # OpenAPI spec + Worker Env interface
├── tools/
│   ├── scripts/            # Build, deployment, sync utilities
│   │   ├── enrichment/    # GitHub, skills, AI enrichment (Go)
│   │   ├── build/          # Build scripts (Python)
│   │   └── sync/           # Data sync scripts (Go)
│   └── ci/                 # CI validation scripts (Go)
├── infrastructure/         # Monitoring, n8n, DB configs
├── tests/                  # Jest, Playwright E2E
├── docs/                   # ADRs, architecture docs, guides
└── .github/
    └── workflows/          # 35 GitHub Actions workflows
```

### Data Flow

```
1. SSoT Edit → packages/data/resumes/master/resume_data.json
2. Build Trigger → npm run build / GitHub Actions
3. Derivative Generation:
   ├── worker.js (portfolio bundle)
   ├── API schemas (contracts/openapi.yaml)
   ├── Type definitions (types/)
   └── Validation schemas (schemas/)
4. Deployment:
   ├── Cloudflare Workers (portfolio)
   ├── Docker container (job-server via docker-compose)
   └── Dashboard APIs (job-dashboard)
```

---

## Automation Inventory

### GitHub Actions Workflows

#### Pull Request & Issue Automation

| Workflow | Description |
|----------|-------------|
| `01_branch-to-pr.yml` | Auto-create PR from feature branch |
| `02_issue-to-branch.yml` | Create branch from issue |
| `03_pr-checks.yml` | PR validation checks (reusable `44_reusable-pr-checks.yml`) |
| `09_semantic-pr.yml` | Enforce semantic PR titles |
| `10_pr-review.yml` | Auto-request reviews |
| `13_pr-auto-merge.yml` | Auto-merge approved PRs |
| `14_bot-auto-fix.yml` | Auto-fix lint/format issues |
| `15_merged-pr-cleanup.yml` | Cleanup after PR merge |
| `18_issue-management.yml` | Issue labeling/triage (reusable `43_reusable-issue-management.yml`) |
| `19_issue-backfill.yml` | Backfill issues from commits |
| `37_ci-failure-issues.yml` | Create issues from CI failures |

#### Release & Deployment Automation

| Workflow | Description |
|----------|-------------|
| `24_release-notes.yml` | Auto-generate release notes |
| `25_release-publish.yml` | Publish releases |
| `release.yml` | Main release workflow |
| `auto-merge.yml` | Auto-merge strategy |
| `post-deploy-verify.yml` | Post-deployment verification |
| `delete-standalone-job-worker.yml` | Cleanup stale workers |
| `provision-queues.yml` | Provision message queues |

#### Documentation Automation

| Workflow | Description |
|----------|-------------|
| `20_readme-gen.yml` | Auto-generate README |
| `21_docs-sync.yml` | Sync documentation (reusable `42_reusable-docs-sync.yml`) |

#### Security & Compliance

| Workflow | Description |
|----------|-------------|
| `04_actionlint.yml` | GitHub Actions linting |
| `05_gitleaks.yml` | Secret scanning |
| `06_codeql.yml` | CodeQL security analysis |
| `07_dependency-review.yml` | Dependency vulnerability review |
| `08_scorecard.yml` | OpenSSF Scorecard assessment |

#### Dependency Management

| Workflow | Description |
|----------|-------------|
| `12_dependabot-auto-merge.yml` | Auto-merge Dependabot PRs |
| `auto-sync-data.yml` | Auto-sync dependency data |

#### Health & Monitoring

| Workflow | Description |
|----------|-------------|
| `29_downstream-health-check.yml` | Check downstream service health |
| `60_ci-auto-heal.yml` | Auto-heal failing CI pipelines |
| `ci.yml` | Main CI pipeline |

#### Community & Onboarding

| Workflow | Description |
|----------|-------------|
| `welcome.yml` | Welcome new contributors |
| `labeler.yml` | Auto-label issues/PRs |

#### Core Workflows

| Workflow | Description |
|----------|-------------|
| `ci.yml` | Main CI pipeline (lint, typecheck, test, build) |

---

### CLI Commands & Tools

#### NPM Scripts (package.json)

**Build & Development:**

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` | Build portfolio worker with data sync |
| `npm run build:full` | Full build (portfolio + CLI) |
| `npm run dev` | Miniflare local development |

**Testing:**

| Command | Description |
|---------|-------------|
| `npm test` | Jest + Node native tests |
| `npm run test:node` | Node.js environment tests |
| `npm run test:e2e` | Playwright E2E tests |

**Sync & Enrichment:**

| Command | Description |
|---------|-------------|
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX portfolio (Python) |
| `npm run sync:all` | Full sync (data + PPTX) |
| `npm run sync:proposals` | Sync job proposals |
| `npm run enrich:github` | Enrich GitHub profile data (Go) |
| `npm run enrich:skills` | Enrich skills data (Go) |
| `npm run enrich:ai` | AI-based enrichment (Go) |
| `npm run enrich:all` | Full enrichment pipeline |

**Automation:**

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | Sync + build + typecheck + test |
| `npm run automate:full` | Full automation pipeline |

**Quality:**

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint code quality |
| `npm run typecheck` | TypeScript type checking |
| `npm run strip-exif` | Strip EXIF from images |

**Deployment:**

| Command | Description |
|---------|-------------|
| `npm run deploy` | Manual deploy (disabled) |
| `npm run version:bump` | Bump version (patch) |

#### CLI Tools (packages/cli)

```bash
# Database operations
resume db:verify        # Verify database schema
resume db:migrate       # Run migrations

# Deployment
resume deploy:portfolio # Deploy portfolio worker
resume deploy:jobs      # Deploy job server

# Verification
resume verify:api       # Verify API contracts
resume verify:types     # Verify type consistency
```

#### Go Tools (tools/)

| Tool | Purpose |
|------|---------|
| `tools/ci/validate-cloudflare-native.go` | Validate Cloudflare-specific configs |
| `tools/scripts/sync/apply-proposals.go` | Apply job proposals |
| `tools/scripts/enrichment/github/main.go` | GitHub data enrichment |
| `tools/scripts/enrichment/skills/main.go` | Skills data enrichment |
| `tools/scripts/enrichment/ai/main.go` | AI-powered enrichment |

---

## Quick Start

### Prerequisites

- Node.js ≥22
- npm ≥10
- Docker & docker-compose (for job-server)
- Go ≥1.21 (for enrichment tools)
- Python ≥3.11 (for PPTX generation)

### 1. Clone & Install

```bash
git clone https://github.com/jclee941/resume.git
cd resume
npm install
```

### 2. SSoT Data Sync

```bash
# Sync resume data from SSoT source
npm run sync:data

# Or sync everything (data + PPTX)
npm run sync:all
```

### 3. Build

```bash
# Build portfolio worker
npm run build

# Full build (portfolio + CLI)
npm run build:full
```

### 4. Run Tests

```bash
# All tests (Jest + Node)
npm test

# Unit tests only
npm run test:node

# E2E tests (Playwright)
npm run test:e2e
```

### 5. Local Development

```bash
# Portfolio development (Miniflare)
npm run dev

# Job server (Docker)
docker-compose up -d

# CLI tools
npm run cli:build
```

---

## Local Development

### Portfolio (Cloudflare Workers)

```bash
# Start Miniflare dev server
npm run dev

# Access at http://127.0.0.1:8787