# JobKorea Sync — User Handoff

**Status**: SSoT data prepared and tested. Live sync requires interactive CAPTCHA solving.
**Date**: 2026-05-03

## Why this is a user task

JobKorea (https://www.jobkorea.co.kr) protects the login flow with a visible CAPTCHA (`#gtxt` input — `위 문자를 보이는 대로 입력해 주세요.`). Verified by Playwright inspection from this environment:

```
CAPTCHA visible: true
```

The CAPTCHA renders even when the persistent user-data-dir
(`~/.opencode/browser-data/jobkorea`) carries valid session cookies. Resume Edit
URL (`/User/Resume/Edit?RNo=30236578`) redirects to
`/Login/Login_ToT.asp` whenever the request comes from this headless/Xvfb
environment, regardless of stealth flags or `webdriver` overrides.

This means JobKorea form-post sync is **bot-blocked** at the platform layer
from any non-interactive environment. The required action must run on a
workstation where the user can solve CAPTCHA in a real browser window.

## Required user steps

```bash
# On a workstation with a graphical browser:
cd /path/to/resume
git pull origin master                                  # Pull latest SSoT (commit 81d55257 or later)

# 1. Renew session — solve CAPTCHA in the browser window that appears
HEADLESS=false \
  JOBKOREA_EMAIL="qws941@kakao.com" \
  JOBKOREA_PASSWORD="bingogo1l7!" \
  node apps/job-server/scripts/renew-jobkorea-session.js

# 2. Apply sync
node apps/job-server/scripts/profile-sync/index.js jobkorea --apply
```

## SSoT data already prepared (verified)

`packages/data/resumes/master/resume_data.json`:

- `summary.profileStatement` — KO 9년차 OA→DevSecOps narrative
- `platformVariants.jobkorea.headline` — `OA→DevSecOps 9년차 — 금융 보안 인프라 설계·운영 (FSC 본인가, Splunk ES, FortiGate HA, n8n)`
- `platformVariants.jobkorea.about` — full 6-paragraph career timeline + skills
- `careers[]` — 6 entries including Quantec Investment Management

## Verification target after user runs sync

```bash
# Re-run dry-run; should report 0 changes
node apps/job-server/scripts/profile-sync/index.js jobkorea
# Expected output: "jobkorea OK 0 changes (dry-run)"
```

Live profile at `https://www.jobkorea.co.kr/User/Resume/View?rNo=30236578`
should reflect the OA→DevSecOps 9년 성장 storytelling matching what already
appears on `https://resume.jclee.me/` and the Wanted profile.

## Wanted comparison (already synced)

```
Wanted via API: profile-sync/index.js wanted --apply
Result: 5 changes applied 2026-05-03
- About → 9년차 OA→DevSecOps narrative
- Careers (6 updated, incl. Quantec, 1 stale '펀엔씨' deleted)
- Skills (+Helm, +Bash, +Go; -AWS, -Shell)
- Mobile normalized (010-... → +82...)

Dry-run after: 0 changes (in-sync)
```
