# Canonical Job URL Migration

## Current State

Production `JOB_DB` (`job-dashboard-db`) received the nullable
`applications.canonical_url` and `job_search_results.canonical_url` columns on
2026-09-29 through `apps/job-dashboard/migrations/0004_health_check_details_and_canonical_urls.sql`,
recorded in Wrangler's `d1_migrations` table. Fresh databases get both columns
from `apps/job-dashboard/schema.sql`.

Canonical URLs are generated from HTTP(S) source URLs. Fragments, URL user
credentials, tracking parameters, and credential-bearing query parameters are
not persisted in `canonical_url`; the raw `source_url` remains available for
the original navigation target.

## Changing the Columns

Create a new migration with `npx wrangler d1 migrations create job-dashboard-db <name>`,
mirror the end state in `apps/job-dashboard/schema.sql` (the D1 schema contract
test compiles every Worker SQL statement against it), and apply it with
`npx wrangler d1 migrations apply job-dashboard-db --remote` before deploying a
Worker release that depends on the change. To drop the columns, stop the
application and job-ingestion writers first; the auto-apply recorder still falls
back to a pre-canonical insert when the column is missing.
