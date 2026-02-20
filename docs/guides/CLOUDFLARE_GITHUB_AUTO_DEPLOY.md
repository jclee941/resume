# Cloudflare Git Auto-Deploy (resume.git)

This runbook makes deployment automatic after `resume.git` push events.

## Current Repo Behavior (Already Enabled)

- GitHub Actions auto-deploys on push to `master` via `.github/workflows/ci.yml`.
- Trigger: `push` on `master`.
- Deploy step uses `cloudflare/wrangler-action@v3`.
- Required GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Option A: GitHub Actions Auto-Deploy (Recommended for this repo)

1. Confirm repository remote points to `resume.git`.
2. Ensure GitHub Actions secrets are set:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `master`.
4. Verify workflow run in GitHub Actions.
5. Confirm production health endpoint returns `200`.

## Option B: Cloudflare Workers Builds Git Integration

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

## Monorepo Notes

- Always keep deploy commands explicit with `--config` to avoid root discovery issues.
- Use build watch paths if multiple Workers are connected to the same repo.
- Keep worker `name` in Wrangler config aligned with dashboard Worker name.

## Quick Verification

```bash
curl -i https://resume.jclee.me/health
curl -i https://resume.jclee.me/job/health
```

Both endpoints should return `200`.
