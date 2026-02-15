# AUTOMATION SCRIPTS (scripts/)

**Generated:** 2026-01-30
**Commit:** 0b7a931e

## OVERVIEW

25 utility scripts for authentication, cookie management, and data synchronization.
Most scripts are experimental iterations toward stealth auth (CloudFront WAF evasion).

## CATEGORIES

| Category          | Count | Active                   | Notes                   |
| ----------------- | ----- | ------------------------ | ----------------------- |
| Auth/Login        | 10    | `quick-login.js`         | OAuth + email flows     |
| Cookie Extraction | 6     | `extract-cookies-cdp.js` | CDP, SQLite, Playwright |
| Sync              | 3     | `auth-sync.js`           | Session → Worker sync   |
| Utilities         | 6     | `metrics-exporter.js`    | Prometheus, debug       |

## WHERE TO LOOK

| Task                     | Script                     | Notes                        |
| ------------------------ | -------------------------- | ---------------------------- |
| **Quick Auth**           | `quick-login.js`           | Current recommended approach |
| **Cookie → Worker**      | `auth-sync.js`             | Syncs cookies to CF Worker   |
| **Profile Sync**         | `profile-sync.js`          | Resume data → Wanted API     |
| **Export Metrics**       | `metrics-exporter.js`      | Prometheus format export     |
| **Manual Cookie Import** | `import-cookies-manual.js` | DevTools copy/paste method   |

## SCRIPT EVOLUTION (Login)

```
direct-login.js → v2 → v3 → v4 → v5 → quick-login.js (current)
     ↓
email-login.js / google-oauth-login.js (alternative flows)
     ↓
auth-persistent.js (session persistence layer)
```

## COOKIE EXTRACTION METHODS

| Script                            | Method       | Success Rate | Notes                 |
| --------------------------------- | ------------ | ------------ | --------------------- |
| `extract-cookies-cdp.js`          | CDP Protocol | High         | Recommended           |
| `extract-cookies-playwright.js`   | Playwright   | Medium       | Browser context       |
| `extract-cookies-sqlite.js`       | SQLite DB    | Low          | Chrome profile access |
| `extract-cookies-from-profile.js` | Profile dir  | Low          | Encrypted cookies     |
| `get-cookies.js`                  | Simple       | Medium       | Basic extraction      |

## ANTI-PATTERNS

| Anti-Pattern         | Why                        | Do Instead                  |
| -------------------- | -------------------------- | --------------------------- |
| Use deprecated v1-v4 | WAF blocks them            | Use `quick-login.js`        |
| Hardcode credentials | Security violation         | Use `.env.local` or prompts |
| Skip stealth headers | 403 Forbidden              | Use BaseCrawler or CDP      |
| Direct SQLite access | Encrypted in modern Chrome | Use CDP extraction          |

## CONVENTIONS

- All scripts run from project root: `node typescript/job-automation/scripts/...`
- Credentials via `.env.local` or interactive prompts
- Output cookies to `~/.OpenCode/data/wanted-session.json`
