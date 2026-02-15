# CRAWLERS KNOWLEDGE BASE (`typescript/job-automation/src/crawlers/`)

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-01-30
**Reason:** High complexity (Anti-bot evasion)

## OVERVIEW

Stealth-hardened browser automation layer using Playwright.
Implements evasive maneuvers (user-agent rotation, header injection, behavior mimicry) to bypass CloudFront WAF and platform-specific anti-bot protections.

## STRUCTURE

```
crawlers/
├── index.js            # Factory: Returns specific crawler instance
├── base-crawler.js     # BASE CLASS: Stealth patches, session management
├── wanted-crawler.js   # Wanted: Chaos API + DOM fallback
├── saramin-crawler.js  # Saramin: Job search & application
├── jobkorea-crawler.js # JobKorea: Mobile view emulation
└── linkedin-crawler.js # LinkedIn: Easy Apply automation
```

## WHERE TO LOOK

| Task                 | Location            | Notes                                |
| -------------------- | ------------------- | ------------------------------------ |
| **Stealth Logic**    | `base-crawler.js`   | `_applyStealth()` method is critical |
| **Wanted Specifics** | `wanted-crawler.js` | Handles "Chaos" API token extraction |
| **Session State**    | `~/.OpenCode/data/` | Cookies stored per platform          |
| **Factory Logic**    | `index.js`          | Resolves crawler by platform string  |

## CONVENTIONS

- **Inheritance**: ALL crawlers MUST extend `BaseCrawler`.
- **Lazy Launch**: Browser is only launched on first action, not instantiation.
- **Headless Hybrid**: Run headless by default, but support `HEADLESS=false` for debugging.
- **Selectors**: Use semantic locators (`getByRole`) over brittle CSS/XPath where possible.
- **Cookie Persistence**: Always load cookies on init; save on successful login.

## ANTI-PATTERNS

- **Naked Playwright**: NEVER use `chromium.launch()` directly. Use `this.browser` from Base.
- **Fixed User-Agent**: Always use the randomized UA provided by BaseCrawler.
- **Aggressive Polling**: Respect `minWait` delays to avoid rate limiting.
- **Ignoring WAF**: If 403/429 occurs, assume detection and halt; do not retry immediately.

## STRATEGIES

- **CloudFront Bypass**: Matches TLS fingerprinting via specific browser args.
- **WebDriver Strip**: Removes `navigator.webdriver` property.
- **Mouse Movement**: Simulates human-like jitter before clicks.
