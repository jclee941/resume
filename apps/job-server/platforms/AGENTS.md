# PLATFORMS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Platform-specific crawler implementations. Each platform has unique anti-detection requirements.

## PLATFORMS

| Platform    | Method             | Detection | Notes                 |
| ----------- | ------------------ | --------- | --------------------- |
| `wanted/`   | WAF + manual auth  | Medium    | stealth required      |
| `jobkorea/` | Cheerio            | Low       | HTML parsing          |
| `saramin/`  | Playwright+stealth | Medium    | bot detection active  |
| `linkedin/` | strict detection   | High      | fragile, rate-limited |
| `remember/` | mobile API         | Low       | planned               |

## CONVENTIONS

- Stealth-first approach for all Playwright platforms.
- Cookie-based authentication.
- Rate limiting per platform.

## ANTI-PATTERNS

- Never use headless-only for Wanted/LinkedIn (detected).
- Never aggressive scraping — triggers permanent bans.
- Never share cookies across platforms.
