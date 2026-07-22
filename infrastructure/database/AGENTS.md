# DATABASE INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

D1 and Supabase database migrations, seeds, and configuration. Two separate
migration lineages: D1 (Cloudflare Workers) and Supabase (PostgreSQL).

## STRUCTURE

```text
infrastructure/database/
├── migrations/             # D1 migrations (0000-0008)
├── seeds/                  # D1 seed data
├── supabase/
│   ├── migrations/         # Supabase PostgreSQL migrations
│   └── seed/               # Supabase seed data
└── README.md
```

## D1 MIGRATIONS

Immutable numbered migrations (0000-0008) for Cloudflare D1 SQLite database.

| Migration | Purpose                    |
| --------- | -------------------------- |
| 0000      | Baseline schema            |
| 0001      | Job applications table     |
| 0002      | Automation tables          |
| 0003      | Monitoring tables          |
| 0004      | Sync logs table            |
| 0005      | Resume sync tables         |
| 0006      | Vault table                |
| 0007      | Wanted application history |
| 0008      | Auto-apply metadata        |

## SUPABASE MIGRATIONS

Separate PostgreSQL migration lineage for Supabase (0001-0004).

| Migration | Purpose              |
| --------- | -------------------- |
| 0001      | Resume tables        |
| 0002      | RLS policies         |
| 0003      | Indexes and triggers |
| 0004      | Tighten grants       |

## CONVENTIONS

- Numbered migrations with zero-padding (0000, 0001, ...).
- D1 migrations use checked-in up/down pairs (`.sql` and `.down.sql`).
- Do not assume migrations are rerunnable; later D1 migrations include plain
  `ALTER TABLE` statements and rely on ordered, one-time application.
- Never edit existing migrations after deployment.
- D1 and Supabase migrations are separate; keep them distinct.

## ANTI-PATTERNS

- Never edit deployed migration files.
- Never skip migration numbers.
- Never commit production credentials in seed files.

---

Parent: [../AGENTS.md](../AGENTS.md)
