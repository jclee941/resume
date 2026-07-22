# Pending Operator Actions

**Status**: Active checklist · **Owner**: Repository operator (qws941) ·
**Last Updated**: 2026-05-05

This document is the single source of truth for operator-only tasks that
no automation / no agent can perform. Each entry was previously tracked as
a GitHub issue; the issues have been closed in favor of this central
checklist because GitHub issues are a poor fit for "operator must perform
manual action in an external dashboard" tracking.

When an operator completes a task here, check the box and add the date +
verification evidence in the same line. Re-open a GitHub issue only if the
operator action **fails** in a way that requires code changes.

---

## Open

### CF-API-001 — Rotate Cloudflare global API key → scoped token

**Was issue**: #13 · **Priority**: P0 · **Estimated time**: ~15 min ·
**Runbook**: [`CLOUDFLARE_KEY_ROTATION.md`](./CLOUDFLARE_KEY_ROTATION.md)

The repo currently uses a Cloudflare global API key (full account
permissions). Rotate to a scoped token with only:
`Workers Scripts:Edit` + `Workers KV Storage:Edit` + `Account Settings:Read`.

- [ ] Old global key revoked
- [ ] New scoped token created
- [ ] Token stored in GitHub Secrets as `CF_API_TOKEN`
      (and old `CLOUDFLARE_API_KEY` removed)
- [ ] One production deploy validated end-to-end with the new token
- [ ] Runbook checked-off

---

### CF-RATE-001 — Provision native Cloudflare rate-limit binding

**Was issue**: #15 · **Priority**: P1 · **Estimated time**: ~30 min ·
**Recipe**: comment block at the top of
`apps/job-dashboard/src/middleware/rate-limit.js`

The current KV-backed sliding-window has a non-atomic read-modify-write
(theoretical race under high concurrency). Cloudflare's native rate-limit
binding provides atomic semantics.

- [ ] `RATE_LIMITER` binding created in the Cloudflare account dashboard
- [ ] Binding wired into the root `wrangler.jsonc` (the merged worker's
      config per ADR 0009 — `apps/portfolio/wrangler.jsonc` and
      `apps/job-dashboard/wrangler.jsonc` no longer exist)
- [ ] Middleware migrated to consume the binding (recipe is in the file's
      header comment)
- [ ] KV-based fallback removed once production traffic confirms parity

---

### JK-PROBE-001 — Verify JobKorea live DOM selectors

**Was issue**: #18 · **Priority**: P3 · **Estimated time**: ~30 min ·
**Files**: `apps/job-server/scripts/profile-sync/jobkorea-sections.js`,
`apps/job-server/src/crawlers/jobkorea-crawler.js`

JobKorea redesigns periodically. The skills-mapping selectors and the
`getProfile` selectors must be re-verified against an authenticated live
session whenever a probe surfaces a regression.

- [ ] Operator runs `node apps/job-server/scripts/profile-sync/probe-jobkorea.js`
      with a valid session
- [ ] Skill-section selectors verified or updated (source-control the diff)
- [ ] `getProfile` selectors verified or updated
- [ ] Inline `TODO` comments removed from both files
- [ ] `tests/integration/jobkorea-profile-sync.test.js` updated if the fixture
      shape changed

---

### OPS-001 — Trigger `provision-queues.yml` to activate Cloudflare Queues

**Was issue**: #40 · **Priority**: P2 · **Estimated time**: ~10 min

ADR 0008 Migration Plan item 11. Producer functions are defined in code
but Cloudflare queues (`crawl-tasks`, `notifications`) are not yet
provisioned. The queue bindings in the root `wrangler.jsonc` are
intentionally INACTIVE comments until the operator dispatches the
provisioning workflow.

- [ ] Trigger `Provision Cloudflare Queues` via GitHub Actions UI
      (workflow_dispatch, confirm input `PROVISION`)
- [ ] Verify the 4 queues (`crawl-tasks`, `crawl-tasks-dlq`, `notifications`,
      `notifications-dlq`) appear in the Cloudflare dashboard
- [ ] Replace the INACTIVE comment block in the root `wrangler.jsonc`
      with the active producer/consumer config (template in ADR 0008)
- [ ] Push to master to redeploy with active bindings
- [ ] Verify queue handlers process test messages

**Note**: Cloudflare Queues are a paid resource (Workers Paid plan).

---

## Completed

(none yet — entries move here once checked off, with a `Done: YYYY-MM-DD`
suffix and a link to the deploy / runbook completion record.)

---

## Why this is a markdown checklist instead of GitHub issues

- These tasks require **operator action in external systems** (Cloudflare
  dashboard, JobKorea browser session, GitHub Actions UI). No agent can
  drive them; no PR can close them.
- A GitHub issue with a long-pending P0 / P1 label is misleading on the
  open-issue dashboard — it suggests "team has work to do" when in fact
  the team's only available action is to wait for the operator.
- A markdown checklist next to the runbooks keeps the operator action
  discoverable in the same place the operator already works
  (`docs/runbooks/`).

The original GitHub issues are closed with a link back to this file. If
an operator action **fails** in a way that requires a code change, file a
fresh GitHub issue tied to the specific failure rather than re-opening
the closed tracker.
