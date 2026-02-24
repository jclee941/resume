# PROJECT KNOWLEDGE BASE

## OVERVIEW

Playwright end-to-end test suite for portfolio, dashboard, security, accessibility, and deployment verification paths.

## WHERE TO LOOK

| Task                        | Location                                                                           | Notes                               |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| Baseline portfolio behavior | `portfolio.spec.js`, `portfolio-ui.spec.js`                                        | core UI and interaction coverage    |
| Dashboard/MCP behavior      | `job-dashboard.spec.js`, `mcp-server.spec.js`, `dashboard.spec.js`                 | job automation and API-facing flows |
| Security and auth checks    | `security.spec.js`, `deploy-verification.spec.js`                                  | policy and endpoint validation      |
| Accessibility gates         | `accessibility.spec.js`, `accessibility-axe.spec.js`, `accessibility-wcag.spec.js` | a11y compliance checks              |
| Mobile and performance      | `mobile.spec.js`, `mobile-responsive.spec.js`, `performance.spec.js`               | device and perf expectations        |
| Visual regression           | `visual.spec.js`, `visual-regression.spec.js`, `visual.spec.js-snapshots/`         | snapshot-based UI drift detection   |
| Shared E2E helpers          | `fixtures/helpers.js`                                                              | common setup/helper utilities       |

## CONVENTIONS

- Use `*.spec.js` naming for Playwright tests in this directory.
- Prefer resilient locators and deterministic waits.
- Use `domcontentloaded` for page load state in this project.
- Keep test flows independent; avoid cross-test state coupling.
- Co-locate visual snapshots under `visual.spec.js-snapshots/` only.

## ANTI-PATTERNS

- Never use `networkidle` as a required load state for terminal-animation pages.
- Never rely on arbitrary sleep-heavy timing in place of explicit conditions.
- Never hardcode environment-specific host assumptions inside test bodies.
- Never commit broad `.skip`/`.only` patterns in shared E2E specs.
- Never bypass security/accessibility suites to force green pipelines.

## NOTES

- E2E runtime behavior is sensitive to animations and async widget loading; keep assertions phase-aware.
- Update snapshots intentionally with review when UI semantics change.
