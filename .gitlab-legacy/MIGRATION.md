# GitLab CI/CD Migration

This repository has been migrated from GitHub Actions to GitLab CI/CD.

## Migration Summary

| Wave | Components | Status |
|------|-----------|--------|
| Wave 1 | Base infrastructure (.gitlab-ci.yml, templates, 1Password) | ✅ Complete |
| Wave 2 | CI pipeline, Wanted resume sync, Auto-sync | ✅ Complete |
| Wave 3 | Release pipeline, Verify pipeline | ✅ Complete |
| Wave 4 | Auto-issue-on-failure, ELK ingest | ✅ Complete |
| Wave 5 | GitHub deprecation | ✅ Complete |

## GitLab CI Structure

```
.gitlab-ci.yml              # Main pipeline configuration
.gitlab/ci/
├── onepassword.yml         # 1Password secrets integration
├── wanted-resume-sync.yml  # Weekly resume sync automation
├── auto-sync.yml           # Data sync + dependency update
├── release.yml             # Release automation
├── verify.yml              # Post-deployment verification
└── auto-issue-on-failure.yml # Failure tracking
```

## Pipeline Stages

1. **prepare** - Analyze affected targets
2. **validate** - Lint, typecheck, data drift detection
3. **test** - Unit tests, E2E tests, security scans
4. **build** - Build artifacts
5. **deploy** - Deployment (manual trigger)
6. **report** - ELK ingest, notifications
7. **automation** - Auto-sync, auto-update
8. **scheduled** - Wanted resume sync

## Required CI/CD Variables

Set in GitLab → Settings → CI/CD → Variables:

| Variable | Type | Required For |
|----------|------|--------------|
| `OP_SERVICE_ACCOUNT_TOKEN` | Masked | 1Password secret access |
| `GITLAB_TOKEN` | Masked | MR creation, releases |
| `ELASTICSEARCH_URL` | Unmasked | ELK logging |
| `ELASTICSEARCH_API_KEY` | Masked | ELK authentication |

## Archived GitHub Actions

Original workflows archived in `.github/workflows-archived/`:
- `ci.yml`
- `verify.yml`
- `release.yml`
- `wanted-resume-sync.yml`
- `auto-sync.yml`
- `auto-update.yml`
- And more...

## Schedule Configuration

Configure in GitLab → CI/CD → Schedules:

| Schedule | Cron | Description |
|----------|------|-------------|
| wanted-resume-sync | `0 3 * * 0` | Weekly Sunday 3 AM UTC |
| auto-update-deps | `0 18 * * 0` | Weekly Sunday 6 PM UTC |

## Verification

Verify migration:
```bash
# Check all includes are valid
gitlab-ci-lint .gitlab-ci.yml

# View all migrated files
ls -la .gitlab/ci/
```

## Rollback

To restore GitHub Actions:
```bash
mv .github/workflows-archived/*.yml .github/workflows/
```

## Notes

- GitHub Actions workflows have been disabled by archiving
- Cloudflare Workers Builds remains the deployment authority
- Dual-run period recommended before full cutover
