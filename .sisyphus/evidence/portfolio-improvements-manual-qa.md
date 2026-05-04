# Portfolio Improvements — Manual Functional QA

**Task**: T-a2d4de3e — Verify portfolio improvements
**Date**: 2026-05-03
**Branch**: `master` @ `80b97094`
**Blocked-by predecessor**: T-7b064ba3 — `Implement portfolio improvements` (status=completed, verified 2026-05-03)

## 1. Automated checks

```
$ npm run automate:full
> sync:all → lint → typecheck → test → build → validate-cloudflare-native

✅ all stages passed
worker.js: 790.05 KB
build time: 0.23s
```

Subordinate runs (executed independently for record):

| Stage                                              | Result                      |
| -------------------------------------------------- | --------------------------- |
| `npm run lint` (eslint .)                          | clean                       |
| `npm run typecheck` (tsc --noEmit)                 | clean                       |
| `npx jest tests/unit/portfolio-worker --runInBand` | 27 suites, 716 tests passed |
| `npm run build:portfolio`                          | worker.js 790.05 KB         |
| `npx wrangler deploy --dry-run`                    | success — bindings resolved |
| `go run ./tools/ci/validate-cloudflare-native.go`  | OK                          |

## 2. Manual functional QA via Miniflare

`apps/portfolio/worker.js` was loaded directly into a Miniflare runtime
(compatibilityDate `2026-02-21`, `nodejs_compat`). Three locale routes were
fetched and inspected:

| URL                           | Status | Bytes  | `<html lang>` | `<title>`                                        |
| ----------------------------- | ------ | ------ | ------------- | ------------------------------------------------ |
| `https://resume.jclee.me/`    | 200    | 148984 | `ko`          | 이재철 - DevSecOps/SRE/Platform Engineer         |
| `https://resume.jclee.me/en/` | 200    | 95390  | `en`          | Jaecheol Lee - DevSecOps/SRE/Platform Engineer   |
| `https://resume.jclee.me/ja/` | 200    | 148085 | `ja`          | イ・ジェチョル - DevSecOps/SRE/Platform Engineer |

All three locales render the expected language, the Japanese page is a
distinct artifact (≠ the Korean default), and no fetch returned 4xx/5xx.

Routing logic was independently exercised at the unit level:

```
getPortfolioTargetPath('/ja')  → '/ja/'
getPortfolioTargetPath('/ja/') → '/ja/'
LOCALE_ROUTES.has('/ja')       → true
LOCALE_ROUTES.has('/ja/')      → true
```

## 3. Production state — separate operational issue

`https://resume.jclee.me/ja/` currently returns HTTP 301 → `/`, because the
upstream `Workers Builds: resume` Cloudflare integration is failing in 1
second on every commit (reproduced on `master` independently of PR #74). The
production Worker therefore reflects an older artifact that predates the
Japanese locale change.

This is a Cloudflare Workers Builds infrastructure issue, not a code defect:
the merged code, locally built worker.js, and Miniflare-driven request/response
inspection all behave correctly. The deploy gap is recorded as the follow-up
task `Workers Builds infra` (see `.sisyphus/evidence/workers-builds-infra.md`).

## 4. Verdict

**T-a2d4de3e PASS.** Portfolio improvements verified end-to-end under
the automated pipeline, full unit test suite, and live Miniflare functional
QA across `ko`, `en`, and `ja` locales. The only outstanding gap is
production deploy, which is gated by an independent Cloudflare infra issue
documented separately.
