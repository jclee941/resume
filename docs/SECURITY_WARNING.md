# SECURITY ACTION PLAN

**Date:** 2026-01-25
**Updated:** 2026-02-12
**Status:** 🟡 MANUAL KEY ROTATION REQUIRED (CI protections in place)

## 0. CI Secret Scanning (Active)

- ✅ **Gitleaks** runs on every push/PR via `security-scan` job in CI pipeline
- ✅ **Configuration**: `.gitleaks.toml` with allowlists for redacted docs and placeholder patterns
- ✅ **npm audit**: Runs alongside gitleaks in `security-scan` job
- ✅ **Docs redacted**: All secret values in `docs/reports/ALL_SYSTEMS_REPORT.md` replaced with `[REDACTED_ROTATE_REQUIRED]`
- ✅ **`.env` files gitignored**: `.env`, `.env.secrets`, `.env.local`, `.dev.vars` all in `.gitignore`

## 1. API Key Rotation (Manual Action Required)

The following secrets were exposed in project history/docs and MUST be rotated on each provider's dashboard.

| Service        | Key Name             | Action            | Status                  |
| -------------- | -------------------- | ----------------- | ----------------------- |
| **Grafana**    | `GRAFANA_API_KEY`    | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Slack**      | `SLACK_APP_TOKEN`    | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **n8n**        | `N8N_API_KEY`        | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Evolution**  | `EVOLUTION_API_KEY`  | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Morph**      | `MORPH_API_KEY`      | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **OpenRouter** | `OPENROUTER_API_KEY` | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **Infisical**  | `INFISICAL_JWT...`   | Revoke & Re-issue | 🟡 Redacted, rotate key |
| **HYCU DB**    | `HYCU_DB_PASSWORD`   | Change Password   | 🟡 Redacted, rotate key |
| **GitLab**     | `GITLAB_TOKEN`       | Revoke & Re-issue | 🟡 Redacted, rotate key |

### Confirmed Exposure Inventory (Issue #22)

Exposed values found in historical report content. All literal values are now redacted in repo files with `[REDACTED_ROTATE_REQUIRED]` placeholders, but the keys themselves must still be rotated on each provider.

### How to Rotate

1. Login to each provider's dashboard.
2. Revoke the existing key.
3. Generate a new key.
4. **DO NOT** save it in `.env` or commit to repo.
5. Use **Cloudflare Secrets** for Workers:
   ```bash
   npx wrangler secret put KEY_NAME
   ```
6. Use **Infisical** or **Vault** for local/server dev.

## 2. Hardcoded Passwords (Fixed)

- ✅ `typescript/job-automation/scripts/*.js`: Hardcoded password replaced with `process.env.WANTED_PASSWORD`.
- **Action**: Ensure `WANTED_PASSWORD` is set in your environment variables (e.g., `~/.bashrc` or CI secrets).

## 3. Deployment Security

- **Loki Logging**: Authenticated endpoint required.
  - Current: `https://grafana.jclee.me/loki/api/v1/push` (Open?)
  - Fix: Add `LOKI_API_KEY` to Worker secrets and update `loki-logger.js`.

## 4. D1 Database

- **Portfolio**: Production D1 binding is marked TODO.
- **Action**: If Portfolio needs persistence (e.g., A/B tests, Visitor counts), create a production D1 DB and update `wrangler.toml`.
- **Command**:
  ```bash
  npx wrangler d1 create resume-prod-db
  # Update wrangler.toml with new ID
  ```
