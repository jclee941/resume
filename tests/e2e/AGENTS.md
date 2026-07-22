# E2E TESTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Playwright end-to-end suite for portfolio, dashboard, security, accessibility,
and deployment verification. It discovers 39 specs across desktop Chromium and
four Chromium-backed mobile profiles (iPhone SE, iPhone 12 Pro, Pixel 5, iPad).
Local runs default to `http://localhost:8787`; production verification sets
`SKIP_WEBSERVER=1` and `PLAYWRIGHT_BASE_URL=https://resume.jclee.me`.

## WHERE TO LOOK

| Task                        | Location                                                                           | Notes                               |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| Baseline portfolio behavior | `portfolio.spec.js`, `portfolio-ui.spec.js`                                        | core UI and interaction coverage    |
| Dashboard/MCP behavior      | `job-dashboard.spec.js`, `mcp-server.spec.js`, `dashboard.spec.js`                 | job automation and API-facing flows |
| Security and auth checks    | `security.spec.js`, `deploy-verification.spec.js`                                  | policy and endpoint validation      |
| Accessibility gates         | `accessibility.spec.js`, `accessibility-axe.spec.js`, `accessibility-wcag.spec.js` | a11y compliance checks              |
| Mobile and performance      | `mobile.spec.js`, `mobile-responsive.spec.js`, `performance.spec.js`               | device and perf expectations        |
| SEO/i18n behavior           | `seo.spec.js`, `seo-hreflang.spec.js`                                              | metadata, canonical, locale links   |
| Visual regression           | `visual.spec.js`, `visual.spec.js-snapshots/`                                      | snapshot-based UI drift detection   |
| Shared E2E helpers          | `fixtures/helpers.js`                                                              | common setup/helper utilities       |

## CONVENTIONS

- Use `*.spec.js` naming for Playwright tests in this directory.
- Prefer resilient locators (data-testid, role-based) and deterministic waits.
- Use `domcontentloaded` for page load state; avoid `networkidle` on portfolio pages.
- Keep test flows independent; avoid cross-test state coupling.
- Co-locate visual snapshots under `visual.spec.js-snapshots/` only.
- Mobile specs match `mobile.spec.js` pattern; desktop specs run on Chromium.
- Production verification sets `SKIP_WEBSERVER=1` and `PLAYWRIGHT_BASE_URL=https://resume.jclee.me`; local specs should not bake that host into assertions.

## ANTI-PATTERNS

- Never use `networkidle` as a required load state for portfolio pages (async widgets and animations cause timeouts).
- Never rely on arbitrary sleep-heavy timing in place of explicit conditions.
- Never hardcode environment-specific host assumptions inside test bodies.
- Never commit broad `.skip`/`.only` patterns in shared E2E specs.
- Never bypass security/accessibility suites to force green pipelines.
- Never use `describe.skip` — use runtime `test.skip` for conditional skips.

## NOTES

- E2E runtime behavior is sensitive to animations and async widget loading; keep assertions phase-aware.
- Update snapshots intentionally with review when UI semantics change.
- Retries: 2 in CI, 0 locally; use `test.skip()` for known flaky tests pending fixes.

---

Parent: [../AGENTS.md](../AGENTS.md)
