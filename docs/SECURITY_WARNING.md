# ⚠️ SECURITY ACTION PLAN

**Date:** 2026-01-25
**Status:** 🔴 CRITICAL ACTIONS REQUIRED

## 1. API Key Rotation (Immediate)

The following secrets were exposed in project history/docs and MUST be rotated immediately.

| Service        | Key Name             | Action            | Status     |
| -------------- | -------------------- | ----------------- | ---------- |
| **Grafana**    | `GRAFANA_API_KEY`    | Revoke & Re-issue | 🔴 Pending |
| **Slack**      | `SLACK_APP_TOKEN`    | Revoke & Re-issue | 🔴 Pending |
| **n8n**        | `N8N_API_KEY`        | Revoke & Re-issue | 🔴 Pending |
| **Evolution**  | `EVOLUTION_API_KEY`  | Revoke & Re-issue | 🔴 Pending |
| **Morph**      | `MORPH_API_KEY`      | Revoke & Re-issue | 🔴 Pending |
| **OpenRouter** | `OPENROUTER_API_KEY` | Revoke & Re-issue | 🔴 Pending |
| **Infisical**  | `INFISICAL_JWT...`   | Revoke & Re-issue | 🔴 Pending |
| **HYCU DB**    | `HYCU_DB_PASSWORD`   | Change Password   | 🔴 Pending |

### Confirmed Exposure Inventory (Issue #22)

The exposed values were found in historical report content and are now treated as compromised:

| Secret Name                          | Category    | Exposure Source                      | Rotation Required |
| ------------------------------------ | ----------- | ------------------------------------ | ----------------- |
| `GRAFANA_API_KEY`                    | API Key     | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `SLACK_APP_TOKEN`                    | API Token   | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `N8N_API_KEY`                        | API Token   | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `EVOLUTION_API_KEY`                  | API Key     | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `MORPH_API_KEY`                      | API Key     | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `OPENROUTER_API_KEY`                 | API Key     | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `INFISICAL_JWT_PROVIDER_AUTH_SECRET` | JWT Secret  | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `HYCU_DB_PASSWORD`                   | DB Password | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |
| `GITLAB_TOKEN`                       | API Token   | `docs/reports/ALL_SYSTEMS_REPORT.md` | Yes               |

All literal values must remain redacted in repository files.

### How to Fix

1. Login to each provider's dashboard.
2. Revoke the existing key.
3. Generate a new key.
4. **DO NOT** save it in `.env`.
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
