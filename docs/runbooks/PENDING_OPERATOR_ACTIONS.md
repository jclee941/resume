# Pending Operator Actions

**Status**: Active checklist · **Owner**: Repository operator (qws941) ·
**Last Updated**: 2026-11-09

> External account state is not verified by this repository checklist. A
> configuration declaration alone does not prove that a resource was
> provisioned or is operating.

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

The current external credential type and rotation state have not been verified
here. Consult the [rotation runbook](./CLOUDFLARE_KEY_ROTATION.md) and
[secret boundary policy](../security/wrangler-vars-vs-secrets.md); do not infer
account state from repository configuration.

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
`packages/shared/src/rate-limit/kv-sliding-window.js`

The current KV-backed sliding-window has a non-atomic read-modify-write
(theoretical race under high concurrency). Cloudflare's native rate-limit
binding provides atomic semantics.

- [ ] `RATE_LIMITER` binding created in the Cloudflare account dashboard
- [ ] Binding wired into the root `wrangler.jsonc` (the merged worker's
      config per ADR 0009 — standalone portfolio and job-dashboard configs no longer exist)
- [ ] Middleware migrated to consume the binding (recipe is in the file's
      header comment)
- [ ] KV-based fallback removed once production traffic confirms parity

---

### OPS-001 — Verify Cloudflare Queue provisioning and operation

**Was issue**: #40 · **Priority**: P2 · **Estimated time**: ~10 min

As of 2026-11-09, the [root Wrangler configuration](../../wrangler.jsonc)
declares producer and consumer bindings for the two queues and their
dead-letter queues. That declaration does not establish whether the remote
queues exist, whether the deployed Worker has active bindings, or whether
messages are processed. Those external states remain unresolved.

- [ ] Verify the four queues exist in the Cloudflare account
- [ ] Verify the 4 queues (`crawl-tasks`, `crawl-tasks-dlq`, `notifications`,
      `notifications-dlq`) appear in the Cloudflare dashboard
- [ ] Verify the intended deployment uses the declared producer/consumer bindings
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
