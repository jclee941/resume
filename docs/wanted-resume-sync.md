# Wanted Resume Sync

## Overview

The `resume` Worker syncs the master resume (the SSoT
`packages/data/resumes/master/resume_data.json`, stored in JOB_DB) to the Wanted
resume through the Wanted API. The sync runs inside `ResumeSyncWorkflow`
(`apps/job-dashboard/src/workflows/resume-sync.js`), one durable step per
platform (`wanted`, `jobkorea`).

## Architecture

```text
JOB_DB master resume → mapToWantedFormat() → Wanted API (Chaos)
                                                    ↓
                    profile, careers, educations, skills, activities,
                    language certificates, about, contact
```

The section writers live in `packages/shared/src/platform-sync/wanted/`.

## Credentials and Session

| Name                                                        | Stored in                         | Used for                             |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| `WANTED_EMAIL`, `WANTED_PASSWORD`, `WANTED_ONEID_CLIENT_ID` | `resume` Worker secrets           | minting a Wanted OneID session       |
| `ENCRYPTION_KEY`                                            | `resume` Worker secret            | AES-GCM encryption of sessions in KV |
| `auth:wanted`                                               | KV `SESSIONS`                     | the session the sync step reads      |
| target resume ID                                            | JOB_DB `resumes.target_resume_id` | which Wanted resume is updated       |

- `POST /job/api/wanted/refresh-session` (admin) mints a fresh session into
  `auth:wanted`.
- The daily `0 21 * * *` Cron Trigger refreshes the Wanted and JobKorea sessions
  before it starts the sync.

## Usage

### Automatic (Cloudflare Cron)

`0 21 * * *` starts `ResumeSyncWorkflow` for `wanted` and `jobkorea` as a dry
run unless the Worker variable `RESUME_SYNC_CRON_DRY_RUN` is `false`. A dry run
reads the live resume and reports what would change without writing. Every run
records a `resume_sync_history` row and sends a Telegram summary.

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
- Remember is not synced.
