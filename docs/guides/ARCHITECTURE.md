# Architecture Guide

## System Overview

### Why Source-to-Worker Pipeline?

**Design Goal**: Single-file deployment with zero runtime dependencies

**Benefits**:

- ⚡ **Zero cold start**: All HTML/CSS embedded in worker code
- 🌍 **Global edge deployment**: Runs on 300+ Cloudflare data centers
- 🔒 **Security**: CSP hashes calculated at build time, no inline risks
- 📦 **Simplicity**: One `worker.js` file contains entire site
- 💰 **Cost**: Free tier (100k requests/day)

**Trade-off**: Cannot edit HTML directly in production - must rebuild and redeploy

## Build Pipeline Architecture

### Critical Worker Generation Workflow

Source files (HTML/CSS/JSON) are transformed into a single deployable `worker.js`.

**Phase 1: CSS Separation** (Completed 2025-11-07)

- `typescript/portfolio-worker/styles.css` contains all CSS (758 lines)
- `typescript/portfolio-worker/index.html` has CSS placeholder: `<!-- CSS_PLACEHOLDER -->`
- Build script injects CSS at build time

**Phase 2: Data-Driven Templates** (Completed 2025-11-07)

- `typescript/portfolio-worker/data.json` contains all project data (resume cards + project cards)
- `typescript/portfolio-worker/index.html` has placeholders: `<!-- RESUME_CARDS_PLACEHOLDER -->` and `<!-- PROJECT_CARDS_PLACEHOLDER -->`
- Build script generates HTML from JSON at build time

### Build Pipeline (3 phases)

1. **Edit Content**: Modify `typescript/portfolio-worker/data.json` (project data) OR `typescript/portfolio-worker/index.html` (structure) OR `typescript/portfolio-worker/styles.css` (styling)
2. **Generate Worker**: Run `npm run build` (performs 6 transformations)
3. **Deploy**: Push to `master` branch (GitHub Actions auto-deploys) OR run `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production` manually

### 6 Critical Transformations

`typescript/portfolio-worker/generate-worker.js` performs these operations:

1. **CSS Injection**: Reads `styles.css`, replaces `<!-- CSS_PLACEHOLDER -->` (758 lines → inline CSS)
2. **Data Injection**: Reads `data.json`, generates HTML cards from templates (resume + projects)
3. **HTML Minification**: 15% size reduction using `html-minifier-terser` (whitespace removal, tag optimization)
4. **CSP Hash Generation**: Extracts `<script>` and `<style>` tags, generates SHA-256 hashes (CRITICAL: no trim())
5. **Template Literal Escaping**: Escapes backticks (`) and dollar signs ($) for safe JavaScript embedding
6. **Deployment Timestamp**: Injects `DEPLOYED_AT` from environment variable (ISO 8601 UTC)

### Worker Routing

- `/` → Embedded index.html (minified)
- `/health` → Health check JSON (status, metrics, uptime)
- `/metrics` → Prometheus exposition format
- `/api/vitals` → Web Vitals POST endpoint (Loki logging)

### Template Functions

`typescript/portfolio-worker/generate-worker.js` contains:

- `generateResumeCards(data)`: Creates resume project cards from `data.resume` array
- `generateProjectCards(data)`: Creates portfolio project cards from `data.projects` array
- Special handling:
  - Grafana project: Multiple dashboard links
  - Highlighted cards: Use `completePdfUrl` instead of `pdfUrl`/`docxUrl`
  - GitHub URLs: All download links use `CONFIG.GITHUB_BASE_URL` prefix

### CSP Hash Calculation

**CRITICAL**: CSP hashes MUST be calculated from **original HTML before escaping**

- **DO NOT use `.trim()`** on extracted inline scripts/styles before hashing
- Browsers calculate CSP hashes with **exact whitespace** as rendered in HTML
- Commit f67b5eb fixed this: removed `trim()` from hash calculation to match browser behavior

## Content Hierarchy

### Source Files

- **master/resume_master.md**: Single source of truth (complete career history)
- **master/resume_final.md**: Compressed submission version (downloadable from portfolio)
- **company-specific/**: Tailored resumes derived from master
- **typescript/portfolio-worker/data.json**: Portfolio project data (resume cards + project cards)
- **typescript/portfolio-worker/styles.css**: All CSS styles (758 lines)
- **typescript/portfolio-worker/index.html**: HTML structure with placeholders (200 lines)
- **resume/nextrade/**: Technical documentation (Architecture, DR, SOC) for download

### Generated Files (do not edit directly)

- **typescript/portfolio-worker/worker.js**: Cloudflare Worker with embedded HTML (30.57 KB, auto-generated)

### Data Structure

`typescript/portfolio-worker/data.json` format:

```json
{
  "resume": [
    {
      "icon": "🏦",
      "title": "Project Title",
      "description": "Project description",
      "stats": ["Tag1", "Tag2"],
      "highlight": true,  // Optional, for featured projects
      "pdfUrl": "...",    // For standard resume cards
      "docxUrl": "...",   // For standard resume cards
      "completePdfUrl": "..."  // For highlighted resume cards
    }
  ],
  "projects": [
    {
      "icon": "🔥",
      "title": "Project Title",
      "tech": "Tech Stack",
      "description": "Description",
      "liveUrl": "...",   // For standard projects
      "githubUrl": "...", // For standard projects
      "dashboards": [...], // For Grafana project with multiple links
      "documentationUrl": "..."  // For projects with docs
    }
  ]
}
```

All versions must maintain consistency in:

- Career dates and timeline
- Quantitative metrics (format: "50% 시간 단축 (8시간 → 4시간)")
- Technical stack keywords

## Observability Architecture

### Monitoring Endpoints

**1. Health Check** (`/health`):

```bash
curl https://resume.jclee.me/health
```

Returns JSON with service status, version, deployment time, uptime, and metrics.

**2. Prometheus Metrics** (`/metrics`):

```bash
curl https://resume.jclee.me/metrics
```

Returns Prometheus exposition format for Grafana integration.

**3. Web Vitals Collection** (`/api/vitals`):

```bash
curl -X POST https://resume.jclee.me/api/vitals \
  -H "Content-Type: application/json" \
  -d '{"lcp": 1250, "fid": 50, "cls": 0.05}'
```

Accepts POST requests with Web Vitals data (LCP, FID, CLS, FCP, TTFB), logs to Grafana Loki.

### Loki Integration

- All requests logged to `https://grafana.jclee.me/loki/api/v1/push`
- Fire-and-forget async logging (non-blocking, doesn't delay response)
- Log labels: `job="resume-worker"`, `level="INFO|ERROR"`, `path="/..."`, `method="GET"`
- Failed Loki writes are silently caught (logged to console but don't block request)

## Web Portfolio Design

**Current Design** (Updated 2025-10-18):

- Minimal 1-column layout with premium visual effects
- Dark mode toggle with localStorage persistence
- Responsive: 5 breakpoints (1200px/1024px/768px/640px/375px)
- SEO: Meta tags, Open Graph, Twitter Card, canonical URL
- Accessibility: ARIA labels, semantic HTML, 44px touch targets
- Animations: Scroll fade-in, counter animations, hover effects with cubic-bezier easing
- Nextrade technical documentation download section (4 docs with PDF/DOCX options)

**Typography**:

- Hero title: Playfair Display 4.8rem
- Section titles: Playfair Display 3.2rem
- Body: Inter with -0.01em letter-spacing

**Color System**:

- Primary gradient: `#7c3aed → #5b21b6 → #2563eb` (darker purple/blue for better contrast)
- Gold gradient: `#f59e0b → #d97706`
- Shadows: Enhanced opacity (0.35-0.5) for depth

**Security Headers**:

- Content-Security-Policy with SHA-256 hashes (NO `unsafe-inline`)
- Strict-Transport-Security with HSTS preload
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Performance & Security

### Performance Budgets (Lighthouse CI)

- **Performance**: ≥90 score
- **Accessibility**: ≥95 score
- **Best Practices**: ≥95 score
- **SEO**: ≥95 score

**Web Vitals Targets**:

- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1
- FCP (First Contentful Paint): <1.8s
- TTFB (Time to First Byte): <0.8s

### Security Headers

Enhanced Content Security Policy with SHA-256 hashes (no `unsafe-inline`):

```
Content-Security-Policy:
  default-src 'self';
  font-src 'self' https://fonts.gstatic.com;
  style-src 'self' 'sha256-...' https://fonts.googleapis.com;
  script-src 'self' 'sha256-...';
  img-src 'self' data:;
  connect-src 'self' https://grafana.jclee.me
```

## Dependencies

### Runtime Requirements

- **Node.js**: >=20.0.0 (enforced in package.json engines)
- **npm**: Package manager (comes with Node.js)

### Key DevDependencies

- `wrangler@^4.42.2`: Cloudflare Workers CLI and local dev server
- `@playwright/test@^1.56.0`: E2E testing framework (Chromium, Firefox, WebKit)
- `jest@^30.2.0`: Unit testing framework (CommonJS config)
- `eslint@^9.37.0`: Linting (flat config: `eslint.config.cjs`)
- `prettier@^3.6.2`: Code formatting
- `html-minifier-terser@^7.2.0`: HTML minification in build pipeline
- `sharp@^0.34.4`: Image processing utilities

### Configuration Files

- `jest.config.cjs`: Jest 30 CommonJS configuration
- `eslint.config.cjs`: ESLint 9 flat config (modern syntax)
- `playwright.config.js`: Playwright E2E test configuration
- `typescript/portfolio-worker/wrangler.toml`: Cloudflare Workers deployment config

## Git Repository

**Primary**: GitHub (https://github.com/qws941/resume.git) - **PRIVATE** as of 2025-11-18

**Remotes Configuration**:

```bash
origin  https://github.com/qws941/resume.git  # GitHub (Primary)
```

**Push Workflow**:

```bash
git push origin master  # GitHub
```

**IMPORTANT - GitHub Private Repository**:

- GitHub repository is PRIVATE (since 2025-11-18)
- Raw file URLs (in `typescript/portfolio-worker/data.json`) still work for authenticated users
- Public resume site (https://resume.jclee.me) works via Cloudflare Workers
- PDF/DOCX download links in portfolio require GitHub authentication
- Alternative: Consider hosting resume files on Cloudflare R2 for public access

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

**Trigger**: Push to `master`, pull request, and `workflow_dispatch`

**Workflow highlights**:

1. Validate + quality gates:
   - Cloudflare native structure validation
   - Wrangler type generation checks for both workers
   - ESLint + typecheck + unit/E2E tests
2. Build + deploy:
   - Build `typescript/portfolio-worker/worker.js`
   - Deploy with `cloudflare/wrangler-action@v4`
   - Optional gradual rollout via `wrangler versions upload/list/deploy`
3. Verify + rollback + notify:
   - Cloudflare API deployment verification and HTTP checks
   - Automatic rollback job on verification failure
   - Summary/notification stage

**Required Secrets**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`
- `SLACK_WEBHOOK_URL` (optional)

### Preview Environment

- PR preview deploy uses `--env preview` with isolated Worker config.
- Cleanup job removes preview worker on PR close.

**Pipeline** (Release-Only):

1. **validate**: Tag format validation
2. **build**: Create release package (.tar.gz)
3. **release**: Publish GitHub release
4. **notify**: Send Slack notification (optional)

**Usage**:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

**Note**: Regular commits do NOT trigger GitHub Actions (release-only pipeline)

**Verification**:

```bash
curl -I https://resume.jclee.me  # Expect HTTP 200
curl https://resume.jclee.me/health  # Check deployment timestamp
```
