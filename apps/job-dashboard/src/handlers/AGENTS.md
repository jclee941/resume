# HANDLERS KNOWLEDGE BASE

**Generated:** 2026-10-14
**Commit:** `493d44f6`
**Branch:** `master`

## OVERVIEW

Request adapters and focused operation modules for dashboard APIs and scheduled automation.

Scope reason: score 9; dense request-adapter domain.

## STRUCTURE

```text
handlers/
  applications/  CRUD, approvals, history sync, query/repository helpers
  auto-apply/    Run/start/status/config, scoring, and duplicate checks
  browser/       Browser Rendering smoke check
  jobkorea/      Session minting and page helpers
  public-jobs/   On-demand public-sector posting collection
  scheduled/     Cron router and auto-apply start plan
  sync/          Profile-sync status
  wanted/        Wanted session minting
  __tests__/     Node test suites for request behavior
```

## WHERE TO LOOK

| Task                    | Location                                 | Notes                                          |
| ----------------------- | ---------------------------------------- | ---------------------------------------------- |
| Common response helpers | `base-handler.js`                        | Optional base class, not universal inheritance |
| Application facade      | `applications/index.js`                  | Delegates to operation/query modules           |
| Explicit candidates     | `auto-apply/explicit-candidates.js`      | Normalization and supported-platform checks    |
| Native dispatch         | `auto-apply/native-dispatch.js`          | Workflow creation and configuration gate       |
| Company deduplication   | `auto-apply/duplicate-company.js`        | Normalized historical company comparison       |
| Cron execution          | `scheduled/cron-router.js`               | Session refresh and scheduled work budgets     |
| JobKorea history login  | `applications/jobkorea-history-login.js` | Login and read share one borrowed browser      |

## CONVENTIONS

- Use `BaseHandler` where shared parsing/response helpers fit; standalone handlers are established.
- Keep persistence in focused repository/helper modules rather than HTTP facade methods.
- Normalize `source`, `platform`, and `loginPlatform` through the platform catalog.
- Non-dry-run native dispatch checks `auto_apply_enabled` before creating workflows.
- `auto-apply/constants.js` distinguishes supported and disabled platforms; Saramin is disabled.
- Use typed client-facing errors for unsupported explicit candidates.
- Daily cron refreshes only Wanted before history sync and Workflow starts.
- Cron and on-demand JobKorea history use `fetchJobKoreaHistoryAfterLogin`, not KV cookie replay.
- `ProfileSyncHandler` passes `mintJobKoreaSession` as `jobkoreaLogin` to the sync service.

## ANTI-PATTERNS

- Do not let a platform alias bypass disabled-platform validation.
- Do not bypass company history checks when candidates arrive explicitly.
- Do not infer enabled automation from the presence of session credentials.
- Do not collapse operation-specific failures into successful HTTP payloads.
- Do not mint JobKorea cookies in one browser and replay them in another; pages can stall.

Parent: [../AGENTS.md](../AGENTS.md)
