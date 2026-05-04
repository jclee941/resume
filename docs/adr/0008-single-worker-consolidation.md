# ADR 0008: Single-Worker Consolidation (resume + job-dashboard)

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** [ADR 0007 — MSA Service Split](./0007-msa-service-split.md)

## Context

ADR 0007 split the codebase into two independent Cloudflare Workers:

- `resume` (portfolio worker) — public site at `resume.jclee.me`
- `job` (job-dashboard worker) — admin/automation API at `resume.jclee.me/job/*`

The split was achieved via a **Service Binding**
(`env.JOB_SERVICE.fetch(request)`) wired in `apps/portfolio/entry.js`.

This architecture introduced operational drag:

- Two independent Cloudflare Workers Builds projects to provision and monitor
- Two `wrangler.jsonc` files to keep in sync (KV namespaces shared by ID)
- The `JOB_SERVICE` Service Binding requires the target Worker to exist in the
  same Cloudflare account _before_ the binding can be added — creating a
  chicken-and-egg deployment ordering problem (documented in
  `docs/runbooks/JOB_DASHBOARD_DEPLOY.md`)
- After multiple deployment incidents the binding was repeatedly disabled
  (`a626e28`, `e4e89b7`) leaving `/job/*` returning 503 in production
- The "two failure domains" benefit advertised in ADR 0007 was never realized:
  both workers share KV namespace IDs (`SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV`),
  so a KV outage takes both down anyway. Independent scaling was also never used
  — both workers share the same `resume.jclee.me` route at the L7 edge.

## Decision

**Consolidate `apps/job-dashboard` into `apps/portfolio` as a single Cloudflare
Worker.**

The merged worker:

- Continues to deploy as `resume` (the existing production worker name)
- Imports the job-dashboard worker module **in-process**: `import jobWorker from
  '../job-dashboard/src/index.js'` in `apps/portfolio/entry.js`
- Calls `jobWorker.fetch(request, env, ctx)` directly when
  `url.pathname.startsWith('/job')` (no Service Binding round-trip)
- Re-exports all 7 Workflow classes (`JobCrawlingWorkflow`,
  `ApplicationWorkflow`, `ResumeSyncWorkflow`, `DailyReportWorkflow`,
  `HealthCheckWorkflow`, `BackupWorkflow`, `CleanupWorkflow`) and the
  `BrowserSessionDO` Durable Object class so wrangler can register them against
  their `wrangler.jsonc` bindings
- Delegates `queue(batch, env, ctx)` to `jobWorker.queue` so the merged worker
  handles `crawl-tasks` and `notifications` queues

## Binding Changes

| Binding                                               | Before               | After                                                                                            |
| ----------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `DB` (portfolio D1)                                   | `resume-prod-db`     | unchanged                                                                                        |
| `DB` (job-dashboard D1)                               | `job-dashboard-db`   | **renamed to `JOB_DB`** to coexist in the merged worker                                          |
| `JOB_SERVICE` Service Binding                         | `service: "job"`     | **removed** (no remote Worker to call)                                                           |
| Workflows ×7                                          | only in `job` worker | **moved to `resume` worker**                                                                     |
| `BROWSER_SESSION` Durable Object                      | only in `job` worker | **moved to `resume` worker** with `migrations: [{tag: "v1", new_classes: ["BrowserSessionDO"]}]` |
| Queue producers (`CRAWL_TASKS`, `NOTIFICATION_QUEUE`) | only in `job` worker | **moved to `resume` worker**                                                                     |
| Queue consumers (`crawl-tasks`, `notifications`)      | only in `job` worker | **moved to `resume` worker**                                                                     |
| `AI`, `MYBROWSER`                                     | only in `job` worker | **moved to `resume` worker**                                                                     |

The `env.DB` → `env.JOB_DB` rename was applied across 55 references in
`apps/job-dashboard/src/` (handlers, workflows, services, queue-consumer,
routes) via `ast-grep`.

## Consequences

### Positive

- One Cloudflare Workers Builds project, one `wrangler.jsonc`, one deploy.
- No more chicken-and-egg Service Binding ordering problem.
- No more "Dashboard unavailable in local dev" 503 fallback — `/job/*` always
  works locally if entry.js compiles.
- In-process function call replaces same-datacenter RPC — slightly lower latency
  (`Service Binding` calls are typically <1 ms but still serialize/deserialize a
  Request).
- `/job/*` routing no longer requires the runbook in `JOB_DASHBOARD_DEPLOY.md`.

### Negative

- Single failure domain restored. A bug in any handler can crash the whole
  worker invocation.
- Worker bundle size grows. Pre-merge `worker.js` was ~410KB; post-merge is
  larger (Cloudflare warns at 1 MB, errors at ~3 MB compressed). Must be
  monitored.
- `BrowserSessionDO` is a NEW Durable Object class on the `resume` worker →
  `migrations: [{tag: "v1"}]` must be the **first** migration entry. Existing
  data on the `job` worker's `BROWSER_SESSION` namespace will not migrate; this
  DO is used for transient Puppeteer sessions only, so loss is acceptable.
- `apps/job-dashboard/wrangler.jsonc` becomes mostly informational — it is no
  longer the deployed config. The `job` worker can be deleted from Cloudflare
  after the merged worker proves stable.

### Migration Plan

1. ✅ Rename `env.DB` → `env.JOB_DB` across `apps/job-dashboard/src/` (55
   references).
2. ✅ Update `apps/job-dashboard/wrangler.jsonc` D1 binding to `JOB_DB`.
3. ✅ Add all job-dashboard bindings to `apps/portfolio/wrangler.jsonc`
   production env.
4. ✅ Modify `apps/portfolio/entry.js` to import jobWorker, re-export classes,
   delete `JOB_SERVICE` fallback.
5. ✅ Remove `services: [{ binding: "JOB_SERVICE", service: "job" }]` from root
   `wrangler.jsonc`.
6. ✅ Rewrite `tests/unit/portfolio-worker/entry.test.js` to assert merged-worker
   contract (no `JOB_SERVICE`).
7. ✅ Delete obsolete `apps/job-dashboard/wrangler.jsonc` and
   `docs/runbooks/JOB_DASHBOARD_DEPLOY.md`.
8. ✅ Update `docs/ARCHITECTURE.md` and
   `docs/architecture/MONOREPO_REVIEW_2026-04-29.md` (P0-4 marked OBSOLETE).
9. ✅ Add `.github/workflows/provision-queues.yml` for opt-in queue provisioning
   - binding activation.
10. ✅ **Standalone `job` Cloudflare Worker deleted** (verified 2026-04-30: GET
    `/accounts/{id}/workers/scripts/job` → HTTP 404). `/job/*` traffic confirmed
    handled by merged `resume` worker via in-process `jobWorker.fetch()`.
    Deletion automation: `.github/workflows/delete-standalone-job-worker.yml`
    (workflow_dispatch, status-only existence check, route-first deletion with
    auto-rollback). The actual deletion was a no-op because the `job` worker had
    been deleted earlier; the workflow's idempotent skip path correctly detected
    this and exited successfully without further action.
11. **Pending operator action (optional):** Trigger `provision-queues.yml`
    workflow when ready to activate `crawl-tasks` and `notifications` queues.
    Producer functions are defined but no current workflow handler invokes them;
    queue activation is OPT-IN until task enqueueing is implemented in workflow
    code.

### Reversibility

- This decision can be reversed by reverting the entry.js + wrangler.jsonc
  commits and re-deploying job-dashboard as a standalone Worker.
- The `env.DB` → `env.JOB_DB` rename is harder to revert because
  handler/workflow/service code was modified — but the rename itself is
  mechanical and could be reversed with another `ast-grep` pass.

## References

- [ADR 0006 — Single-Worker Architecture](./0006-single-worker-architecture.md)
  (original, superseded by 0007)
- [ADR 0007 — MSA Service Split](./0007-msa-service-split.md) (now superseded by
  this ADR)
- ~~`docs/runbooks/JOB_DASHBOARD_DEPLOY.md`~~ — deleted (merged worker has no
  separate `job` deploy)
- Cloudflare Service Bindings documentation: <https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/>
