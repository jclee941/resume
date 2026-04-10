# GitLab CI → GitHub Actions Migration

**Date**: 2026-04-10
**Reason**: GitLab Runner at 192.168.50.215 was down (6+ days), blocking deployments.
Repository migrated to https://github.com/jclee941/resume.

## Architecture Decision

Deployment is handled by **Cloudflare Workers Builds** (Git integration to GitHub).
GitHub Actions only runs **validation CI** (lint, typecheck, tests, JSON validation).

### Why no Deploy workflow in GitHub Actions
CF Workers Builds auto-builds and deploys on every push to master. Running a parallel
deploy from GitHub Actions would cause:
- Double deploys (race condition)
- Conflicting version IDs in Cloudflare
- Wasted CI minutes

### Deployment path after migration
```
git push origin master
  ↓
[GitHub Actions: CI validation]  ──(parallel)──  [CF Workers Builds: build + deploy]
  ↓                                                   ↓
lint, typecheck, test, JSON check                resume.jclee.me updated
```

## GitLab CI → GitHub Actions Mapping

| GitLab CI Job | GitHub Actions | Notes |
|---|---|---|
| validate/lint.yml | ci.yml → lint | ESLint |
| validate/typecheck.yml | ci.yml → typecheck | TypeScript |
| validate/data-drift.yml | ci.yml → validate-data | JSON validation |
| test/unit.yml | ci.yml → test-unit | Jest + Node tests |
| build.yml | CF Workers Builds | Handled externally |
| deploy.yml | CF Workers Builds | Handled externally |
| verify/health.yml | Not yet ported | Manual: curl /health |
| verify/security-headers.yml | Not yet ported | Manual: curl -I |
| test/e2e.yml | Not yet ported | Manual: npm run test:e2e |
| release.yml | Not yet ported | Low priority |
| n8n-notifications.yml | Not yet ported | Optional |
| auto-sync.yml (Wanted) | Not yet ported | Scheduled task |

## Preserved as Reference
- `.gitlab/ci/**/*` — original job definitions
- `.gitlab/verify-*.go` — Go verification scripts (can be reused from any CI)

## Required GitHub Secrets (for CI only)
CI workflow does not need Cloudflare secrets (no deploy step).
Secrets set but currently unused by CI:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_KEY
- CLOUDFLARE_EMAIL

These remain available for future workflow reactivation if needed.

## User Action: Connect CF Workers Builds to GitHub
1. Cloudflare Dashboard → Workers & Pages → `resume`
2. Settings → Git Integration → Connect → GitHub
3. Authorize Cloudflare app → Select `jclee941/resume`
4. Production branch: `master`
5. Build command: `npm ci && npm run sync:data && npm run build`
6. Deploy command: `npx wrangler deploy --config apps/portfolio/wrangler.toml --env production`
7. Root directory: `/` (monorepo root)
8. Disconnect old GitLab integration to avoid conflicts.

After connection, every `git push origin master` auto-triggers CF build + deploy.
