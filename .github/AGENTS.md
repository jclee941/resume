# GITHUB CONTROL PLANE KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Repository metadata, issue templates, CODEOWNERS, Dependabot configuration, and
one validation-only GitHub Actions workflow. Production deployment authority
remains Cloudflare Workers Builds.

## STRUCTURE

```text
.github/
├── ISSUE_TEMPLATE/            # issue forms
├── workflows/                 # minimal validation-only CI
├── CODEOWNERS                 # review ownership
├── PULL_REQUEST_TEMPLATE.md   # PR checklist
└── dependabot.yml             # npm, pip, Actions, and Docker update policy
```

## GITHUB ACTIONS

| Workflow | Purpose                                                                      | Deploy Authority |
| -------- | ---------------------------------------------------------------------------- | ---------------- |
| `ci.yml` | Audit, lint, format, typecheck, tests, architecture checks, Wrangler dry-run | None             |

## CONVENTIONS

- Production deployment remains Cloudflare Workers Builds owned. GitHub workflows
  must remain validation-only and must not become a shadow deploy authority.
- Prefer repository or environment secrets for credentials. Workflow files must
  contain only secret names, not values.
- Pin third-party actions to a release commit SHA with the version in a trailing
  comment; Dependabot updates both.

## ANTI-PATTERNS

- Never inline live tokens, webhook secrets, Cloudflare IDs, or service
  credentials in YAML.
- Never treat a GitHub workflow or local Wrangler commands as the production
  deploy source of truth.
- Never add workflow writes to generated artifacts unless ownership is documented
  in the owning subtree.

---

Parent: [../AGENTS.md](../AGENTS.md)
