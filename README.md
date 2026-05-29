<think>
The user wants me to generate a comprehensive README.md for the repository. Let me analyze the project structure, workflow files, and other provided information to create a well-structured bilingual (Korean and English) README.

Key information from the provided data:
1. Project name: resume.jclee.me
2. Description: DevSecOps/SRE resume automation monorepo
3. Contains: Cloudflare Workers portfolio, job automation pipelines, self-hosted observability
4. Technologies: Node.js ≥22, Cloudflare Workers, Docker
5. Monorepo with workspaces: apps/portfolio, apps/job-server, apps/job-dashboard, packages/cli, packages/data, packages/shared, packages/types, packages/schemas, packages/contracts, packages/env
6. 35 workflow files total
7. Key models: minimax-m2.7 and gpt-5.5 (via CLIProxyAPI)
8. Current version: 1.40.11

Let me structure the README with:
- Title and badges
- Overview
- Features
- Architecture
- Automation inventory (workflows + tools)
- Quick start
- Local development
- Commands reference
- Contribution guide

I'll make it bilingual (Korean first, then English) as requested.
</think>

# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/workers/)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-43853D?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[포트폴리오 →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

# DevSecOps / SRE Resume Automation Monorepo

Cloudflare Workers Portfolio · Job Automation Pipeline · Self-Hosted Observability

---

## 목차 (Table of Contents)

- [개요 (Overview)](#개요-overview)
- [주요 기능 (Features)](#주요-기능-features)
- [아키텍처 (Architecture)](#아키텍처-architecture)
- [자동화 인벤토리 (Automation Inventory)](#자동화-인벤토리-automation-inventory)
- [빠른 시작 (Quick Start)](#빠른-시작-quick-start)
- [로컬 개발 (Local Development)](#로컬-개발-local-development)
- [コマンド 레퍼런스 (Commands Reference)](#コマンド-레퍼런스-commands-reference)
- [기여 가이드 (Contribution Guide)](#기여-가이드-contribution-guide)

---

## 개요 (Overview)

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(Single Source of Truth, SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

---

## Overview

이재철 (Jaecheol Lee) — DevSecOps/SRE Engineer. 8 years, financial/public security infrastructure.

This repository is not a single portfolio site but a **monorepo of multiple outputs derived from a Single Source of Truth (SSoT) resume data**.

```text
                    ┌─────────────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └─────────────────────────┬───────────────────┘
                                              │
        ┌──────────────────────────────────────┼──────────────────────────────────────┐
        ▼                                      ▼                                      ▼
┌─────────────────┐               ┌─────────────────┐                  ┌─────────────────┐
│  Edge Portfolio │               │   Job Server    │                  │    Dashboard    │
│  (CF Workers)   │               │  (MCP Runtime)  │                  │  (Cloudflare)   │
└─────────────────┘               └─────────────────┘                  └─────────────────┘
        │                                      │                                      │
        ▼                                      ▼                                      ▼
┌─────────────────┐               ┌─────────────────┐                  ┌─────────────────┐
│  resume.jclee.me│               │  Wanted CV Sync │                  │   Job Dashboard │ 
│  /en  /ja       │               │  JobKorea Auto  │                  │   REST API      │
└─────────────────┘               └─────────────────┘                  └─────────────────┘
```

### 지원 언어 (Supported Languages)

- 한국어 (Korean)
- English
- 日本語 (Japanese)
- 中文 (Chinese)

---

## 주요 기능 (Features)

### Core Components

| 컴포넌트 | 설명 |
|----------|------|
| `apps/portfolio` | Cloudflare Workers 기반 공개 포트폴리오 (Edge-runtime-generated worker.js) |
| `apps/job-server` | MCP 서버 · 구직 자동화 런타임 · Wanted/JobKorea API 클라이언트 |
| `apps/job-dashboard` | Dashboard Worker · Cloudflare Workflows · REST API |
| `packages/cli` | Resume CLI 도구 (`db`, `deploy`, `verify` 명령) |
| `packages/data` | SSoT 이력서 JSON 원본 및 스키마 |
| `packages/shared` | 교차 패키지 유틸리티 (errors, crypto, retry, rate-limit, auth, browser, clients) |
| `packages/types` | JSDoc/TS 캐노니컬 타입 정의 (런타임 의존성 없음) |
| `packages/schemas` | Zod 런타임 검증 스키마 |
| `packages/contracts` | OpenAPI 스펙 + Cloudflare Worker Env 인터페이스 |
| `packages/env` | 환경 변수 검증 + 타입 세이프 시크릿 |

### 주요 기술 스택

- **Runtime:** Node.js ≥22, Cloudflare Workers
- **Language:** TypeScript, JavaScript, Go (CI/CD scripts)
- **Validation:** Zod
- **API:** OpenAPI 3.1, REST
- **Data:** JSON Schema, SSoT pattern
- **Testing:** Jest, Playwright
- **Containers:** Docker, docker-compose
- **AI Integration:** CLIProxyAPI (minimax-m2.7, gpt-5.5)

---

## 아키텍처 (Architecture)

```text
.
├── .github/
│   ├── workflows/          # GitHub Actions (35개 워크플로우)
│   │   ├── 01_branch-to-pr.yml
│   │   ├── 02_issue-to-branch.yml
│   │   ├── 03_pr-checks.yml
│   │   ├── 04_actionlint.yml
│   │   ├── 05_gitleaks.yml
│   │   ├── 06_codeql.yml
│   │   ├── 07_dependency-review.yml
│   │   ├── 08_scorecard.yml
│   │   ├── 09_semantic-pr.yml
│   │   ├── 10_pr-review.yml
│   │   ├── 12_dependabot-auto-merge.yml
│   │   ├── 13_pr-auto-merge.yml
│   │   ├── 14_bot-auto-fix.yml
│   │   ├── 15_merged-pr-cleanup.yml
│   │   ├── 18_issue-management.yml
│   │   ├── 19_issue-backfill.yml
│   │   ├── 20_readme-gen.yml
│   │   ├── 21_docs-sync.yml
│   │   ├── 24_release-notes.yml
│   │   ├── 25_release-publish.yml
│   │   ├── 29_downstream-health-check.yml
│   │   ├── 37_ci-failure-issues.yml
│   │   ├── 42_reusable-docs-sync.yml
│   │   ├── 43_reusable-issue-management.yml
│   │   ├── 44_reusable-pr-checks.yml
│   │   ├── 60_ci-auto-heal.yml
│   │   ├── auto-merge.yml
│   │   ├── auto-sync-data.yml
│   │   ├── ci.yml
│   │   ├── delete-standalone-job-worker.yml
│   │   ├── labeler.yml
│   │   ├── post-deploy-verify.yml
│   │   ├── provision-queues.yml
│   │   ├── release.yml
│   │   └── welcome.yml
│   └── scripts/
│
├── apps/
│   ├── portfolio/          # Cloudflare Worker Edge Site
│   │   ├── src/
│   │   │   ├── images/
│   │   │   └── templates/
│   │   └── worker.js       # Generated
│   ├── job-server/         # MCP/Job Automation Runtime
│   │   └── src/
│   │       ├── server/
│   │       ├── sync/
│   │       └── clients/
│   └── job-dashboard/      # Dashboard API
│       └── src/
│
├── packages/
│   ├── cli/                # resume CLI
│   ├── env/                # Environment validation
│   ├── data/               # SSoT resume data
│   ├── shared/             # Cross-package utilities
│   ├── types/              # JSDoc/TS types
│   ├── schemas/            # Zod schemas
│   ├── contracts/          # OpenAPI + Env interface
│
├── tools/
│   ├── scripts/            # CI/build/deploy scripts (Go + JS)
│   └── ci/                 # Validation scripts
│
├── infrastructure/         # Monitoring, n8n configs
├── tests/                  # Jest, integration, E2E
├── docs/                   # ADRs, architecture docs
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── jest.config.cjs
├── playwright.config.js
├── eslint.config.cjs
├── lychee.toml
└── wrangler.jsonc
```

### 데이터 플로우 (Data Flow)

```text
resume_data.json (SSoT)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Build Pipeline (sync:data → build → typecheck → test)   │
└──────────────────────────────────────────────────────────┘
       │
       ├──────────────────┬──────────────────┬──────────────┐
       ▼                  ▼                  ▼              ▼
  portfolio/          job-server/       job-dashboard/  external/
  worker.js           MCP Server        REST API       sync/
                                                           │
                                                           ▼
                                                     Wanted CV
                                                     JobKorea
```

---

## 자동화 인벤토리 (Automation Inventory)

### GitHub Actions 워크플로우 (Workflows)

#### Pull Request & Branch Automation

| 워크플로우 | 설명 |
|-----------|------|
| `01_branch-to-pr.yml` | 브랜치 생성 → PR 연결 자동화 |
| `02_issue-to-branch.yml` | 이슈 → 브랜치 자동 생성 (`jclee941/issue-branch-action`) |
| `03_pr-checks.yml` | PR 체크셋 실행 (Reusable Workflow: `44_reusable-pr-checks.yml`) |
| `09_semantic-pr.yml` | semantic-pr/commitlint PR 검증 |
| `10_pr-review.yml` | AI 자동 PR 리뷰 (minimax-m2.7, gpt-5.5 via CLIProxyAPI) |
| `13_pr-auto-merge.yml` | 자동 병합 |
| `14_bot-auto-fix.yml` | Bot 자동 수정 |
| `15_merged-pr-cleanup.yml` | 병합 후 정리 |
| `auto-merge.yml` | Dependabot + semantic PR 자동 병합 |
| `labeler.yml` | PR 라벨 자동 할당 |

#### Security & Compliance

| 워크플로우 | 설명 |
|-----------|------|
| `04_actionlint.yml` | GitHub Actions YAML lint (`actionlint`) |
| `05_gitleaks.yml` | 시크릿 스캔 (`gitleaks`) |
| `06_codeql.yml` | CodeQL 정적 분석 |
| `07_dependency-review.yml` | 의존성 보안 리뷰 |
| `08_scorecard.yml` | OpenSSF Scorecard |

#### Release & Deployment

| 워크플로우 | 설명 |
|-----------|------|
| `24_release-notes.yml` | 자동 릴리스 노트 생성 |
| `25_release-publish.yml` | 릴리스 게시 |
| `release.yml` | 릴리스 워크플로우 |
| `CI/CD (ci.yml)` | 일반 CI 파이프라인 |
| `post-deploy-verify.yml` | 배포 후 검증 |

#### Documentation & Sync

| 워크플로우 | 설명 |
|-----------|------|
| `20_readme-gen.yml` | README 자동 생성 |
| `21_docs-sync.yml` | 문서 동기화 (Reusable: `42_reusable-docs-sync.yml`) |
| `42_reusable-docs-sync.yml` | 문서 동기화 재사용 워크플로우 |

#### Issue & Project Management

| 워크플로우 | 설명 |
|-----------|------|
| `18_issue-management.yml` | 이슈 관리 자동화 (Reusable: `43_reusable-issue-management.yml`) |
| `19_issue-backfill.yml` | 이슈 백필 |
| `37_ci-failure-issues.yml` | CI 실패 → 이슈 자동 생성 |
| `43_reusable-issue-management.yml` | 이슈 관리 재사용 워크플로우 |
| `welcome.yml` | 새 기여자 환영 메시지 |

#### Maintenance & Health

| 워크플로우 | 설명 |
|-----------|------|
| `12_dependabot-auto-merge.yml` | Dependabot 자동 병합 |
| `29_downstream-health-check.yml` | 다운스트림 건강 상태检查 |
| `60_ci-auto-heal.yml` | CI 자동 복구 |
| `auto-sync-data.yml` | 데이터 자동 동기화 |
| `provision-queues.yml` | 큐 프로비저닝 |
| `delete-standalone-job-worker.yml` |孤立 Worker 정리 |

#### Reusable Workflows

| 워크플로우 | 설명 |
|-----------|------|
| `42_reusable-docs-sync.yml` | 문서 동기화 |
| `43_reusable-issue-management.yml` | 이슈 관리 |
| `44_reusable-pr-checks.yml` | PR 체크 |

### AI Models (via CLIProxyAPI)

| 모델 | 용도 |
|------|------|
| `minimax-m2.7` | PR 리뷰, 코드 분석 |
| `gpt-5.5` | 문서 생성, 복잡한 분석 |

### 주요 NPM 스크립트

```bash
# SSoT 자동화
npm run sync:data              # 이력서 JSON 동기화
npm run sync:pptx              # PPTX 생성 (Python)
npm run sync:all               # 전체 동기화
npm run sync:proposals         # 제안 동기화 (JS + Go)

# AI enriched 데이터
npm run enrich:github          # GitHub 데이터 enrichment
npm run enrich:skills          # 기술 스택 enrichment
npm run enrich:ai              # AI 기반 enrichment
npm run enrich:all             # 전체 enrichment

# 빌드 & 배포
npm run build                   # portfolio worker.js 생성
npm run build:full             # 전체 빌드 + CLI
npm run deploy                  # 배포 (手動 비활성화)
npm run cli:build              # CLI 빌드

# 테스트 & 검증
npm test                       # Jest + Node native
npm run test:node              # Node native tests only
npm run typecheck              # TypeScript check
npm run lint                   # ESLint

# 완전 자동화
npm run automate:ssot          # sync + build + typecheck + test
npm run automate:full          # 전체 검증 + Cloudflare 네이티브 검증 (Go)
```

---

## 빠른 시작 (Quick Start)

### 필수 요구사항 (Prerequisites)

- Node.js ≥22
- npm or yarn
- Docker & Docker Compose (optional)
- Go lang (for CI scripts)

### 설치 (Installation)

```bash
# 클론
git clone https://github.com/jclee941/resume.git
cd resume

# 의존성 설치
npm install

# SSoT 데이터 동기화
npm run sync:data

# 빌드
npm run build
```

### 로컬 개발 서버 (Local Dev Server)

```bash
# Miniflare를 사용한 로컬 개발
npm run dev

# Docker Compose로 실행
docker-compose up --build
```

### 빠른 검증 (Quick Validation)

```bash
# SSoT → 빌드 → 타입检查 → 테스트
npm run automate:ssot

# 전체 자동화 (lint + test + build + Go 검증)
npm run automate:full
```

---

## 로컬 개발 (Local Development)

### 개발 환경 설정 (Development Setup)

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일을編集하여 필요한 API 키 설정

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 테스트 실행
npm test

# 4. 타입 체크
npm run typecheck
```

### Docker 기반 개발 (Docker-based Development)

```bash
# 전체 스택 실행
docker-compose up --build

# 로그 확인
docker-compose logs -f

# 컨테이너 내부 접근
docker exec -it resume-mcp-server sh
```

### IDE 설정 (IDE Setup)

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.workingDirectories": ["packages/*"],
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Commands Reference

### 빌드 & 개발 스크립트 (Build & Development Scripts)

| 스크립트 | 설명 |
|----------|------|
| `npm run build` | Generate `worker.js` from HTML templates |
| `npm run build:portfolio` |