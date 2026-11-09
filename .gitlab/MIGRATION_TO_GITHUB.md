# GitLab CI → GitHub Actions Migration

**Date**: 2026-04-10
**Reason**: GitLab Runner at 192.168.50.215 was down (6+ days), blocking deployments.
Repository migrated to https://github.com/jclee941/resume.

> **Historical record, as of 2026-11-09.** This page records the April 2026
> migration and is not a current setup procedure. The status of the external
> connection and other migration-time actions below is unknown. For current
> repository guidance, see the [root guide](../AGENTS.md), the
> [current CI workflow](../.github/workflows/ci.yml), and the root
> [Wrangler configuration](../wrangler.jsonc).

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

| GitLab CI Job                | GitHub Actions         | Notes                    |
| ---------------------------- | ---------------------- | ------------------------ |
| validate/lint.yml            | ci.yml → lint          | ESLint                   |
| validate/typecheck.yml       | ci.yml → typecheck     | TypeScript               |
| validate/data-drift.yml      | ci.yml → validate-data | JSON validation          |
| test/unit.yml                | ci.yml → test-unit     | Jest + Node tests        |
| build.yml                    | CF Workers Builds      | Handled externally       |
| deploy.yml                   | CF Workers Builds      | Handled externally       |
| verify/health.yml            | Not yet ported         | Manual: curl /health     |
| verify/security-headers.yml  | Not yet ported         | Manual: curl -I          |
| test/e2e.yml                 | Not yet ported         | Manual: npm run test:e2e |
| release.yml                  | Not yet ported         | Low priority             |
| automation-notifications.yml | Not yet ported         | Optional                 |
| auto-sync.yml (Wanted)       | Not yet ported         | Scheduled task           |

## Paths Recorded as Preserved at Migration Time

The following paths were recorded as preserved on 2026-04-10. They are historical
path references; their current locations or availability are unresolved.

- `.gitlab/ci/**/*` — original job definitions
- `.gitlab/verify-*.go` — Go verification scripts (can be reused from any CI)

## Required GitHub Secrets (for CI only)

CI workflow did not need Cloudflare secrets (no deploy step) at migration time.
The following secrets were recorded as unused by CI then; their present status is
unknown:

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_KEY
- CLOUDFLARE_EMAIL

The migration record said these remained available for future workflow
reactivation; that statement does not establish their current status.

## Migration-Time Setup Actions (Current Status Unknown)

These were listed as actions to complete during the migration. This document does
not establish whether any external setting was completed or remains active.

1. Cloudflare Dashboard → Workers & Pages → `resume`
2. Settings → Git Integration → Connect → GitHub
3. Authorize Cloudflare app → Select `jclee941/resume`
4. Production branch: `master`
5. Build command recorded at migration: `npm ci && npm run sync:data && npm run build`
6. Deploy command recorded at migration: `npx wrangler deploy --config apps/portfolio/wrangler.toml --env production`
7. Root directory: `/` (monorepo root)
8. Disconnect old GitLab integration to avoid conflicts.

The final statement describes the expected behavior after setup at migration time;
it is not evidence of the current external integration.
