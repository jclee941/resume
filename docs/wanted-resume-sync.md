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

| Secret / Variable          | Source                          | Where                    |
| -------------------------- | ------------------------------- | ------------------------ |
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password service account       | GitHub Secret            |
| `WANTED_COOKIES`           | Browser Cookie header           | GitHub Secret (optional) |
| `WANTED_EMAIL`             | 1Password item `homelab/resume` | 1Password load step      |
| `WANTED_PASSWORD`          | 1Password item `homelab/resume` | 1Password load step      |
| `WANTED_RESUME_ID`         | 1Password item `homelab/resume` | 1Password load step      |
| `WANTED_ONEID_CLIENT_ID`   | 1Password item `homelab/resume` | 1Password load step      |

### Setup Steps

1. Add GitHub Secret `OP_SERVICE_ACCOUNT_TOKEN` with access to the `homelab` vault.
2. Create or update the 1Password item `homelab/resume` with the fields `username`, `password`, `wanted_resume_id`, and `wanted_oneid_client_id`.
3. Optional override: add GitHub Secret `WANTED_COOKIES` only if you want to bypass password-based cookie minting.
4. For local verification, either set a cookie session with `wanted_auth({ action: 'set_cookies', cookies: '...' })` or use the same email/password against Wanted OneID before running sync.
5. Run `unified_resume_sync({ action: 'status', platforms: ['wanted'] })` to list resume IDs if you need to discover the target resume.

## Usage

### Manual (MCP)

```
wanted_auth({ action: 'set_cookies', cookies: 'cookie_string_here' })
unified_resume_sync({ action: 'sync', platforms: ['wanted'], resume_id: '...' })
```

### Automatic Cookie Minting

- If `WANTED_COOKIES` is set, the automation uses it as-is.
- If `WANTED_COOKIES` is not set, the workflow loads `WANTED_EMAIL`, `WANTED_PASSWORD`, `WANTED_RESUME_ID`, and `WANTED_ONEID_CLIENT_ID` from `op://homelab/resume/...` via `1password/load-secrets-action`.
- If `WANTED_PASSWORD` is present, the CI script requests a fresh OneID token from `https://id-api.wanted.co.kr/v1/auth/token` using `WANTED_ONEID_CLIENT_ID` and converts it to `WWW_ONEID_ACCESS_TOKEN=...` before syncing.
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
- Required configuration: `OP_SERVICE_ACCOUNT_TOKEN` plus a populated `homelab/resume` 1Password item; `WANTED_COOKIES` remains an optional GitHub Secret override

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
