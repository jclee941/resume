# Local Development with Miniflare

This setup provides a local Cloudflare Worker runtime with D1, KV, and R2 simulation.

## Files

- `miniflare.config.js`: Miniflare v3 local runtime config.
- `.dev.vars.example`: template for local worker environment variables.

## Quick Start

1. Copy env template:

```bash
cp .dev.vars.example .dev.vars
```

2. Fill values in `.dev.vars` for local-only usage.

3. Start local worker:

```bash
npm run dev
```

The local endpoint listens on `http://localhost:8787`.

## Optional: Wrangler Dev

If you want direct Wrangler runtime instead of Miniflare:

```bash
npm run dev:wrangler
```

## Local Bindings

- `DB` -> local D1 simulation
- `SESSIONS`, `CACHE` -> local KV namespaces
- `RESUME_ASSETS_BUCKET` -> local R2 bucket

## Notes

- Never commit `.dev.vars`.
- Keep secrets and API tokens out of source control.
