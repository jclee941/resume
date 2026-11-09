# Cloudflare Git Auto-Deploy (resume.git)

This overview describes the repository's Cloudflare Workers Builds deployment
boundary.

## Current Repo Behavior (Already Enabled)

- Deployment is handled by Cloudflare Workers Builds Git integration.
- GitHub Actions [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
  runs one read-only validation job; it does not deploy.
- Worker deploy/promotion is managed in Cloudflare Dashboard Builds settings.
- The root [`wrangler.jsonc`](../../wrangler.jsonc) is the runtime configuration.

## Legacy GitHub Actions deployment

1. Confirm repository remote points to `resume.git`.
2. Ensure GitHub Actions secrets are set:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `master`.
4. Use only for temporary fallback.
5. Keep disabled in normal operation.

## Cloudflare Workers Builds Git integration

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

```bash
npx wrangler deploy --config wrangler.jsonc
```

1. Save and trigger with a new commit push.

Build-only version upload, if configured in the existing Builds settings:

```bash
npx wrangler versions upload --config wrangler.jsonc
```

## Monorepo Notes

- Always keep deploy commands explicit with `--config` to avoid root discovery
  issues.
- `preview` is the only named Wrangler environment; production uses the root
  configuration without `--env production`.
- Use build watch paths if multiple Workers are connected to the same repo.
- Keep worker `name` in Wrangler config aligned with dashboard Worker name.

## Quick Verification

```bash
curl -i https://resume.jclee.me/health
```
