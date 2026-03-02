# AUTO-APPLY KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Playwright-based stealth auto-submission system with rate limiting and tracking.

## STRUCTURE

```text
auto-apply/
├── auto-applier.js         # UnifiedApplySystem (form fill + stealth)
├── application-manager.js  # tracking, retry, rate limiting
├── cli.js                  # CLI interface
└── index.js                # barrel export
```

## DEPENDENCIES

- `playwright-extra` + stealth plugin (required).
- `SessionManager` for cookie injection.
- `JobMatcher` scoring data for application decisions.

## CONVENTIONS

- Stealth-first: UA rotation, mouse jitter, human-like delays.
- Rate limiting enforced per platform per time window.
- Application tracking with retry logic (3 max).

## ANTI-PATTERNS

- Never use naked Playwright — always stealth plugin.
- Never skip rate limiting.
- Never bypass matching score gates.
- Never submit without valid session cookies.
