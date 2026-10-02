# Wanted Resume Sync

## Overview

The `resume` Worker syncs the master resume (the SSoT
`packages/data/resumes/master/resume_data.json`, stored in JOB_DB) to the Wanted
resume through the Wanted API. The sync runs inside `ResumeSyncWorkflow`
(`apps/job-dashboard/src/workflows/resume-sync.js`), one durable step per
platform: `wanted`, `jobkorea`, `skcareers` and `remember` by default.

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
- `POST /job/api/jobkorea/refresh-session` (admin) logs in to JobKorea through Browser Rendering
  and stores the session in `auth:jobkorea` for 6 hours. The login is submitted with JobKorea's IP
  security (IP보안) off: later runs replay the session from other Browser Rendering browsers, which
  leave from other IPs, and a session bound to the login IP stalls there.
- The daily `0 21 * * *` Cron Trigger refreshes the Wanted and JobKorea sessions
  before it starts the sync.

## Usage

### Automatic (Cloudflare Cron)

`0 21 * * *` starts `ResumeSyncWorkflow` for `wanted`, `jobkorea`, `skcareers` and `remember`
as a dry run unless the Worker variable `RESUME_SYNC_CRON_DRY_RUN` is `false`. A dry run
reads the live resume and reports what would change without writing. Every run
records a `resume_sync_history` row and sends a Telegram summary. The same cron
run also starts the live auto-apply run on Wanted and Remember
([Auto-apply](guides/INFRASTRUCTURE.md#auto-apply)).

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
- Remember is on the daily cron (sync and auto-apply) and reaches its API through
  the Cloudflare Browser Rendering REST API (see below), because its WAF answers
  403 to Cloudflare's Worker and Browser Rendering binding IP ranges. The SSoT owns
  the Remember careers: careers it does not list are removed, in a second request
  after the main flag has moved to the newest SSoT career (Remember refuses to
  delete the main career).

## Remember over Browser Rendering REST

Remember's Cloudflare WAF answers 403 to Cloudflare's Worker and Browser Rendering
_binding_ IP ranges, but the Browser Rendering _REST_ API runs on infrastructure
Remember accepts. So every Remember request is replayed from a Browser Rendering
REST page, entirely Cloudflare-native (no outside host).

- `rememberFetch(env)` returns a Browser Rendering REST fetch when
  `REMEMBER_BROWSER_ACCOUNT_ID` and `REMEMBER_BROWSER_API_TOKEN` (a token with
  Browser Run Write) are set, and a plain `fetch` otherwise. Each Remember call
  (login, profile sync, search, apply) loads `/robots.txt` on the right origin
  (`rememberapp.co.kr` for login, `career.rememberapp.co.kr` for the APIs — a stable
  page that does not redirect), injects a main-world script that runs the request as
  a page `fetch`, and reads the base64 result back from the DOM. The login token
  comes from the response body (`data.device.token`), so no cookie is read; the
  `Cookie` request header (the device id) is applied through the REST `cookies`
  option.
- SK Careers keeps one resume per account with personal, education, career,
  certificate and attachment sections only. The sync fills military service,
  education, the five most recent careers and the five most recent active
  certificates (the site's limits), and keeps the account's name, email and phone.
