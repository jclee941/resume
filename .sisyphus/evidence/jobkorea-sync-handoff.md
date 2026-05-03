# JobKorea Sync — Handoff

**Status**: Auto login + CAPTCHA solver implemented; final form save blocked
on `M_MainField` (직무코드) per career — requires one-time manual code pin
through the JobKorea UI before automation can persist.
**Date**: 2026-05-03 (revised)

## Architecture summary

1. `apps/job-server/scripts/profile-sync/jobkorea-handler/captcha-solver.js`
   - Playwright downloads `/login/captcha.asp` BMP via `page.evaluate(fetch)`
     (preserves cookies)
   - BMP → PNG via Python PIL (vision model accuracy improvement)
   - cliproxy.jclee.me `/v1/chat/completions` with `gemini-2.5-flash-lite`
     (verified: T37I6U, P5L637, BI6J2H, 6C7S52 all correct vs. multimodal
     baseline)
   - Multi-model fallback chain
2. `apps/job-server/scripts/jk-auto-sync-with-captcha.mjs`
   - Cookie inject → CAPTCHA solve (auto) → credential fill → submit → verify
   - Saves cookies to both `~/.OpenCode/data/jobkorea-session.json` and
     `<repo>/jobkorea-session.json`
3. `apps/job-server/scripts/profile-sync/jobkorea-sections.js`
   - Wires SSoT `coverLetter.ko` (headline + paragraphs + closing) into
     `UserResume.M_Career_Text` (JobKorea 경력요약/자기소개서 field, 2000-char limit)
   - All 6 career entries propagated (company, period, role, description)
   - JobKorea-required `M_MainField` (직무코드) currently submitted as `''`

## Why `--apply` fails today

JobKorea's career form requires `Career[c{N}].M_MainField` per entry (직무코드,
"담당직무를 입력해주세요" error). The job-code popup is rendered by the
backbone-driven write page (`/Scripts/User/Resume/itemtemplate.js`) and there
is no unauthenticated REST endpoint that lists the code tree (we probed
`/User/Resume/GetPartCode`, `/User/Resume/GetMainField`, `/User/Resume/GetUserFileDB`,
the resource bundles, and the open-graph trace; only `GetPartCode` returns
data, and that is the company industry list, not the engineer-job tree).

Without those numeric codes the JobKorea backend rejects the save before
career rows are persisted. The cover letter and career text payload ARE
included in the form post — they just are never accepted.

## Required ONE-TIME manual step

Open JobKorea resume edit while logged in, click each career row's `직무 입력`
button, and pick the matching IT-security category (e.g. "보안엔지니어"
under 정보보안). Save after the codes are pinned. From that point on,
`change-detection.js` ALWAYS_KEEP_NEW_VALUES regex preserves the per-entry
`M_MainField` so subsequent automated `--apply` runs succeed without further
clicks.

```
# After the manual code-pin pass, fully automated:
export CLIPROXY_API_KEY=$(...)        # from jclee941/resume GitHub secret
export JOBKOREA_EMAIL=$(...)
export JOBKOREA_PASSWORD=$(...)        # use 1Password reference op://homelab/resume/jobkorea/password
node apps/job-server/scripts/jk-auto-sync-with-captcha.mjs
node apps/job-server/scripts/profile-sync/index.js jobkorea --apply
# Expected: jobkorea OK N changes
node apps/job-server/scripts/profile-sync/index.js jobkorea
# Expected: jobkorea OK 0 changes (dry-run)
```

Do NOT commit the credentials in plain text. Pull from 1Password or env.

## SSoT prepared (verified in DIFF logs)

`packages/data/resumes/master/resume_data.json`:

- `summary.profileStatement` — refined KO 9년차 OA→DevSecOps narrative
- `coverLetter.ko` — 5-paragraph 자기소개서 (headline + paragraphs + closing)
- `coverLetter.en`, `coverLetter.ja` — distributed to per-locale SSoT
- `platformVariants.jobkorea.headline` + `about` — narrative profile
- `careers[]` — 6 entries including 콴텍투자일임

DIFF observed during apply attempt confirms all 6 careers and cover-letter text
are sent in the form payload but rejected by `M_MainField` validation.

## Wanted (already synced — for reference)

```
node apps/job-server/scripts/profile-sync/index.js wanted --apply
# Result (2026-05-03): 5 changes applied
# - About → 9년차 OA→DevSecOps narrative
# - Careers (6 updated, incl. 콴텍투자일임, stale 펀엔씨 deleted)
# - Skills (+Helm, +Bash, +Go; -AWS, -Shell)
# - Mobile normalized
# Dry-run after: 0 changes (in-sync)
```

## Security note

A JobKorea password and CLIPROXY token were exposed inline during interactive
debugging in this session. Both should be rotated:

- CLIPROXY token: rotate `cliproxy-github-bot` 1Password item via
  `cliproxy` LXC's `config.local.yaml` and `docker restart cliproxyapi`,
  then update jclee941/resume GitHub secret `CLIPROXY_API_KEY`.
- JobKorea password: rotate via JobKorea web UI; update `op://homelab/resume/password`
  and `op://homelab/resume/jobkorea/password` references.
