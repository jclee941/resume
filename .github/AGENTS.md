# GITHUB CONTROL PLANE KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

GitHub Actions workflows, branch protection checks, PR automation, and CI/CD
orchestration. Production deployment authority remains Cloudflare Workers Builds.

## STRUCTURE

```text
.github/
├── workflows/        # CI, security, release, PR, docs, issue automation
├── actions/          # local composite actions
├── ISSUE_TEMPLATE/   # issue forms
├── scripts/          # workflow helper scripts
├── CODEOWNERS        # review ownership
└── dependabot.yml    # dependency update policy
```

## LIVE WORKFLOWS

| Workflow                           | Purpose                                    | Branch Protection |
| ---------------------------------- | ------------------------------------------ | ----------------- |
| `ci.yml`                           | Validation gate (lint, test, build)        | Yes               |
| `release.yml`                      | Release metadata and changelog             | No                |
| `post-deploy-verify.yml`           | Verification after Workers Builds deploy   | No                |
| `provision-queues.yml`             | Manual Cloudflare queue setup              | No                |
| `delete-standalone-job-worker.yml` | Manual cleanup of retired dashboard Worker | No                |
| `10_pr-review.yml`                 | PR review automation                       | No                |
| `11_security-pr-review.yml`        | Security PR review                         | No                |
| `12_dependabot-auto-merge.yml`     | Dependabot auto-merge                      | No                |
| `13_pr-auto-merge.yml`             | PR auto-merge                              | No                |
| `14_bot-auto-fix.yml`              | Bot auto-fix                               | No                |

## CONVENTIONS

- Preserve branch-protection-facing workflow and job names unless protection is
  updated in the same change.
- Production deployment remains Cloudflare Workers Builds owned. GitHub workflows
  may validate, release, or verify but must not become a shadow deploy authority.
- Prefer repository or environment secrets for credentials. Workflow files must
  contain only secret names, not values.
- Use local composite actions only for repeated setup behavior with stable
  inputs/outputs.

## ANTI-PATTERNS

- Never weaken or rename required checks just to make branch protection pass.
- Never inline live tokens, webhook secrets, Cloudflare IDs, or service
  credentials in YAML.
- Never treat `release.yml` or local Wrangler commands as the production deploy
  source of truth.
- Never add workflow writes to generated artifacts unless ownership is documented
  in the owning subtree.

---

Parent: [../AGENTS.md](../AGENTS.md)
