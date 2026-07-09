# JobKorea Sync Environment Variable Reference

## Quick Reference

| Variable                      | Default      | Values                                    | Description                                           |
| ----------------------------- | ------------ | ----------------------------------------- | ----------------------------------------------------- |
| `JOBKOREA_SYNC_MODE`          | `playwright` | `playwright`, `hybrid-api`, `api-dry-run` | Low-level sync mode; root sync scripts set this       |
| `JOBKOREA_API_FALLBACK`       | `true`       | `true`, `false`                           | Fall back to Playwright on API auth or CAPTCHA errors |
| `JOBKOREA_PORTFOLIO_OPTIONAL` | `false`      | `true`, `false`                           | Continue sync if portfolio registration fails         |
| `HEADLESS`                    | `true`       | `true`, `false`                           | Playwright headless mode                              |
| `JOBKOREA_RNO`                | —            | resume ID                                 | JobKorea resume number (required)                     |

## Required Variables

### `JOBKOREA_RNO`

Your JobKorea resume number. This is the unique identifier for the resume you
want to sync. You can find it in the URL when editing your resume on the
JobKorea website.

```bash
export JOBKOREA_RNO=12345678
```

No default is provided. The sync will fail early if this variable is missing.

## Optional Variables

### `JOBKOREA_SYNC_MODE`

Controls which sync strategy is used.

- `playwright` — Full browser automation. Most reliable but slowest.
- `hybrid-api` — API save with Playwright auth. Fast and low detection risk.
- `api-dry-run` — Read-only diff. No changes are written.

The operator default is the root script, which loads 1Password references and
sets the mode automatically:

```bash
npm run sync:jobkorea      # hybrid-api apply
npm run sync:jobkorea:dry  # api-dry-run diff
```

Set `JOBKOREA_SYNC_MODE` directly only when debugging a lower-level mode outside
the root scripts.

### `JOBKOREA_API_FALLBACK`

When running in `hybrid-api` mode, API calls can fail with auth or CAPTCHA
errors. If this variable is `true`, the sync automatically retries the failed
operation through Playwright instead of aborting.

```bash
export JOBKOREA_API_FALLBACK=true
```

Set to `false` only if you want strict API-only behavior and prefer to fail
fast on any browser-dependent challenge.

### `JOBKOREA_PORTFOLIO_OPTIONAL`

Portfolio registration is stricter than resume save and fails more often due to
file size limits or format checks. If this variable is `true`, a portfolio
failure is logged as a warning and the sync continues. If `false`, the entire
sync aborts on portfolio error.

```bash
export JOBKOREA_PORTFOLIO_OPTIONAL=true
```

### `HEADLESS`

Run Playwright in headless mode. Set to `false` when debugging CAPTCHA or
visual form fill issues. Headed mode opens a visible browser window.

```bash
export HEADLESS=false
```

## Session File Location

Authenticated sessions are persisted to disk so you do not need to log in on
every run.

```text
~/.opencode/data/sessions/jobkorea.json
```

This file contains cookies and session tokens. It is created automatically after
the first successful login. Do not commit it to source control. The directory is
already ignored by the repository `.gitignore`.

If the session expires, `npm run sync:jobkorea` renews it automatically before
saving. The standalone renewal script remains available for debugging:

```bash
node apps/job-server/scripts/renew-jobkorea-session.js
```

## HAR Output Directory

HAR capture files are written to a temporary directory during sync runs.

```text
/tmp/opencode/jobkorea-har/
```

Files are named with timestamps:

```text
/tmp/opencode/jobkorea-har/sync-2026-05-08T12-34-56-789Z.har
```

These files may contain sensitive data (cookies, tokens, form payloads). Always
run `npm run jobkorea:har:sanitize` before sharing or archiving them.
