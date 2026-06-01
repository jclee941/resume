# JobKorea Profile Sync Runbook

## Overview

The JobKorea profile sync keeps your resume and portfolio data in sync with the
JobKorea platform. It reads from the single source of truth
(`packages/data/resumes/master/resume_data.json`) and pushes changes to 87
fields across multiple resume sections.

### Why Hybrid Mode Exists

Playwright form filling is reliable but slow and triggers bot detection when
run too frequently. Hybrid mode uses direct HTTP POST calls for the actual save
operations while keeping Playwright only for authentication, session renewal,
and CAPTCHA handling. This cuts sync time dramatically and lowers detection
risk.

### Three Execution Modes

| Mode                   | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `playwright` (default) | Full Playwright form fill. Slowest but most reliable.                            |
| `hybrid-api`           | Playwright for auth and CAPTCHA, direct API for save and portfolio registration. |
| `api-dry-run`          | Diff detection only. No writes. Useful for verifying what would change.          |

## Architecture

### Playwright Layer

Handles everything that requires a real browser context:

- **Authentication** — Login with ID and password, cookie extraction.
- **Session renewal** — Detects expired sessions and re-authenticates.
- **CAPTCHA** — Triggers human-in-the-loop solving when challenged.
- **Section slot creation** — Adds new DOM elements for multi-row sections
  (career, education, certificates) before filling them.
- **Change detection** — Compares current page values with source data to skip
  unchanged fields.

### API Layer

Direct HTTP clients that bypass the UI:

- **Save API** — POSTs form-encoded resume data to `/resume/ResumeUpdate.asp`.
- **Portfolio API** — POSTs portfolio registration to
  `/portfolio/PortfolioRegistration.asp`.
- **Payload encoding** — Handles EUC-KR encoding, form serialization, and hidden
  field injection.
- **Session management** — Maintains a cookie jar from Playwright auth and
  attaches it to API requests.

### Fallback

When the API layer encounters an auth or CAPTCHA error, it automatically falls
back to the Playwright layer if `JOBKOREA_API_FALLBACK` is `true` (default).
This means hybrid mode degrades gracefully into full Playwright mode rather than
failing outright.

## Files

| File                  | Role                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `sync.js`             | Main orchestrator. Chooses mode, runs change detection, triggers save and portfolio registration.                   |
| `sync-hybrid.js`      | Hybrid mode helpers. Bridges Playwright auth with API save operations.                                              |
| `api-client.js`       | Direct API client for resume save and portfolio registration endpoints.                                             |
| `api-payload.js`      | Payload encoding. Converts resume data to EUC-KR form fields and injects hidden tokens.                             |
| `api-errors.js`       | Error classification. Distinguishes auth errors, CAPTCHA blocks, validation failures, and transient network issues. |
| `api-session.js`      | Cookie session management. Extracts cookies from Playwright and attaches them to fetch calls.                       |
| `session.js`          | Playwright session management. Login flow, cookie persistence, and renewal logic.                                   |
| `har-capture.js`      | Captures HAR archives during Playwright runs for later analysis.                                                    |
| `har-analyze.js`      | Parses captured HAR files to extract request patterns, headers, and payloads.                                       |
| `har-sanitize.js`     | Removes PII, cookies, and tokens from HAR files before sharing or committing.                                       |
| `change-detection.js` | Diff detection. Compares current page or API state with source data to produce a change set.                        |
| `section-slots.js`    | DOM slot creation. Adds new rows to repeatable sections (career, education, certificates) in the Playwright page.   |

## Environment Variables

- `JOBKOREA_SYNC_MODE` — Mode selection (`playwright`, `hybrid-api`,
  `api-dry-run`).
- `JOBKOREA_API_FALLBACK` — Enable Playwright fallback on API auth or CAPTCHA
  errors (`true` by default).
- `JOBKOREA_PORTFOLIO_OPTIONAL` — Continue sync even if portfolio registration
  fails (`false` by default).
- `HEADLESS` — Run Playwright in headless mode (`true` by default).
- `JOBKOREA_RNO` — JobKorea resume number (required).

See [ENV_REFERENCE.md](ENV_REFERENCE.md) for the full reference.

## Usage

```bash
# Default (Playwright full form fill)
npm run jobkorea:sync

# Hybrid mode (API save + Playwright auth)
JOBKOREA_SYNC_MODE=hybrid-api npm run jobkorea:sync

# Dry-run (diff only, no save)
JOBKOREA_SYNC_MODE=api-dry-run npm run jobkorea:sync

# HAR capture for analysis
npm run jobkorea:har:capture

# API tests
npm run jobkorea:api:test

# Hybrid tests
npm run jobkorea:sync:hybrid:test

# All JobKorea tests
npm run jobkorea:test:all
```

## Troubleshooting

### Session Expired

Symptom: Login redirect loop or "session expired" message.

Fix: Run the session renewal script.

```bash
node scripts/profile-sync/jobkorea-handler/renew-jobkorea-session.js
```

### CAPTCHA Detected

Symptom: API returns a CAPTCHA challenge or HTML instead of JSON.

Fix: Hybrid mode falls back to Playwright automatically when
`JOBKOREA_API_FALLBACK=true`. If you are running API-only mode, switch to
`hybrid-api` or `playwright`.

### API Blocked (403)

Symptom: API save returns HTTP 403 or connection reset.

Cause: TLS fingerprinting or bot detection at the CDN edge.

Fix: The current client uses standard `fetch`. If detection escalates, switch to
`curl_cffi` or another impersonation library that mimics a real browser TLS
fingerprint. Update `api-client.js` to use the new transport.

### Save Failed

Symptom: API returns 200 but the response body contains `ErrorMessage` or
validation errors.

Fix: Check the logs for the exact `ErrorMessage` field. Common causes are:

- Missing required hidden fields (check `api-payload.js` token injection).
- Invalid date format (JobKorea expects `YYYY-MM-DD` or `YYYY-MM` depending on
  the field).
- Exceeding max length for text areas.

## HAR Analysis Workflow

Use this workflow when JobKorea changes their form structure or API endpoints.

### 1. Capture HAR

```bash
npm run jobkorea:har:capture
```

Runs a full sync with HAR recording enabled. Output goes to
`/tmp/opencode/jobkorea-har/`.

### 2. Sanitize

```bash
npm run jobkorea:har:sanitize -- /tmp/opencode/jobkorea-har/sync-*.har
```

Strips cookies, tokens, and PII from the HAR so it is safe to share or commit.

### 3. Analyze

```bash
npm run jobkorea:har:analyze -- /tmp/opencode/jobkorea-har/sync-*.har
```

Extracts request URLs, headers, payloads, and response bodies. Compare the
output with the fixtures in `__fixtures__/` to spot schema drift.

### 4. Compare with Fixtures

```bash
diff <(npm run jobkorea:har:analyze -- capture.har) \
     scripts/profile-sync/__fixtures__/expected-save-payload.txt
```

If the diff shows new hidden fields, updated endpoints, or changed encoding,
update `api-payload.js` and `api-client.js` accordingly. Add new fixtures to
`__fixtures__/` so future captures can be compared automatically.
