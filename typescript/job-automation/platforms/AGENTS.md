# JOB PLATFORMS KNOWLEDGE BASE

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-01-30

## OVERVIEW

Platform-specific stealth crawlers and automation logic for Wanted, JobKorea, Saramin, LinkedIn, and Remember.

## STRUCTURE

```
platforms/
├── wanted/          # WAF-heavy, requires manual auth
├── jobkorea/        # Legacy HTML structure
├── saramin/         # Complex dynamic loading
├── linkedin/        # Strict bot detection
└── remember/        # Mobile-first API
```

## WHERE TO LOOK

| Platform     | Location                       | Notes                               |
| ------------ | ------------------------------ | ----------------------------------- |
| **Wanted**   | `wanted/wanted-crawler.js`     | Uses `WantedAPI` + Cookie Injection |
| **JobKorea** | `jobkorea/jobkorea-crawler.js` | Cheerio-based parsing               |
| **Saramin**  | `saramin/saramin-crawler.js`   | Playwright with stealth plugin      |

## CONVENTIONS

- **Stealth First**: Always use `playwright-extra` with stealth plugin.
- **Cookie Auth**: Prefer session persistence over login forms.
- **Rate Limiting**: Respect `robots.txt` delays (min 1s between requests).

## ANTI-PATTERNS

- **Headless Mode**: Detected by Wanted/LinkedIn. Use `headless: false` or stealth.
- **Aggressive Scraping**: Triggers IP bans. Use exponential backoff.
