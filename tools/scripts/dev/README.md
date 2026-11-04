# Local Development with Wrangler

This setup provides a local Cloudflare Worker runtime through Wrangler dev, which uses
Miniflare for local execution.

## Files

- Root `wrangler.jsonc`: runtime entry, bindings, and local development configuration.
- Root `.dev.vars.example`: template for local worker environment variables.

## Quick Start

1. Copy env template:

```bash
cp .dev.vars.example .dev.vars
```

1. Fill values in `.dev.vars` for local-only usage.

2. Start local worker:

```bash
npm run dev
```

The local endpoint listens on `http://localhost:8787`.

## Alias

`npm run dev:wrangler` runs the same local worker command as `npm run dev`.

## Local Bindings

Root `wrangler.jsonc` owns the bindings used by the local Worker, including:

- `JOB_DB` -> local D1 simulation
- `SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV` -> local KV namespaces

## Notes

- Never commit `.dev.vars`.
- Keep secrets and API tokens out of source control.
