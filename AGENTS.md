# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-26
**Commit:** 591edc3
**Branch:** master

## OVERVIEW

GitHub community health files **Single Source of Truth (SSoT)** for all `qws941` repositories. Contains governance files, reusable CI/CD workflows, issue templates, label definitions, and repository rulesets that auto-sync to downstream repos. No application code — config and policy only.

## STRUCTURE

```text
./
├── .github/
│   ├── workflows/
│   │   ├── _ci-node.yml            # Reusable Node.js CI (workflow_call)
│   │   ├── _ci-python.yml          # Reusable Python CI (workflow_call)
│   │   ├── _deploy-cf-worker.yml   # Reusable CF Worker deploy (workflow_call)
│   │   ├── _elk-ingest.yml         # Reusable ELK ingest (workflow_call)
│   │   ├── auto-merge.yml          # Dependabot + owner + Codex auto-merge via admin bypass (synced)
│   │   ├── codex-auto-issue.yml    # Codex auto-issue on label (synced)
│   │   ├── codex-triage.yml        # Codex auto-triage on issue open (synced)
│   │   ├── commitlint.yml          # Conventional commit PR title check (synced)
│   │   ├── labeler.yml             # PR auto-labeling workflow (synced)
│   │   ├── lock-threads.yml        # Lock closed issues/PRs after 30d (synced)
│   │   ├── pr-size.yml             # PR diff size labeling xs-xl (synced)
│   │   ├── release-drafter.yml     # Auto-draft release notes on merge (synced)
│   │   ├── stale.yml               # Stale issue cleanup 14d+5d (synced)
│   │   ├── welcome.yml             # First-time contributor greeting (synced)
│   │   └── sync-files.yml          # File sync orchestrator (push to master)
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml          # Structured bug report form
│   │   ├── feature_request.yml     # Structured feature request form
│   │   └── config.yml              # Blank issues disabled, security redirect
│   ├── CODEOWNERS                  # * @qws941, /.github/ @qws941
│   ├── FUNDING.yml                 # github: qws941
│   ├── PULL_REQUEST_TEMPLATE.md    # What/Why/Kind/Changes/Testing/Checklist
│   ├── dependabot.yml              # Weekly github-actions updates
│   ├── labeler.yml                 # PR auto-label path rules (8 labels)
│   ├── release-drafter.yml         # Release drafter category config
│   └── sync.yml                    # Sync target config: 3 groups, 12 repos
├── scripts/
│   ├── labels.yml                  # 26 standard labels (type:*/priority:*/status:*/size:*)
│   ├── sync-labels.sh              # gh CLI label sync script
│   └── sync-rulesets.sh            # gh CLI ruleset + repo settings sync script
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
| Add a new sync target repo    | `.github/sync.yml` → `repos:`      | Add to Group 1 + Group 3 always; Group 2 unless custom     |
| Reusable CI workflows         | `.github/workflows/_*.yml`         | `_` prefix = `workflow_call` only, not synced              |
| Synced workflows              | `.github/workflows/{name}.yml`     | No `_` prefix = synced to downstream repos                 |
| Issue templates               | `.github/ISSUE_TEMPLATE/`          | Bug report + feature request forms                         |
| PR template                   | `.github/PULL_REQUEST_TEMPLATE.md` | What/Why/Kind/Changes/Testing/Checklist format             |
| Standard labels               | `scripts/labels.yml`               | 26 labels: `type:*`, `priority:*`, `status:*`, `size/*`    |
| Label sync to repos           | `scripts/sync-labels.sh`           | Uses `gh` CLI + python3/pyyaml, run manually               |
| Contribution rules            | `CONTRIBUTING.md`                  | Trunk-based dev, conventional commits, review SLA          |
| Security reports              | `SECURITY.md`                      | Email security@jclee.me, 48h response SLA                  |
| GitHub profile page           | `profile/README.md`                | Rendered at github.com/qws941                              |
| Editor formatting             | `.editorconfig`                    | Synced to all repos                                        |
| Codex automation              | `.github/workflows/codex-*.yml`    | Triage on issue open + auto-issue on label                 |
| Community automation        | `.github/workflows/{welcome,lock-threads}.yml` | First-time greeting + thread locking             |
| PR quality gates            | `.github/workflows/{commitlint,pr-size}.yml`    | Conventional commit enforcement + size labeling  |
| Release management          | `.github/workflows/release-drafter.yml`         | Auto-draft release notes from merged PRs         |
| Release drafter config      | `.github/release-drafter.yml`                   | PR category → changelog section mapping          |
| Ruleset sync to repos       | `scripts/sync-rulesets.sh`                      | 3 rulesets + repo settings to all non-archived repos |
| Auto-merge workflow         | `.github/workflows/auto-merge.yml`              | GH_PAT admin bypass merge, no approval step  |

## CONVENTIONS

### SSoT Sync Model

This repo is the canonical source. Changes propagate automatically:

- **Sync trigger**: Push to `master` on paths: `OWNERS`, `AGENTS.md`, `LICENSE`, `.editorconfig`, `.github/sync.yml`, `.github/labeler.yml`, `.github/release-drafter.yml`, `.github/FUNDING.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*`, `.github/workflows/{stale,labeler,auto-merge,codex-triage,codex-auto-issue,welcome,lock-threads,commitlint,pr-size,release-drafter}.yml`
- **Sync engine**: `BetaHuhn/repo-file-sync-action` via `.github/workflows/sync-files.yml`
- **Sync PRs**: Prefixed `chore: `, labeled `sync`, assigned to `qws941`

**Synced files** (must remain generic, no repo-specific content):

| File                                    | Targets                                 |
| --------------------------------------- | --------------------------------------- |
| `OWNERS`                                | All 12 repos                            |
| `LICENSE`                               | All 12 repos                            |
| `.editorconfig`                         | All 12 repos                            |
| `.github/labeler.yml`                   | All 12 repos                            |
| `.github/release-drafter.yml`           | All 12 repos                            |
| `.github/workflows/stale.yml`           | All 12 repos                            |
| `.github/workflows/labeler.yml`         | All 12 repos                            |
| `.github/workflows/codex-triage.yml`    | All 12 repos                            |
| `.github/workflows/codex-auto-issue.yml`| All 12 repos                            |
| `.github/workflows/welcome.yml`         | All 12 repos                            |
| `.github/workflows/lock-threads.yml`    | All 12 repos                            |
| `.github/workflows/commitlint.yml`      | All 12 repos                            |
| `.github/workflows/pr-size.yml`         | All 12 repos                            |
| `.github/workflows/release-drafter.yml` | All 12 repos                            |
| `AGENTS.md`                             | All 12 repos                            |
| `.github/FUNDING.yml`                   | All 12 repos                            |
| `.github/PULL_REQUEST_TEMPLATE.md`      | All 12 repos                            |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | All 12 repos                            |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | All 12 repos                       |
| `.github/ISSUE_TEMPLATE/config.yml`     | All 12 repos                            |
| `.github/workflows/auto-merge.yml`      | All 12 repos                            |

**NOT synced** (repo-specific by design):

- `.github/dependabot.yml` — different ecosystems per repo
- `.github/CODEOWNERS` — terraform has custom path rules

### Sync Groups and Target Repos

Three sync groups covering 12 repositories:

| Group | Content                              | Targets                                           |
| ----- | ------------------------------------ | ------------------------------------------------- |
| 1     | Governance + core workflows          | All 12 repos                                      |
| 2     | `auto-merge.yml`                     | All 12 repos                                      |
| 3     | `codex-auto-issue.yml`               | All 12 repos                                      |

**Target repos**: `aimo3-prize`, `blacklist`, `hycu_fsds`, `opencode`, `propose`, `qws941`, `resume`, `safetywallet`, `splunk`, `terraform`, `tmux`, `youtube`

### Reusable Workflows

Four `workflow_call` workflows prefixed with `_` (not synced, called via `uses:`):

| Workflow                | Purpose                      | Key Inputs                                           |
| ----------------------- | ---------------------------- | ---------------------------------------------------- |
| `_ci-node.yml`          | Node.js CI (lint/type/test)  | `node-version`, `turbo`, `run-lint`, `run-test`      |
| `_ci-python.yml`        | Python CI (ruff/mypy/pytest) | `python-version`, `run-mypy`, `run-test`, `src-dirs` |
| `_deploy-cf-worker.yml` | Cloudflare Worker deploy     | `working-directory`, `environment`, `deploy-command` |
| `_elk-ingest.yml`       | ELK ingest (CI/CD events)   | `conclusion`, `index-prefix`, `service`, `extra-fields` |

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

**Configuration:**

- Codex reads `AGENTS.md` at repo root automatically — no additional config needed.
- `## Review guidelines` section (below) customizes review behavior.
- Enable automatic reviews per-repo at `chatgpt.com/codex/settings/code-review`.
- AGENTS.md is synced to all 12 repos via `sync.yml` Group 1.
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

### Repository Rulesets

Three standard rulesets applied to all non-archived repos via `scripts/sync-rulesets.sh`:

| Ruleset | Target | Scope | Key Rules |
| --- | --- | --- | --- |
| `default-branch-rules` | Default branch | All repos | PR required (1 approval; 0 for config-only repos), dismiss stale reviews, require thread resolution, linear history, squash+rebase merge only, non-fast-forward, admin bypass (RepositoryRole 5) |
| `code-scanning` | All branches | All repos | CodeQL required — security alerts ≥ high, code alerts ≥ errors. May fail on private repos without GHAS. |
| `tag-protection` | `v*` tags | All repos | Prevents creation, update, deletion, non-fast-forward of version tags. Admin bypass only. |

**Repo settings** applied alongside rulesets:
- Auto-merge enabled, delete branch on merge
- Squash merge enabled (PR_TITLE + PR_BODY), merge commits disabled, rebase enabled

**Config-only repos** (`.github`, `qws941`): 0 required approvals (no CI, no code to review).

**Status check preservation**: The script preserves existing `required_status_checks` rules in `default-branch-rules` — it reads the current ruleset before updating and merges existing checks into the payload.

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
- Sync groups: Group 1 (governance + core workflows → all repos) vs Group 2 (auto-merge → all repos) vs Group 3 (codex-auto-issue → all repos).
- GitHub auto-inherits: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` apply to all repos without syncing.

## COMMANDS

```bash
# Sync labels to all repos (requires gh CLI auth + python3/pyyaml)
bash scripts/sync-labels.sh

# Dry-run label sync
bash scripts/sync-labels.sh --dry-run

# Sync to specific repo only
bash scripts/sync-labels.sh --repo qws941/terraform

# File sync happens automatically on push to master
# Manual trigger available via workflow_dispatch on sync-files.yml

# Sync rulesets + repo settings to all repos (requires gh CLI auth)
bash scripts/sync-rulesets.sh

# Dry-run ruleset sync
bash scripts/sync-rulesets.sh --dry-run

# Sync rulesets to specific repo only
bash scripts/sync-rulesets.sh --repo qws941/terraform
```

## NOTES

- This is a personal account `.github` repo, not a GitHub Organization `.github` repo. GitHub still honors community health file inheritance for the account's repos.
- `profile/README.md` renders as the GitHub profile page at `github.com/qws941`.
- Reusable workflows are consumed via `uses: qws941/.github/.github/workflows/_ci-node.yml@master` — note the double `.github` path segment.
- The `terraform` repo has custom CODEOWNERS (path-specific rules), which is why that file is not synced. Auto-merge is now standardized across all repos including terraform.
- Secrets required: `GH_PAT` for sync-files workflow, `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CF Worker deploy workflow, `ELASTICSEARCH_URL` + optional `ELASTICSEARCH_API_KEY` for ELK ingest workflow.
- `chatgpt-codex-connector` GitHub App installed with all-repo access. `@codex review` works in any repo PR. Issue-context `@codex` mentions do not trigger responses (known limitation).
- AGENTS.md is synced to all downstream repos — Codex reads it automatically for review context in every repo.
- GH_PAT is used in `auto-merge.yml` for admin bypass merge (repository rulesets allow RepositoryRole 5 to bypass branch protection).
