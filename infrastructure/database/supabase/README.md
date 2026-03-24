# Supabase Resume Database

PostgreSQL schema for the SSoT resume data, hosted on self-hosted Supabase at `supabase.jclee.me`.

## Schema

10 tables in the `public` schema with `resume_` prefix:

| Table                      | Description                            | Source Key                          |
| -------------------------- | -------------------------------------- | ----------------------------------- |
| `resume_profiles`          | Parent table — singleton data as JSONB | personal, education, military, etc. |
| `resume_careers`           | Work experience entries                | `careers[]`                         |
| `resume_projects`          | Project detail entries                 | `projects[]`                        |
| `resume_certifications`    | Certifications with status             | `certifications[]`                  |
| `resume_skill_categories`  | Skill category groups                  | `skills{}` keys                     |
| `resume_skills`            | Individual skills per category         | `skills{}.items[]`                  |
| `resume_personal_projects` | Side projects                          | `personalProjects[]`                |
| `resume_languages`         | Language proficiencies                 | `languages[]`                       |
| `resume_infrastructure`    | Homelab infrastructure items           | `infrastructure[]`                  |
| `resume_oss_contributions` | OSS contributions (placeholder)        | `ossContributions[]`                |

## Migrations

Apply in order using `psql` or the Supabase SQL Editor:

```bash
# 1. Create tables
psql "$DATABASE_URL" -f migrations/0001_create_resume_tables.sql

# 2. Enable RLS + public read policies
psql "$DATABASE_URL" -f migrations/0002_create_rls_policies.sql

# 3. Add indexes and updated_at triggers
psql "$DATABASE_URL" -f migrations/0003_create_indexes_and_triggers.sql
```

### Rollback

Down migrations reverse each step:

```bash
psql "$DATABASE_URL" -f migrations/0003_create_indexes_and_triggers.down.sql
psql "$DATABASE_URL" -f migrations/0002_create_rls_policies.down.sql
psql "$DATABASE_URL" -f migrations/0001_create_resume_tables.down.sql
```

## Seed Data

The seed script reads `packages/data/resumes/master/resume_data.json` (SSoT) and generates idempotent SQL.

```bash
# Generate seed.sql from current resume data
cd infrastructure/database/supabase/seed
node seed-resume-data.mjs

# Preview without writing (prints to stdout)
node seed-resume-data.mjs --dry-run

# Apply seed data
psql "$DATABASE_URL" -f seed/seed.sql
```

The generated SQL uses `ON CONFLICT ... DO UPDATE` for safe re-runs and deterministic UUIDs for stable row identities.

## Connection

Credentials are stored in 1Password:

| Secret                 | 1Password Reference                      |
| ---------------------- | ---------------------------------------- |
| `SUPABASE_URL`         | `op://homelab/supabase/Connection/url`   |
| `SUPABASE_SERVICE_KEY` | `op://homelab/supabase/Keys/service_key` |
| `SUPABASE_ANON_KEY`    | `op://homelab/supabase/Keys/anon_key`    |

```bash
# Resolve DATABASE_URL via 1Password CLI
export DATABASE_URL=$(op read "op://homelab/supabase/Connection/url")
```

## Design Decisions

- **Singleton data as JSONB**: `personal`, `education`, `military`, `hero`, `contact`, `summary`, `section_descriptions`, `career_gap` stored as JSONB columns on `resume_profiles` to avoid over-normalization.
- **Collection data normalized**: Careers, projects, skills, etc. are separate tables with FK to `resume_profiles` for query flexibility and ordering.
- **CHECK constraints over enums**: `status` and `level` columns use `CHECK` constraints instead of `CREATE TYPE ... AS ENUM` for simpler migrations.
- **GIN indexes on JSONB**: Enable efficient `@>`, `?`, and `?|` queries on JSONB columns.
- **Deterministic UUIDs**: Seed script generates content-based UUIDs for idempotent re-seeding.

## File Structure

```
supabase/
├── README.md                                    # This file
├── migrations/
│   ├── 0001_create_resume_tables.sql            # 10 CREATE TABLE
│   ├── 0001_create_resume_tables.down.sql       # 10 DROP TABLE
│   ├── 0002_create_rls_policies.sql             # RLS + public read policies
│   ├── 0002_create_rls_policies.down.sql        # Drop policies + disable RLS
│   ├── 0003_create_indexes_and_triggers.sql     # Indexes + updated_at triggers
│   └── 0003_create_indexes_and_triggers.down.sql
└── seed/
    ├── seed-resume-data.mjs                     # JSON → SQL generator
    └── seed.sql                                 # Generated output (re-generate after data changes)
```
