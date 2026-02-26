# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-26
**Commit:** c6ea65a
**Branch:** master

## OVERVIEW

GitHub community health files **Single Source of Truth (SSoT)** for all `qws941` repositories. Contains governance files, reusable CI/CD workflows, issue templates, and label definitions that auto-sync to 10+ downstream repos. No application code — config and policy only.

## STRUCTURE

```text
./
├── .github/
│   ├── workflows/
│   │   ├── _ci-node.yml            # Reusable Node.js CI (workflow_call)
│   │   ├── _ci-python.yml          # Reusable Python CI (workflow_call)
│   │   ├── _deploy-cf-worker.yml   # Reusable CF Worker deploy (workflow_call)
│   │   ├── auto-merge.yml          # Dependabot + owner auto-merge (synced)
│   │   ├── labeler.yml             # PR auto-labeling workflow (synced)
│   │   ├── stale.yml               # Stale issue cleanup 14d+5d (synced)
│   │   └── sync-files.yml          # File sync orchestrator (push to master)
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml          # Structured bug report form
│   │   ├── feature_request.yml     # Structured feature request form
│   │   └── config.yml              # Blank issues disabled, security redirect
│   ├── CODEOWNERS                  # * @qws941
│   ├── FUNDING.yml                 # github: qws941
│   ├── PULL_REQUEST_TEMPLATE.md    # What/Why/Kind/Changes/Testing/Checklist
│   ├── copilot-instructions.md     # SSoT context, 5 rules, key file table
│   ├── dependabot.yml              # Weekly github-actions updates
│   ├── labeler.yml                 # PR auto-label path rules
│   └── sync.yml                    # Sync target config: 2 groups, 10 repos
├── scripts/
│   ├── labels.yml                  # 17 standard labels (type:*/priority:*/status:*)
│   └── sync-labels.sh              # gh CLI label sync script
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
| Add a new sync target repo    | `.github/sync.yml` → `repos:`      | Add to both Group 1 and Group 2 (unless custom auto-merge) |
| Reusable CI workflows         | `.github/workflows/_*.yml`         | `_` prefix = `workflow_call` only, not synced              |
| Synced workflows              | `.github/workflows/{name}.yml`     | No `_` prefix = synced to downstream repos                 |
| Issue templates               | `.github/ISSUE_TEMPLATE/`          | Bug report + feature request forms                         |
| PR template                   | `.github/PULL_REQUEST_TEMPLATE.md` | What/Why/Kind/Changes/Testing/Checklist format             |
| Standard labels               | `scripts/labels.yml`               | 17 labels: `type:*`, `priority:*`, `status:*`              |
| Label sync to repos           | `scripts/sync-labels.sh`           | Uses `gh` CLI, run manually                                |
| Contribution rules            | `CONTRIBUTING.md`                  | Trunk-based dev, conventional commits, review SLA          |
| Security reports              | `SECURITY.md`                      | Email security@jclee.me, 48h response SLA                  |
| GitHub profile page           | `profile/README.md`                | Rendered at github.com/qws941                              |
| Editor formatting             | `.editorconfig`                    | Synced to all repos                                        |
| Copilot context for this repo | `.github/copilot-instructions.md`  | SSoT-specific rules, NOT synced                            |

## CONVENTIONS

### SSoT Sync Model

This repo is the canonical source. Changes propagate automatically:

- **Sync trigger**: Push to `master` on paths: `OWNERS`, `LICENSE`, `.editorconfig`, `AGENTS.md`, `.github/sync.yml`, `.github/workflows/codex-triage.yml`
- **Sync engine**: `BetaHuhn/repo-file-sync-action` via `.github/workflows/sync-files.yml`
- **Sync PRs**: Prefixed `chore: `, labeled `sync`, assigned to `qws941`

**Synced files** (must remain generic, no repo-specific content):

| File                               | Targets                                 |
| ---------------------------------- | --------------------------------------- |
| `OWNERS`                           | All 10 repos                            |
| `LICENSE`                          | All 10 repos                            |
| `.editorconfig`                    | All 10 repos                            |
| `.github/labeler.yml`              | All 10 repos                            |
| `.github/workflows/stale.yml`      | All 10 repos                            |
| `.github/workflows/labeler.yml`    | All 10 repos                            |
| `.github/workflows/auto-merge.yml` | 9 repos (excludes `terraform` — custom) |
| `AGENTS.md`                        | All 10 repos                            |
| `.github/workflows/codex-triage.yml`| All 10 repos                            |

**NOT synced** (repo-specific by design):

- `.github/dependabot.yml` — different ecosystems per repo
- `.github/CODEOWNERS` — terraform has custom path rules
- `.github/copilot-instructions.md` — repo-specific context

### Sync Target Repos

`blacklist`, `hycu_fsds`, `propose`, `qws941`, `resume`, `safetywallet`, `splunk`, `terraform`, `tmux`, `youtube`

### Reusable Workflows

Three `workflow_call` workflows prefixed with `_` (not synced, called via `uses:`):

| Workflow                | Purpose                      | Key Inputs                                           |
| ----------------------- | ---------------------------- | ---------------------------------------------------- |
| `_ci-node.yml`          | Node.js CI (lint/type/test)  | `node-version`, `turbo`, `run-lint`, `run-test`      |
| `_ci-python.yml`        | Python CI (ruff/mypy/pytest) | `python-version`, `run-mypy`, `run-test`, `src-dirs` |
| `_deploy-cf-worker.yml` | Cloudflare Worker deploy     | `working-directory`, `environment`, `deploy-command` |

Usage pattern in consuming repos:

```yaml
jobs:
  ci:
    uses: qws941/.github/.github/workflows/_ci-node.yml@master
    with:
      node-version: "20"
    secrets: inherit
```

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
- **PR body format**: What / Why / Testing sections

### Labels

17 standard labels across all repos, defined in `scripts/labels.yml`:

- `type:bug`, `type:feature`, `type:docs`, `type:refactor`, `type:ci`, `type:chore`, `type:security`, `type:test`, `type:infra`
- `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- `status:blocked`, `status:in-progress`, `status:needs-review`, `status:wontfix`, `status:duplicate`

### Governance

- **OWNERS** (Google3/K8s-style): Defines approvers and reviewers. Hierarchical. Synced.
- **CODEOWNERS** (GitHub-native): Enforces required reviews. NOT synced (repo-specific).
- Both set to `qws941` at root level.

### Codex Integration

`chatgpt-codex-connector` GitHub App is installed with access to all repositories.

**Triggers:**

| Trigger | Action | Context |
| ------- | ------ | ------- |
| `@codex review` in PR comment | Code review using AGENTS.md conventions | PR diff + repo context |
| `@codex <task>` in PR comment | Execute arbitrary task (fix, refactor, test) | PR context |
| `@codex` in issue comment | Investigate and propose fix, create PR | Issue context |
| Automatic review (if enabled) | Review every new PR without @mention | Per-repo Codex setting |

**Configuration:**

- Codex reads `AGENTS.md` at repo root automatically — no additional config needed.
- `## Review guidelines` section (below) customizes review behavior.
- Enable automatic reviews per-repo at `chatgpt.com/codex/settings/code-review`.
- AGENTS.md is synced to all 10 repos via `sync.yml` Group 1.

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
- Sync groups: Group 1 (governance + workflows → all repos) vs Group 2 (auto-merge → excludes terraform).
- GitHub auto-inherits: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` apply to all repos without syncing.

## COMMANDS

```bash
# Sync labels to all repos (requires gh CLI auth)
bash scripts/sync-labels.sh

# File sync happens automatically on push to master
# Manual trigger available via workflow_dispatch on sync-files.yml
```

## NOTES

- This is a personal account `.github` repo, not a GitHub Organization `.github` repo. GitHub still honors community health file inheritance for the account's repos.
- `profile/README.md` renders as the GitHub profile page at `github.com/qws941`.
- Reusable workflows are consumed via `uses: qws941/.github/.github/workflows/_ci-node.yml@master` — note the double `.github` path segment.
- The `terraform` repo has custom auto-merge (risk-based) and custom CODEOWNERS, which is why those files are excluded from sync Group 2 / not synced respectively.
- Secrets required: `GH_PAT` for sync-files workflow, `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CF Worker deploy workflow.
- `chatgpt-codex-connector` GitHub App installed with all-repo access. `@codex review` works in any repo PR. `@codex` works in issue comments to investigate and propose fixes.
- AGENTS.md is synced to all downstream repos — Codex reads it automatically for review context in every repo.
