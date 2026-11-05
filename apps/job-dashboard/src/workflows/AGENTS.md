# WORKFLOWS KNOWLEDGE BASE

**Generated:** 2026-11-05
**Commit:** `2dfb061d`
**Branch:** `master`

## OVERVIEW

Background orchestration for applications, crawling, resume sync, reporting, health, and cleanup.

Scope reason: score 7; retryable Workflow domain.

## WHERE TO LOOK

| Task                      | Location                                                                           | Notes                                     |
| ------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Class exports             | `index.js`                                                                         | Worker-facing export barrel               |
| Applications              | `application.js`, `application/workflow-runner.js`                                 | Class facade and orchestration            |
| Approval and submit gates | `application/approval-gates.js`, `application/application-submission-gates.js`     | Approval metadata and real-submit checks  |
| Transports                | `application/application-submitters.js`, `application/browser-rendering-submit.js` | Platform-specific submission              |
| Terminal outcomes         | `application/workflow-terminal.js`                                                 | No-jobs, daily-limit, failure persistence |
| Lifecycle tests           | `application/__tests__/workflow-lifecycle-kit.mjs`                                 | Shared harness for retry/replay suites    |
| Crawling                  | `job-crawling/`                                                                    | `job-crawling.js` is a re-export shim     |
| Resume sync               | `resume-sync.js`, `resume-sync-steps.js`                                           | Platform steps and outcomes               |
| Reports                   | `daily-report.js`, `daily-report-content.js`, `daily-report-stats.js`              | Report assembly                           |
| Health and cleanup        | `health-check/`, `health-check.js`, `cleanup.js`                                   | Checks and guarded cleanup                |

## CONVENTIONS

- Keep steps idempotent so retrying does not duplicate external side effects.
- Route terminal states through `workflow-terminal.js` so outcomes survive retries and replay; extend the lifecycle suites when changing them.
- Explicit candidates skip discovery while retaining normalized platform source.
- Delegate profile editing to `../services/resume-platform-sync/`.
- `ResumeSyncWorkflow` injects `mintJobKoreaSession` as `jobkoreaLogin` for editor-local login.
- Keep preview text and approval metadata with gates, not submission transports.
- Validate platform hosts before browser navigation or session hydration.
- Keep durable step boundaries visible; preserve bounded retry configuration.
- Keep `step.*` calls outside `step.do` callbacks; the nesting regression test enforces this.
- Existence of a platform submitter does not make that platform enabled in the catalog.

## ANTI-PATTERNS

- Do not invoke route handlers from Workflow steps.
- Do not bypass approval, deduplication, or submission gates on explicit-candidate runs.
- Do not couple Wanted API transport to browser-based submission implementations.
- Do not reactivate a disabled platform solely because an old submitter remains exported.
- Do not perform cleanup without its explicit eligibility conditions.

Parent: [../AGENTS.md](../AGENTS.md)
