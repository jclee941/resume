# RELEASE DOMAIN KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Release automation: deterministic version decisions, immutable source bundles, idempotent GitHub release publication, and separation from Cloudflare Workers production deploy. Two subpackages orchestrate prepare → verify → publish via `.github/workflows/release.yml`.

## STRUCTURE

```text
./
├── next-version/          # Decide next SemVer tag and release policy
│   ├── main.go            # CLI entry, flag parsing
│   ├── policy.go          # Release decision logic (publish/no-release/superseded)
│   ├── repository.go      # Git tag/commit inspection
│   ├── policy_test.go
│   └── main_test.go
├── publish/               # Publish verified draft to GitHub Releases
│   ├── main.go            # CLI entry, flag parsing
│   ├── transaction.go     # Idempotent publish state machine
│   ├── github_client.go   # GitHub API client
│   ├── input.go           # Manifest/notes loading
│   ├── types.go           # Release, PublishRequest, Outcome types
│   ├── transaction_test.go
│   ├── fake_client_test.go
│   └── github_client_test.go
└── AGENTS.md              # This file
```

## WHERE TO LOOK

| Task                  | Location                        | Notes                                                     |
| --------------------- | ------------------------------- | --------------------------------------------------------- |
| Release workflow      | `.github/workflows/release.yml` | prepare → verify → publish orchestrator                   |
| Version decision      | `next-version/policy.go`        | SemVer bump logic, release policy                         |
| Git inspection        | `next-version/repository.go`    | Tag listing, commit range, remote tip                     |
| Publish state machine | `publish/transaction.go`        | Idempotent draft → publish flow                           |
| GitHub API            | `publish/github_client.go`      | Release CRUD, asset upload, tag operations                |
| Type contracts        | `publish/types.go`              | Release, PublishRequest, Outcome, ReleaseClient interface |
| Manifest format       | `publish/input.go`              | release-manifest.json schema and loading                  |

## CONVENTIONS

- **Immutable inputs**: `TARGET_SHA` (40-hex) pinned at prepare stage; all downstream steps use same commit.
- **Deterministic source**: `git archive` run twice, byte-for-byte identical (gzip -n -9, no timestamps).
- **Idempotent publish**: Publish transaction checks for existing release before any write; returns `OutcomeIdempotent` if already published.
- **Ownership markers**: Draft releases tagged with `run-marker` (e.g., `release-run:12345`) to prevent cross-run interference.
- **Separation of concerns**: Release workflow creates GitHub release metadata only; Cloudflare Workers Builds owns production deploy authority.
- **Decision artifact**: `release-decision.json` created by `next-version`, uploaded before verify stage, downloaded by publish stage.
- **Manifest contract**: `release-manifest.json` contains target SHA, tag, asset name, SHA-256 digest, and size; `publish` verifies it against the source asset.

## ANTI-PATTERNS

- Never edit generated artifacts (source bundle, manifest, release notes) by hand.
- Never bypass the prepare stage decision; always pin `TARGET_SHA` to a specific commit.
- Never treat GitHub release publication as production deployment; Cloudflare Workers Builds is the deploy authority.
- Never reuse `run-marker` across different release runs; each run gets a unique GitHub Actions `GITHUB_RUN_ID`.
- Never publish without verify stage; the workflow enforces `needs: [prepare, verify]` before publish.
- Never hardcode version numbers; derive from git tags and commit history via `next-version`.

## NOTES

- `next-version` exits with decision in `release-decision.json`; workflow validates decision shape before proceeding.
- `publish` is a pure transaction: checks for idempotency, creates draft, uploads asset, publishes, or cleans up on failure.
- Release notes are generated from commit log range (`git log --format='- %s (%h)'`) and included in GitHub release body.
- Source bundle is deterministic and reproducible; CI verifies by building twice and comparing byte-for-byte.

---

Parent: [../AGENTS.md](../AGENTS.md)
