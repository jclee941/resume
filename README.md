<think>
The user wants me to generate a comprehensive README.md for a repository. Based on the project structure and information provided, I need to create a bilingual (Korean and English) README.md that covers:

1. Title
2. Badges
3. Overview
4. Features
5. Architecture
6. Automation inventory (workflows + tools)
7. Quick start
8. Local development
9. Commands reference
10. Contribution guide

Let me analyze the repository:

- This is a resume/portfolio monorepo
- Uses Cloudflare Workers for the portfolio site
- Has job automation (Wanted/JobKorea)
- Uses n8n for orchestration
- Has MCP (Model Context Protocol) server
- Uses GitHub Actions for CI/CD
- Has 34 workflow files
- Uses npm workspaces for monorepo
- Has Docker support
- Contains various tools in Go, Node.js, Python

Key information:
- Name: resume.jclee.me
- Owner: Jaecheol Lee (이재철) - DevSecOps/SRE engineer
- Version: 1.40.11
- Node.js >= 22
- Cloudflare Workers
- Workspaces: apps/portfolio, apps/job-server, apps/job-dashboard, packages/cli, packages/data, packages/shared, packages/types, packages/schemas, packages/contracts, packages/env

The automation inventory mentions:
- 34 workflow files total
- Various GitHub Actions workflows (01_branch-to-pr.yml through 60_ci-auto-heal.yml, plus others)
- Tools in Go and Node.js (but 0 GO automation tools according to the count)

Let me create a comprehensive bilingual README.

</think>

# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

---

# resume.jclee.me

## DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## Overview | 개요

### English

This repository is a **monorepo** for the `resume.jclee.me` project — a DevSecOps/SRE engineer's resume portfolio and job application automation system. It leverages the **Single Source of Truth (SSoT)** pattern: a single `resume_data.json` file drives multiple outputs including the edge-deployed portfolio site, job automation pipelines, and profile synchronization services.

### 한국어

이 저장소는 `resume.jclee.me` 프로젝트의 **모노레포**입니다 — DevSecOps/SRE 엔지니어의 포트폴리오 사이트와 구직 지원 자동화 시스템을 포함합니다. **단일 진실원(SSoT)** 패턴을採用하여, 단일 `resume_data.json` 파일에서 에지 배포 포트폴리오 사이트, 구직 자동화 파이프라인, 프로필 동기화 서비스 등 다중 산출물을 생성합니다.

---

## Features | 기능

### English

- **Edge Portfolio Site**: Cloudflare Workers deployed at the edge with i18n support (KO/EN/JA)
- **Job Automation Pipeline**: Automated job application workflows for Wanted, JobKorea, and similar platforms
- **Single Source of Truth**: Centralized `resume_data.json` powering all derived outputs
- **MCP Server**: Model Context Protocol server for AI-assisted job matching and automation
- **Self-Hosted Observability**: Grafana + Prometheus + alerting infrastructure
- **n8n Workflows**: Visual workflow automation for job posting and profile sync
- **GitHub Actions CI/CD**: 34 automated workflows covering PR checks, releases, deployments, and more
- **Type-Safe Environment**: Zod validation schemas + TypeScript types for all environments
- **Docker Support**: Containerized job-server and MCP server with health checks

### 한국어

- **에지 포트폴리오 사이트**: i18n 지원(KO/EN/JA) Cloudflare Workers 에지 배포
- **구직 자동화 파이프라인**: 원티드, 잡코리아 등 플랫폼용 자동 지원 워크플로우
- **단일 진실원(SSoT)**: 모든 파생 산출물을 구동하는 중앙 집중식 `resume_data.json`
- **MCP 서버**: AI 기반 직업 매칭 및 자동화를 위한 Model Context Protocol 서버
- **셀프호스팅 옵저버빌리티**: Grafana + Prometheus + 알리밍 인프라
- **n8n 워크플로우**: 구직 공고 및 프로필 동기화를 위한 시각적 워크플로우 자동화
- **GitHub Actions CI/CD**: PR 검사, 릴리스, 배포 등을カバー하는 34개 자동화 워크플로우
- **타입 안전 환경**: Zod 검증 스키마 + TypeScript 타입
- **Docker 지원**: 헬스체크가 포함된 컨테이너화된 job-server 및 MCP 서버

---

## Architecture | 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Single Source of Truth (SSoT)                       │
│                   packages/data/resumes/master/resume_data.json              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────────────────────┐
         │                        │                                        │
         ▼                        ▼                                        ▼
┌─────────────────┐      ┌─────────────────┐                      ┌─────────────────┐
│  Edge Portfolio │      │  Job Automation │                      │  Profile Sync   │
│  (CF Workers)   │      │  (n8n + MCP)    │                      │ (Wanted/Social) │
│  apps/portfolio │      │  apps/job-server│                      │ apps/job-server │
└─────────────────┘      └─────────────────┘                      └─────────────────┘
         │                        │                                        │
         ▼                        ▼                                        ▼
  resume.jclee.me          Self-hosted Server                       External APIs
  (Global Edge)            (Docker/n8n)                             (Wanted/JobKorea)
```

### English

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | Cloudflare Workers, HTML/JS | Edge-deployed portfolio with i18n |
| **API/Automation** | Node.js 22+, n8n | Job server, MCP tools, crawlers |
| **Data** | JSON (SSoT), Zod schemas | Type-safe validation at runtime |
| **Contracts** | OpenAPI, TypeScript | API specs and Worker Env interfaces |
| **CI/CD** | GitHub Actions (34 workflows) | Automation for PR, release, deploy |
| **Observability** | Grafana, Prometheus | Self-hosted monitoring stack |
| **Container** | Docker, docker-compose | Production-ready deployments |

### 한국어

| 레이어 | 기술 스택 | 설명 |
|--------|----------|------|
| **프론트엔드** | Cloudflare Workers, HTML/JS | i18n 지원 에지 배포 포트폴리오 |
| **API/자동화** | Node.js 22+, n8n | Job 서버, MCP 도구, 크롤러 |
| **데이터** | JSON (SSoT), Zod 스키마 | 런타임 타입 안전 검증 |
| **컨트랙트** | OpenAPI, TypeScript | API 스펙 및 Worker Env 인터페이스 |
| **CI/CD** | GitHub Actions (34 워크플로우) | PR, 릴리스, 배포 자동화 |
| **옵저버빌리티** | Grafana, Prometheus | 셀프호스팅 모니터링 스택 |
| **컨테이너** | Docker, docker-compose | 운영 환경 배포 준비 |

---

## Automation Inventory | 자동화 인벤토리

### English

This repository contains **34 GitHub Actions workflows** and additional tooling for comprehensive automation:

#### Workflows (`.github/workflows/`)

| Category | Workflows | Purpose |
|----------|-----------|---------|
| **Branch/PR** | `01_branch-to-pr.yml`, `03_pr-checks.yml`, `13_pr-auto-merge.yml` | PR lifecycle automation |
| **Issue Management** | `02_issue-to-branch.yml`, `18_issue-management.yml`, `19_issue-backfill.yml`, `43_reusable-issue-management.yml` | Issue tracking and automation |
| **Code Quality** | `04_actionlint.yml`, `05_gitleaks.yml`, `06_codeql.yml`, `07_dependency-review.yml`, `08_scorecard.yml`, `44_reusable-pr-checks.yml` | Security and linting checks |
| **Release** | `09_semantic-pr.yml`, `24_release-notes.yml`, `25_release-publish.yml`, `release.yml` | Semantic versioning and release process |
| **Documentation** | `20_readme-gen.yml`, `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | Auto-generated and synced docs |
| **Deployment** | `29_downstream-health-check.yml`, `auto-sync-data.yml`, `ci.yml`, `labeler.yml` | Deployment and health monitoring |
| **Auto-Fix** | `10_pr-review.yml`, `12_dependabot-auto-merge.yml`, `14_bot-auto-fix.yml` | Automated PR fixing and merging |
| **Maintenance** | `15_merged-pr-cleanup.yml`, `37_ci-failure-issues.yml`, `60_ci-auto-heal.yml` | Repository maintenance and CI healing |
| **Specialized** | `auto-merge.yml`, `delete-standalone-job-worker.yml`, `provision-queues.yml`, `welcome.yml` | Additional automation tasks |

#### AI Models (via CLIProxyAPI)

| Model | Purpose |
|-------|---------|
| `minimax-m2.7` | Primary automation model |
| `gpt-5.5` | Secondary/GPT-family model |

#### Tools & Scripts

- **Node.js**: Build scripts, data sync, enrichment tools
- **Go**: CI validation scripts (`tools/ci/`)
- **Python**: PPTX generation, data processing

### 한국어

이 저장소는 **34개의 GitHub Actions 워크플로우**와 추가 도구를 포함하여 종합 자동화를提供합니다:

#### 워크플로우 (`.github/workflows/`)

| 카테고리 | 워크플로우 | 목적 |
|----------|-----------|------|
| **브랜치/PR** | `01_branch-to-pr.yml`, `03_pr-checks.yml`, `13_pr-auto-merge.yml` | PR 라이프사이클 자동화 |
| **이슈 관리** | `02_issue-to-branch.yml`, `18_issue-management.yml`, `19_issue-backfill.yml`, `43_reusable-issue-management.yml` | 이슈 트래킹 및 자동화 |
| **코드 품질** | `04_actionlint.yml`, `05_gitleaks.yml`, `06_codeql.yml`, `07_dependency-review.yml`, `08_scorecard.yml`, `44_reusable-pr-checks.yml` | 보안 및 린팅 검사 |
| **릴리스** | `09_semantic-pr.yml`, `24_release-notes.yml`, `25_release-publish.yml`, `release.yml` | 시맨틱 버저닝 및 릴리스 프로세스 |
| **문서화** | `20_readme-gen.yml`, `21_docs-sync.yml`, `42_reusable-docs-sync.yml` | 자동 생성 및 동기화 문서 |
| **배포** | `29_downstream-health-check.yml`, `auto-sync-data.yml`, `ci.yml`, `labeler.yml` | 배포 및 헬스 모니터링 |
| **자동 수정** | `10_pr-review.yml`, `12_dependabot-auto-merge.yml`, `14_bot-auto-fix.yml` | 자동 PR 수정 및 병합 |
| **유지보수** | `15_merged-pr-cleanup.yml`, `37_ci-failure-issues.yml`, `60_ci-auto-heal.yml` | 저장소 유지보수 및 CI 복구 |
| **특수** | `auto-merge.yml`, `delete-standalone-job-worker.yml`, `provision-queues.yml`, `welcome.yml` | 추가 자동화 태스크 |

#### AI 모델 (CLIProxyAPI 경유)

| 모델 | 목적 |
|------|------|
| `minimax-m2.7` | 주 자동화 모델 |
| `gpt-5.5` | 보조/GPT 계열 모델 |

---

## Quick Start | 빠른 시작

### English

```bash
# Clone the repository
git clone https://github.com/jclee941/resume.git
cd resume

# Install dependencies
npm install

# Run SSoT automation (sync + build + typecheck + test)
npm run automate:ssot

# Run full automation pipeline
npm run automate:full

# Development
npm run dev
```

### 한국어

```bash
# 저장소 클론
git clone https://github.com/jclee941/resume.git
cd resume

# 의존성 설치
npm install

# SSoT 자동화 실행 (동기화 + 빌드 + 타입체크 + 테스트)
npm run automate:ssot

# 전체 자동화 파이프라인 실행
npm run automate:full

# 개발 모드
npm run dev
```

---

## Local Development | 로컬 개발

### English

#### Prerequisites

- Node.js ≥ 22
- Docker & Docker Compose (for job-server/MCP server)
- Optional: `exiftool` for image metadata stripping

#### Using Miniflare (Portfolio)

```bash
npm run dev
# Portfolio available at http://localhost:8787
```

#### Using Docker (Job Server / MCP)

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down
```

### 한국어

#### 전제 조건

- Node.js ≥ 22
- Docker 및 Docker Compose (job-server/MCP 서버용)
- 선택: 이미지 메타데이터 제거용 `exiftool`

#### Miniflare 사용 (포트폴리오)

```bash
npm run dev
# 포트폴리오: http://localhost:8787
```

#### Docker 사용 (Job 서버 / MCP)

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f mcp-server

# 서비스 중지
docker-compose down
```

---

## Commands Reference | 명령어 참조

### English

| Script | Description |
|--------|-------------|
| `npm run automate:ssot` | Sync data + build + typecheck + test |
| `npm run automate:full` | Full pipeline: sync + lint + typecheck + test + build |
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:full` | Build portfolio + CLI |
| `npm run dev` | Miniflare local development |
| `npm run lint` | ESLint on all workspaces |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Jest + Node native tests |
| `npm run test:node` | Node-specific tests |
| `npm run sync:data` | Sync resume data from SSoT |
| `npm run sync:pptx` | Generate PPTX presentation |
| `npm run sync:all` | Sync data + PPTX |
| `npm run enrich:github` | Enrich resume with GitHub data |
| `npm run enrich:skills` | Enrich resume with skills data |
| `npm run enrich:ai` | AI-powered resume enrichment |
| `npm run enrich:all` | Run all enrichment scripts |
| `npm run deploy` | Disabled (use git push to master) |
| `npm run strip-exif` | Strip EXIF from portfolio images |
| `npm run version:bump` | Bump version (patch) |

### 한국어

| 스크립트 | 설명 |
|----------|------|
| `npm run automate:ssot` | 데이터 동기화 + 빌드 + 타입체크 + 테스트 |
| `npm run automate:full` | 전체 파이프라인: 동기화 + 린트 + 타입체크 + 테스트 + 빌드 |
| `npm run build` | HTML 템플릿에서 `worker.js` 생성 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run dev` | Miniflare 로컬 개발 |
| `npm run lint` | 모든 워크스페이스 ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run test` | Jest + Node 네이티브 테스트 |
| `npm run test:node` | Node 특정 테스트 |
| `npm run sync:data` | SSoT에서 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 프레젠테이션 생성 |
| `npm run sync:all` | 데이터 + PPTX 동기화 |
| `npm run enrich:github` | GitHub 데이터로 이력서 보강 |
| `npm run enrich:skills` | 스킬 데이터로 이력서 보강 |
| `npm run enrich:ai` | AI 기반 이력서 보강 |
| `npm run enrich:all` | 모든 보강 스크립트 실행 |
| `npm run deploy` | 비활성화 (master에 git push 사용) |
| `npm run strip-exif` | 포트폴리오 이미지에서 EXIF 제거 |
| `npm run version:bump` | 버전 업데이트 (패치) |

---

## Contribution Guide | 기여 가이드

### English

We welcome contributions! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for detailed guidelines.

#### Contributing Steps

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make changes** with proper testing