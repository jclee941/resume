# Wanted Resume Sync

## Overview

Automated sync of `packages/data/resumes/master/resume_data.json` (SSoT) to Wanted Korea resume platform via API.

## Architecture

```
resume_data.json (SSoT) → mapToWantedFormat() → Wanted API (Chaos)
                                                       ↓
                                                  Profile + Careers + Education + Skills
```

## Credentials

| Secret / Variable        | Source                  | Where                      |
| ------------------------ | ----------------------- | -------------------------- |
| `WANTED_EMAIL`           | Wanted account email    | GitHub Secret              |
| `WANTED_COOKIES`         | Browser Cookie header   | GitHub Secret (optional)   |
| `WANTED_PASSWORD`        | Wanted OneID password   | GitHub Secret (fallback)   |
| `WANTED_RESUME_ID`       | Wanted platform         | GitHub Repository Variable |
| `WANTED_ONEID_CLIENT_ID` | Wanted OneID login page | GitHub Repository Variable |

### Setup Steps

1. Add GitHub Secret `WANTED_EMAIL` and GitHub variables `WANTED_RESUME_ID`, `WANTED_ONEID_CLIENT_ID`.
2. Choose one auth mode:
   - Preferred: add `WANTED_COOKIES` with the full browser `Cookie` header copied from an authenticated Wanted request.
   - Fallback: add `WANTED_PASSWORD` and let the CI script mint `WWW_ONEID_ACCESS_TOKEN` automatically.
3. For local verification, either set a cookie session with `wanted_auth({ action: 'set_cookies', cookies: '...' })` or use the same email/password against Wanted OneID before running sync.
4. Run `unified_resume_sync({ action: 'status', platforms: ['wanted'] })` to list resume IDs if you need to discover the target resume.

## Usage

### Manual (MCP)

```
wanted_auth({ action: 'set_cookies', cookies: 'cookie_string_here' })
unified_resume_sync({ action: 'sync', platforms: ['wanted'], resume_id: '...' })
```

### Automatic Cookie Minting

- If `WANTED_COOKIES` is set, the automation uses it as-is.
- If `WANTED_COOKIES` is not set but `WANTED_PASSWORD` is present, the CI script requests a fresh OneID token from `https://id-api.wanted.co.kr/v1/auth/token` using `WANTED_ONEID_CLIENT_ID` and converts it to `WWW_ONEID_ACCESS_TOKEN=...` before syncing.
- If neither `WANTED_COOKIES` nor `WANTED_PASSWORD` is present, the workflow fails during configuration validation.

### Manual (HTTP API)

```bash
# Trigger single-worker profile sync alias
curl -X POST https://resume.jclee.me/api/automation/resume-update \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin-token>' \
  -d '{"platforms":["wanted"],"resume_id":"...","dryRun":true}'

# Poll sync status
curl -H 'Authorization: Bearer <admin-token>' \
  https://resume.jclee.me/api/automation/resume-update/<syncId>
```

### Automated (GitHub Actions)

- Workflow: `.github/workflows/wanted-resume-sync.yml`
- Schedule: Weekly Sunday 12:00 KST
- Manual trigger: `workflow_dispatch` with optional `dry_run` and `resume_id`
- Required configuration: `WANTED_EMAIL`, `WANTED_RESUME_ID`, and either `WANTED_COOKIES` or `WANTED_PASSWORD`; password fallback also requires `WANTED_ONEID_CLIENT_ID`

## Synced Sections

| Section   | API               | Method               |
| --------- | ----------------- | -------------------- |
| Profile   | SNS Profile API   | PATCH                |
| Careers   | Chaos Resumes API | PUT/POST per entry   |
| Education | Chaos Resumes API | PUT/POST per entry   |
| Skills    | Chaos Resumes API | POST (additive only) |

## Limitations

- Skills sync is additive only (does not delete remote skills not in SSoT)
- JobKorea and Remember require browser automation (not implemented)
- Cookie-based auth can still fail when the OneID password changes or additional verification is required
