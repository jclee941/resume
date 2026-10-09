# 1PASSWORD SCRIPT KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Go wrappers resolve secret references for child processes and seed explicitly allowed environment fields.

Boundary: retained credential-resolution domain with CLI and SDK authentication modes.

## WHERE TO LOOK

| Task                  | Location                                               | Notes                                                |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| CLI-backed execution  | `run/main.go`                                          | Resolve references through `op read`                 |
| SDK-backed execution  | `native-run/`                                          | Arguments, client, env-file parsing, child execution |
| Allowed-field seeding | `seed-resume/main.go`                                  | Restricted field creation/update                     |
| Regression coverage   | `native-run/main_test.go`                              | Isolated SDK-wrapper tests                           |
| Operator procedure    | Repository `docs/guides/ONEPASSWORD_RESUME_SECRETS.md` | Canonical usage                                      |
| Reference examples    | Root `.env.1password.example`                          | Committed references only                            |

## CONVENTIONS

- Prefer `native-run` when a service-account token or desktop authorization is available; `run` is the CLI fallback.
- Root npm wrappers change directory into `tools/scripts`; env-file arguments are relative to that directory.
- `npm run op:run -- --env-file ../../.env.1password -- <command>` uses CLI resolution.
- `npm run op:native:run -- --env-file ../../.env.1password --auth service-account -- <command>` uses the SDK.
- `npm run op:seed:resume -- --env-file ../../.env` is a deliberate secret-store mutation, not a validation command.
- `go -C tools/scripts test ./onepassword/...` runs the wrapper test packages.
- Tests use temporary files and fake values; they must not call the real CLI or inspect local operator files.

## ANTI-PATTERNS

- Do not add seed keys without updating the allowlist, operator guide, and reference example together.
- Do not create plaintext env files as a side effect of routine verification.
- Do not place resolved values in process arguments, shell history, snapshots, or evidence.
- Do not broaden secret-scanner exceptions to accommodate local plaintext files.
- Do not assume CLI sign-in satisfies SDK service-account authentication.

---

Parent: [../AGENTS.md](../AGENTS.md)
