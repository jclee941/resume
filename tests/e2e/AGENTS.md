# E2E TESTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Playwright suites exercise portfolio, dashboard, accessibility, security, and deployment surfaces.

Boundary: retained browser-runtime domain with server, locale, device, and capture contracts.

## WHERE TO LOOK

| Task                     | Location                                               | Notes                                             |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------- |
| Portfolio interaction    | `portfolio.spec.js`, `portfolio-ui.spec.js`            | Barrel plus focused behavior                      |
| Dashboard coverage       | `dashboard*.spec.js`, `job-dashboard.spec.js`          | UI and API contracts                              |
| Security and auth        | `security.spec.js`, `auth-login.spec.js`               | Policy and login behavior                         |
| Accessibility            | `accessibility*.spec.js`                               | Semantic, keyboard, axe, visual checks            |
| Device behavior          | `mobile.spec.js`, `mobile-*.spec.js`                   | Mobile-project matching differs                   |
| Deployment smoke         | `worker-health.spec.js`, `deploy-verification.spec.js` | Root smoke commands                               |
| Copy ledger              | `portfolio-public-copy-ledger*.js`                     | Capture and source-audit contracts                |
| Mock and capture helpers | `fixtures/AGENTS.md`                                   | Dashboard environment, mock sites, ledger helpers |
| Visual assertions        | `visual.spec.js`, `visual-helpers.js`                  | Local ignored baselines                           |

## CONVENTIONS

- Root configuration discovers 73 tracked specs at this snapshot; thin barrels require split helper modules.
- Chromium runs all specs; four Chromium-backed mobile projects match only `mobile.spec.js`.
- Default local base URL is `http://localhost:8787`; root Wrangler configuration serves the deployed entrypoint.
- `SKIP_WEBSERVER=1` targets the configured remote URL without starting Wrangler.
- `PLAYWRIGHT_BASE_URL` and `PORTFOLIO_LEDGER_URL` must agree when both are supplied.
- `PORTFOLIO_FORCE_NEW_SERVER=1` prevents local server reuse.
- Locale and request headers use `ko-KR` to avoid a redirect changing root-route assertions.
- Baselines are ignored materialized-content captures; `updateSnapshots: 'missing'` creates absent baselines only.
- Screenshot mismatch ratio is 0.05; retries are 2 in CI and 0 locally; traces attach on first retry.
- Run one suite with `npx playwright test <name> --project=chromium`.

## ANTI-PATTERNS

- Do not assume every `mobile-*.spec.js` runs under every mobile project.
- Do not bake the production hostname into local assertions.
- Do not use broad `describe.skip`; conditional `test.skip` must name an actual unavailable capability.
- Do not treat first-time baseline creation as a comparison against a reviewed screenshot.
- Do not remove security or accessibility checks to accommodate an environment mismatch.

---

Parent: [../AGENTS.md](../AGENTS.md)
