# Portfolio Library Modules

This directory contains build-time transforms, emitted Worker source, and
helpers imported directly by the portfolio Worker.

## Table of Contents

- [Module map](#module-map)
- [Module conventions](#module-conventions)
- [Build and tests](#build-and-tests)
- [Related references](#related-references)

## Module map

- **Build and file I/O:** [`build-orchestrator.js`](./build-orchestrator.js),
  [`file-reader.js`](./file-reader.js), and [`worker-writer.js`](./worker-writer.js)
  coordinate generation and handle build inputs and output.
- **Data and page transforms:** [`data-processor.js`](./data-processor.js),
  [`html-transformer.js`](./html-transformer.js), and
  [`localized-page-builder.js`](./localized-page-builder.js) validate and
  transform content, then assemble localized pages.
- **Template safety:** [`template-sanitizer.js`](./template-sanitizer.js) and
  [`csp-hash-generator.js`](./csp-hash-generator.js) escape template values and
  derive hashes from inline content.
- **Cards and disclosures:** [`cards/`](./cards/) and
  [`japanese-template/`](./japanese-template/) render portfolio content and
  localized page fragments.
- **Generated Worker source:** [`worker-preamble.js`](./worker-preamble.js)
  and [`worker-routes/`](./worker-routes/) assemble emitted Worker source.
- **Runtime routing and headers:** [`entry-router-utils/`](./entry-router-utils/)
  and [`security-headers.js`](./security-headers.js) adapt edge responses and
  apply runtime security headers.
- **Metadata:** [`owner-identity.js`](./owner-identity.js) and
  [`content-lastmod.js`](./content-lastmod.js) derive owner and content-date
  metadata from inputs.
- **Metrics:** [`metrics/`](./metrics/) stores and aggregates runtime metrics.

## Module conventions

Most modules use CommonJS. `entry-router-utils.js` and its children are
edge-imported ESM. Functions named `generate*` under `worker-routes/` return
source strings for the build; they are not live request handlers.

Filesystem and process access belongs at the build boundary. Pass explicit
inputs to transforms, pass runtime bindings through `env`, and preserve inline
script bytes after CSP hashes are calculated.

## Build and tests

Run repository commands from the root. `npm run build` prepares content,
synchronizes data, and builds the portfolio Worker. Library tests are part of
the root Jest suite, including
[`tests/unit/portfolio-worker/lib/`](../../../tests/unit/portfolio-worker/lib/).

## Related references

- [Portfolio ownership and build boundaries](../AGENTS.md)
- [Root workspace commands](../../../package.json)
- [Portfolio Worker generation entry](../generate-worker.js)
