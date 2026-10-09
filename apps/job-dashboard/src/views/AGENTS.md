# VIEWS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Inline HTML, CSS, and script modules for the operations dashboard.

Scope reason: existing distinct template-string UI domain.

## WHERE TO LOOK

| Task               | Location                                                                     | Notes                                            |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Shell and CSP      | `dashboard.js`                                                               | HTML template, script nonce, computed style hash |
| Script composition | `scripts.js`                                                                 | Concatenates feature modules                     |
| API and actions    | `scripts/core.js`                                                            | `apiFetch` and `DASHBOARD_ACTIONS`               |
| Feature state      | `scripts/state.js`                                                           | Shared client state                              |
| Feature behavior   | `scripts/automation.js`, `scripts/applications.js`, `scripts/resume-sync.js` | Operation-specific UI                            |
| Styles             | `styles.js`, `styles/`                                                       | Variables, layout, component bundles             |

## CONVENTIONS

- Modules export template strings rather than standalone static assets.
- Wire controls with `data-action`; dispatch through the deliberate action map.
- Use `apiFetch` for the merged `/job` prefix and CSRF header behavior.
- Escape user-controlled values before HTML interpolation.
- Reuse dashboard CSS variables and component modules for dense operational layouts.
- Preserve per-response script nonce and style-hash generation over final bundle bytes.
- CSP has explicit Google identity/font allowances; the current shell bundles its own UI assets.

## ANTI-PATTERNS

- Do not add inline event-handler or style attributes that violate the page CSP.
- Do not place session tokens or webhook credentials in generated markup.
- Do not expose new browser globals outside the deliberate action interface.
- Do not move server-owned API decisions into view scripts.
- Do not assume a CSP allowlist entry means the shell currently fetches that resource.

Parent: [../AGENTS.md](../AGENTS.md)
