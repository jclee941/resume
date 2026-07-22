# SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-06-30
**Commit:** `766d220c`
**Branch:** `master`

## OVERVIEW

Utility scripts for authentication, data sync, metrics, Telegram notification,
pipeline orchestration, and profile automation. Run from project root.

## KEY SCRIPTS

| Script                         | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `auth-persistent.js`           | persistent session management                        |
| `auth-sync.js`                 | cookies → worker KV (846 lines)                      |
| `auth-sync/`                   | auth sync helper modules                             |
| `auto-all.js`                  | run all automation workflows                         |
| `ci-resume-sync.js`            | CI pipeline resume sync                              |
| `cookie-inject.js`             | inject cookies into browser                          |
| `extract-cookies-cdp.js`       | CDP cookie extraction                                |
| `import-cookies-manual.js`     | manually import cookie strings                       |
| `metrics-exporter.js`          | Prometheus metrics export                            |
| `ops/`                         | operational helper scripts                           |
| `profile-sync.js`              | resume → API sync (966 lines)                        |
| `profile-sync/`                | profile sync helper modules                          |
| `job-search-apply-pipeline.js` | automation pipeline: search + apply + profile sync   |
| `send-jobs-telegram.js`        | Telegram job queue notification and ATS-only dry-run |
| `skill-tag-map.js`             | skill name → tag ID mapping                          |

## AUTH EVOLUTION

`direct-login v1-v5` → `auth-persistent.js` (current).

## COOKIE EXTRACTION PRIORITY

CDP (recommended) > Playwright > SQLite > Profile.

## CONVENTIONS

- All scripts run from project root.
- Use `auth-persistent.js` for auth flows.
- `profile-sync/` subdirectory has 8 helper modules + 3 test files.
- Notification dry-runs should use fixtures under `scripts/__fixtures__/` and
  must not require live Telegram credentials.

## ANTI-PATTERNS

- Never commit cookies or session files.
- Never use deprecated `direct-login` scripts (already removed).
- Never hardcode paths — use config.
- Never send non-ATS or already-filtered queues from dry-run fixtures unless
  the test explicitly covers mixed filtering behavior.

## PROFILE-SYNC PORTFOLIO FLOW

JobKorea portfolio URL registration uses `AddUserFileDB` API (not form POST):

1. `registerPortfolioUrl(page, url)` → POST `/User/Resume/AddUserFileDB` →
   returns `{ sc: 1, idx: N }`
2. `mapPortfolioToFormFields(ssot, fileIdx)` → sets `UserResume.Attach_File_Name
= "N,"`
3. Form save includes the server-generated IDX → portfolio persists

Pipeline (`job-search-apply-pipeline.js`) runs this automatically at 9am/9pm KST
via automation.

---

Parent: [../AGENTS.md](../AGENTS.md)
