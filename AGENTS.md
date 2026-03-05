# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-05
**Commit:** _(auto-updated on push)_
**Branch:** master

## OVERVIEW

GitHub community health files **Single Source of Truth (SSoT)** for all `qws941` repositories. Contains governance files, reusable CI/CD workflows, issue templates, and label definitions that auto-sync to downstream repos. No application code — config and policy only.

## STRUCTURE

```text
./
├── .github/
│   ├── workflows/
│   │   ├── _auto-approve-runs.yml  # Reusable auto-approve runs (workflow_call)
│   │   ├── _auto-merge.yml         # Reusable auto-merge (workflow_call)
│   │   ├── _branch-cleanup.yml     # Reusable branch cleanup (workflow_call)
│   │   ├── _ci-node.yml            # Reusable Node.js CI (workflow_call)
│   │   ├── _ci-notify-failure.yml  # Reusable CI failure notification (workflow_call)
│   │   ├── _ci-python.yml          # Reusable Python CI (workflow_call)
│   │   ├── _codex-auto-issue.yml   # Reusable Codex auto-issue (workflow_call)
│   │   ├── _codex-issue-timeout.yml # Reusable Codex issue timeout (workflow_call)
│   │   ├── _codex-pr-normalize.yml # Reusable Codex PR normalize (workflow_call)
│   │   ├── _codex-pr-review.yml    # Reusable Codex PR review (workflow_call)
│   │   ├── _codex-triage.yml       # Reusable Codex triage (workflow_call)
│   │   ├── _commitlint.yml         # Reusable commit lint (workflow_call)
│   │   ├── _dependabot-auto-fix.yml # Reusable Dependabot auto-fix (workflow_call)
│   │   ├── _deploy-cf-worker.yml   # Reusable CF Worker deploy (workflow_call)
│   │   ├── _elk-ingest.yml         # Reusable ELK ingest (workflow_call)
│   │   ├── _issue-label.yml       # Reusable issue auto-label (workflow_call)
│   │   ├── _issue-lifecycle.yml    # Reusable issue lifecycle (workflow_call)
│   │   ├── _labeler.yml            # Reusable PR labeler (workflow_call)
│   │   ├── _lock-threads.yml       # Reusable lock threads (workflow_call)
│   │   ├── _pr-size.yml            # Reusable PR size labeler (workflow_call)
│   │   ├── _release-drafter.yml    # Reusable release drafter (workflow_call)
│   │   ├── _stale.yml              # Reusable stale cleanup (workflow_call)
│   │   ├── _welcome.yml            # Reusable first interaction (workflow_call)
│   │   ├── auto-approve-runs.yml   # Thin caller → _auto-approve-runs.yml (synced)
│   │   ├── auto-merge.yml          # Thin caller → _auto-merge.yml (synced)
│   │   ├── branch-cleanup.yml      # Thin caller → _branch-cleanup.yml (synced)
│   │   ├── ci-notify-failure.yml   # Thin caller → _ci-notify-failure.yml (synced)
│   │   ├── codex-auto-issue.yml    # Thin caller → _codex-auto-issue.yml (synced)
│   │   ├── codex-issue-timeout.yml # Thin caller → _codex-issue-timeout.yml (synced)
│   │   ├── codex-pr-normalize.yml  # Thin caller → _codex-pr-normalize.yml (synced)
│   │   ├── codex-pr-review.yml     # Thin caller → _codex-pr-review.yml (synced)
│   │   ├── codex-triage.yml        # Thin caller → _codex-triage.yml (synced)
│   │   ├── commitlint.yml          # Thin caller → _commitlint.yml (synced)
│   │   ├── dependabot-auto-fix.yml # Thin caller → _dependabot-auto-fix.yml (synced)
│   │   ├── issue-label.yml        # Thin caller → _issue-label.yml (synced)
│   │   ├── issue-lifecycle.yml     # Thin caller → _issue-lifecycle.yml (synced)
│   │   ├── labeler.yml             # Thin caller → _labeler.yml (synced)
│   │   ├── lock-threads.yml        # Thin caller → _lock-threads.yml (synced)
│   │   ├── pr-size.yml             # Thin caller → _pr-size.yml (synced)
│   │   ├── release-drafter.yml     # Thin caller → _release-drafter.yml (synced)
│   │   ├── stale.yml               # Thin caller → _stale.yml (synced)
│   │   ├── sync-files.yml          # File sync orchestrator (push to master + workflow_dispatch)
│   │   ├── sync-labels.yml         # Label sync orchestrator (workflow_dispatch)
│   │   └── welcome.yml             # Thin caller → _welcome.yml (synced)
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml          # Structured bug report form
│   │   ├── feature_request.yml     # Structured feature request form
│   │   ├── issue-form.yml          # General issue form (Korean)
│   │   └── config.yml              # Blank issues disabled, security redirect
│   ├── CODEOWNERS                  # * @qws941, /.github/ @qws941
│   ├── FUNDING.yml                 # github: qws941
│   ├── PULL_REQUEST_TEMPLATE.md    # What/Why/Kind/Changes/Testing/Checklist
│   ├── dependabot.yml              # Weekly github-actions updates
│   ├── labeler.yml                 # PR auto-label path rules (8 labels)
│   ├── release-drafter.yml         # Release drafter category config
│   └── sync.yml                    # Sync target config: 1 group, 14 repos
├── scripts/
│   ├── labels.yml                  # 26 standard labels (type:*/priority:*/status:*/size:*)
│   ├── onboard-repo.go             # Automated repo onboarding (sync, labels, webhooks, dependabot)
│   └── sync-labels.go              # Go label sync (parallel, delete-stale, summary table)
├── profile/
│   └── README.md                   # GitHub profile page content
├── .editorconfig                   # 2-space JS/TS/YAML, 4-space Python, tabs Makefile
├── CODE_OF_CONDUCT.md              # Contributor Covenant v2.1
├── CONTRIBUTING.md                 # Trunk-based dev, conventional commits, review policy
├── LICENSE                         # MIT
├── OWNERS                          # Google3-style: approvers + reviewers = qws941
└── SECURITY.md                     # Security policy: security@jclee.me, 48h SLA
```

## WHERE TO LOOK

| Task                          | Location                           | Notes                                                      |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Add/modify synced files       | `.github/sync.yml`                 | Defines file mappings and target repos                     |
| Add a new sync target repo    | `.github/sync.yml` → `repos:`      | Add to the repos: list in the single sync group     |
| Reusable CI workflows         | `.github/workflows/_*.yml`         | `_` prefix = `workflow_call` only, not synced              |
| Synced workflows              | `.github/workflows/{name}.yml`     | No `_` prefix = synced to downstream repos                 |
| Issue templates               | `.github/ISSUE_TEMPLATE/`          | Bug report, feature request, and general issue forms       |
| PR template                   | `.github/PULL_REQUEST_TEMPLATE.md` | What/Why/Kind/Changes/Testing/Checklist format             |
| Standard labels               | `scripts/labels.yml`               | 26 labels: `type:*`, `priority:*`, `status:*`, `size/*`    |
| Label sync to repos           | `scripts/sync-labels.go`           | Go CLI, parallel sync with `--delete-stale`, `--dry-run`   |
| Contribution rules            | `CONTRIBUTING.md`                  | Trunk-based dev, conventional commits, review SLA          |
| Security reports              | `SECURITY.md`                      | Email security@jclee.me, 48h response SLA                  |
| GitHub profile page           | `profile/README.md`                | Rendered at github.com/qws941                              |
| Editor formatting             | `.editorconfig`                    | Synced to all repos                                        |
| Codex automation              | `.github/workflows/codex-*.yml`    | Triage, auto-issue, PR review, PR normalize, issue timeout |
| Community automation        | `.github/workflows/{welcome,lock-threads}.yml` | First-time greeting + thread locking             |
| Dependabot auto-fix         | `.github/workflows/dependabot-auto-fix.yml`             | Weekly Dependabot alert → Codex issue pipeline   |
| PR quality gates            | `.github/workflows/{commitlint,pr-size}.yml`    | Conventional commit enforcement + size labeling  |
| Release management          | `.github/workflows/release-drafter.yml`         | Auto-draft release notes from merged PRs         |
| Release drafter config      | `.github/release-drafter.yml`                   | PR category → changelog section mapping          |
| Auto-merge workflow         | `.github/workflows/auto-merge.yml`              | Approve + queue squash merge pending CI pass |
| Auto-approve runs         | `.github/workflows/auto-approve-runs.yml`       | Rerun action_required runs (workflow_dispatch)   |
| Issue lifecycle           | `.github/workflows/issue-lifecycle.yml`         | Link PRs to issues, auto-close on merge          |
| Branch cleanup            | `.github/workflows/branch-cleanup.yml`          | Delete merged PR branches                         |
| CI failure notification   | `.github/workflows/ci-notify-failure.yml`       | Notify + assign Codex bot on CI failure            |
| Issue auto-labeling     | `.github/workflows/issue-label.yml`             | Type + priority labels from issue form dropdowns |

## CONVENTIONS

### SSoT Sync Model

This repo is the canonical source. Changes propagate automatically:

- **Sync trigger**: Push to `master` on paths: `OWNERS`, `AGENTS.md`, `LICENSE`, `.editorconfig`, `.github/sync.yml`, `.github/FUNDING.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labeler.yml`, `.github/release-drafter.yml`, `.github/ISSUE_TEMPLATE/*`, `.github/workflows/{auto-approve-runs,auto-merge,branch-cleanup,ci-notify-failure,codex-auto-issue,codex-issue-timeout,codex-pr-normalize,codex-pr-review,codex-triage,commitlint,dependabot-auto-fix,issue-label,issue-lifecycle,labeler,lock-threads,pr-size,release-drafter,stale,welcome}.yml`; manual `workflow_dispatch` available via `sync-files.yml`
- **Sync engine**: `BetaHuhn/repo-file-sync-action` via `.github/workflows/sync-files.yml`
- **Sync PRs**: Prefixed `chore: `, labeled `sync`, assigned to `qws941`

**Synced files** (must remain generic, no repo-specific content):

| File                                         | Targets      |
| -------------------------------------------- | ------------ |
| `OWNERS`                                     | All 14 repos |
| `LICENSE`                                     | All 14 repos |
| `.editorconfig`                               | All 14 repos |
| `AGENTS.md`                                   | All 14 repos |
| `.github/FUNDING.yml`                         | All 14 repos |
| `.github/PULL_REQUEST_TEMPLATE.md`            | All 14 repos |
| `.github/labeler.yml`                         | All 14 repos |
| `.github/release-drafter.yml`                 | All 14 repos |
| `.github/ISSUE_TEMPLATE/bug_report.yml`       | All 14 repos |
| `.github/ISSUE_TEMPLATE/config.yml`           | All 14 repos |
| `.github/ISSUE_TEMPLATE/feature_request.yml`  | All 14 repos |
| `.github/ISSUE_TEMPLATE/issue-form.yml`       | All 14 repos |
| `.github/workflows/auto-approve-runs.yml`     | All 14 repos |
| `.github/workflows/auto-merge.yml`            | All 14 repos |
| `.github/workflows/branch-cleanup.yml`        | All 14 repos |
| `.github/workflows/ci-notify-failure.yml`     | All 14 repos |
| `.github/workflows/codex-auto-issue.yml`      | All 14 repos |
| `.github/workflows/codex-issue-timeout.yml`   | All 14 repos |
| `.github/workflows/codex-pr-normalize.yml`    | All 14 repos |
| `.github/workflows/codex-pr-review.yml`       | All 14 repos |
| `.github/workflows/codex-triage.yml`          | All 14 repos |
| `.github/workflows/commitlint.yml`            | All 14 repos |
| `.github/workflows/dependabot-auto-fix.yml`   | All 14 repos |
| `.github/workflows/issue-label.yml`           | All 14 repos |
| `.github/workflows/issue-lifecycle.yml`       | All 14 repos |
| `.github/workflows/labeler.yml`               | All 14 repos |
| `.github/workflows/lock-threads.yml`          | All 14 repos |
| `.github/workflows/pr-size.yml`               | All 14 repos |
| `.github/workflows/release-drafter.yml`       | All 14 repos |
| `.github/workflows/stale.yml`                 | All 14 repos |
| `.github/workflows/welcome.yml`               | All 14 repos |

**NOT synced** (repo-specific by design):

- `.github/dependabot.yml` — different ecosystems per repo
- `.github/CODEOWNERS` — terraform has custom path rules

### Sync Groups and Target Repos

Single consolidated sync group covering 14 repositories. All governance files, workflow callers, and community health files are synced together.

**Target repos**: `aimo3-prize`, `blacklist`, `hycu`, `hycu_fsds`, `opencode`, `propose`, `qws941`, `resume`, `safetywallet`, `slack-opencode-bridge`, `splunk`, `terraform`, `tmux`, `youtube`

### Reusable Workflows

23 `workflow_call` workflows prefixed with `_` (not synced, called cross-repo via `uses:`):

**CI/CD Templates** (parameterized, used by repo-specific CI workflows):

| Workflow                | Purpose                      | Key Inputs                                           |
| ----------------------- | ---------------------------- | ---------------------------------------------------- |
| `_ci-node.yml`          | Node.js CI (lint/type/test)  | `node-version`, `turbo`, `run-lint`, `run-test`      |
| `_ci-python.yml`        | Python CI (ruff/mypy/pytest) | `python-version`, `run-mypy`, `run-test`, `src-dirs` |
| `_deploy-cf-worker.yml` | Cloudflare Worker deploy     | `working-directory`, `environment`, `deploy-command` |
| `_elk-ingest.yml`       | ELK ingest (CI/CD events)   | `conclusion`, `index-prefix`, `service`, `extra-fields` |

**Community & Automation Templates** (zero-config, called by synced thin callers):

| Workflow                    | Purpose                              | Secrets Required     |
| --------------------------- | ------------------------------------ | -------------------- |
| `_auto-merge.yml`           | Approve + queue squash merge         | `GH_PAT`             |
| `_auto-approve-runs.yml`    | Rerun action_required + stale failures | `GH_PAT`           |
| `_branch-cleanup.yml`       | Delete merged PR branches            | —                    |
| `_ci-notify-failure.yml`    | Notify on CI failure, assign Codex   | —                    |
| `_codex-auto-issue.yml`     | Post @codex on `codex`-labeled issues | —                   |
| `_codex-issue-timeout.yml`  | Close stale Codex-assigned issues    | —                    |
| `_codex-pr-normalize.yml`   | Normalize PR title/labels, undraft   | —                    |
| `_codex-pr-review.yml`      | Auto-review PRs via @codex           | —                    |
| `_codex-triage.yml`         | Auto-triage issues with keywords     | —                    |
| `_commitlint.yml`           | Conventional commit PR title check   | —                    |
| `_dependabot-auto-fix.yml`  | Dependabot alert → codex-labeled issue | —                  |
| `_issue-lifecycle.yml`      | Link PRs to issues, manage state     | —                    |
| `_issue-label.yml`        | Auto-label issues from form dropdowns | —                    |
| `_labeler.yml`              | PR auto-labeling by file paths       | —                    |
| `_lock-threads.yml`         | Lock closed issues/PRs after 30d     | —                    |
| `_pr-size.yml`              | PR diff size labeling xs-xl          | —                    |
| `_release-drafter.yml`      | Auto-draft release notes on merge    | —                    |
| `_stale.yml`                | Close stale issues/PRs (14d+5d)      | —                    |
| `_welcome.yml`              | Greet first-time contributors        | —                    |

**Architecture**: Synced workflow files (e.g., `stale.yml`) are thin callers (~15 lines) that reference the template via `uses: qws941/.github/.github/workflows/_stale.yml@master`. Templates contain all logic; callers only define triggers and permissions.

Usage pattern in consuming repos:

```yaml
jobs:
  ci:
    uses: qws941/.github/.github/workflows/_ci-node.yml@master
    with:
      node-version: "20"
    secrets: inherit
```

### Codex Integration

`chatgpt-codex-connector` GitHub App is installed with access to all repositories.

**Triggers:**

| Trigger | Action | Context |
| ------- | ------ | ------- |
| `@codex review` in PR comment | Code review using AGENTS.md conventions | PR diff + repo context |
| `@codex <task>` in PR comment | Execute arbitrary task (fix, refactor, test) | PR context |
| `@codex` in issue comment | Investigate issue and respond (requires Codex Environment) | Issue context |
| Automatic review (if enabled) | Review every new PR without @mention | Per-repo Codex setting |

**Automated workflows:**

| Workflow | Trigger | Behavior |
| --- | --- | --- |
| `codex-triage.yml` | `issues: opened` | Filters title for failure/deploy/build/docker keywords → posts `@codex` investigate comment |
| `codex-auto-issue.yml` | `issues: labeled` with `codex` label | Posts `@codex` comment with issue title and body context |
| `dependabot-auto-fix.yml` | `schedule` (Monday 03:00 UTC) + `workflow_dispatch` | Fetches open Dependabot alerts, deduplicates, creates codex-labeled issues → triggers codex-auto-issue pipeline |
| `codex-pr-normalize.yml` | `pull_request_target: opened, edited` | Normalizes Codex PR title to conventional commit, adds labels, undrafts |
| `codex-pr-review.yml` | `pull_request_target: opened, synchronize` | Auto-reviews PRs via @codex |
| `codex-issue-timeout.yml` | `schedule` + `workflow_dispatch` | Closes stale Codex-assigned issues after timeout |
| `issue-lifecycle.yml` | `pull_request` + `issues` events | Links PRs to issues via keywords, manages issue state on close |
| `ci-notify-failure.yml` | `workflow_run: completed` | Notifies on CI failures, assigns Codex bot for auto-fix |
| `branch-cleanup.yml` | `pull_request: closed` (merged) | Deletes merged PR branches |

**Configuration:**

- Codex reads `AGENTS.md` at repo root automatically — no additional config needed.
- `## Review guidelines` section (below) customizes review behavior.
- Enable automatic reviews per-repo at `chatgpt.com/codex/settings/code-review`.
- AGENTS.md is synced to all 14 repos via `sync.yml` Group 1.
- Codex Environment must be created per-repo at `chatgpt.com/codex/settings/environments` (web UI only, no API).
- **Known limitation**: Rapid-fire `@codex` mentions (multiple within seconds) may hit rate limits and receive no response. Space out mentions or retry individually.

**Native GitHub Coding Agents (separate from connector app):**

GitHub offers native third-party coding agents (OpenAI Codex, Anthropic Claude) via Copilot. These are **separate** from the `chatgpt-codex-connector` GitHub App.

| Feature | `chatgpt-codex-connector` App | Native Copilot Coding Agents |
| --- | --- | --- |
| PR code review | ✅ Works via `@codex review` | ✅ Assignable to PRs |
| Issue investigation | ✅ Works via `@codex` mention (requires Environment) | ✅ Assignable to issues (creates PRs) |
| Requirement | App installation only | Copilot Pro+ or Enterprise plan |
| Cost | Free | GitHub Actions minutes + Copilot premium requests |
| Enable | App installed globally | Copilot policy settings (individual or org) |

The `codex-triage.yml` and `codex-auto-issue.yml` workflows post `@codex` comments on issues. The connector app responds when a Codex Environment is configured for the repo. Rapid-fire mentions across multiple issues may hit rate limits — the bot silently drops responses in that case.

### GitHub Actions

- SHA-pin all actions with `# vN` version comment suffix
- Never use mutable tags (`@v4`) — always full commit SHA

### Commit and PR Conventions

- **Conventional Commits**: `type(scope): imperative summary` (≤72 chars, lowercase)
- **Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, `perf`, `build`, `revert`
- **Branch naming**: `type/description` (e.g., `feat/add-metrics-export`)
- **PR size**: ~200 LOC max
- **Merge policy**: Squash merge only. Merge commits disabled.
- **Review SLA**: 24 hours. `nit:` prefix for non-blocking feedback.
- **PR body format**: What / Why / Kind / Changes / Testing / Breaking / Checklist / Related

### Labels

26 standard labels across all repos, defined in `scripts/labels.yml`:

- `type:bug`, `type:feature`, `type:docs`, `type:refactor`, `type:ci`, `type:chore`, `type:security`, `type:test`, `type:infra`
- `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- `status:blocked`, `status:in-progress`, `status:needs-review`, `status:wontfix`, `status:duplicate`
- `size/xs`, `size/s`, `size/m`, `size/l`, `size/xl`
- `sync`, `auto-merge`, `codex`

### PR Auto-Labeling

Path-based labels defined in `.github/labeler.yml`:

- `documentation` — `*.md`, `docs/`
- `ci` — `.github/`, `*.yml`
- `terraform` — `*.tf`
- `docker` — `Dockerfile*`
- `python` — `*.py`
- `typescript` — `*.ts`, `*.tsx`
- `shell` — `*.sh`
- `config` — `*.json`, `*.toml`, `.editorconfig`

### Governance

- **OWNERS** (Google3/K8s-style): Defines approvers and reviewers. Hierarchical. Synced.
- **CODEOWNERS** (GitHub-native): Enforces required reviews. NOT synced (repo-specific).
- Both set to `qws941` at root level.


## Review guidelines

- Enforce conventional commit format in PR titles: `type(scope): summary`.
- All GitHub Actions must be SHA-pinned with `# vN` version comment — flag any mutable tag (`@v4`).
- Never approve PRs that add `as any`, `@ts-ignore`, `@ts-expect-error`, or empty `catch {}` blocks.
- Never approve PRs that hardcode IPs, secrets, or credentials.
- Synced files (OWNERS, LICENSE, .editorconfig, AGENTS.md, labeler.yml, workflow files) must remain generic — flag any repo-specific content.
- PR size should be ~200 LOC max. Flag PRs exceeding 400 LOC.
- Squash merge only — flag merge commits or rebase merges.
- Trunk-based development — flag long-lived feature branches.
- Review SLA context: non-blocking feedback uses `nit:` prefix.
- For Terraform changes: verify no hardcoded IPs, use variables/env vars.
- For workflow changes: verify SHA-pinned actions, correct `workflow_call` inputs, proper permissions scoping.

## ANTI-PATTERNS (THIS PROJECT)

- Never put repo-specific content in synced files — they propagate to all repos.
- Never sync `dependabot.yml` or `CODEOWNERS` — they vary per repo.
- Never use mutable action tags (`@v4`) — always SHA-pin with version comment.
- Never hardcode IPs or secrets — use Terraform variables or env vars.
- Never suppress type errors (`as any`, `@ts-ignore`) or delete failing tests.
- Never use merge commits — squash merge only.
- Never create long-lived feature branches — trunk-based development only.

## UNIQUE STYLES

- Config-only repo: no application code, no build system, no tests.
- Dual governance: OWNERS (intent/policy) + CODEOWNERS (GitHub enforcement) coexist.
- Reusable workflow naming: `_` prefix distinguishes callable workflows from synced workflows.
- Sync groups: Single consolidated group syncs all governance + thin caller workflows to all 14 repos.
- GitHub auto-inherits: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` apply to all repos without syncing.

## COMMANDS

```bash
# Sync labels to all repos (requires gh CLI auth)
go run scripts/sync-labels.go

# Dry-run label sync
go run scripts/sync-labels.go --dry-run

# Sync to specific repo only
go run scripts/sync-labels.go --repo qws941/terraform

# Delete stale labels not in labels.yml
go run scripts/sync-labels.go --delete-stale

# Onboard a new repo (sync + labels + webhooks + dependabot)
go run scripts/onboard-repo.go --repo qws941/new-repo

# Dry-run onboarding
go run scripts/onboard-repo.go --repo qws941/new-repo --dry-run

# File sync happens automatically on push to master
# Manual trigger available via workflow_dispatch on sync-files.yml
```
## NOTES

- This is a personal account `.github` repo, not a GitHub Organization `.github` repo. GitHub still honors community health file inheritance for the account's repos.
- `profile/README.md` renders as the GitHub profile page at `github.com/qws941`.
- Reusable workflows are consumed via `uses: qws941/.github/.github/workflows/_ci-node.yml@master` — note the double `.github` path segment.
- The `terraform` repo has custom CODEOWNERS (path-specific rules), which is why that file is not synced. Auto-merge is now standardized across all repos including terraform.
- Secrets required: `GH_PAT` for sync-files workflow, `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CF Worker deploy workflow, `ELASTICSEARCH_URL` + optional `ELASTICSEARCH_API_KEY` for ELK ingest workflow.
- `chatgpt-codex-connector` GitHub App installed with all-repo access. `@codex review` works in any repo PR. Issue-context `@codex` mentions require a Codex Environment configured per-repo at `chatgpt.com/codex/settings/environments`. Rapid-fire mentions may hit rate limits.
- AGENTS.md is synced to all downstream repos — Codex reads it automatically for review context in every repo.
- GH_PAT is used in `auto-merge.yml` for PR approval and auto-merge queueing (waits for CI to pass before merging).
- `auto-approve-runs.yml` is triggered via `workflow_dispatch` only. Detects action_required runs from Codex/bot PRs and reruns them via API. No cron or external polling needed.
