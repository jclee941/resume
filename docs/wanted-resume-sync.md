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

| Secret             | Source             | Where                          |
| ------------------ | ------------------ | ------------------------------ |
| `WANTED_EMAIL`     | `qws941@kakao.com` | GitHub Secrets (via 1Password) |
| `WANTED_PASSWORD`  | 1Password vault    | GitHub Secrets (via 1Password) |
| `WANTED_RESUME_ID` | Wanted platform    | GitHub Repository Variable     |

### Setup Steps

1. Store credentials in 1Password vault `homelab` as item `wanted-credentials`
2. Add GitHub Secrets: `WANTED_EMAIL`, `WANTED_PASSWORD`
3. Get resume ID: run `wanted_auth({ action: 'login', email: '...', password: '...' })` then `unified_resume_sync({ action: 'status', platforms: ['wanted'] })` to list resume IDs
4. Set GitHub variable: `WANTED_RESUME_ID` = the target resume ID

## Usage

### Manual (MCP)

```
wanted_auth({ action: 'login', email: 'qws941@kakao.com', password: '...' })
unified_resume_sync({ action: 'sync', platforms: ['wanted'], resume_id: '...' })
```

### Manual (HTTP API)

```bash
# Login
curl -X POST http://localhost:3000/job/api/auth/set -H 'Content-Type: application/json' -d '{"platform":"wanted","email":"...","password":"..."}'
# Sync
curl -X POST http://localhost:3000/job/api/resume-sync/sync -H 'Content-Type: application/json' -d '{"platforms":["wanted"],"resume_id":"..."}'
```

### Automated (GitHub Actions)

- Workflow: `.github/workflows/wanted-resume-sync.yml`
- Schedule: Weekly Sunday 12:00 KST
- Manual trigger: `workflow_dispatch` with optional `dry_run` and `resume_id`

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
- Wanted API login may have rate limits or CAPTCHA triggers
