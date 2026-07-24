# Canonical Job URL Migration

## Rollout Order

Apply `infrastructure/database/migrations/0009_add_canonical_job_urls.sql` to
the target D1 database before deploying a Worker or job-server release that
writes canonical job URLs. Verify that the migration runner records `0009`,
then deploy the application release and resume job ingestion or auto-apply
runs.

This order prevents writes from reaching a database that lacks
`applications.canonical_url` or `job_search_results.canonical_url`.

## Migration Inventory

Migration `0009_add_canonical_job_urls` makes these changes:

| Object | Change |
| --- | --- |
| `applications` | Adds nullable `canonical_url` for the credential- and tracking-free job URL. |
| `job_search_results` | Creates the discovery-results table when absent, or adds nullable `canonical_url` to its existing schema. |

Canonical URLs are generated from HTTP(S) source URLs. Fragments, URL user
credentials, tracking parameters, and credential-bearing query parameters are
not persisted in `canonical_url`; the raw `source_url` remains available for
the original navigation target.

## Rollback

Stop job ingestion and application writers before applying
`0009_add_canonical_job_urls.down.sql`. The down migration removes only the
two `canonical_url` columns and preserves `job_search_results` with its rows.

The static D1 migration cannot safely determine whether 0009 created
`job_search_results` or inherited it from an earlier schema, so rollback never
drops that table. After the down migration, deploy or revert to an application
release that does not write canonical URL columns. The auto-apply helper's
pre-0009 fallback is only a temporary compatibility path for its metadata
probe; other application write paths require the migration.
