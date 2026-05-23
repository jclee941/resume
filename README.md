<think>
The user wants me to generate a comprehensive README.md for this repository. Let me analyze the provided information:

1. **Project Type**: Resume/DevSecOps monorepo with Cloudflare Workers
2. **Key Features**:
   - Cloudflare Workers portfolio site
   - Job automation (Wanted/JobKorea)
   - SSoT (Single Source of Truth) data
   - Self-hosted observability
   - n8n workflows

3. **Structure**:
   - Apps: portfolio, job-server, job-dashboard
   - Packages: cli, env, data, shared, types, schemas, contracts
   - Monorepo with npm workspaces

4. **Workflows (34 total)**: Various GitHub Actions for PR, release, docs sync, etc.
5. **No Go automation tools** (the count shows 0)
6. **Models**: minimax-m2.7 and gpt-5.5 via CLIProxyAPI

7. **Key scripts** from package.json:
   - `automate:ssot` - sync + build + typecheck + test
   - `automate:full` - sync all + lint + typecheck + test + build + validate
   - `build` - generate worker.js
   - Various enrichment scripts

Let me create a comprehensive bilingual README.md in Korean and English.

</think>

# README.md

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## Overview

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

```text
                    ┌─────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └────────────┬────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
   │  (CF Workers)   │  │  (n8n orches.)  │  │ (Wanted CV +    │
   └─────────────────┘  └─────────────────┘  │   Social)       │
                                               └─────────────────┘
```

### Models / AI Integration

| Model | Provider | Purpose |
|-------|----------|---------|
| `minimax-m2.7` | MiniMax | Job matching, enrichment automation |
| `gpt-5.5` | OpenAI (via CLIProxyAPI) | Code review, PR automation, documentation generation |

---

## Features

- **Single Source of Truth (SSoT)**: 이력서 데이터는 `packages/data/resumes/master/resume_data.json`에서 관리
- **Edge Portfolio**: Cloudflare Workers 기반 글로벌 엣지 배포
- **Job Automation**: Wanted/JobKorea 잡포털 자동 지원 파이프라인 (n8n 오케스트레이션)
- **Profile Sync**: Wanted 이력서 자동 동기화 + 소셜 프로필 동기화
- **多言語 지원**: 한국어, 영어, 일본어
- **Self-hosted Observability**: 셀프호스트 모니터링 & alerting

---

## Architecture

```
./
├── apps/
│   ├── portfolio/          # Cloudflare Worker 포트폴리오 (公开)
│   ├── job-server/         # MCP/잡 자동화 런타임
│   └── job-dashboard/      # 대시보드 Worker + APIs
├── packages/
│   ├── cli/                # Resume CLI 도구
│   ├── env/                # 환경 변수 검증 + 타입 안전 시크릿
│   ├── data/               # SSoT 이력서 및 JSON 스키마
│   ├── shared/             # 크로스 패키지 유틸리티 (errors, logger, retry, crypto, rate-limit, auth, browser, clients)
│   ├── types/              # 정적 JSDoc/TS 타입 정의 (런타임 의존성 없음)
│   ├── schemas/            # 런타임 Zod 검증 스키마
│   └── contracts/          # OpenAPI 스펙 + Cloudflare Worker Env 인터페이스
├── tools/                  # CI, 빌드, 배포, 검증 스크립트
├── tests/                  # Jest, integration, Playwright E2E
├── infrastructure/         # Cloudflare, monitoring, n8n 설정
├── docs/                   # 가이드, ADR, 아키텍처 문서
└── .github/                # GitHub Actions CI/CD 제어 평면
```

---

## Automation Inventory

### GitHub Actions Workflows (34)

| # | Workflow | Trigger | Description |
|---|----------|---------|-------------|
| 01 | `01_branch-to-pr.yml` | `create` | 브랜치 생성 시 PR 자동 생성 |
| 02 | `02_issue-to-branch.yml` | `issue_comment` | 이슈 댓글에서 브랜치/PR 생성 |
| 03 | `03_pr-checks.yml` | `pull_request` | PR 체크 (lint, test, build) |
| 04 | `04_actionlint.yml` | `push`, `pull_request` | GitHub Actions YAML lint |
| 05 | `05_gitleaks.yml` | `push`, `pull_request` | 시크릿 스캐닝 |
| 06 | `06_codeql.yml` | `push`, `pull_request` | CodeQL 정적 분석 |
| 07 | `07_dependency-review.yml` | `pull_request` | 의존성 보안 리뷰 |
| 08 | `08_scorecard.yml` | `push` | OpenSSF Scorecard |
| 09 | `09_semantic-pr.yml` | `pull_request` | Semantic PR 커밋 검증 |
| 10 | `10_pr-review.yml` | `pull_request` | AI 기반 PR 리뷰 (gpt-5.5) |
| 12 | `12_dependabot-auto-merge.yml` | `schedule`, `pull_request` | Dependabot 자동 병합 |
| 13 | `13_pr-auto-merge.yml` | `pull_request` | PR 자동 병합 |
| 14 | `14_bot-auto-fix.yml` | `pull_request` | Bot 자동 수정 |
| 15 | `15_merged-pr-cleanup.yml` | `delete` | 병합 후 정리 |
| 18 | `18_issue-management.yml` | `issues`, `pull_request` | 이슈 관리 automation |
| 19 | `19_issue-backfill.yml` | `workflow_dispatch` | 이슈 백필 |
| 20 | `20_readme-gen.yml` | `push`, `pull_request` | README 생성 |
| 21 | `21_docs-sync.yml` | `push` | 문서 동기화 |
| 24 | `24_release-notes.yml` | `release` |릴리스 노트 생성 |
| 25 | `25_release-publish.yml` | `release` | 릴리스 게시 |
| 29 | `29_downstream-health-check.yml` | `schedule` | 다운스트림 헬스 체크 |
| 37 | `37_ci-failure-issues.yml` | `workflow_run` | CI 실패 이슈 생성 |
| 42 | `42_reusable-docs-sync.yml` | `push` | 재사용 가능 문서 동기화 |
| 43 | `43_reusable-issue-management.yml` | `issues` | 재사용 가능 이슈 관리 |
| 44 | `44_reusable-pr-checks.yml` | `pull_request` | 재사용 가능 PR 체크 |
| 60 | `60_ci-auto-heal.yml` | `workflow_run` | CI 자동 복구 |
| — | `auto-merge.yml` | `pull_request` | 자동 병합 |
| — | `auto-sync-data.yml` | `schedule` | 데이터 자동 동기화 |
| — | `ci.yml` | `push`, `pull_request` | 메인 CI 파이프라인 |
| — | `delete-standalone-job-worker.yml` | `workflow_dispatch` | Worker 삭제 |
| — | `labeler.yml` | `pull_request` | 라벨 자동 할당 |
| — | `provision-queues.yml` | `workflow_dispatch` | 큐 프로비저닝 |
| — | `release.yml` | `push` | 릴리스 파이프라인 |
| — | `welcome.yml` | `pull_request` | 새로운 기여자 환영 |

### Automation Tools

| Category | Tools |
|----------|-------|
| **AI Models** | `minimax-m2.7` (job matching), `gpt-5.5` (code review, via CLIProxyAPI) |
| **Orchestration** | n8n workflows |
| **CLI** | `packages/cli` - npm 패키지 |
| **Build** | Node.js, Wrangler |
| **Data Sync** | Node.js scripts, Go scripts |
| **Enrichment** | GitHub, Skills, AI enrichment scripts |

---

## Quick Start

### Prerequisites

- Node.js ≥ 22
- npm 10+
- Docker & Docker Compose (for MCP server)

### Installation

```bash
npm install
```

### Core Automation

```bash
# SSoT 데이터 동기화 + 빌드 + 타입 체크 + 테스트
npm run automate:ssot

# 전체 자동화 (데이터 동기화 + lint + 타입 체크 + 테스트 + 빌드 + Cloudflare 검증)
npm run automate:full
```

### Local Development

```bash
# Miniflare 로컬 개발 서버
npm run dev

# 포트폴리오 빌드
npm run build:portfolio

# 포트폴리오 + CLI 빌드
npm run build:full
```

### Testing

```bash
# Jest + Node native 테스트
npm test

# 특정 패키지 테스트
npm test --workspace=packages/types
```

---

## Commands Reference

### Build & Development

| Command | Description |
|---------|-------------|
| `npm run build` | HTML 템플릿에서 `worker.js` 생성 |
| `npm run dev` | Miniflare 로컬 개발 서버 |
| `npm run build:portfolio` | 포트폴리오 Worker 빌드 |
| `npm run build:full` | 포트폴리오 + CLI 빌드 |
| `npm run build:all` | 전체 빌드 |

### Sync & Enrichment

| Command | Description |
|---------|-------------|
| `npm run sync:data` | SSoT 이력서 데이터 동기화 |
| `npm run sync:pptx` | PPTX 생성 (Python) |
| `npm run sync:all` | 데이터 + PPTX 동기화 |
| `npm run sync:proposals` | 제안 동기화 (Node.js + Go) |
| `npm run enrich:github` | GitHub 데이터 Enrichment |
| `npm run enrich:skills` | 스킬 데이터 Enrichment |
| `npm run enrich:ai` | AI 기반 Enrichment |
| `npm run enrich:all` | 전체 Enrichment |

### Quality Assurance

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint linting |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm run test` | Jest + Playwright 테스트 |
| `npm run test:node` | Node 네이티브 테스트 |
| `npm run strip-exif` | 이미지 EXIF 데이터 제거 |

### Automation

| Command | Description |
|---------|-------------|
| `npm run automate:ssot` | sync + build + typecheck + test |
| `npm run automate:full` | 전체 자동화 파이프라인 |

---

## Docker / MCP Server

### Build & Run

```bash
# Docker Compose로 MCP 서버 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f mcp-server

# 중지
docker-compose down
```

### Endpoints

| Service | Port | Description |
|---------|------|-------------|
| MCP Server | 3000 | Job automation runtime |
| Health | /health | 상태 체크 |
| Metrics | /metrics | Prometheus 메트릭스 |

---

## Deployment

### Cloudflare Workers

```bash
# git push to master로 자동 배포 (권장)
git push origin master

# Wrangler를 통한 수동 배포
npx wrangler deploy --env production
```

자세한 내용은 [docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md](docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md) 참조.

---

## Project Knowledge Base

자세한 아키텍처 및 문서는 다음을 참조하세요:

- [AGENTS.md](AGENTS.md) - 프로젝트 전체 구조 및 위치 가이드
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - 상세 아키텍처 문서
- [docs/architecture/](docs/architecture/) - 개별 아키텍처 설계 문서
- [docs/guides/](docs/guides/) - 다양한 가이드 문서
- [docs/adr/](docs/adr/) - Architecture Decision Records
- [docs/security/](docs/security/) - 보안 관련 문서

---

## Contributing

 CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

### 基本ルール

1. **SSoT 준수**: 이력서 데이터는 `packages/data/resumes/master/resume_data.json`에서만 수정
2. **PR 리뷰**: 모든 변경은 PR을 통해 검토
3. **CI 통과**: 모든 워크플로우가 통과해야 병합 가능
4. **타입 안전**: TypeScript strict 모드 준수

### 开发环境セットアップ

```bash
# 克隆
git clone https://github.com/jclee941/resume.git
cd resume

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Links

- **Portfolio**: https://resume.jclee.me
- **English Version**: https://resume.jclee.me/en
- **日本語版**: https://resume.jclee.me/ja
- **Health Check**: https://resume.jclee.me/health
- **Metrics**: https://resume.jclee.me/metrics
- **GitHub**: https://github.com/jclee941/resume
```

---

# Korean-English Bilingual README

```markdown
# resume.jclee.me

## DevSecOps / SRE 이력서 자동화 모노레포 | DevSecOps/SRE Resume Automation Monorepo

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability  
Cloudflare Workers Portfolio · Job Automation Pipeline · Self-hosted Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) ·
[日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) ·
[Metrics](https://resume.jclee.me/metrics)

---

## 개요 | Overview

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 8년차, 금융·공공 보안 인프라.  
Jaecheol Lee — DevSecOps/SRE Engineer. 8 years, FinTech/Government security infrastructure.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.  
This repository is a monorepo of **multiple artifacts derived from a Single Source of Truth (SSoT) resume data**, not a single portfolio site.

```text
                    ┌─────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └────────────┬────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
   │  (CF Workers)   │  │  (n8n orches.)  │  │ (Wanted CV +    │
   └─────────────────┘  └─────────────────┘  │   Social)       │
                                               └─────────────────┘
```

### AI 모델 | AI Models

| 모델 | 제공자 | 용도 |
|------|--------|------|
| `minimax-m2.7` | MiniMax | 잡 매칭, 엔richment 자동화 |
| `gpt-5.5` | OpenAI (via CLIProxyAPI) | 코드 리뷰, PR 자동화, 문서 생성 |

---

## 주요 기능 | Features

| 한국어 | English |
|--------|---------|
| **Single Source of Truth (SSoT)**: 이력서 데이터는 `packages/data/resumes/master/resume_data.json`에서 관리 | **Single Source of Truth (SSoT