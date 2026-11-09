# Technical Debt Resolution - 2026-07-06

This note records the tracked resolution evidence for the July 2026 deferred
technical-debt cleanup.

> Historical resolution record dated 2026-07-06. The evidence below is the
> recorded result of that cleanup; consult current source and CI for present state.

## Resolved Items

### `AUDIT-002`

Replaced the Lighthouse 13 dependency path with `lighthouse@12.6.1` to avoid the
recorded vulnerable Sentry/OpenTelemetry dependency chain.

**Recorded evidence:** `npm audit --json --audit-level=moderate` reported no
vulnerabilities.

### `OVERSIZE-001`

Split touched crawler/profile-sync and Worker preamble generation into focused
helper modules so modified active source files stayed below the 200 pure-LOC
ceiling.

**Recorded source sizes:** `remember-profile-sync.js` 197 LOC;
`remember-profile-sections.js` 111; `jobkorea-crawler.js` 199;
`jobkorea-crawler-utils.js` 80; `worker-preamble.js` 51; and
`worker-runtime-helpers.js` 171.

### `PERF-001`

Removed the inline resume JSON payload from portfolio HTML, served locale data
through JSON routes, added gzip negotiation including `q=0`, delayed Google Tag
Manager until post-load idle time, and restored hash scrolling after async
hydration.

**Recorded local evidence:** the Worker `/` gzip body was 37,884 bytes;
`/resume-data.json` contained 6 careers and 7 skill groups. Lighthouse evidence
was stored at
`.omo/evidence/deferred-tech-debt-20260706/lighthouse-local.txt`.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:portfolio`
- `npm run test:e2e` -> 469 passed, 9 skipped
- Local Worker browser QA with Chromium: resume data loaded, 6 timeline nodes rendered, 7 skill groups rendered, no mobile horizontal overflow.
- `.omo/evidence/tech-debt-qa-20260705/manualQa.md` is stale and superseded by the 2026-07-06 evidence set; it referenced Lighthouse 13 after this cleanup pinned Lighthouse 12.6.1.

Focused platform tests were recorded with:

```sh
node --test \
  apps/job-server/platforms/__tests__/browser-readiness.test.js \
  apps/job-server/platforms/__tests__/get-job-detail.test.js \
  apps/job-server/platforms/jobkorea/__tests__/jobkorea-crawler.test.js
```

## Scope Notes

- `apps/portfolio/worker.js` remained unchanged in git diff; all portfolio Worker changes were made in source generators or runtime source files.
- `design-state.md` was pre-existing untracked local state and was intentionally left out of this cleanup commit.
