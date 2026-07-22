# CRAWLERS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Unified multi-platform search facade, shared crawler primitives, plugin registry,
browser utilities, and platform factory adapters.

## STRUCTURE

```text
crawlers/
├── base-crawler.js, base-crawler/  # lifecycle, TLS, normalization helpers
├── unified/                        # UnifiedJobCrawler and platform factory
├── plugin-registry.js              # crawler registration/lifecycle
├── browser-utils.js                # shared browser helpers
└── stealth-browser-crawler.js      # stealth browser base
```

## CONVENTIONS

- Create platform implementations through the unified factory/registry path.
- Inject sessions and browser dependencies; keep platform state isolated.
- Use bounded retries, jitter, rate limits, and explicit partial-failure results.
- Prefer semantic/role/text locators; isolate unavoidable selectors inside the
  owning platform adapter.
- Normalize external job data before passing it to matching or application flows.

## ANTI-PATTERNS

- Never share cookies or browser state across platforms.
- Never use fixed user agents or aggressive polling.
- Never let one platform failure discard valid results from other platforms.
- Never make high-risk website automation the default when a safer adapter exists.

---

Parent: [../AGENTS.md](../AGENTS.md)
