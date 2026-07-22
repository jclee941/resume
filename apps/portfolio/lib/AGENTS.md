# PORTFOLIO LIB KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Build-time compilers plus runtime modules embedded in or called by the portfolio
Worker. Phase ownership matters more than a blanket purity rule.

## STRUCTURE

```text
lib/
├── build-orchestrator.js, file-reader.js, worker-writer.js  # build I/O
├── cards/, cards.js, templates.js                           # HTML generation
├── csp-hash-generator.js, html-transformer.js               # CSP/template pipeline
├── localized-page-builder.js, japanese-template/            # locale transforms
├── worker-preamble.js, worker-routes/, worker-routes.js     # bundle emitters
├── entry-router-utils/, entry-router-utils.js               # edge routing helpers
├── routes/                                                   # runtime endpoints
└── metrics/, metrics.js, tracing.js, es-logger.js            # observability
```

## CONVENTIONS

- Keep filesystem and process I/O in build-boundary modules; keep transforms
  deterministic for the same explicit inputs.
- Escape generated HTML and preserve placeholder/CSP-hash ordering.
- Pass Worker bindings through explicit `env` parameters; do not capture them in
  module globals.
- Use `@resume/schemas` or `@resume/shared/validation` at untrusted boundaries.
- Keep route families explicit about cache, security headers, status codes, and
  `ctx.waitUntil()` telemetry.
- The PDF routes are the only runtime `env.ASSETS` fetch exception.

## ANTI-PATTERNS

- Never write `worker.js` outside the worker writer/orchestrator path.
- Never trim or mutate inline script content after hash calculation.
- Never interpolate unescaped resume or request data into HTML.
- Never move dashboard implementation into portfolio helpers; only `entry.js`
  owns the sanctioned cross-app import.
- Never add mutable cross-request state to Worker runtime modules.

---

Parent: [../AGENTS.md](../AGENTS.md)
