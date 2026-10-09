# RELEASE DOMAIN KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Two Go CLIs calculate release decisions and publish verified assets through an ownership-checked transaction.

Boundary: retained immutable-release and publication-state-machine domain.

## WHERE TO LOOK

| Task                  | Location                      | Notes                                         |
| --------------------- | ----------------------------- | --------------------------------------------- |
| Decision CLI          | `next-version/main.go`        | Flags and JSON output                         |
| Version policy        | `next-version/policy.go`      | Publish, no-release, superseded decisions     |
| Repository inspection | `next-version/repository.go`  | Tags, commit range, remote tip                |
| Publish CLI           | `publish/main.go`             | Publication inputs                            |
| Asset validation      | `publish/input.go`            | Manifest and SHA-256 verification             |
| Transaction           | `publish/transaction.go`      | Snapshot, ownership, upload, publish, cleanup |
| API adapter           | `publish/github_client.go`    | Release and tag operations                    |
| Test doubles          | `publish/fake_client_test.go` | Transaction behavior without external writes  |

## CONVENTIONS

- Invoke packages with `go -C tools/scripts run ./release/next-version` or `./release/publish` plus required flags.
- `next-version` accepts `--repo`, `--target`, `--remote-tip`, `--trigger`, and `--output`.
- Decision output defaults to `release-decision.json`; no workflow automatically transfers it between stages.
- Targets are immutable 40-hex SHAs; release tags use `vMAJOR.MINOR.PATCH`.
- Manifest fields are `target_sha`, `tag`, `name`, `digest`, and `size`; the asset bytes must match.
- Draft ownership uses a `release-run:<digits>` marker and a run-created-tag flag.
- An already published matching release returns an idempotent outcome before writes.
- Remote-tip guards run before first write and publication; cleanup rechecks ownership and target.
- `go -C tools/scripts test ./release/publish ./release/next-version` covers both CLIs.

## ANTI-PATTERNS

- Do not describe an absent prepare/archive workflow as automated behavior of these CLIs.
- Do not reuse another run's marker or delete a tag this run did not create.
- Do not publish an asset when its digest, size, target, or tag disagrees with the manifest.
- Do not treat release metadata publication as proof of deployed Worker state.

---

Parent: [../AGENTS.md](../AGENTS.md)
