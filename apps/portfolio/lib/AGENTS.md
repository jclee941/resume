# PORTFOLIO LIB KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Build-time transforms, emitted Worker source, and directly imported edge helpers.

Scope reason: score 11; required compiler/runtime boundary.

## STRUCTURE

```text
lib/
  cards/               Portfolio HTML card renderers
  entry-router-utils/  Directly imported ESM edge helpers
  japanese-template/   Localized page construction
  metrics/             Metric storage and aggregation helpers
  routes/              Runtime route implementations
  worker-routes/       JavaScript source emitters for the generated Worker
```

## WHERE TO LOOK

| Task                   | Location                                                                | Notes                             |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| Build I/O              | `build-orchestrator.js`, `file-reader.js`, `worker-writer.js`           | Read inputs and write bundle      |
| Transform pipeline     | `data-processor.js`, `html-transformer.js`, `localized-page-builder.js` | Deterministic input transforms    |
| Template safety        | `template-sanitizer.js`, `csp-hash-generator.js`                        | Escaping and exact-byte hashing   |
| Runtime headers        | `security-headers.js`, `entry-router-utils/response-headers.js`         | CSP, caching, response adaptation |
| Runtime emission       | `worker-preamble.js`, `worker-routes.js`                                | Assemble generated JavaScript     |
| Identity/content dates | `owner-identity.js`, `content-lastmod.js`                               | Derive metadata from inputs       |
| Unit coverage          | `tests/unit/portfolio-worker/lib/`                                      | Repository-root Jest suites       |

## CONVENTIONS

- Most modules use CommonJS; `entry-router-utils.js` and its children are edge-imported ESM.
- `generate*` functions in `worker-routes/` return source strings, not live request handlers.
- Keep filesystem/process access at the build boundary; pass explicit inputs to transforms.
- Keep `cards.js`, `metrics.js`, and `worker-routes.js` as facade barrels over their directories.
- Preserve inline script bytes after hash calculation and escape values before interpolation.
- Pass runtime bindings as `env` parameters rather than capturing request state globally.
- `OWNERS` assigns special review ownership to `security-headers.js`.

## ANTI-PATTERNS

- Do not write the generated bundle outside the orchestrator/writer path.
- Do not confuse emitted source text with the emitter's own module syntax.
- Do not mutate inline script content after computing its CSP hash.
- Do not add mutable cross-request state to edge helpers.

Parent: [../AGENTS.md](../AGENTS.md)
