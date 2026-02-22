# Deployment Pipeline Documentation

**Last Updated**: 2026-02-21
**Deployment Source of Truth**: Cloudflare Workers Builds
**Validation Source of Truth**: `.github/workflows/ci.yml`

## Overview

This repo now uses a split model:

- Cloudflare Workers Builds: build + deploy on Git push
- GitHub Actions CI: validation-only quality gates

## Deployment Path (Cloudflare Builds)

1. Connect Worker to Git repository in Cloudflare Dashboard.
2. Configure root dir `/` and build command `npm run build`.
3. Ensure deploy command uses explicit config:

```bash
npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production
```

4. Push to `master` to trigger build/deploy via Cloudflare.

Important requirement:

- Worker name in Cloudflare dashboard must match `name` in Wrangler config for the selected root.

## CI Path (GitHub Actions)

`.github/workflows/ci.yml` runs repository validation only:

1. `analyze`
2. `validate-cloudflare` (includes `wrangler types` checks)
3. `lint`
4. `typecheck`
5. `test-unit`
6. `test-e2e`
7. `security-scan`
8. `build` artifact generation

Deploy/rollback/preview deploy jobs are disabled to avoid dual-deployer drift.

## Optional Build-Only Mode

To let Cloudflare Builds create versions without promoting active deployment, set deploy command to:

```bash
npx wrangler versions upload --config typescript/portfolio-worker/wrangler.toml --env production
```

## Required Secrets

- GitHub CI: no Cloudflare deploy secret required for validation-only flow
- Optional notification: `N8N_WEBHOOK_URL`

## Quick Verification

```bash
bash tools/ci/validate-cloudflare-native.sh
npm run typecheck
npm run build
curl -i https://resume.jclee.me/health
curl -i https://resume.jclee.me/job/health
```

## Operational Notes

- Keep only one active deploy authority (Cloudflare Builds) to prevent race conditions.
- Keep `--config` explicit in all build/deploy commands.
- `typescript/portfolio-worker/worker.js` is generated; do not hand-edit.
