# Technical Debt Resolution - 2026-07-06

This note records the tracked resolution evidence for the July 2026 deferred
technical-debt cleanup.

## Resolved Items

| ID             | Resolution                                                                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUDIT-002`    | Replaced the vulnerable Lighthouse 13 dependency path with `lighthouse@12.6.1`, the npm-audit-compatible version that avoids the vulnerable Sentry/OpenTelemetry chain.                                                                                                 | `npm audit --json --audit-level=moderate` reports 0 vulnerabilities.                                                                                                                                                          |
| `OVERSIZE-001` | Split touched crawler/profile-sync and Worker preamble generation into focused helper modules so modified active source files stay below the 200 pure-LOC ceiling.                                                                                                      | `remember-profile-sync.js` 197 pure LOC, `remember-profile-sections.js` 111, `jobkorea-crawler.js` 199, `jobkorea-crawler-utils.js` 80, `worker-preamble.js` 51, `worker-runtime-helpers.js` 171.                             |
| `PERF-001`     | Removed the large inline resume JSON payload from portfolio HTML, served locale data through JSON routes, added gzip response handling with `q=0` negotiation, delayed Google Tag Manager until post-load idle time, and restored hash scrolling after async hydration. | Local Worker `/` gzip body: 37,884 bytes; `/resume-data.json` gzip response contains 6 careers and 7 skill groups; current Lighthouse evidence is stored at `.omo/evidence/deferred-tech-debt-20260706/lighthouse-local.txt`. |

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:portfolio`
- `npm run test:e2e` -> 469 passed, 9 skipped
- `node --test apps/job-server/platforms/__tests__/browser-readiness.test.js apps/job-server/platforms/__tests__/get-job-detail.test.js apps/job-server/platforms/jobkorea/__tests__/jobkorea-crawler.test.js`
- Local Worker browser QA with Chromium: resume data loaded, 6 timeline nodes rendered, 7 skill groups rendered, no mobile horizontal overflow.
- `.omo/evidence/tech-debt-qa-20260705/manualQa.md` is stale and superseded by the 2026-07-06 evidence set; it referenced Lighthouse 13 after this cleanup pinned Lighthouse 12.6.1.

## Scope Notes

- `apps/portfolio/worker.js` remained unchanged in git diff; all portfolio Worker changes were made in source generators or runtime source files.
- `design-state.md` was pre-existing untracked local state and was intentionally left out of this cleanup commit.
