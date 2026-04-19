# Resume Management System

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)

이재철 (Jaecheol Lee) — DevSecOps/SRE 이력서 자동화 monorepo. Cloudflare Workers 포트폴리오, 구직 자동화 파이프라인, 셀프호스팅 Observability.

## Live

- **Portfolio**: https://resume.jclee.me
- **English**: https://resume.jclee.me/en

## Structure

```
resume/
├── apps/
│   ├── portfolio/          # Edge portfolio (Cloudflare Worker, ~572KB)
│   ├── job-server/         # MCP Server + Job automation runtime
│   └── job-dashboard/      # CF Worker: Dashboard API (Service Binding)
├── packages/
│   ├── cli/                # Deployment CLI
│   ├── data/               # SSoT: resume_data.json (canonical)
│   └── shared/             # Cross-worker utilities
├── infrastructure/
│   ├── monitoring/         # Grafana, Prometheus, Elasticsearch
│   └── n8n/                # Workflow automation (10+ workflows)
├── tools/                  # Build, CI, verification scripts
├── tests/                  # Jest unit + Playwright E2E
└── docs/                   # Guides, ADRs, architecture
```

## Tech Stack

| Layer         | Stack                                           |
| ------------- | ----------------------------------------------- |
| Frontend      | HTML5, CSS3, Vanilla JS, IBM Plex Mono + Inter  |
| Runtime       | Cloudflare Workers (portfolio + dashboard)      |
| Automation    | Node.js MCP Server, Playwright, n8n             |
| Build         | npm workspaces, Bazel (query layer)             |
| CI/CD         | GitHub Actions → Cloudflare Workers Builds      |
| Testing       | Jest (unit), Playwright (E2E), Node test runner |
| Observability | Grafana, Prometheus, Elasticsearch, Loki        |

## Quick Start

```bash
npm install
npm run automate:ssot     # sync + build + typecheck + test
npm run dev               # local dev (Miniflare)
npm test                  # all tests
npm run lint && npm run typecheck
```

## Architecture

### Portfolio Worker

HTML 템플릿 → `generate-worker.js` → `worker.js` (edge artifact). CSP SHA-256 해시, HSTS, multi-language (`/` KO, `/en` EN).

### Job Automation Runtime

MCP Server (Fastify) + 16 MCP tools. Hexagonal architecture: services (domain) ↔ clients (adapters).

| Component              | Role                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `src/crawlers/`        | Stealth Playwright crawlers (Wanted, JobKorea, Saramin, +7) |
| `src/auto-apply/`      | Browser-based form submission + rate limiting               |
| `src/shared/services/` | 22 domain services (matching, apply, session, resume, etc.) |
| `src/session-broker/`  | Wanted session renewal (Docker + stealth browser)           |

## Job Automation

### Resume Sync

| Platform     | Method                          | Status |
| ------------ | ------------------------------- | ------ |
| **Wanted**   | OneID token + Chaos API v1      | Active |
| **JobKorea** | Playwright headless + form POST | Active |

### Auto-Apply

Wanted + JobKorea 자동지원. n8n 파이프라인으로 매일 9시/21시 실행.

| Platform     | Method                                                        | How                                                           |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------- |
| **Wanted**   | Browser-based (CDP cookie injection → `page.evaluate(fetch)`) | OneID 토큰 → CDP HttpOnly 쿠키 → Chaos API `/applications/v1` |
| **JobKorea** | Playwright (click "즉시 지원" button flow)                    | `page.getByRole('button', { name: '즉시 지원' })`             |

```bash
# CLI
node apps/job-server/src/auto-apply/cli/index.js apply --apply --max=10

# n8n pipeline (SSH)
node apps/job-server/scripts/job-search-apply-pipeline.js
```

### Cover Letter Generator

직무별 맞춤형 자소서 자동 생성 (500-600자). 6개 직무 템플릿 (DevSecOps, SRE, Security, Cloud Security, DevOps, Infra). Claude API 연동 시 AI 맞춤형 전환.

- **Fallback**: `cover-letter-generator.js` — `detectRole()` → `buildKoreanCoverLetter()`
- **AI**: `ANTHROPIC_API_KEY` 설정 시 Claude Haiku 기반 직무 맞춤 생성

### Profile Auto-Sync

`resume_data.json` → Wanted CV + 소셜 프로필 자동 반영 (Playwright + CDP).

## n8n Workflows

| Workflow                    | Schedule    | Purpose                                                      |
| --------------------------- | ----------- | ------------------------------------------------------------ |
| **Job Search + Auto Apply** | 9am/9pm KST | 검색 → 스코어링 → 자소서 생성 → 자동지원 (Wanted + JobKorea) |
| **Resume Sync**             | Sun 3am KST | Wanted + JobKorea 이력서 동기화                              |
| **Shared: Telegram Notify** | On demand   | `@qws941_bot` 알림                                           |

```bash
# Manual trigger
curl -X POST https://n8n.jclee.me/webhook/job-search-apply
curl -X POST https://n8n.jclee.me/webhook/resume-sync
```

## Observability

Prometheus → Grafana 대시보드, Elasticsearch ECS 로그, Loki 인프라 로그.

```bash
curl https://resume.jclee.me/health    # JSON health check
curl https://resume.jclee.me/metrics   # Prometheus exposition
```

> 상세: [Infrastructure Guide](docs/guides/INFRASTRUCTURE.md) · [Monitoring Setup](docs/guides/MONITORING_SETUP.md)

## CI/CD

| Workflow      | Trigger              | Jobs                                                             |
| ------------- | -------------------- | ---------------------------------------------------------------- |
| **CI**        | push/PR to master    | lint, typecheck, test-jest, test-node (782 tests), validate-data |
| **Release**   | CI success on master | semver bump, changelog, GitHub Release, CF Workers deploy        |
| **Auto-sync** | daily 00:00 UTC      | SSoT sync, drift detection, auto PR                              |

## Deployment

Production: Cloudflare Workers Builds (git push → CI → auto deploy).

```bash
npm run automate:full    # full CI pipeline locally
git push                 # triggers CI + deploy
```

`npm run deploy` is intentionally disabled. Use the git push flow.

## Documentation

| Guide                       | Path                                                 |
| --------------------------- | ---------------------------------------------------- |
| Infrastructure Architecture | `docs/guides/INFRASTRUCTURE.md`                      |
| Monitoring Setup            | `docs/guides/MONITORING_SETUP.md`                    |
| Auto-Apply Guide            | `docs/guides/auto-apply.md`                          |
| Cover Letter Strategy       | `docs/guides/cover-letter-customization-strategy.md` |
| Certification Roadmap       | `docs/guides/certification-roadmap.md`               |
| PDF Generation              | `docs/guides/PDF_GENERATION.md`                      |

### AGENTS.md Hierarchy

43+ domain-specific AGENTS.md files across `apps/`, `packages/`, `tests/`, `tools/`, `infrastructure/`.

## Links

- **Portfolio**: https://resume.jclee.me
- **GitHub**: https://github.com/jclee941/resume
