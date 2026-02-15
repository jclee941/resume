# AUTO-APPLY MODULE

> Parent: [../AGENTS.md](../AGENTS.md)

**Updated:** 2026-01-30

## PURPOSE

Automated job application submission via Playwright browser automation.

## FILES

| File                     | Role                                               |
| ------------------------ | -------------------------------------------------- |
| `auto-applier.js`        | Playwright submission logic, form filling, stealth |
| `application-manager.js` | Status tracking, retry logic, rate limiting        |
| `cli.js`                 | CLI interface for manual triggering                |
| `index.js`               | Barrel exports                                     |

## EXPORTS

```javascript
import {
  AutoApplier,
  ApplicationManager,
  APPLICATION_STATUS,
} from "./auto-apply";
```

## STATUS ENUM

```javascript
APPLICATION_STATUS = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  FAILED: "failed",
  DUPLICATE: "duplicate",
};
```

## DEPENDENCIES

- `playwright-extra` + stealth plugin (required for anti-bot)
- Session cookies from `SessionManager`
- Job data from `matching/` service

## ANTI-PATTERNS

- **Direct playwright import**: Use `playwright-extra` with stealth
- **Skipping rate limits**: Platforms ban aggressive automation
- **Storing credentials**: Use session cookies from SessionManager
