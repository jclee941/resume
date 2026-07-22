# AUTO-APPLY KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

`AutoApplier` facade plus dependency construction, filtering, approval,
tracking, browser helpers, runner/pipeline, and platform strategy routing.

## CONVENTIONS

- Inject application storage, sessions, browser factories, clocks, and platform
  strategies through `auto-applier-dependencies.js`.
- Keep filtering/approval decisions separate from browser submission transport.
- Route platform actions through `auto-applier-strategy-router.js` and
  `strategies/`; preserve platform rate limits and retry bounds.
- Dry-run and approval paths must stop before irreversible submission.
- Close browser resources on success and failure; never persist raw cookies in
  logs or reports.

## ANTI-PATTERNS

- Never bypass match, opt-in, approval, or existing-application gates.
- Never perform real submission from tests, smoke checks, or dry runs.
- Never use naked browser automation without the repository stealth/session path.
- Never hide CAPTCHA, auth expiry, or unsupported platform results as success.
- Never hardcode account identifiers, selectors, credentials, or resume IDs.

---

Parent: [../AGENTS.md](../AGENTS.md)
