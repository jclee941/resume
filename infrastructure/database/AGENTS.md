# DATABASE INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Cloudflare D1 database migrations and seed data.

## STRUCTURE

```text
infrastructure/database/
├── migrations/             # D1 migrations (0000-0009)
├── seeds/                  # D1 seed data
└── README.md
```

## D1 MIGRATIONS

Immutable numbered migrations (0000-0009) for Cloudflare D1 SQLite database.

| Migration | Purpose                    |
| --------- | -------------------------- |
| 0000      | Baseline schema            |
| 0001      | Job applications table     |
| 0002      | Automation tables          |
| 0003      | Monitoring tables          |
| 0004      | Sync logs table            |
| 0005      | Resume sync tables         |
| 0007      | Wanted application history |
| 0008      | Auto-apply metadata        |
| 0009      | Canonical job URLs         |

**Note:** Migration `0006` was removed on 2026-07-23. It was a misfiled
PostgreSQL/Supabase Vault schema that could never execute on D1. The
`0005 -> 0007` sequence gap is intentional; do not reuse number 0006.

## CONVENTIONS

- Numbered migrations with zero-padding (0000, 0001, ...).
- D1 migrations use checked-in up/down pairs (`.sql` and `.down.sql`).
- Do not assume migrations are rerunnable; later D1 migrations include plain
  `ALTER TABLE` statements and rely on ordered, one-time application.
- Never edit existing migrations after deployment.

## ANTI-PATTERNS

- Never edit deployed migration files.
- Never skip migration numbers — the single documented exception is the
  retired 0006 (see the note above); do not introduce new gaps.
- Never commit production credentials in seed files.

---

Parent: [../AGENTS.md](../AGENTS.md)
