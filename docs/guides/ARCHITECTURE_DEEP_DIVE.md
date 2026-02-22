# Architecture Deep Dive

Complete technical architecture documentation for the Resume Portfolio System.

## Table of Contents

1. [System Overview](#system-overview)
2. [Build Pipeline](#build-pipeline)
3. [Worker Architecture](#worker-architecture)
4. [Data Flow](#data-flow)
5. [Caching Strategy](#caching-strategy)
6. [Security Architecture](#security-architecture)
7. [Monitoring & Observability](#monitoring--observability)
8. [Testing Architecture](#testing-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│                    (300+ Global Data Centers)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Router    │→ │   Handler   │→ │   Response Generator    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                      │                 │
│         ▼                                      ▼                 │
│  ┌─────────────┐                    ┌─────────────────────────┐  │
│  │  Embedded   │                    │   Security Headers      │  │
│  │    HTML     │                    │   (CSP, HSTS, etc.)     │  │
│  └─────────────┘                    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Observability Stack                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Prometheus  │  │    Loki     │  │       Grafana           │  │
│  │  (Metrics)  │  │   (Logs)    │  │    (Dashboards)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Zero Cold Start**: All HTML/CSS embedded in worker code
2. **Edge-First**: Runs on 300+ Cloudflare data centers globally
3. **Security by Default**: CSP hashes calculated at build time
4. **Single-File Deployment**: One `worker.js` contains entire site
5. **Cost Effective**: Free tier (100k requests/day)

### Trade-offs

| Benefit                | Trade-off                      |
| ---------------------- | ------------------------------ |
| Zero cold start        | Cannot edit HTML in production |
| Global edge deployment | Must rebuild for any change    |
| Single-file simplicity | Larger worker size (~300KB)    |
| CSP hash security      | Build step required            |

---

## Build Pipeline

### Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Source Files                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ index.html │  │ styles.css │  │ data.json  │  │ lib/*.js   │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   generate-worker.js                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. Load source files                                        │ │
│  │ 2. Validate data.json schema                                │ │
│  │ 3. Generate resume cards HTML                               │ │
│  │ 4. Generate project cards HTML (with metrics, skills)       │ │
│  │ 5. Inject CSS into HTML                                     │ │
│  │ 6. Minify HTML (15% size reduction)                         │ │
│  │ 7. Extract CSP hashes (SHA-256)                             │ │
│  │ 8. Escape template literals (backticks, $)                  │ │
│  │ 9. Inject deployment timestamp                              │ │
│  │ 10. Write worker.js                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      worker.js (~300KB)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ - Embedded minified HTML                                    │ │
│  │ - CSP hashes for all inline scripts/styles                  │ │
│  │ - Request router                                            │ │
│  │ - Security headers                                          │ │
│  │ - Health/metrics endpoints                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Build Transformations

| Step | Input          | Output         | Purpose                        |
| ---- | -------------- | -------------- | ------------------------------ |
| 1    | `data.json`    | Validated data | Schema validation              |
| 2    | Resume data    | HTML cards     | Generate resume section        |
| 3    | Project data   | HTML cards     | Generate projects with metrics |
| 4    | `styles.css`   | Inline CSS     | Embed in HTML                  |
| 5    | Full HTML      | Minified HTML  | 15% size reduction             |
| 6    | Inline scripts | SHA-256 hashes | CSP security                   |
| 7    | Template       | Escaped string | Safe JS embedding              |
| 8    | ISO timestamp  | Embedded date  | Deployment tracking            |

### Module Structure

```
typescript/portfolio-worker/lib/
├── config.js          # Configuration constants, cache
├── cards.js           # Card generation (resume, project)
├── templates.js       # Link generation helpers
├── validators.js      # Data validation
├── security-headers.js # CSP, HSTS headers
├── cache-headers.js   # Resource-specific caching
├── metrics.js         # Prometheus metrics generation
└── utils.js           # Utility functions
```

---

## Worker Architecture

### Request Flow

```javascript
// Simplified worker structure
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route handling
    switch (url.pathname) {
      case '/':
        return serveHTML(indexHtml, securityHeaders);
      case '/health':
        return serveHealth(metrics);
      case '/metrics':
        return servePrometheus(metrics);
      case '/api/vitals':
        return handleVitals(request);
      default:
        return serveStatic(url.pathname);
    }
  },
};
```

### Routing Table

| Path          | Method | Handler           | Response              |
| ------------- | ------ | ----------------- | --------------------- |
| `/`           | GET    | `serveHTML`       | Portfolio HTML        |
| `/health`     | GET    | `serveHealth`     | JSON health status    |
| `/metrics`    | GET    | `servePrometheus` | Prometheus format     |
| `/api/vitals` | POST   | `handleVitals`    | Web Vitals collection |
| `/sw.js`      | GET    | `serveStatic`     | Service Worker        |
| `/*.pdf`      | GET    | `serveDocument`   | PDF downloads         |
| `/*`          | GET    | `serveStatic`     | Static assets         |

### Response Headers

```javascript
const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'sha256-...' https://browser.sentry-cdn.com;
    style-src 'self' 'sha256-...' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data:;
    connect-src 'self' https://grafana.jclee.me https://*.sentry.io;
  `,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

---

## Data Flow

### Project Card Data Structure

```json
{
  "projects": [
    {
      "icon": "🤖",
      "title": "ClaudeOS",
      "tech": "Go, gRPC, Prometheus, n8n",
      "description": "AI development platform...",
      "tagline": "Multi-model AI agent automation platform",
      "metrics": {
        "agents": "6 specialized AI",
        "integrations": "12+ MCP servers",
        "uptime": "99.5%",
        "response_time": "Under 2s"
      },
      "related_skills": ["Go", "gRPC", "Prometheus", "n8n", "AI/ML"],
      "related_projects": ["Monitoring Platform", "Workflow Automation"],
      "businessImpact": "70% reduction in development time",
      "liveUrl": "https://grafana.jclee.me/...",
      "githubUrl": "https://github.com/qws941/resume/..."
    }
  ]
}
```

### Card Generation Flow

```
data.json
    │
    ▼
┌─────────────────────────────────────────┐
│         generateProjectCards()           │
│  ┌─────────────────────────────────────┐│
│  │ 1. Parse project data               ││
│  │ 2. Generate tagline HTML            ││
│  │ 3. Generate metrics grid            ││
│  │ 4. Generate skill tags              ││
│  │ 5. Generate business impact         ││
│  │ 6. Generate links                   ││
│  │ 7. Assemble card HTML               ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
    │
    ▼
HTML Cards (embedded in worker.js)
```

---

## Caching Strategy

### Resource-Specific Cache Headers

| Resource Type               | Cache-Control                         | Max-Age | Purpose         |
| --------------------------- | ------------------------------------- | ------- | --------------- |
| HTML                        | `public, max-age=3600`                | 1 hour  | Fresh content   |
| Static (JS/CSS/Images)      | `public, max-age=31536000, immutable` | 1 year  | Long-term cache |
| API (`/health`, `/metrics`) | `no-cache, no-store`                  | 0       | Real-time data  |
| Service Worker              | `no-cache, must-revalidate`           | 0       | Always fresh    |
| Documents (PDF/DOCX)        | `public, max-age=86400`               | 1 day   | Moderate cache  |

### Implementation

```javascript
// typescript/portfolio-worker/lib/cache-headers.js
function getCacheHeaders(pathname) {
  if (pathname === '/sw.js') {
    return CACHE_HEADERS.SERVICE_WORKER;
  }
  if (pathname.startsWith('/api/') || pathname === '/health' || pathname === '/metrics') {
    return CACHE_HEADERS.API;
  }
  if (/\.(pdf|docx)$/i.test(pathname)) {
    return CACHE_HEADERS.DOCUMENT;
  }
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/i.test(pathname)) {
    return CACHE_HEADERS.STATIC;
  }
  return CACHE_HEADERS.HTML;
}
```

---

## Security Architecture

### Content Security Policy (CSP)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self'
    'sha256-abc123...'  # Inline scripts (build-time hashes)
    https://browser.sentry-cdn.com;
  style-src 'self'
    'sha256-def456...'  # Inline styles (build-time hashes)
    https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self'
    https://grafana.jclee.me
    https://*.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### CSP Hash Generation

```javascript
// Critical: Hash calculation from ORIGINAL HTML (no trim!)
function extractCSPHashes(html) {
  const scriptHashes = [];
  const styleHashes = [];

  // Extract inline scripts
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]; // NO .trim() - browsers use exact whitespace
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    scriptHashes.push(`'sha256-${hash}'`);
  }

  return { scriptHashes, styleHashes };
}
```

### Security Headers Summary

| Header                      | Value                                          | Purpose               |
| --------------------------- | ---------------------------------------------- | --------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS           |
| `X-Content-Type-Options`    | `nosniff`                                      | Prevent MIME sniffing |
| `X-Frame-Options`           | `DENY`                                         | Prevent clickjacking  |
| `X-XSS-Protection`          | `1; mode=block`                                | XSS filter            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | Control referrer      |

---

## Monitoring & Observability

### Metrics Endpoint (`/metrics`)

```prometheus
# HELP resume_uptime_seconds Service uptime in seconds
# TYPE resume_uptime_seconds gauge
resume_uptime_seconds{job="resume"} 86400

# HELP resume_requests_total Total HTTP requests
# TYPE resume_requests_total counter
resume_requests_total{job="resume"} 12345

# HELP resume_success_rate Request success rate
# TYPE resume_success_rate gauge
resume_success_rate{job="resume"} 0.998

# HELP resume_error_rate Request error rate
# TYPE resume_error_rate gauge
resume_error_rate{job="resume"} 0.002
```

### Health Endpoint (`/health`)

```json
{
  "status": "healthy",
  "version": "1.0.32",
  "deployed_at": "2025-12-22T07:50:03.351Z",
  "uptime_seconds": 86400,
  "metrics": {
    "requests_total": 12345,
    "requests_success": 12320,
    "requests_error": 25,
    "success_rate": 0.998
  }
}
```

### Loki Log Format

```json
{
  "streams": [
    {
      "stream": {
        "job": "resume-worker",
        "level": "INFO"
      },
      "values": [
        [
          "1703235600000000000",
          "{\"path\":\"/\",\"method\":\"GET\",\"status\":200,\"duration_ms\":45}"
        ]
      ]
    }
  ]
}
```

---

## Testing Architecture

### Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ← 34 tests (Playwright)
                    │   Tests     │    Visual, accessibility, mobile
                    └─────────────┘
                   ╱               ╲
                  ╱                 ╲
         ┌─────────────────────────────┐
         │      Integration Tests      │  ← Worker integration
         │                             │    API endpoints
         └─────────────────────────────┘
        ╱                               ╲
       ╱                                 ╲
┌─────────────────────────────────────────────┐
│              Unit Tests                      │  ← 213 tests (Jest)
│  cards, config, templates, validators,      │    98% coverage
│  security-headers, cache-headers, utils     │
└─────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Module                | Coverage | Tests   |
| --------------------- | -------- | ------- |
| `cards.js`            | 100%     | 25      |
| `config.js`           | 100%     | 12      |
| `templates.js`        | 100%     | 15      |
| `validators.js`       | 100%     | 20      |
| `security-headers.js` | 100%     | 18      |
| `cache-headers.js`    | 100%     | 15      |
| `utils.js`            | 100%     | 20      |
| **Total**             | **98%**  | **213** |

### E2E Test Categories

| Category      | Tests | Purpose                   |
| ------------- | ----- | ------------------------- |
| Visual        | 8     | Screenshot comparison     |
| Accessibility | 6     | ARIA, keyboard navigation |
| Mobile        | 12    | Touch targets, responsive |
| Performance   | 4     | Lighthouse CI             |
| Security      | 4     | CSP, headers              |

---

## Deployment Architecture

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Build     │→ │    Test     │→ │       Deploy            │  │
│  │ npm run     │  │ npm test    │  │ wrangler deploy --config│  │
│  │   build     │  │ npm run     │  │                         │  │
│  │             │  │  test:e2e   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                            │
│                    (Production Edge)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable                | Purpose            | Required |
| ----------------------- | ------------------ | -------- |
| `CLOUDFLARE_API_TOKEN`  | Deployment auth    | Yes      |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier | Yes      |
| `DEPLOYED_AT`           | Build timestamp    | Auto-set |
| `SLACK_WEBHOOK_URL`     | Notifications      | Optional |
| `GEMINI_API_KEY`        | AI summaries       | Optional |

---

## Performance Optimization

### Build-Time Optimizations

1. **HTML Minification**: 15% size reduction
2. **CSS Inlining**: Single HTTP request
3. **Template Caching**: Avoid regeneration
4. **Data Validation**: Fail fast on errors

### Runtime Optimizations

1. **Edge Deployment**: <50ms TTFB globally
2. **Immutable Caching**: 1-year cache for static assets
3. **Preconnect Hints**: Font loading optimization
4. **Lazy Loading**: Images below fold

### Size Budget

| Component       | Size   | Budget |
| --------------- | ------ | ------ |
| Worker.js       | 292KB  | <500KB |
| HTML (minified) | ~50KB  | <100KB |
| CSS (inline)    | ~30KB  | <50KB  |
| Total           | ~300KB | <500KB |

---

## Future Improvements

### Planned Enhancements

1. **Edge KV Storage**: Dynamic content without rebuild
2. **Image Optimization**: Cloudflare Images integration
3. **A/B Testing**: Edge-based experiments
4. **Analytics**: Privacy-focused metrics

### Technical Debt

1. **TypeScript Migration**: Full type safety
2. **Module Bundling**: Reduce worker size
3. **Incremental Builds**: Faster development
4. **Preview Deployments**: PR-based previews

---

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Vitals](https://typescript/portfolio-worker.dev/vitals/)
- [Prometheus Exposition Format](https://prometheus.io/docs/instrumenting/exposition_formats/)
