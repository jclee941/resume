# Resume Management System

Personal resume and portfolio management system built with modern web technologies and automated deployment pipeline.

## 🚀 Live Demo

- **Portfolio**: https://resume.jclee.me
- **Features**: Responsive design, dark mode, SEO optimized, accessibility compliant

## Project Structure

```
resume/
├── typescript/                    # Language-based source directory
│   ├── portfolio-worker/          # Edge portfolio (resume.jclee.me)
│   │   ├── lib/                   # Build utilities, security headers
│   │   ├── assets/                # Fonts, images (inlined at build)
│   │   ├── index.html             # KO portfolio template
│   │   ├── index-en.html          # EN portfolio template
│   │   └── generate-worker.js     # Build engine → worker.js
│   ├── job-automation/            # MCP Server + Dashboard
│   │   ├── src/                   # Core: crawlers, services, tools
│   │   └── workers/               # Dashboard Cloudflare Worker
│   ├── cli/                       # Deployment CLI (Commander.js)
│   └── data/                      # SSoT: Resume JSONs & schemas
│       └── resumes/master/        # resume_data.json (canonical)
├── infrastructure/                # Grafana, Elasticsearch, Prometheus, n8n
├── docs/                          # Documentation hub
│   ├── guides/                    # Deployment & setup guides
│   └── architecture/              # ADRs, system design
├── tools/                         # Build scripts, CI utilities
├── tests/                         # Jest unit + Playwright E2E
└── third_party/                   # npm deps (One Version Rule)
```

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Deployment**: Cloudflare Workers (Edge-deployed)
- **Build System**: Bazel + npm (Google3-style hybrid)
- **CI/CD**: GitHub Actions
- **Testing**: Jest (unit), Playwright (E2E)
- **Code Quality**: gitleaks (secret scanning)
- **Observability**: Grafana, Elasticsearch, Prometheus (self-hosted)

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm
- Wrangler CLI (for Cloudflare deployment)

### Local Development

```bash
# Install dependencies
npm install

# End-to-end automation check (SSOT sync + lint + test + build + CF-native validation)
npm run automate:full

# Serve portfolio locally
cd typescript/portfolio-worker
npm run dev

# Run tests
npm test

# E2E tests
npm run test:e2e
```

### Worker Generation

**CRITICAL**: After editing HTML files, regenerate `worker.js` (or run `npm run automate:ssot` from root):

```bash
# Generate worker.js from HTML (extracts CSP hashes from both KO + EN)
cd typescript/portfolio-worker
node generate-worker.js

# Fast SSOT validation/build pipeline from project root
cd ../..
npm run automate:ssot
```

## Deployment

### Automated Deployment

Production deployment authority is Cloudflare Workers Builds (git push to protected branch). Local `wrangler deploy` is not the default production path.

```bash
# From project root: validate everything before pushing
npm run automate:full

# Then push branch/commit to trigger automated deployment pipeline
git push
```

### Single Worker Resume Sync API

`resume` worker now exposes direct (no `/job` prefix) aliases for JobKorea/Wanted profile sync automation:

```bash
# Trigger profile sync (defaults to platforms: wanted, jobkorea)
curl -X POST https://resume.jclee.me/api/automation/resume-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"ssotData": {"personal": {"name": "..."}}, "dryRun": true}'

# Check sync status
curl -H "Authorization: Bearer <admin-token>" \
  https://resume.jclee.me/api/automation/resume-update/<syncId>
```

### Environment Variables

Required for deployment (in `~/.env`):

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
    - Extract CSP hashes from both HTML files (union)
    - Apply baseline CSP directives
  → worker.js (NEVER EDIT DIRECTLY)
  → wrangler deploy → Cloudflare Edge
```

### Security Headers

Content Security Policy with baseline directives and SHA-256 hashes:

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self' 'sha256-...' https://*.sentry.io;
  style-src 'self' 'sha256-...' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://grafana.jclee.me https://*.sentry.io;
  manifest-src 'self';
  worker-src 'self';
```

## 📊 Observability

> **📖 For complete infrastructure details**, see:
>
> - **[Infrastructure Architecture](docs/guides/INFRASTRUCTURE.md)** - Complete system topology, component details, security, performance metrics
> - **[Monitoring Setup Guide](docs/guides/MONITORING_SETUP.md)** - Step-by-step configuration for Prometheus, Grafana, Elasticsearch, n8n
> - **[Grafana Dashboard](monitoring/grafana-dashboard-resume-portfolio.json)** - Pre-configured dashboard with 7 visualization panels

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

## Documentation

### Key Guides

- **Infrastructure Architecture**: `docs/guides/INFRASTRUCTURE.md`
- **Monitoring Setup**: `docs/guides/MONITORING_SETUP.md`
- **Manual Deployment**: `docs/guides/MANUAL_DEPLOYMENT_GUIDE.md`
- **Git Auto-Deploy**: `docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md`

### AGENTS.md Hierarchy

Domain-specific context in subdirectory AGENTS.md files:

| Path                                    | Focus                |
| --------------------------------------- | -------------------- |
| `typescript/portfolio-worker/AGENTS.md` | Build pipeline, CSP  |
| `typescript/job-automation/AGENTS.md`   | MCP server, crawlers |
| `typescript/data/AGENTS.md`             | SSoT schema, sync    |
| `typescript/cli/AGENTS.md`              | CLI tool usage       |
| `tests/AGENTS.md`                       | Test patterns        |

## Portfolio Features

- **Responsive Design**: Mobile-first, 5 breakpoints
- **Dark Mode**: Toggle with localStorage persistence
- **SEO Optimized**: Meta tags, Open Graph, Twitter Card
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Multi-language**: Korean (default) + English

## Links

- **Live Site**: https://resume.jclee.me
- **English**: https://resume.jclee.me/en
- **GitHub**: https://github.com/qws941/resume
