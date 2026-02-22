# SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

25 utility scripts for authentication, data sync, and metrics. Run from project root.

## KEY SCRIPTS

| Script                   | Purpose                           |
| ------------------------ | --------------------------------- |
| `quick-login.js`         | current auth method (recommended) |
| `extract-cookies-cdp.js` | CDP cookie extraction             |
| `auth-sync.js`           | cookies → worker KV (846 lines)   |
| `profile-sync.js`        | resume → API sync (966 lines)     |
| `metrics-exporter.js`    | Prometheus metrics export         |

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
