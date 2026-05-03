# Workers Builds: resume — Infrastructure Failure

**Status**: Pre-existing infra issue, blocking production deploys
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

## Impact

- `https://resume.jclee.me/ja/` returns HTTP 301 → `/` because the
  Cloudflare-deployed artifact pre-dates the Japanese locale change merged
  in PR #74 (`80b97094`).
- All other production routes continue to serve the older artifact.
- Local `wrangler deploy --dry-run` succeeds, so the issue is environmental
  (Cloudflare Workers Builds runner config / secrets / build command), not
  a wrangler.jsonc or worker.js defect.

## Reproduction

| Branch                      | HEAD       | Workers Builds         |
| --------------------------- | ---------- | ---------------------- |
| `master` (post-merge #74)   | `80b97094` | failure (1s)           |
| `master` (pre-merge #74)    | `d1e62878` | failure (1s)           |
| `feat/japanese-portfolio-locale` | `e419e01c` | failure (1s)      |

The 1-second failure pattern indicates the build runner exits before
executing any build command — typically a missing secret, an
unsupported config field, or a queue/permission rejection on the
Cloudflare side.

## Required follow-up (NEW TASK)

A new operational task should:

1. Open the failing Cloudflare Workers Builds run in the dashboard and
   capture the actual error string.
2. Confirm whether the Cloudflare account has the Workers Builds beta
   enabled for the `resume` worker.
3. Validate the build command configured on Cloudflare side
   (`npm run build:portfolio` or equivalent).
4. Verify `CF_API_TOKEN` / `CF_ACCOUNT_ID` parity with `wrangler.jsonc`
   account `a8d9c67f586acdd15eebcc65ca3aa5bb`.
5. After fixing, push a no-op commit (e.g. README touch) and confirm the
   `Workers Builds: resume` check turns green AND
   `https://resume.jclee.me/ja/` responds with `<html lang="ja">`.

## Verification target

Once resolved, the production smoke test should match the local
Miniflare inspection recorded in
`.sisyphus/evidence/portfolio-improvements-manual-qa.md`:

| URL                                | Expected lang | Expected title fragment                        |
| ---------------------------------- | ------------- | ---------------------------------------------- |
| `https://resume.jclee.me/`         | `ko`          | `이재철 - DevSecOps/SRE/Platform Engineer`     |
| `https://resume.jclee.me/en/`      | `en`          | `Jaecheol Lee - DevSecOps/SRE/Platform Engineer` |
| `https://resume.jclee.me/ja/`      | `ja`          | `イ・ジェチョル - DevSecOps/SRE/Platform Engineer` |
