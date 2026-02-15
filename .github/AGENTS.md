# .github — CI/CD & Repository Configuration

## OVERVIEW

GitHub Actions CI/CD, repository automation, and developer tooling.

| Category          | Files                           | Purpose                           |
| ----------------- | ------------------------------- | --------------------------------- |
| Workflows         | 8 YAML files                    | CI/CD, IaC, maintenance, releases |
| Composite Actions | `actions/setup/`                | Shared Node/npm/Playwright setup  |
| Repo Config       | CODEOWNERS, labeler, dependabot | Automation & governance           |

## WORKFLOWS

### ci.yml — CI/CD Pipeline v2.0

**Primary pipeline. Deploys to production.**

| Trigger             | Behavior                                                     |
| ------------------- | ------------------------------------------------------------ |
| Push to `master`    | Full pipeline: analyze → lint/test → build → deploy → verify |
| PR to `master`      | Analyze → lint/test → build → preview deploy                 |
| `workflow_dispatch` | Manual with `force_deploy`, `dry_run`, `skip_tests` inputs   |

**13 Jobs (dependency chain):**

```
analyze → lint ──────────────────┐
        → typecheck ─────────────┤
        → test-unit ─────────────┤→ build → deploy → verify → notify
        → test-e2e ──────────────┤              ↓ (on failure)
        → security-scan ─────────┘          rollback
```

Plus: `deploy-preview` (PR ephemeral worker) and `cleanup-preview` (PR close).

**Key Design Decisions:**

- Strict deploy gate: `success()` not `always()&&!failure()` — with `force_deploy` bypass
- Separated concurrency: PR = `pr-{N}` (cancel-in-progress), deploy = `deploy-production` (queue)
- Rollback: `wrangler rollback` on deploy/verify failure
- Verify: CF API worker age check + HTTP health (warning-only due to Bot Fight Mode)

**Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `N8N_WEBHOOK_URL`

### maintenance.yml — Scheduled Maintenance

**4 jobs for operational upkeep (1 scheduled, 3 manual).**

| Job             | Schedule          | Purpose                                |
| --------------- | ----------------- | -------------------------------------- |
| auth-refresh    | Manual (dispatch) | Refresh auth tokens via n8n webhook    |
| profile-sync    | Manual (dispatch) | Sync profiles from SSoT                |
| drift-detection | Monday 06:00 UTC  | Terraform plan against R2-backed state |
| cache-cleanup   | Manual (dispatch) | Purge stale KV/R2 cache entries        |

**drift-detection specifics:**

- Terraform 1.6.0, working dir: `infrastructure/cloudflare/`
- S3 backend → Cloudflare R2 (via `AWS_ENDPOINT_URL_S3` env var)
- Terraform init has retry with backoff (3 attempts: 10s, 20s, 30s)
- Creates/updates GitHub issue on drift detection

### terraform.yml — IaC Pipeline

| Trigger                                    | Behavior                                        |
| ------------------------------------------ | ----------------------------------------------- |
| PR (paths: `infrastructure/cloudflare/**`) | `terraform plan` + PR comment                   |
| Push to `master`                           | `terraform plan` (review via dispatch apply)    |
| `workflow_dispatch`                        | Plan, apply, or destroy with optional `-target` |

### release.yml — Auto Release

Triggers after CI succeeds on `master`. Uses conventional commits for semver tagging (`mathieudutour/github-tag-action`). Creates GitHub Release with changelog.

### verify.yml — Deployment Verification

Standalone verification (manual + `workflow_call`). Checks production/staging URLs with configurable timeout.

### update-snapshots.yml — Visual Regression

Manual dispatch. Runs Playwright to update visual snapshots. Creates PR with changes. Requires typing "update" to confirm.

### vault-test.yml — Vault OIDC Test

Runs on `self-hosted` (proxmox). Tests HashiCorp Vault OIDC JWT auth against 4 secret paths.

### pr-labeler.yml — Auto Labeling

Uses `actions/labeler@v6` with sync-labels. Triggers on PR open/sync/reopen.

### auto-merge.yml — Auto-Merge

Enables squash auto-merge on PRs from:

- **dependabot[bot]** — Automated dependency updates
- **Repository owner** — Owner PRs
- **`auto-merge` label** — Any PR with the label

**Requires branch protection** with required status checks to gate merges. Without it, PRs merge immediately.

#### Branch Protection Setup (ONE-TIME, manual)

Go to **GitHub → Settings → Branches → Add branch protection rule**:

| Setting                           | Value                                                |
| --------------------------------- | ---------------------------------------------------- |
| Branch name pattern               | `master`                                             |
| Require status checks             | ✅ `lint`, `typecheck`, `test-unit`, `security-scan` |
| Require branches to be up-to-date | ✅                                                   |
| Require conversation resolution   | Optional                                             |
| Allow auto-merge                  | ✅ (already enabled at repo level)                   |
| Allow force pushes                | ❌                                                   |
| Allow deletions                   | ❌                                                   |

## COMPOSITE ACTION

### actions/setup/action.yml

Eliminates Node/npm setup duplication across workflows.

| Input                | Default | Purpose                                              |
| -------------------- | ------- | ---------------------------------------------------- |
| `install-playwright` | `false` | Install + cache Playwright browsers (~500MB savings) |
| `node-version`       | `22`    | Node.js version                                      |

**Steps:** Setup Node → npm ci → (optional) detect Playwright version → restore/save browser cache → install browsers.

## REPOSITORY CONFIG

### CODEOWNERS

All files default to `@qws941`. Specific sections mirror directory structure but all map to same owner.

### labeler.yml

9 auto-labels by path:

| Label          | Paths                                     |
| -------------- | ----------------------------------------- |
| portfolio      | `typescript/portfolio-worker/**`          |
| job-automation | `typescript/job-automation/**`            |
| cli            | `typescript/cli/**`                       |
| data           | `typescript/data/**`                      |
| ci             | `.github/**`                              |
| infrastructure | `infrastructure/**`                       |
| tests          | `tests/**`                                |
| docs           | `**/*.md`                                 |
| build          | `BUILD.bazel`, `MODULE.bazel`, `tools/**` |

### dependabot.yml

Weekly updates (Monday, Asia/Seoul TZ):

- **npm**: Groups minor+patch together. PR limit: 10. Reviewer: `qws941`
- **github-actions**: PR limit: 5. Reviewer: `qws941`

## ANTI-PATTERNS

| Anti-Pattern                       | Why                        | Do Instead                                               |
| ---------------------------------- | -------------------------- | -------------------------------------------------------- |
| Skip composite action setup        | Duplicates Node/npm config | Use `actions/setup`                                      |
| `always()` in deploy conditions    | Deploys on test failures   | Use `success()` with `force_deploy`                      |
| Hardcode Node version in workflows | Version drift              | Reference `NODE_VERSION` env or composite action default |
| Push terraform changes without PR  | No plan review             | Use terraform.yml PR workflow                            |
| Add secrets to workflow files      | Security violation         | Use GitHub Secrets + environment variables               |

## FILES

| File                             | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `workflows/ci.yml`               | Primary CI/CD pipeline (13 jobs)     |
| `workflows/maintenance.yml`      | 4 scheduled maintenance jobs         |
| `workflows/terraform.yml`        | IaC plan/apply/destroy               |
| `workflows/release.yml`          | Auto semver release                  |
| `workflows/verify.yml`           | Deployment health check              |
| `workflows/update-snapshots.yml` | Playwright visual snapshot update    |
| `workflows/vault-test.yml`       | Vault OIDC integration test          |
| `workflows/pr-labeler.yml`       | Auto PR labeling                     |
| `workflows/auto-merge.yml`       | Squash auto-merge for CI-passing PRs |
| `actions/setup/action.yml`       | Composite: Node + npm + Playwright   |
| `CODEOWNERS`                     | PR reviewer assignment               |
| `labeler.yml`                    | Path-based label rules               |
| `dependabot.yml`                 | Dependency update config             |
