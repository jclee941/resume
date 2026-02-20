# Cloudflare Workers Builds Template (Standard)

Use this template when configuring Cloudflare Workers Builds for this monorepo.

## Standard Fields

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production`
- Root directory: `/`
- Build token name: `resume build token`
- Environment variables: none
- Optional recommendation: `CLOUDFLARE_ACCOUNT_ID` (useful for multi-account setups)

## Why This Template

- Running `npx wrangler deploy` at repo root without `--config` causes `Missing entry-point to Worker script or to assets directory`.
- The Worker config for production is in `typescript/portfolio-worker/wrangler.toml`.
- Explicit `--config` makes monorepo deploy behavior deterministic in local, CI, and Cloudflare Builds.

## Validation Commands

Run from repository root:

```bash
npm run build
npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production --dry-run
```

## Equivalent npm Scripts

- Root-safe deploy: `npm run deploy:wrangler:root`
- Root-safe dry run: `npm run deploy:wrangler:root:dry-run`

## Post-Deploy Checks

```bash
curl -i https://resume.jclee.me/health
curl -i https://resume.jclee.me/job/health
```

Both should return `200`.

## Git Integration Reference

- Official guide: `https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/`
- Project runbook: `docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md`
