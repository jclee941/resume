# PORTFOLIO LIB KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

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
| `env.js`                 | environment config             |
| `routes/`                | route handlers (barrel export) |

## CONVENTIONS

- Pure functions — receive `env` object, return values.
- Data validation is imported from `@resume/shared/validation`.
- Fire-and-forget telemetry (never await logging calls).
- Never `trim()` script content before CSP hash computation.

## ANTI-PATTERNS

- No external npm dependencies in lib modules except workspace package imports.
- No worker binding leaks across module boundaries.
- No mutable module-level state.

---

Parent: [../../../AGENTS.md](../../../AGENTS.md)
