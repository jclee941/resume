# GITHUB CONTROL PLANE KNOWLEDGE BASE

**Generated:** 2026-11-02
**Commit:** `f2142ccf`
**Branch:** `master`

## OVERVIEW

Repository review metadata, issue forms, dependency updates, and the validation workflow.

Boundary: score 1; retained distinct domain for repository automation and review policy.

## WHERE TO LOOK

| Task               | Location                   | Notes                                          |
| ------------------ | -------------------------- | ---------------------------------------------- |
| CI gates           | `workflows/ci.yml`         | Single `validate` job                          |
| Dependency updates | GitHub repository settings | External settings are not declared here        |
| Review routing     | `CODEOWNERS`               | Path ownership                                 |
| Change description | `PULL_REQUEST_TEMPLATE.md` | Contributor checklist                          |
| Issue intake       | `ISSUE_TEMPLATE/`          | Bug, feature, security forms and chooser       |

## CONVENTIONS

- CI runs on pull requests, pushes to master, and manual dispatch.
- Workflow permissions are `contents: read`; concurrency cancels older runs for the same ref.
- Pin external actions to commit SHAs with trailing version comments.
- CI uses Node 22, Python 3.12, and the Go version from `tools/scripts/go.mod`.
- The content guard precedes dependency installation; keep its bootstrap dependency-free.
- Secret scan (gitleaks `dir`, `.gitleaks.toml`) and workflow lint (actionlint) follow the guard, before Node setup. Both tools are downloaded at a pinned version and verified against a hardcoded SHA-256 from the release checksums file; update the version and hash together.
- Validation order: content guard, secret scan, workflow lint, dependency audit, build, lint/format, types, tests, architecture contracts, bundle dry-run.
- CI test commands are explicit; adding a root test script alone does not add a workflow step.
- PR titles follow Conventional Commits; documentation branches use `docs/*`, as declared in the PR template.
- `CODEOWNERS` routes the default and listed paths to the repository maintainer.
- Branch protection, required checks, bot availability, and automatic merge settings require external verification; the workflow does not establish them.
- Playwright E2E is on demand, not a step in the validation workflow.

## ANTI-PATTERNS

- Do not add write permissions merely to make validation helpers work.
- Do not put generated-output updates into the validation job.
- Do not replace immutable action pins with floating tags.
- Do not infer automated deployment or release publication from a successful CI run.

---

Parent: [../AGENTS.md](../AGENTS.md)
