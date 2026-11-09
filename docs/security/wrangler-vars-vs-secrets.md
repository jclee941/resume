# Wrangler `vars` vs Workers Secrets — Boundary Policy

**Status**: Active · **Owner**: Platform/Security · **SSOT**: SSOT-030 ·
**Issue**: #37 · **Last Updated**: 2026-05-05

This document defines the **explicit boundary** between values that may be
committed to `wrangler.jsonc` as plaintext `vars` and values that **must** be
provisioned as Workers Secrets (`wrangler secret put`).

The boundary is enforced both by convention and by a CI lint guard
(`tools/scripts/security/check-wrangler-secrets.go`) that fails the build when
secret-shaped strings appear in any committed `wrangler.jsonc` or
`wrangler.toml`.

---

## Quick Decision Table

| Value type                                                | Rule                                                  |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Public URL (e.g. `https://api.example.com`)               | `vars` — Not sensitive                                |
| Feature flag (e.g. `ENABLE_X = "true"`)                   | `vars` — Behavior toggle                              |
| Cron schedule (e.g. `CRON = "0 */6 * * *"`)               | `vars` — Operational metadata                         |
| Index / queue name (e.g. `CRAWL_QUEUE_NAME`)              | `vars` — Resource identifier, not credential          |
| Public key fingerprint                                    | `vars` — Verifier, not signer                         |
| Numeric tuning constant (rate limits, timeouts)           | `vars` — Operational parameter                        |
| API key / token (any provider: Cloudflare, Wanted, etc.)  | Secret — Authentication credential                    |
| OAuth client secret                                       | Secret — Authentication credential                    |
| JWT signing key                                           | Secret — Confidentiality of issued tokens             |
| Symmetric encryption key                                  | Secret — Cryptographic primitive                      |
| Webhook signing secret                                    | Secret — Integrity check                              |
| Database password / connection string with embedded creds | Secret — Authentication credential                    |
| Personal email / phone of a user                          | Secret — PII — treat as Secrets even when not a creds |

**Rule of thumb**: if leaking the value would let an attacker impersonate the
service, decrypt user data, sign messages on behalf of the project, or
exfiltrate PII — it is a **Secret**.

---

## How to Provision Each

### `vars` — committed to `wrangler.jsonc`

```jsonc
{
  "name": "resume",
  "vars": {
    "DEPLOY_ENV": "production",
    "RATE_LIMIT_RPM": "60",
  },
}
```

These are visible in the GitHub repository, in build logs, and in the
Cloudflare dashboard. Treat them as **public**.

### Workers Secrets — provisioned out-of-band

For local/operator setup:

```bash
cd apps/portfolio
wrangler secret put ENCRYPTION_KEY            # paste at prompt
wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
wrangler secret put SESSION_SIGNING_KEY
```

Production deployment is controlled by Workers Builds using the repository-root
`wrangler.jsonc`; this policy does not establish which credentials are currently
configured in Cloudflare or the build integration. Legacy API-key and email
authentication is still supported by some repository tooling, so do not infer
that it has been removed everywhere. Keep credentials out of command-line
arguments and logs.

GitHub Secrets used by CI:

- `CLOUDFLARE_API_TOKEN` — scoped CF token (see
  [`docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`](../runbooks/CLOUDFLARE_KEY_ROTATION.md))
- `CLOUDFLARE_ACCOUNT_ID` — actually a public-ish ID, but kept in secrets
  to avoid accidental fork exposure
- `GOOGLE_OAUTH_CLIENT_SECRET` — auth flow credential

---

## Rotation

When in doubt, rotate. Each secret should be rotated:

- **Quarterly** as a baseline cadence.
- **Immediately** if any of the following:
  - The secret was checked into git history (even if reverted).
  - The secret appeared in a build log, screenshot, or chat transcript.
  - A team member with access leaves the project.
  - A dependency that consumed the secret is compromised.

For open operator work, see the
[pending actions checklist](../runbooks/PENDING_OPERATOR_ACTIONS.md) and the
[historical key-rotation runbook](../runbooks/CLOUDFLARE_KEY_ROTATION.md). The
general pattern:

1. Generate the new secret in the provider's console.
2. `wrangler secret put NAME` and update the GitHub Secret in parallel.
3. Follow the current deployment process documented in
   [`docs/architecture/DEPLOYMENT_PIPELINE.md`](../architecture/DEPLOYMENT_PIPELINE.md);
   a repository push alone does not prove the credential was used or the
   deployment completed.
4. **Only then** revoke the old secret.

This ordering avoids a window where production runs with no valid credential.

---

## CI Lint Guard

`tools/scripts/security/check-wrangler-secrets.go` scans every committed
`wrangler.jsonc` / `wrangler.toml` for known secret shapes:

| Pattern                                                         | Matches                                 |
| --------------------------------------------------------------- | --------------------------------------- |
| `AKIA[0-9A-Z]{16}`                                              | AWS Access Key ID                       |
| `sk_live_[0-9a-zA-Z]{16,}`                                      | Stripe live secret key                  |
| `sk-[A-Za-z0-9_-]{20,}`                                         | OpenAI / Anthropic / similar `sk-` keys |
| `eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}` | JWT (3 base64url segments)              |
| `gh[pous]_[A-Za-z0-9]{30,}`                                     | GitHub PAT                              |
| `xox[baprs]-[0-9]+-[A-Za-z0-9-]+`                               | Slack token                             |
| `AIza[0-9A-Za-z_-]{35}`                                         | Google API key                          |
| `-----BEGIN ([A-Z]+ )?PRIVATE KEY-----`                         | Private key block                       |
| `[a-fA-F0-9]{32,}` outside hash / resource-id keys              | Long hex blob (likely key/password)     |
| Long key-name + literal value (e.g. `"api_key": "..."`)         | Heuristic credential catch-all          |

The script exits non-zero on the first match. The current read-only CI
validation job runs it alongside the gitleaks repository-wide scan. The
Wrangler guard checks configuration files; gitleaks also scans repository
history.

To run locally:

```bash
go run ./tools/scripts/security/check-wrangler-secrets.go
```

Cloudflare resource identifiers (D1 `database_id`, KV/R2 namespace `id`,
account/zone IDs) are excluded from the long-hex catch-all because they are
public identifiers issued by Cloudflare, not credentials.

---

## Audit Trail

| Date       | Event                             | Actor    |
| ---------- | --------------------------------- | -------- |
| 2026-05-05 | Document created (#37 / SSOT-030) | platform |

---

## See Also

- [`docs/runbooks/CLOUDFLARE_KEY_ROTATION.md`](../runbooks/CLOUDFLARE_KEY_ROTATION.md)
  — historical rotation procedure; confirm current operator status before use.
- [`docs/security/SECRET_ROTATION_PLAYBOOK.md`](./SECRET_ROTATION_PLAYBOOK.md)
  — full rotation playbook covering all provider categories.
- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](../architecture/SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-030 — original consolidation entry that produced this issue.
