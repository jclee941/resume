# GITHUB AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

10 workflows, 1 composite action, branch rulesets, auto-labeling. CI is validation-only — production deployment via Cloudflare Workers Builds.

## STRUCTURE

```text
.github/
├── workflows/
│   ├── ci.yml                # main validation pipeline (8 jobs)
│   ├── maintenance.yml       # scheduled cleanup (4 jobs)
│   ├── terraform.yml         # IaC plan/apply
│   ├── release.yml           # conventional commit → semver tag
│   ├── verify.yml            # post-deploy health check
│   ├── update-snapshots.yml  # Playwright snapshot refresh
│   ├── vault-test.yml        # OIDC vault integration
│   ├── pr-labeler.yml        # auto-label PRs by path
│   ├── codeql.yml            # weekly + push security scan
│   └── auto-merge.yml        # dependabot auto-merge
├── actions/
│   └── setup/                # composite: Node 22 + npm ci + Playwright
├── CODEOWNERS
├── labeler.yml               # 9 path-based label rules
├── dependabot.yml
└── rulesets/                  # branch protection rules
```

## WHERE TO LOOK

| Task              | Location                  | Notes                          |
| ----------------- | ------------------------- | ------------------------------ |
| CI pipeline       | `workflows/ci.yml`        | 8 jobs, validation-only        |
| Setup action      | `actions/setup/`          | Node 22, npm ci, Playwright    |
| Label rules       | `labeler.yml`             | 9 auto-labels by path          |
| Branch protection | `rulesets/`               | squash/rebase, required checks |
| Terraform CI      | `workflows/terraform.yml` | plan on PR, apply on dispatch  |

## CI PIPELINE (`ci.yml`)

```
analyze → validate-cf ─┐
         lint ──────────┤
         typecheck ─────┤→ build
         test-unit ─────┤
         test-e2e ──────┤
         security-scan ─┘
```

- **analyze**: detect affected packages via `tools/ci/affected.sh`
- **validate-cf**: `wrangler types` + `validate-cloudflare-native.sh`
- **lint**: ESLint with 69-warning ratchet baseline
- **typecheck**: `tsc --noEmit`
- **test-unit**: Jest with 90% coverage thresholds
- **test-e2e**: Playwright (5 device projects)
- **security-scan**: gitleaks + npm audit
- **build**: `generate-worker.js` + wrangler build check
- Supports `workflow_dispatch` with `gradual_rollout` and `canary_percentage` inputs

## RULESETS

- **default-branch-rules**: squash/rebase merge only, required checks: lint, typecheck, test-unit, security-scan
- **tag-protection**: version tags protected

## RELEASE FLOW

Conventional commits → `mathieudutour/github-tag-action` → semver bump → GitHub Release with changelog.

## CONVENTIONS

- Pin action versions to commit SHAs, not mutable tags.
- Use composite `actions/setup` for consistent environment.
- CI never deploys — Cloudflare Workers Builds has deploy authority.
- `continue-on-error: false` for E2E tests (blocking).
- Minimum required `permissions` per job.

## ANTI-PATTERNS

- Never treat GitHub Actions as production deploy authority.
- Never use `permissions: write-all`.
- Never skip security scan for production.
- Never use `networkidle` in Playwright CI — use `domcontentloaded`.

## SECRETS (7)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GITLEAKS_LICENSE`, `SLACK_WEBHOOK_URL`, `ANTHROPIC_API_KEY`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.

## KNOWN ISSUES

- ESLint baseline ratcheted to 69 warnings (regex fix pending).
- Lighthouse `/health` endpoint removed from verification.
- Release workflow needs dispatch fallback for tag creation.
