# GitLab CI Legacy Archive

**Status**: ARCHIVED — no longer executed
**Migrated**: 2026-04-10
**Active CI/CD**: `.github/workflows/` (GitHub Actions) + Cloudflare Workers Builds

## What's here

Historical GitLab CI configuration preserved for reference:

- `ci/` — Full job definitions (`build.yml`, `deploy.yml`, `test/`, `validate/`, `verify/`, etc.)
- `verify-*.go` — Go-based verification scripts (health, performance, security headers, etc.)
- `CI_TEST_TRIGGER.md` — GitLab CI trigger test notes
- `MIGRATION.md` — Prior GitLab-internal migration notes

## Why preserved

1. **Reference for future ports**: Some workflows were not ported to GitHub Actions in the initial migration (release, security, analyze, etc.). These files document the original implementation.
2. **Rollback safety net**: If GitHub Actions integration fails catastrophically, these files provide the blueprint to restore GitLab CI.
3. **Historical accuracy**: Git log preserved via `git mv`, so authorship history is intact.

## Migration mapping

See `.gitlab/MIGRATION_TO_GITHUB.md` (still in `.gitlab/`) for the detailed mapping between GitLab CI jobs and GitHub Actions workflows.

## Do NOT execute these files

- None of these YAMLs or Go scripts should be invoked by active CI
- `.gitlab-ci.yml` at repo root has been deleted — GitLab Runner cannot pick these up
- If you need to revive a workflow, port it to `.github/workflows/` properly
