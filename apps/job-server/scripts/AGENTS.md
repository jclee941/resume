# SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

17 utility scripts for authentication, data sync, and metrics. Run from project root.

## KEY SCRIPTS

| Script                          | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `auth-persistent.js`            | persistent session management                     |
| `auth-sync.js`                  | cookies → worker KV (846 lines)                   |
| `auth-sync/`                    | auth sync helper modules                          |
| `auto-all.js`                   | run all automation workflows                      |
| `ci-resume-sync.js`             | CI pipeline resume sync                           |
| `cookie-inject.js`              | inject cookies into browser                       |
| `extract-cookies-cdp.js`        | CDP cookie extraction                             |
| `extract-cookies-from-chrome.sh` | legacy chrome extraction script                   |
| `get-cookies.js`                | retrieve cookies from data store                  |
| `import-cookies-manual.js`      | manually import cookie strings                    |
| `metrics-exporter.js`           | Prometheus metrics export                         |
| `ops/`                          | operational helper scripts                        |
| `profile-sync.js`               | resume → API sync (966 lines)                     |
| `profile-sync/`                 | profile sync helper modules                       |
| `quick-login.js`                | current auth method (recommended)                 |
| `skill-tag-map.js`              | skill name → tag ID mapping                       |

## AUTH EVOLUTION

`direct-login v1-v5` → `quick-login.js` (current).

## COOKIE EXTRACTION PRIORITY

CDP (recommended) > Playwright > SQLite > Profile.

## CONVENTIONS

- All scripts run from project root.
- Use `quick-login.js` for new auth flows.
- `profile-sync/` subdirectory has 8 helper modules.

## ANTI-PATTERNS

- Never commit cookies or session files.
- Never use deprecated `direct-login` scripts.
- Never hardcode paths — use config.
