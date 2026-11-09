# Deployment Pipeline Documentation

- **Last updated:** 2026-11-09
- **Deployment source of truth:** Cloudflare Workers Builds
- **Validation source of truth:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

> Production uses the root [`wrangler.jsonc`](../../wrangler.jsonc) configuration.
> `preview` is the only named Wrangler environment. This reference reflects the
> repository configuration inspected on 2026-11-09.

## Overview

This repository uses separate deployment and validation owners:

- Cloudflare Workers Builds builds and deploys on Git push.
- GitHub Actions runs repository validation only.

## Deployment Path (Cloudflare Builds)

1. Connect Worker to Git repository in Cloudflare Dashboard.
2. Configure the repository root (`/`) and build command `npm run build`.
3. Set the deploy command to use the root Wrangler configuration:

```bash
npx wrangler deploy --config wrangler.jsonc
```

4. Push to `master` to trigger the Cloudflare build and deployment.

Important requirement:

- Worker name in Cloudflare dashboard must match `name` in Wrangler config for
  the selected root.

## CI Path (GitHub Actions)

`.github/workflows/ci.yml` defines one read-only `validate` job. Its steps run in
the order listed in that workflow; they do not deploy or run Playwright E2E:

Playwright E2E is a separate on-demand command, not a CI step. Cloudflare Workers
Builds remains the deployment authority.

## Optional Build-Only Mode

To let Cloudflare Builds create versions without promoting active deployment,
set deploy command to:

```bash
npx wrangler versions upload --config wrangler.jsonc
```

## Required Secrets

- GitHub CI: no Cloudflare deploy secret required for validation-only flow
- Optional notification: `AUTOMATION_WEBHOOK_URL`

## Quick Verification

Run these local checks independently:

```bash
go run ./tools/ci/validate-cloudflare-native.go
npm run typecheck
npm run build
```

Check the live health endpoints separately when production verification is needed:

```bash
curl -i https://resume.jclee.me/health
curl -i https://resume.jclee.me/job/health
```

## Operational Notes

- Keep only one active deploy authority (Cloudflare Builds) to prevent race
  conditions.
- Keep `--config` explicit in all build/deploy commands.
- `apps/portfolio/worker.js` is generated; do not hand-edit.
