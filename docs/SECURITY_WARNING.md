# SECURITY ACTION PLAN

**Date:** 2026-01-25
**Updated:** 2026-03-28
**Status:** 🟢 SECURE (GitHub Actions integration)

## 0. Secret Scanning (Active)

- ✅ **Gitleaks** runs as a pre-commit hook on staged files (`.pre-commit-config.yaml`)
- ✅ **Configuration**: `.gitleaks.toml` with allowlists for redacted docs and
  placeholder patterns
- ✅ **npm audit**: CI Validate runs `npm run security:audit` on every push and PR
- ✅ **Docs redacted**: All historical secret values in documentation
  replaced with `[REDACTED_ROTATE_REQUIRED]`
- ✅ **`.env` files gitignored**: `.env`, `.env.secrets`, `.env.local`,
  `.dev.vars` all in `.gitignore`

## 1. API Key Rotation (Manual Action Required)

The following secrets were exposed in project history/docs and MUST be rotated
on each provider's dashboard.

| Service        | Key Name                     | Action            | Status                  |
| -------------- | ---------------------------- | ----------------- | ----------------------- |
| **Grafana**    | `GRAFANA_API_KEY`            | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Slack**      | `SLACK_APP_TOKEN`            | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **automation** | `AUTOMATION_API_KEY`         | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Telegram**   | `TELEGRAM_BOT_TOKEN`         | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Morph**      | `MORPH_API_KEY`              | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **OpenRouter** | `OPENROUTER_API_KEY`         | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Infisical**  | `INFISICAL_JWT...`           | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **HYCU DB**    | `HYCU_DB_PASSWORD`           | Change Password   | 🟡 Redacted, rotate key |
| **GitLab**     | `GITLAB_OAUTH_CLIENT_SECRET` | Revoke & Re-issue | 🟢 OAuth (rotatable)    |

### Confirmed Exposure Inventory (Issue #22)

Exposed values found in historical report content. All literal values are now
redacted in repo files with `[REDACTED_ROTATE_REQUIRED]` placeholders, but the
keys themselves must still be rotated on each provider.

### How to Rotate

1. Login to each provider's dashboard.
2. Revoke the existing key.
3. Generate a new key.
4. **DO NOT** save it in `.env` or commit to repo.
5. Use **Cloudflare Secrets** for Workers:

   ```bash
   npx wrangler secret put KEY_NAME
   ```

6. Use **1Password** or **Vault** for local/server dev.

### GitLab OAuth Note

GitLab now uses OAuth2 client credentials flow. To rotate:

1. Go to GitLab UI: **Settings** → **Applications**
2. Find the `resume-cicd` OAuth application
3. Regenerate the client secret
4. Update the secret in **1Password** (`homelab` vault → `GitHub Actions`)
5. Update GitHub Actions secrets if using direct secrets instead of 1Password

## 2. Hardcoded Passwords (Fixed)

- ✅ The hardcoded Wanted password in the former job-server scripts was
  replaced with `WANTED_PASSWORD`; those scripts were removed with the local
  job-server ([ADR 0010](adr/0010-retire-local-job-server.md)).
- The `resume` Worker reads `WANTED_PASSWORD` from Cloudflare Worker Secrets.

## 3. Deployment Security

- **Loki Logging**: Authenticated endpoint required.
  - Current: `https://grafana.jclee.me/loki/api/v1/push` (Open?)
  - Fix: Add `LOKI_API_KEY` to Worker secrets and update `loki-logger.js`.

## 4. D1 Database

- **Portfolio**: The Worker binds only `JOB_DB` (job-dashboard-db); there is no
  separate portfolio D1 binding.
- **Action**: If Portfolio needs persistence (e.g., A/B tests, Visitor counts),
  add tables to `JOB_DB` through a migration instead of binding a second database.

## Update wrangler.jsonc with new ID
