# Cloudflare Git Auto-Deploy (resume.git)

This runbook makes deployment automatic after `resume.git` push events.

## Current Repo Behavior (Already Enabled)

- Deployment is handled by Cloudflare Workers Builds Git integration.
- GitHub Actions `.github/workflows/ci.yml` is validation-only (lint/test/build/security checks).
- Worker deploy/promotion is managed in Cloudflare Dashboard Builds settings.

## Option A: GitHub Actions Auto-Deploy (Legacy)

1. Confirm repository remote points to `resume.git`.
2. Ensure GitHub Actions secrets are set:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `master`.
4. Use only for temporary fallback.
5. Keep disabled in normal operation.

## Option B: Cloudflare Workers Builds Git Integration (Primary)

Official docs:

- `https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/`

Dashboard setup:

1. Workers & Pages -> Create application -> Import repository.
2. Install/authorize `Cloudflare Workers & Pages` GitHub App.
3. Restrict app access to selected repositories.
4. Configure Builds fields:
   - Git repository: `qws941/resume`
   - Production branch: `master`
   - Root directory: `/`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production`
5. Save and trigger with a new commit push.

Recommended deploy command for Builds:

- Active deploy: `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production`
- Build-only (version upload): `npx wrangler versions upload --config typescript/portfolio-worker/wrangler.toml --env production`

## Monorepo Notes

- Always keep deploy commands explicit with `--config` to avoid root discovery issues.
- PR preview deploy uses `--env preview` to keep preview config isolated from production env.
- Use build watch paths if multiple Workers are connected to the same repo.
- Keep worker `name` in Wrangler config aligned with dashboard Worker name.

## Quick Verification

```bash
curl -i https://resume.jclee.me/health
curl -i https://resume.jclee.me/job/health
```

Both endpoints should return `200`.
