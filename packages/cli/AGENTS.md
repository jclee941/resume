# CLI KNOWLEDGE BASE

**Generated:** 2026-05-07
**Commit:** `713f507e`
**Branch:** `master`

## OVERVIEW

Commander.js CLI for resume operations. ESM only.

## STRUCTURE

```text
cli/
├── bin/
│   └── run.js          # entry point (loads root .env)
├── src/
│   └── commands/
│       ├── deploy.js   # deployment command
│       ├── verify.js   # verification command
│       └── db.js       # D1 migration management
└── package.json
```

## COMMANDS

| Command  | Description                      | Subcommands                                       |
| -------- | -------------------------------- | ------------------------------------------------- |
| `deploy` | Deploy services                  | `--worker-file`, `--dir`, `--env`                 |
| `verify` | Verify service health            | -                                                 |
| `db`     | D1 database migration management | `migrate`, `rollback`, `status`, `seed`, `create` |

## CONVENTIONS

- ESM imports only.
- Root `.env` loaded at entry via `dotenv`.
- Commands are self-contained in `src/commands/`.

## ANTI-PATTERNS

- Never store secrets in CLI code.
- Never bypass verification steps.
- Never hardcode URLs — use env vars.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
