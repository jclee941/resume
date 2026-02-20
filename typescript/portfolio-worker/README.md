# Resume Portfolio - Web

**Live**: https://resume.jclee.me  
**Platform**: Cloudflare Workers (Edge-deployed)  
**Last Updated**: 2026-01

---

## Overview

Personal portfolio site deployed to Cloudflare's edge network. All assets inlined into a single Worker script for zero-latency delivery.

## Structure

```
web/
├── index.html          # Source of Truth - main portfolio
├── styles.css          # Global styles (inlined at build)
├── generate-worker.js  # Build engine - asset inlining + CSP hash generation
├── worker.js           # ARTIFACT - auto-generated, DO NOT EDIT
├── lib/                # Edge modules (security headers, SEO, metrics)
├── assets/             # Fonts, screenshots (base64-inlined)
└── downloads/          # PDF/DOCX resume files
```

## Development

```bash
# Install dependencies (from project root)
npm install

# Local preview with Wrangler
npm run dev

# Build worker.js from index.html
npm run build

# Run E2E tests
npm run test:e2e
```

## Deployment

```bash
# Full deployment (build + deploy + verify)
npm run deploy

# Or step by step:
npm run build                                                      # Generate worker.js
npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production
resume-cli verify                                                  # Health check
```

## Build Pipeline

```
index.html + styles.css + assets/
         ↓
   generate-worker.js
         ↓
    - Inline all CSS/JS
    - Base64 encode images
    - Generate SHA-256 CSP hashes
    - Embed as template literals
         ↓
      worker.js (< 1MB)
         ↓
   Cloudflare Workers Edge
```

## Security Headers

Auto-generated Content Security Policy with SHA-256 hashes:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-...';
  style-src 'self' 'sha256-...' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://grafana.jclee.me;

Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

## Endpoints

| Path          | Description               |
| ------------- | ------------------------- |
| `/`           | Main portfolio page       |
| `/health`     | JSON health check         |
| `/metrics`    | Prometheus format metrics |
| `/api/vitals` | Web Vitals POST endpoint  |

## Anti-Patterns

| Don't                     | Why                        |
| ------------------------- | -------------------------- |
| Edit `worker.js` directly | Regenerated on every build |
| Add external CDN links    | Violates CSP policy        |
| Use heavy assets          | Bundle must stay < 1MB     |
| Remove inline scripts     | Breaks CSP hash generation |

## Contact

- **Email**: qws941@kakao.com
- **GitHub**: https://github.com/qws941
- **GitHub**: https://github.com/qws941/resume
