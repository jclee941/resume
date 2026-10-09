# JOB DASHBOARD WORKER KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Dashboard API, database lineage, and automation package mounted by the portfolio entry.

Scope reason: score 12; required application boundary.

## WHERE TO LOOK

| Task                | Location                                    | Notes                                            |
| ------------------- | ------------------------------------------- | ------------------------------------------------ |
| Runtime composition | `src/AGENTS.md`                             | HTTP, queue, scheduled, and export wiring        |
| Database baseline   | `migrations/0001_init.sql`                  | Starting point for migration replay              |
| Schema snapshot     | `schema.sql`                                | Must match cumulative migration DDL              |
| Content storage     | `migrations/0006_content_files.sql`         | Content-pack table                               |
| History correction  | `migrations/0008_wanted_applied_at_utc.sql` | Data-only timestamp normalization                |
| Stubbed ATS checks  | `scripts/dev/foreign-apply-dry-run.mjs`     | Requires `--ats-stub`                            |
| API documentation   | `API_REFERENCE.md`                          | Cross-check against routes and canonical OpenAPI |
| Deployment switch   | `package.json`                              | Standalone deploy script intentionally fails     |

## CONVENTIONS

- Preserve six Workflow exports plus `BrowserSessionDO` for the portfolio entry.
- Wrangler's D1 migration directory is this package's `migrations/`.
- Use sequential `NNNN_snake_case.sql` migrations; retain the baseline for replay.
- Mirror schema-changing migrations in `schema.sql`; data-only corrections need no DDL change.
- `tests/unit/job-dashboard/migration-lineage.test.js` replays the lineage against the snapshot.
- `tests/unit/job-dashboard/d1-schema-contract.test.js` checks Worker SQL against the schema.
- Run colocated Node tests with `npm run test:dashboard`; root Jest suites use `npm run test:jest`.
- The foreign-apply dry run uses local ATS stubs, not live third-party submissions.

## ANTI-PATTERNS

- Do not remove the baseline when adding incremental migrations.
- Do not describe a data-only migration as a schema change.
- Do not treat a passing stubbed ATS run as proof of live submission.
- Do not revive the standalone deploy command without revisiting ADR 0009.

Parent: [../../AGENTS.md](../../AGENTS.md)
