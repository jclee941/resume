# Workers Builds: resume — Infrastructure Failure

**Status**: Redundant — production deploys handled by `release.yml` since PR #121 (2026-05-04). The `Workers Builds: resume` check still appears on every push as `failure (1s)` but is **NOT a required check** and does **NOT block** any merges or deploys. Resolution path is to uninstall the GitHub App from the repo (see below).
**Date observed**: 2026-05-03
**Branch**: `master` @ `80b97094` (also reproduced on prior master commits)

## Symptom

The `Workers Builds: resume` check on Cloudflare Workers Builds fails in
~1 second on every push to `master` (start_at == completed_at). Example:

```
{
  "name": "Workers Builds: resume",
  "conclusion": "failure",
  "started_at":   "2026-05-03T08:19:48Z",
  "completed_at": "2026-05-03T08:19:48Z",
  "html_url": "https://github.com/jclee941/resume/runs/74101145548"
}
```

Logs are hosted on Cloudflare dashboard at:
`https://dash.cloudflare.com/.../workers/services/view/resume/production/builds/<id>`
and are not accessible via the GitHub Checks API or `gh run` CLI.

## Impact (current)

- **No deploy impact** — `release.yml` workflow_run trigger handles deploy via
  `cloudflare/wrangler-action@v3` on every CI-passing master push. Verified at
  Version `37b1bee4` deploy 2026-05-04T04:31Z.
- **No merge impact** — not a required status check on branch protection.
- **GitHub UI noise only** — the failing check shows on PR pages and master
  commits but is purely cosmetic.

## Cause

- The Cloudflare Workers Builds GitHub App is configured separately in the
  Cloudflare Dashboard, not in this repo. The 1-second failure pattern
  indicates the build runner exits before executing any build command —
  typically a missing/invalid `CLOUDFLARE_API_TOKEN` in the Workers Builds
  build settings, an unsupported config field, or a queue/permission rejection.
- `release.yml` succeeds because it uses GitHub Actions secrets
  (`CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID`) via `cloudflare/wrangler-action@v3`,
  which is a completely independent auth path.

## Reproduction

| Branch                           | HEAD       | Workers Builds |
| -------------------------------- | ---------- | -------------- |
| `master` (post-merge #74)        | `80b97094` | failure (1s)   |
| `master` (pre-merge #74)         | `d1e62878` | failure (1s)   |
| `feat/japanese-portfolio-locale` | `e419e01c` | failure (1s)   |

The 1-second failure pattern indicates the build runner exits before
executing any build command — typically a missing secret, an
unsupported config field, or a queue/permission rejection on the
Cloudflare side.

## Resolution — Uninstall the GitHub App (recommended)

Since `release.yml` handles deploys end-to-end, the Workers Builds GitHub App
is redundant. To remove the spurious check from the GitHub UI:

1. Browse to <https://github.com/jclee941/resume/settings/installations>
2. Find **Cloudflare Workers and Pages** in the installed apps list
3. Click **Configure** → either:
   - **Repository access**: "Only select repositories" and remove `jclee941/resume`, or
   - **Uninstall** entirely if no other repo uses it
4. Push a no-op commit and confirm the `Workers Builds: resume` check no
   longer appears on the PR page or master commit list.

## Alternative — Fix in Cloudflare Dashboard (if dual-deploy desired)

If keeping Workers Builds operational alongside `release.yml` is preferred
(e.g. for branch previews):

1. Open <https://dash.cloudflare.com/a8d9c67f586acdd15eebcc65ca3aa5bb/workers/services/view/resume/production/builds>
2. Capture the actual error string from the latest failing build
3. Add `CLOUDFLARE_API_TOKEN` to the build environment variables (use a
   scoped token with `Account:Workers Scripts:Edit` + `Workers Builds:Edit`)
4. Set build command: `npm run build`
5. Set deploy command: `npx wrangler deploy --config apps/portfolio/wrangler.jsonc --env production`
6. Push a no-op commit and confirm the check turns green.

## Verification target

Once resolved, the production smoke test should match the local
Miniflare inspection recorded in
`.sisyphus/evidence/portfolio-improvements-manual-qa.md`:

| URL                           | Expected lang | Expected title fragment                            |
| ----------------------------- | ------------- | -------------------------------------------------- |
| `https://resume.jclee.me/`    | `ko`          | `이재철 - DevSecOps/SRE/Platform Engineer`         |
| `https://resume.jclee.me/en/` | `en`          | `Jaecheol Lee - DevSecOps/SRE/Platform Engineer`   |
| `https://resume.jclee.me/ja/` | `ja`          | `イ・ジェチョル - DevSecOps/SRE/Platform Engineer` |
