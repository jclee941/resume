# Resume Management System

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)

Personal resume and portfolio management system for 이재철 (Jaecheol Lee), built for Cloudflare Workers, job automation, and self-hosted observability.

## 🚀 Live Demo

- **Portfolio**: https://resume.jclee.me
- **Features**: Responsive design, dark theme, SEO optimized, accessibility compliant

## Project Structure

```
resume/
├── apps/                          # Deployable applications
│   ├── portfolio/                 # Edge portfolio (resume.jclee.me)
│   │   ├── lib/                   # Build utilities, security headers
│   │   ├── assets/                # Fonts, images (inlined at build)
│   │   ├── index.html             # KO portfolio template
│   │   ├── index-en.html          # EN portfolio template
│   │   └── generate-worker.js     # Build engine → worker.js
│   ├── job-server/                # MCP Server + Automation runtime
│   │   └── src/                   # Core: crawlers, services, tools
│   └── job-dashboard/             # CF Worker: Job dashboard API (Service Binding)
├── packages/                      # Shared packages
│   ├── cli/                       # Deployment CLI (Commander.js)
│   ├── data/                      # SSoT: Resume JSONs & schemas
│   │   └── resumes/master/        # resume_data.json (canonical)
│   └── shared/                    # @resume/shared: cross-worker utilities
├── infrastructure/                # Grafana, Elasticsearch, Prometheus, n8n
├── docs/                          # Documentation hub
│   ├── adr/                       # Durable architecture decisions
│   ├── guides/                    # Deployment & setup guides
│   └── architecture/              # Current system design docs
├── tools/                         # Build scripts, CI utilities
├── tests/                         # Jest unit + Playwright E2E
└── third_party/                   # policy/docs for third-party boundaries
```

Additional runtime areas, `ta/` contains TA profile generation tooling, and `supabase/` contains Supabase edge functions.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Typography**: IBM Plex Mono + Inter
- **Deployment**: Cloudflare Workers, Cloudflare Workers Builds
- **Build System**: npm workspaces + Bazel facade/query layer
- **CI/CD**: GitHub Actions
- **Testing**: Jest (unit), Playwright (E2E)
- **Code Quality**: gitleaks (secret scanning)
- **Observability**: Grafana, Elasticsearch, Prometheus (self-hosted)

## Development

### Prerequisites

- Node.js >= 22.0.0
- npm
- Wrangler CLI for local Cloudflare work

### Local Development

```bash
npm install
npm run automate:ssot
npm run automate:full
npm run dev
npm run dev:wrangler
npm test
npm run test:e2e
npm run test:e2e:smoke
npm run verify:production
npm run lint
npm run typecheck
npm run format:check
```

### Worker Generation

After editing the portfolio HTML templates, regenerate `worker.js`.

```bash
cd apps/portfolio
node generate-worker.js

# From project root, run the full validation pipeline
npm run automate:ssot
```

## Deployment

Production deployment runs through Cloudflare Workers Builds. The authoritative path is `git push` to the protected branch, which triggers the CI and deployment pipeline.

```bash
npm run automate:full
git push
```

`npm run deploy` is intentionally disabled in `package.json`. Use the build and push flow above instead.

### Resume Sync API

The portfolio worker exposes direct aliases for resume sync automation, proxied to the job-dashboard worker through Service Binding.

```bash
curl -X POST https://resume.jclee.me/api/automation/resume-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"ssotData": {"personal": {"name": "..."}}, "dryRun": true}'

curl -H "Authorization: Bearer <admin-token>" \
  https://resume.jclee.me/api/automation/resume-update/<syncId>
```

### Environment Variables

Required for deployment in `~/.env`:

```bash
CLOUDFLARE_API_KEY=your_global_api_key
CLOUDFLARE_EMAIL=your_email
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

## Architecture

### Cloudflare Worker Design

- **Static HTML serving**: HTML files embedded in `worker.js` as template literals
- **Multi-language**: `/` → KO, `/en` → EN portfolio
- **Security headers**: CSP with SHA-256 hashes, HSTS, X-Frame-Options
- **Performance**: Global CDN, zero cold start

### Worker Generation Pipeline

```
index.html + index-en.html
  → generate-worker.js
    - Escape backticks and ${}
    - Extract CSP hashes from both HTML files
    - Apply baseline CSP directives
  → worker.js (NEVER EDIT DIRECTLY)
  → wrangler deploy → Cloudflare Edge
```

### Security Headers

Content Security Policy with baseline directives and SHA-256 hashes:

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self' 'sha256-...';
  style-src 'self' 'sha256-...' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://grafana.jclee.me;
  manifest-src 'self';
  worker-src 'self';
```

## 📊 Observability

> **📖 For complete infrastructure details**, see:
>
> - **[Infrastructure Architecture](docs/guides/INFRASTRUCTURE.md)** - system topology, component details, security, performance metrics
> - **[Monitoring Setup Guide](docs/guides/MONITORING_SETUP.md)** - Prometheus, Grafana, Elasticsearch, n8n setup
> - **[Grafana Dashboard](monitoring/grafana-dashboard-resume-portfolio.json)** - dashboard with 7 visualization panels

### Monitoring Endpoints

**Health Check**:

```bash
curl https://resume.jclee.me/health
```

Returns JSON with service status, version, uptime, and request metrics:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "deployed_at": "2025-10-17T09:45:00.000Z",
  "uptime_seconds": 3600,
  "metrics": {
    "requests_total": 1234,
    "requests_success": 1230,
    "requests_error": 4,
    "vitals_received": 56
  }
}
```

**Prometheus Metrics**:

```bash
curl https://resume.jclee.me/metrics
```

Prometheus exposition format for Grafana integration:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{job="resume"} 1234

# HELP http_requests_success Successful HTTP requests
# TYPE http_requests_success counter
http_requests_success{job="resume"} 1230

# HELP http_requests_error Failed HTTP requests
# TYPE http_requests_error counter
http_requests_error{job="resume"} 4

# HELP http_response_time_seconds Average response time
# TYPE http_response_time_seconds gauge
http_response_time_seconds{job="resume"} 0.05

# HELP web_vitals_received Total Web Vitals data points received
# TYPE web_vitals_received counter
web_vitals_received{job="resume"} 56
```

**Web Vitals Endpoint**:

```bash
curl -X POST https://resume.jclee.me/api/vitals \
  -H "Content-Type: application/json" \
  -d '{"lcp": 1250, "fid": 50, "cls": 0.05}'
```

### Grafana Integration

All metrics and logs are automatically sent to the centralized observability stack:

- **Metrics**: Prometheus scrapes `/metrics` endpoint
- **Logs**: All requests logged to Elasticsearch (ECS format, batched)
- **Dashboard**: View real-time metrics at `https://grafana.jclee.me`

**Log Format** (ECS):

```json
{
  "job": "resume-worker",
  "level": "INFO",
  "path": "/",
  "method": "GET",
  "event": "request",
  "response_time_ms": 45
}
```

### Performance Budgets (Lighthouse CI)

Automated performance testing on every deployment:

- **Performance**: ≥90 score
- **Accessibility**: ≥95 score
- **Best Practices**: ≥95 score
- **SEO**: ≥95 score

## Job Automation

The job automation runtime syncs resume data into external job platforms and manages automated job applications.

### Resume Sync

| Platform | Method | Sections | Status |
| -------- | ------ | -------- | ------ |
| **Wanted Korea** | OneID token + Chaos API v2 | careers, educations, skills, activities, language_certs, about, contact (8 sections) | Active |
| **JobKorea** | Playwright headless + form POST | Career, License, Award, School, Intro (79 fields) | Active |

```bash
# Manual sync
node apps/job-server/scripts/ci-resume-sync.js    # Wanted
node apps/job-server/scripts/profile-sync.js --platform jobkorea --apply  # JobKorea
```

### Auto-Apply (Wanted)

Reverse-engineered Wanted Chaos API for programmatic job applications:

```
POST /api/chaos/applications/v1
{ email, username, mobile, job_id, resume_keys: ["<chaos-resume-uuid>"], status: "apply" }
```

Implementation: `apps/job-server/src/auto-apply/strategies/wanted-strategy.js`

### n8n Automation

| Workflow | ID | Schedule | What |
| -------- | -- | -------- | ---- |
| **Resume Sync** | `tG91fX0d6zZQzYay` | Sun 3am KST + webhook | Wanted + JobKorea parallel sync -> Telegram |

```bash
# Manual trigger
curl -X POST https://n8n.jclee.me/webhook/resume-sync
```

- SSH nodes execute scripts on dev machine via `jclee-dev SSH` credential
- `.env` sourced for Wanted OneID credentials (auto cookie minting)
- Telegram notifications via `@qws941_bot` (resume-dedicated bot)

## Recent Changes

- Wanted application API reverse-engineered (`/api/chaos/applications/v1` with `status:apply`)
- n8n Resume Sync workflow deployed (`tG91fX0d6zZQzYay`) with SSH + Telegram
- Wanted `getDetail` endpoint migrated v1->v2 (fixes empty activities bug)
- Activities sync now idempotent (update existing, delete orphans, prevent duplicates)
- `Referer` header added to Wanted HTTP client
- JobKorea awards section: removed `achievements[]` fallback, added structured `awards[]`
- Career duration corrections: 5 entries fixed in `resume_data.json`
- Telegram notifications via dedicated `@qws941_bot` (not YouTube bot)
## Documentation

### Key Guides

- **Infrastructure Architecture**: `docs/guides/INFRASTRUCTURE.md`
- **Monitoring Setup**: `docs/guides/MONITORING_SETUP.md`
- **Manual Deployment**: `docs/guides/MANUAL_DEPLOYMENT_GUIDE.md`
- **Git Auto-Deploy**: `docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md`

### AGENTS.md Hierarchy

Domain-specific context in subdirectory AGENTS.md files:

| Path                        | Focus                |
| --------------------------- | -------------------- |
| `apps/portfolio/AGENTS.md`  | Build pipeline, CSP  |
| `apps/job-server/AGENTS.md` | MCP server, crawlers |
| `packages/data/AGENTS.md`   | SSoT schema, sync    |
| `packages/cli/AGENTS.md`    | CLI tool usage       |
| `tests/AGENTS.md`           | Test patterns        |

## Portfolio Features

- **Terminal-themed dark aesthetic**: cyberpunk-inspired dark terminal layout, no dark mode toggle
- **Typography**: IBM Plex Mono for UI, Inter for body text
- **Color system**: intermediate-dim palette with desaturated neon accents
- **Section layout**: hero, about, status, experience, projects, skills, infrastructure, contact
- **Hover effects**: chromatic shift on hover only, no auto-playing glitch animation
- **Skills display**: CSS gradient progress bars, not text-based bars
- **Interactive CLI**: help, neofetch, snake, and `sudo hire-me` easter eggs
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Links

- **Live Site**: https://resume.jclee.me
- **English**: https://resume.jclee.me/en
- **GitHub**: https://github.com/jclee941/resume
