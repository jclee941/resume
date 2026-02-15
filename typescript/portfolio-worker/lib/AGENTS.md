# PORTFOLIO SHARED LIBRARY (`typescript/portfolio-worker/lib/`)

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-01-30

## OVERVIEW

High-performance, stateless modules for the Portfolio build engine and edge runtime. Handles static asset inlining, security (CSP), observability (ES/Prometheus), and experiment orchestration (A/B testing).

## STRUCTURE

- `security-headers.js`: HSTS, XSS protection, and dynamic CSP generation with SHA-256 hashes.
- `es-logger.js`: Flat-schema Elasticsearch logger via CF Access auth (fire-and-forget, always-immediate).
- `metrics.js` / `performance-metrics.js`: Prometheus exposition and Core Web Vitals tracking.
- `ab-testing.js`: Persistent variant assignment and conversion tracking.
- `cards.js` / `templates.js`: HTML generation with regex-based asset injection.
- `compression.js`: Aggressive minification pipeline for edge bundle optimization (<1MB).
- `validators.js` / `env.js`: JSON schema enforcement and environment safety.

## WHERE TO LOOK

| Task                | Location              | Notes                                         |
| ------------------- | --------------------- | --------------------------------------------- |
| **Update CSP**      | `security-headers.js` | Add SHA hashes or external domains here       |
| **New Log Event**   | `es-logger.js`        | `logToElasticsearch(env, msg, level, labels)` |
| **A/B Test Logic**  | `ab-testing.js`       | Manage `TESTS` registry and storage prefix    |
| **Build Constants** | `config.js`           | Labels, link types, and template cache        |
| **Data Integrity**  | `validators.js`       | Enforce `resume_data.json` structure          |

## CONVENTIONS

- **Stateless Logic**: Export pure functions. Avoid module-level side effects.
- **Worker Compatibility**: Use `env` object for secrets/bindings (not `process.env`).
- **CSP Safety**: NEVER trim scripts before hashing in `templates.js`.
- **Fault Tolerance**: Fire-and-forget for telemetry (ES/Metrics) to prevent blocking response.
- **Regex Extraction**: Use non-greedy patterns in `templates.js` for asset matching.

## ANTI-PATTERNS

- **Framework Bloat**: NO external dependencies. Use vanilla JS/Node built-ins only.
- **Manual String Concat**: Prefer `templates.js` helpers for HTML generation.
- **Binding Leaks**: Do not expose `env` objects to client-side scripts.
- **Inconsistent Hash**: Ensure `generate-worker.js` uses exact script content for CSP hashes.
- **Heavy JSON**: Keep `config.js` constants minimal to fit within Worker limits.
