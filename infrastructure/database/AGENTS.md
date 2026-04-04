# DATABASE INFRASTRUCTURE KNOWLEDGE BASE

**Scope:** Supabase database migrations, seeds, and configuration  
**Purpose:** Database schema versioning and seed data

## OVERVIEW

PostgreSQL database managed via Supabase. Schema changes tracked as numbered migrations with up/down scripts. Seed data for local development and testing.

## STRUCTURE

```text
infrastructure/database/
├── migrations/           # SQL migration files (numbered)
│   ├── 0000_baseline_schema.sql
│   ├── 0001_create_job_applications.sql
│   ├── 0002_add_automation_tables.sql
│   ├── 0003_add_monitoring_tables.sql
│   ├── 0004_add_sync_logs_table.sql
│   └── 0005_add_resume_sync_tables.sql
├── seeds/                # Seed data SQL
│   └── config.sql
└── supabase/
    └── README.md         # Supabase-specific docs
```

## MIGRATIONS

| Migration                      | Purpose                         |
| ------------------------------ | ------------------------------- |
| `0000_baseline_schema`         | Initial schema foundation       |
| `0001_create_job_applications` | Job application tracking tables |
| `0002_add_automation_tables`   | Automation/workflow tables      |
| `0003_add_monitoring_tables`   | Monitoring and metrics tables   |
| `0004_add_sync_logs_table`     | Resume sync audit logging       |
| `0005_add_resume_sync_tables`  | Resume sync state tables        |

## CONVENTIONS

- **Numbered migrations** with zero-padding (0001, 0002...)
- **Up/down pairs** for every migration (`.sql` and `.down.sql`)
- **Idempotent scripts** (safe to run multiple times)
- **No destructive changes** in existing migrations (create new migration)

## ANTI-PATTERNS

- Never edit existing migration files after they've been applied
- Never skip migration numbers (maintain sequence)
- Never commit production credentials in seed files

## NOTES

- Supabase CLI manages migrations: `supabase db push`
- Local development uses `supabase start`
- Production migrations run via CI/CD pipeline
