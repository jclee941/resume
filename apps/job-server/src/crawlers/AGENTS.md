# CRAWLERS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Stealth Playwright crawling layer. BaseCrawler provides anti-detection; platform subclasses implement scraping logic.

## STRUCTURE

```text
crawlers/
├── base-crawler.js     # stealth patches, UA rotation, 1s+ jitter
├── index.js            # factory (createCrawler)
├── wanted/             # Wanted Korea crawler
├── saramin/            # Saramin crawler
├── jobkorea/           # JobKorea crawler
└── linkedin/           # LinkedIn crawler (fragile)
```

## STEALTH STACK

- `rebrowser-puppeteer` + custom stealth patches.
- UA rotation from curated pool.
- WebDriver property stripping.
- Mouse jitter + human-like delays.
- TLS fingerprint for CloudFront bypass.
- Lazy browser launch, headless hybrid mode.

## CONVENTIONS

- 1s+ jitter between requests, 3 retries max.
- Semantic locators (text, role) over CSS selectors.
- Cookie persistence via SessionManager.
- Factory pattern: `createCrawler(platform)` in `index.js`.

## ANTI-PATTERNS

- Never use naked Playwright/Puppeteer.
- Never use fixed UA strings.
- Never aggressive polling — always jitter.
- Never hardcode selectors — use semantic locators.
