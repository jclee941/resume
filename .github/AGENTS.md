# GITHUB CONTROL PLANE KNOWLEDGE BASE

**Generated:** 2026-06-12
**Commit:** `011dd571`
**Branch:** `master`

## OVERVIEW

GitHub Actions, reusable workflows, repository metadata, issue/PR automation,
and branch-protection-facing checks.

## STRUCTURE

```text
.github/
├── workflows/        # CI, security, release, PR, docs, issue automation
├── actions/          # local composite actions used by workflows
├── ISSUE_TEMPLATE/   # issue forms
├── scripts/          # workflow helper scripts
├── CODEOWNERS        # review ownership
└── dependabot.yml    # dependency update policy
```

## WHERE TO LOOK

| Task                    | Location                              | Notes                           |
| ----------------------- | ------------------------------------- | ------------------------------- |
| Main CI gate            | `workflows/ci.yml`                    | validation-first pipeline       |
| Secret scan check       | `workflows/05_gitleaks.yml`           | branch-protection check name    |
| Gitleaks implementation | `workflows/45_reusable-gitleaks.yml`  | reusable workflow body          |
| PR checks               | `workflows/03_pr-checks.yml`          | branch/name/title caller        |
| PR check implementation | `workflows/44_reusable-pr-checks.yml` | reusable workflow body          |
| Production verification | `workflows/post-deploy-verify.yml`    | after Workers Builds deploy     |
| Release metadata        | `workflows/release.yml`               | not production deploy authority |
| Queue provisioning      | `workflows/provision-queues.yml`      | manual paid-resource setup      |
| Local actions           | `actions/`                            | composite action inputs/outputs |

## CONVENTIONS

- Preserve branch-protection-facing workflow and job names unless branch
  protection is updated in the same change.
- Keep caller workflows and reusable workflow bodies separate where that pattern
  already exists; branch protection depends on stable caller names.
- Production deployment remains Cloudflare Workers Builds owned. GitHub
  workflows may validate, release, or verify but must not become a shadow deploy
  authority.
- External reusable workflow calls to `jclee941/.github` are intentional control
  plane dependencies; pin or update them deliberately.
- Prefer repository or environment secrets for credentials. Workflow files must
  contain only secret names, not values.
- Use local composite actions only for repeated setup behavior with stable
  inputs/outputs.

## ANTI-PATTERNS

- Never weaken or rename required checks just to make branch protection pass.
- Never inline live tokens, webhook secrets, Cloudflare IDs, or service
  credentials in YAML.
- Never bypass `05_gitleaks.yml` / `45_reusable-gitleaks.yml` when changing
  secret scanning.
- Never treat `release.yml` or local Wrangler commands as the production deploy
  source of truth.
- Never add workflow writes to generated artifacts unless the generator and
  artifact ownership are documented in the owning subtree.

## NOTES

- Issue auto-labeling and stale-label removal are App-owned by jclee-bot;
  keep that ownership visible in PR descriptions when touched.
- `provision-queues.yml` can affect paid Cloudflare resources. Treat it as an
  operator action, not routine CI.

---

Parent: [../AGENTS.md](../AGENTS.md)
