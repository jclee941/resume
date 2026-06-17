# 1PASSWORD SCRIPT KNOWLEDGE BASE

**Generated:** 2026-06-12
**Commit:** `011dd571`
**Branch:** `master`

## OVERVIEW

Secret-safe 1Password CLI wrappers for resume automation env refs and local
session-file migration.

## STRUCTURE

```text
onepassword/
├── run/             # resolve op:// env refs and execute a child command
├── native-run/      # resolve op:// env refs through the Go SDK
├── seed-resume/     # seed allowed env keys into homelab/resume
└── session-files/   # seed/restore session JSON as 1Password documents
```

## WHERE TO LOOK

| Task                  | Location                                    | Notes                                        |
| --------------------- | ------------------------------------------- | -------------------------------------------- |
| Run with env refs     | `run/main.go`                               | resolves `.env.1password` with `op read`     |
| Run with native SDK   | `native-run/`                               | resolves `.env.1password` through the Go SDK |
| Seed env fields       | `seed-resume/main.go`                       | allowlisted env keys only                    |
| Seed/restore sessions | `session-files/`                            | Document items, stdin upload, 0600 restore   |
| Operator guide        | `docs/guides/ONEPASSWORD_RESUME_SECRETS.md` | canonical usage                              |
| Local env refs        | `.env.1password.example`                    | committed references only                    |

## CONVENTIONS

- Keep tracked files reference-only. `op://` references are allowed; real secret
  values, cookies, tokens, and session JSON are not.
- Prefer `native-run/` for SDK-backed command execution when
  `OP_SERVICE_ACCOUNT_TOKEN` or desktop app authorization is available; keep
  `run/` as the CLI fallback.
- Prefer `op read`, `op document create -`, `op document edit -`, and
  `--out-file --file-mode 0600` over command arguments containing secret values.
- Print field names, file names, counts, and status only. Never print resolved
  secret values or session file contents.
- Session files are 1Password Document items, not env fields:
  `resume-sessions-json` and `resume-wanted-session-json`.
- Restore must refuse to overwrite local session files unless the operator passes
  an explicit force flag.
- Tests must use temp files and fake JSON. They must not call `op`, read local
  `.env*`, or inspect real session files.

## ANTI-PATTERNS

- Never `cat`, log, diff, snapshot, or echo plaintext env/session contents.
- Never add non-allowlisted env keys to `seed-resume` without updating the
  operator guide and `.env.1password.example`.
- Never create `.env`, `.env.local`, app-local `.env`, `sessions.json`, or
  `wanted-session.json` as part of normal verification.
- Never put secret values into shell history, process arguments, test fixtures,
  or evidence files.
- Never broaden gitleaks allowlists to hide local plaintext secret files.

## COMMANDS

```bash
npm run op:run -- --env-file ../../.env.1password -- <command>
npm run op:native:run -- --env-file ../../.env.1password --auth service-account -- <command>
npm run op:seed:resume -- --env-file ../../.env
npm run op:seed:sessions
npm run op:restore:sessions -- --force
cd tools/scripts && go test ./onepassword/...
```

## NOTES

- These scripts are operational Go programs and inherit the `tools/scripts`
  rules: run from the repo root, stay idempotent, and avoid absolute paths.
- CLI-backed scripts fail before reading local files when 1Password CLI is not
  signed in. `native-run/` requires a service-account token or desktop app
  authorization instead.

---

Parent: [../AGENTS.md](../AGENTS.md)
