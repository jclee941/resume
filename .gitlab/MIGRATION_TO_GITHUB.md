# GitLab CI → GitHub Actions Migration

**Date**: 2026-04-10
**Reason**: GitLab Runner at 192.168.50.215 was down (6+ days), blocking deployments.
Repository migrated to https://github.com/jclee941/resume.

## Mapping

| GitLab CI Job | GitHub Actions Workflow | Location |
|---|---|---|
| validate/lint.yml | ci.yml → lint job | .github/workflows/ci.yml |
| validate/typecheck.yml | ci.yml → typecheck job | .github/workflows/ci.yml |
| validate/data-drift.yml | ci.yml → validate-data job | .github/workflows/ci.yml |
| test/unit.yml | ci.yml → test-unit job | .github/workflows/ci.yml |
| build.yml | deploy.yml → build-and-deploy step | .github/workflows/deploy.yml |
| deploy.yml | deploy.yml → build-and-deploy job | .github/workflows/deploy.yml |
| verify/health.yml | deploy.yml → verify-health job | .github/workflows/deploy.yml |
| test/e2e.yml | e2e.yml → smoke job | .github/workflows/e2e.yml |
| verify/security-headers.yml | e2e.yml → verify-production job | .github/workflows/e2e.yml |

## Not Yet Ported (Lower Priority)
- release.yml (semantic-release automation)
- n8n-notifications.yml (n8n webhook notifications on CI events)
- auto-issue-on-failure.yml (auto-create GitHub issues on CI failure)
- auto-sync.yml (Wanted/JobKorea resume sync scheduled job)
- onepassword.yml (1Password secret injection)
- security.yml (SAST/DAST scanning)
- analyze.yml (code analysis)

These remain available in `.gitlab/ci/jobs/` as reference for future porting.

## Deprecated
- `.gitlab-ci.yml` (root) — removed
- `.gitlab/ci/*` — kept as reference, no longer executed

## Cloudflare Workers Builds
CF Workers Builds was connected to GitLab for auto-deployment. After migration:
- Option A: Reconnect CF Workers Builds to GitHub repo `jclee941/resume` via Cloudflare Dashboard
- Option B: Use GitHub Actions `deploy.yml` (uses wrangler-action + CLOUDFLARE_API_TOKEN secret)

This migration chose **Option B** — self-contained GitHub Actions deploy.
CF Workers Builds git integration should be disconnected to avoid double-deploy.
