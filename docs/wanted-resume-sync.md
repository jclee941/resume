# Wanted Resume Sync

## Overview

The `resume` Worker syncs the master resume (the SSoT
`packages/data/resumes/master/resume_data.json`, stored in JOB_DB) to the Wanted
resume through the Wanted API. The sync runs inside `ResumeSyncWorkflow`
(`apps/job-dashboard/src/workflows/resume-sync.js`), one durable step per
platform: `wanted`, `jobkorea` and `skcareers` by default, `remember` only when a
run names it.

## Architecture

```text
JOB_DB master resume → mapToWantedFormat() → Wanted API (Chaos)
                                                    ↓
                    profile, careers, educations, skills, activities,
                    language certificates, about, contact
```

The section writers live in `packages/shared/src/platform-sync/wanted/`.

Wanted keeps no role on a career, so every project under a career carries the
career's SSoT `role` as its job role (직무). The Worker sets `SYNC_STRICT=true`:
career projects and activities (certificates, awards) that the SSoT does not
have are deleted from Wanted.

## Credentials and Session

| Name                                                        | Stored in                         | Used for                             |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| `WANTED_EMAIL`, `WANTED_PASSWORD`, `WANTED_ONEID_CLIENT_ID` | `resume` Worker secrets           | minting a Wanted OneID session       |
| `ENCRYPTION_KEY`                                            | `resume` Worker secret            | AES-GCM encryption of sessions in KV |
| `auth:wanted`                                               | KV `SESSIONS`                     | the session the sync step reads      |
| target resume ID                                            | JOB_DB `resumes.target_resume_id` | which Wanted resume is updated       |
| `SKCAREERS_EMAIL`, `SKCAREERS_PASSWORD`                     | `resume` Worker secrets           | the SK Careers login of each sync    |

- `POST /job/api/wanted/refresh-session` (admin) mints a fresh session into
  `auth:wanted`.
- The daily `0 21 * * *` Cron Trigger refreshes the Wanted and JobKorea sessions
  before it starts the sync.

## Usage

### Automatic (Cloudflare Cron)

`0 21 * * *` starts `ResumeSyncWorkflow` for `wanted`, `jobkorea` and `skcareers`
as a dry run unless the Worker variable `RESUME_SYNC_CRON_DRY_RUN` is `false`. A dry run
reads the live resume and reports what would change without writing. Every run
records a `resume_sync_history` row and sends a Telegram summary. The same cron
run also starts the live Wanted `ApplicationWorkflow` auto-apply run, which submits
every new posting at or above D1 `min_match_score` (up to `max_daily_applications`),
unless auto-apply is disabled in D1 config or `AUTO_APPLY_CRON_ENABLED` is `false`.

### Manual (admin API)

The route passes the JSON body to the workflow as its parameters. Without
`"dryRun": true` the run writes to Wanted.

```bash
# Start a preview run (admin Bearer token + CSRF double-submit cookie/header)
curl -X POST https://resume.jclee.me/job/api/workflows/resume-sync \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Cookie: csrf_token=<csrf>' -H 'X-CSRF-Token: <csrf>' \
  -H 'Content-Type: application/json' \
  -d '{"platforms":["wanted"],"dryRun":true}'

# Read the run status, per-step results and output
curl -H 'Authorization: Bearer <admin-token>' \
  https://resume.jclee.me/job/api/workflows/resume-sync/<instanceId>
```

## Limitations

- Skills sync is additive only: skills missing from the SSoT are not removed on
  Wanted.
- Session minting fails when the OneID password changes or Wanted asks for extra
  verification; the step then reports the session error and writes nothing.
- Remember is synced only when a run names it (`"platforms":["remember"]`): its
  WAF answers 403 to Cloudflare egress, so the Worker run fails until that changes.
  The SSoT owns the Remember careers: careers it does not list are removed, in a
  second request after the main flag has moved to the newest SSoT career (Remember
  refuses to delete the main career).
- SK Careers keeps one resume per account with personal, education, career,
  certificate and attachment sections only. The sync fills military service,
  education, the five most recent careers and the five most recent active
  certificates (the site's limits), and keeps the account's name, email and phone.
