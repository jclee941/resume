# PORTFOLIO LIB KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

25 stateless JavaScript modules for build pipeline and worker runtime.

## KEY MODULES

| Module                   | Role                           |
| ------------------------ | ------------------------------ |
| `security-headers.js`    | CSP policy + nonce generation  |
| `csp-hash-generator.js`  | SHA-256 hashes for inline JS   |
| `es-logger.js`           | Elasticsearch via CF Access    |
| `metrics.js`             | Prometheus-format metrics      |
| `performance-metrics.js` | Core Web Vitals collection     |
| `ab-testing.js`          | experiment assignment          |
| `cards.js`               | HTML card generation           |
| `templates.js`           | HTML template rendering        |
| `compression.js`         | response compression           |
| `validators.js`          | input validation               |
| `env.js`                 | environment config             |
| `routes/`                | route handlers (barrel export) |

## CONVENTIONS

- Pure functions — receive `env` object, return values.
- No external dependencies beyond Node built-ins.
- Fire-and-forget telemetry (never await logging calls).
- Never `trim()` script content before CSP hash computation.

## ANTI-PATTERNS

- No external npm dependencies in lib modules.
- No worker binding leaks across module boundaries.
- No mutable module-level state.
