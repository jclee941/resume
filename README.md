<div align="center">

# resume.jclee.me

**DevSecOps / SRE 이력서 자동화 모노레포**

Cloudflare Workers 포트폴리오 · 구직 자동화 파이프라인 · 셀프호스팅 Observability

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

[Portfolio →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) · [日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) · [Metrics](https://resume.jclee.me/metrics)

</div>

---

## Overview

이재철 (Jaecheol Lee) — DevSecOps/SRE 엔지니어. 9년차, 금융·공공 보안 인프라.

이 저장소는 단일 포트폴리오 사이트가 아닌 **단일 진실원(SSoT) 이력서 데이터에서 파생되는 다중 산출물**의 모노레포입니다.

```
                    ┌─────────────────────────────────┐
                    │  packages/data/resumes/master/resume_data.json  │  ← Single Source of Truth
                    └────────────┬────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Edge Portfolio │  │ Job Automation  │  │ Profile Sync    │
   │  (CF Workers)   │  │ (MCP + n8n)     │  │ (Wanted/JK CV)  │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Quick Start

```bash
npm install
npm run automate:ssot     # sync + build + typecheck + test
npm run dev               # Miniflare local dev
npm test                  # Jest + Node native
```

## Structure

```
resume/
├─ apps/
│  ├─ portfolio/           Edge portfolio · Cloudflare Worker (~409 KB)
│  ├─ job-server/          MCP Server + 14 tools, hexagonal job-automation runtime
│  └─ job-dashboard/       Dashboard API Worker (Service Binding)
├─ packages/
│  ├─ data/                SSoT — resume_data.json (ko / en / ja)
│  ├─ types/               Canonical JSDoc·TS types (zero runtime deps)
│  ├─ schemas/             Runtime Zod validation
│  ├─ contracts/           OpenAPI spec + Worker Env interface
│  ├─ shared/              errors · logger · retry · crypto · rate-limit · auth
│  └─ cli/                 Deployment CLI
├─ infrastructure/
│  ├─ monitoring/          Grafana · Prometheus · Elasticsearch · Loki
│  └─ n8n/                 10+ workflow automations
├─ tools/                  Build · CI · verification (Go + JS)
├─ tests/                  Jest unit · integration · Playwright E2E
└─ docs/                   ADRs · architecture · conventions · guides · security
```

## Stack

| Layer             | Technology                                      |
| ----------------- | ----------------------------------------------- |
| **Runtime**       | Cloudflare Workers · Node.js ≥22                |
| **Frontend**      | Vanilla JS · IBM Plex Mono · Inter              |
| **Automation**    | MCP (Fastify) · Playwright stealth · n8n        |
| **Build**         | npm workspaces (Bazel dropped — [ADR-0008][a8]) |
| **CI/CD**         | GitHub Actions → Cloudflare Workers Builds      |
| **Testing**       | Jest · Playwright · Node test runner            |
| **Observability** | Prometheus · Grafana · Elasticsearch · Loki     |
| **Security**      | gitleaks · CSP SHA-256 · HSTS · Workers Secrets |

[a8]: docs/adr/0008-drop-bazel-facade.md

## Apps

### Portfolio Worker `apps/portfolio/`

HTML 템플릿 → `generate-worker.js` → `worker.js` (edge artifact). CSP SHA-256 nonce, HSTS, multi-locale (`/` ko · `/en` en · `/ja` ja). 빌드된 `worker.js`는 아티팩트이므로 직접 편집하지 않습니다.

### Job Automation Runtime `apps/job-server/`

MCP Server (Fastify) + 16 MCP tools. Hexagonal: services (도메인) ↔ clients (어댑터).

| Module                 | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `src/crawlers/`        | Stealth Playwright (Wanted, JobKorea, Saramin, +7)     |
| `src/auto-apply/`      | Browser-based form submission · rate limiting          |
| `src/shared/services/` | 22 domain services (matching, apply, session, resume…) |
| `src/session-broker/`  | Wanted session renewal — Docker + stealth browser      |

### Dashboard `apps/job-dashboard/`

Cloudflare Worker. Service Binding으로 `job-server` 호출, applications/auto-apply 분석 화면.

## Job Automation

### Resume Sync

| Platform     | Method                          | Status   |
| ------------ | ------------------------------- | -------- |
| **Wanted**   | OneID token + Chaos API v1      | ● Active |
| **JobKorea** | Playwright headless + form POST | ● Active |

### Auto-Apply (Wanted + JobKorea)

n8n 파이프라인으로 매일 9시·21시 KST 실행.

| Platform     | Method                                                 | Path                                                 |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| **Wanted**   | CDP cookie injection → `page.evaluate(fetch)`          | OneID → HttpOnly 쿠키 → Chaos API `/applications/v1` |
| **JobKorea** | `page.getByRole('button', { name: '즉시 지원' })` 클릭 | Playwright 직접 폼 흐름                              |

```bash
# CLI 단발
node apps/job-server/src/auto-apply/cli/index.js apply --apply --max=10

# n8n 파이프라인 수동 트리거
curl -X POST https://n8n.jclee.me/webhook/job-search-apply
```

### Cover Letter Generator

직무별 자소서 자동 생성 (500–600자). 6 templates (DevSecOps · SRE · Security · Cloud Security · DevOps · Infra).

- **Fallback** — `cover-letter-generator.js` · `detectRole()` → `buildKoreanCoverLetter()`
- **AI** — `ANTHROPIC_API_KEY` 설정 시 Claude Haiku 기반 직무 맞춤 생성

### Profile Auto-Sync

`resume_data.json` → Wanted CV + 소셜 프로필 자동 반영 (Playwright + CDP).

## n8n Workflows

| Workflow                    | Schedule          | Purpose                                             |
| --------------------------- | ----------------- | --------------------------------------------------- |
| **Job Search + Auto Apply** | 09:00 / 21:00 KST | 검색 → 스코어링 → 자소서 → 지원 (Wanted + JobKorea) |
| **Resume Sync**             | Sun 03:00 KST     | Wanted + JobKorea 이력서 동기화                     |
| **Telegram Notify**         | On demand         | `@qws941_bot` 알림                                  |

```bash
curl -X POST https://n8n.jclee.me/webhook/resume-sync
```

## Observability

```bash
curl https://resume.jclee.me/health     # JSON · D1·KV bindings · uptime
curl https://resume.jclee.me/metrics    # Prometheus exposition
```

> [Infrastructure Guide](docs/guides/INFRASTRUCTURE.md) · [Monitoring Setup](docs/guides/MONITORING_SETUP.md)

## CI / CD

| Workflow      | Trigger            | Jobs                                                                              |
| ------------- | ------------------ | --------------------------------------------------------------------------------- |
| **CI**        | push / PR → master | secret-scan (gitleaks) · lint · typecheck · test-jest · test-node · validate-data |
| **Release**   | CI ✓ on master     | semver bump · changelog · GitHub Release · CF Workers deploy                      |
| **Auto-sync** | daily 00:00 UTC    | SSoT drift detection · auto PR                                                    |

Production은 **Cloudflare Workers Builds**가 권위(authoritative). 로컬 `npm run deploy`는 의도적으로 비활성화.

```bash
npm run automate:full    # 로컬 풀 파이프라인
git push                 # → CI → 자동 배포
```

## Documentation

| Guide                       | Path                                                     |
| --------------------------- | -------------------------------------------------------- |
| Infrastructure Architecture | [docs/guides/INFRASTRUCTURE.md][g1]                      |
| Monitoring Setup            | [docs/guides/MONITORING_SETUP.md][g2]                    |
| Auto-Apply Guide            | [docs/guides/auto-apply.md][g3]                          |
| Cover Letter Strategy       | [docs/guides/cover-letter-customization-strategy.md][g4] |
| Certification Roadmap       | [docs/guides/certification-roadmap.md][g5]               |
| PDF Generation              | [docs/guides/PDF_GENERATION.md][g6]                      |

[g1]: docs/guides/INFRASTRUCTURE.md
[g2]: docs/guides/MONITORING_SETUP.md
[g3]: docs/guides/auto-apply.md
[g4]: docs/guides/cover-letter-customization-strategy.md
[g5]: docs/guides/certification-roadmap.md
[g6]: docs/guides/PDF_GENERATION.md

### Conventions & Security

- [Architecture Rules](docs/conventions/architecture-rules.md) — 200/500 LOC limits, naming, n8n SSoT
- [Secret Rotation Playbook](docs/security/SECRET_ROTATION_PLAYBOOK.md) — gitleaks gate + rotation
- [SSOT Improvement Plan](docs/architecture/SSOT_IMPROVEMENT_PLAN.md) — Epic 0 – 6 roadmap
- Root [`AGENTS.md`](AGENTS.md) + 43 domain-specific child files across `apps/` · `packages/` · `tests/` · `tools/` · `infrastructure/`

---

<div align="center">

**[resume.jclee.me](https://resume.jclee.me)** · Built on Cloudflare's edge

</div>

<!-- LLM final probe 1777812018 -->
