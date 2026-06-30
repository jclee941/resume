# Local Development with Wrangler

This setup provides a local Cloudflare Worker runtime through Wrangler dev, which uses
Miniflare for local execution.

## Files

- `miniflare.config.js`: legacy local runtime config retained for reference.
- `.dev.vars.example`: template for local worker environment variables.

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

- `DB` -> local D1 simulation
- `SESSIONS`, `CACHE` -> local KV namespaces
- `RESUME_ASSETS_BUCKET` -> local R2 bucket

## Notes

- Never commit `.dev.vars`.
- Keep secrets and API tokens out of source control.
