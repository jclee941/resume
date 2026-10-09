# HANDLERS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Request adapters and focused operation modules for dashboard APIs and scheduled automation.

Scope reason: score 14; dense request-adapter domain.

## STRUCTURE

```text
handlers/
  applications/  CRUD, approvals, history sync, query/repository helpers
  auto-apply/    Run/start/status/config, scoring, and duplicate checks
  browser/       Browser Rendering smoke check
  jobkorea/      Session minting and page helpers
  scheduled/     Cron router and auto-apply start plan
  sync/          Profile-sync status
  wanted/        Wanted session minting
  __tests__/     Node test suites for request behavior
```

## WHERE TO LOOK

| Task                    | Location                            | Notes                                          |
| ----------------------- | ----------------------------------- | ---------------------------------------------- |
| Common response helpers | `base-handler.js`                   | Optional base class, not universal inheritance |
| Application facade      | `applications/index.js`             | Delegates to operation/query modules           |
| Explicit candidates     | `auto-apply/explicit-candidates.js` | Normalization and supported-platform checks    |
| Native dispatch         | `auto-apply/native-dispatch.js`     | Workflow creation and configuration gate       |
| Company deduplication   | `auto-apply/duplicate-company.js`   | Normalized historical company comparison       |
| Cron execution          | `scheduled/cron-router.js`          | Session refresh and scheduled work budgets     |

## CONVENTIONS

- Use `BaseHandler` where shared parsing/response helpers fit; standalone handlers are established.
- Keep persistence in focused repository/helper modules rather than HTTP facade methods.
- Normalize `source`, `platform`, and `loginPlatform` through the platform catalog.
- Non-dry-run native dispatch checks `auto_apply_enabled` before creating workflows.
- `auto-apply/constants.js` distinguishes supported and disabled platforms; Saramin is disabled.
- Use typed client-facing errors for unsupported explicit candidates.

## ANTI-PATTERNS

- Do not let a platform alias bypass disabled-platform validation.
- Do not bypass company history checks when candidates arrive explicitly.
- Do not infer enabled automation from the presence of session credentials.
- Do not collapse operation-specific failures into successful HTTP payloads.

Parent: [../AGENTS.md](../AGENTS.md)
