# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-02-16
**Commit:** 6d59e14
**Branch:** master

## OVERVIEW

Cloudflare Worker portfolio with cyberpunk terminal UI. Zero runtime I/O - all assets inlined at build time.

## STRUCTURE

```
portfolio-worker/
├── index.html           # Source HTML (terminal UI, CLI commands)
├── generate-worker.js   # HTML → worker.js compiler (CSP hashes, escaping)
├── worker.js            # GENERATED - NEVER EDIT
├── data.json            # Build-time resume data snapshot (synced from SSoT)
├── wrangler.toml        # Cloudflare Worker config
├── dashboard.html       # Job dashboard UI (1290 lines, inline JS/CSS)
├── lib/                 # Stateless modules (25 JS files)
│   ├── auth.js              # Authentication helpers
│   ├── build-orchestrator.js # Build pipeline orchestration (163 lines)
│   ├── cards.js             # Card rendering
│   ├── config.js            # Configuration management
│   ├── csp-hash-generator.js # CSP hash computation
│   ├── data-processor.js    # Resume data processing
│   ├── env.js               # Environment variable helpers
│   ├── es-logger.js         # ECS-format logging
│   ├── file-reader.js       # File I/O utilities
│   ├── html-transformer.js  # SRI injection, HTML transforms (106 lines)
│   ├── i18n.js              # Internationalization
│   ├── metrics.js           # Prometheus metrics
│   ├── routes/              # Route handlers (5 files)
│   │   ├── auth.js          # Auth routes
│   │   ├── chat.js          # Chat endpoint
│   │   ├── index.js         # Route barrel
│   │   ├── metrics.js       # Metrics endpoint
│   │   └── observability.js # Health/analytics
│   ├── security-headers.js  # CSP baseline, HSTS, X-* headers (93 lines)
│   ├── templates.js         # HTML generation helpers
│   ├── tracing.js           # Distributed tracing
│   ├── utils.js             # General utilities
│   ├── validators.js        # Input validation
│   ├── worker-preamble.js   # Constants, rate limiting, CORS (266 lines)
│   ├── worker-routes.js     # Request routing logic
│   └── worker-writer.js     # Worker file generation
├── src/
│   └── styles/          # Modular CSS (8 files)
│       ├── animations.css   # Typing effects, glitch, fade
│       ├── base.css         # Root variables, reset
│       ├── components.css   # Cards, buttons, sections
│       ├── layout.css       # Grid, flex, positioning
│       ├── main.css         # Main stylesheet entry
│       ├── media.css        # Mobile breakpoints
│       ├── utilities.css    # Utility classes
│       └── variables.css    # CSS custom properties
```

## BUILD PIPELINE

```
resume_data.json (SSoT) → sync-resume-data.js → data.json
index.html (edit this)
    ↓ generate-worker.js
        - Escape backticks in HTML
        - Compute SHA-256 CSP hashes for inline scripts
        - Inline all CSS from src/styles/
        - Inline resume data from data.json
    ↓
worker.js (NEVER EDIT - regenerated on build)
    ↓ wrangler deploy
resume.jclee.me (Cloudflare Edge)
```

## CLI COMMANDS

Interactive terminal supports these commands:

| Command  | Description              |
| -------- | ------------------------ |
| `help`   | List available commands  |
| `whoami` | Display profile info     |
| `pwd`    | Show current "directory" |
| `date`   | Current date/time        |
| `ls`     | List resume sections     |
| `cat`    | View section contents    |
| `snake`  | Easter egg game          |
| `clear`  | Clear terminal           |

Commands defined in `index.html` within `terminalCommands` object.

## KEY CSS CLASSES

| Class              | Purpose                   |
| ------------------ | ------------------------- |
| `.terminal-window` | Main terminal container   |
| `.cli-container`   | CLI input/output wrapper  |
| `#cli-input`       | User input field          |
| `.typing-effect`   | Animated typing animation |
| `.glitch`          | Cyberpunk glitch effect   |

## LIB MODULES (25 files)

| Module                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `auth.js`               | Authentication helpers                              |
| `build-orchestrator.js` | Build pipeline orchestration (163 LOC)              |
| `cards.js`              | Card rendering                                      |
| `config.js`             | Configuration management                            |
| `csp-hash-generator.js` | CSP SHA-256 hash computation                        |
| `data-processor.js`     | Resume data processing                              |
| `env.js`                | Environment variable helpers                        |
| `es-logger.js`          | ECS-format structured logging                       |
| `file-reader.js`        | File I/O utilities                                  |
| `html-transformer.js`   | SRI injection, HTML transforms                      |
| `i18n.js`               | Internationalization                                |
| `metrics.js`            | Prometheus endpoint (`/metrics`)                    |
| `routes/`               | Route handlers (auth, chat, metrics, observability) |
| `security-headers.js`   | CSP, HSTS, X-Frame-Options                          |
| `templates.js`          | HTML generation utilities                           |
| `tracing.js`            | Distributed tracing                                 |
| `utils.js`              | General utilities                                   |
| `validators.js`         | Input validation                                    |
| `worker-preamble.js`    | Constants, rate limiting, CORS                      |
| `worker-routes.js`      | Request routing logic                               |
| `worker-writer.js`      | Worker file generation                              |

**Conventions for lib/**:

- Pure functions, no side effects
- Receive `env` object from Worker
- Fire-and-forget telemetry (non-blocking)
- CSP hash updates require regenerating worker.js

## CONVENTIONS

- **Zero Runtime I/O**: No fetch() for assets; all inlined at build.
- **CSP Hashes**: Computed from exact inline script content. `trim()` breaks hashes.
- **Edit Source**: Only edit `index.html` and `src/styles/`. Never `worker.js`.
- **Mobile-First**: Use responsive.css for breakpoints.

## ANTI-PATTERNS

| Anti-Pattern                 | Why                        | Do Instead                    |
| ---------------------------- | -------------------------- | ----------------------------- |
| Edit `worker.js` directly    | Regenerated on build       | Edit `index.html`             |
| `trim()` before CSP hash     | Whitespace affects SHA-256 | Hash exact source string      |
| Runtime `fetch()` for assets | Adds latency               | Inline at build time          |
| Hardcode colors in HTML      | Style drift                | Use CSS variables in base.css |
| Skip CSP regeneration        | Security violation         | Always run generate-worker.js |

## COMMANDS

```bash
# Build
node generate-worker.js

# Deploy (production)
source ~/.env && \
  CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
  CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
  npx wrangler deploy --env production

# Local dev
npx wrangler dev

# Test
curl -s https://resume.jclee.me/health
```
