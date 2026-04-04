# SHARED PACKAGE KNOWLEDGE BASE

**Package:** `@resume/shared`  
**Type:** Cross-package utilities  
**Scope:** Shared clients, services, and utilities used across apps

## OVERVIEW

Internal shared utilities package providing cross-cutting concerns: logging, error handling, API clients (GitLab, Wanted, Elasticsearch), browser automation, and data transformers. Consumed by `apps/job-server/` and other packages.

## STRUCTURE

```text
packages/shared/
├── src/
│   ├── errors/           # Custom error classes
│   ├── logger/           # Structured logging (pino-based)
│   ├── clients/
│   │   ├── gitlab/       # GitLab API client
│   │   └── elasticsearch/# ES client wrapper
│   ├── browser/          # Playwright browser service + stealth patches
│   ├── wanted-client.js  # Wanted.kr API client
│   ├── wanted-*.js       # Wanted profile/resume/skill APIs
│   ├── phone.js          # Phone number utilities
│   ├── ua.js             # User-Agent utilities
│   └── job-categories.js # Job category mappings
└── package.json          # Subpath exports configuration
```

## EXPORTS

| Import Path                      | Source                               | Purpose                |
| -------------------------------- | ------------------------------------ | ---------------------- |
| `@resume/shared/errors`          | `src/errors/index.js`                | Custom error classes   |
| `@resume/shared/logger`          | `src/logger/index.js`                | Structured logging     |
| `@resume/shared/es-client`       | `src/clients/elasticsearch/index.js` | Elasticsearch client   |
| `@resume/shared/browser`         | `src/browser/index.js`               | Browser automation     |
| `@resume/shared/browser/stealth` | `src/browser/stealth-patches.js`     | Puppeteer stealth      |
| `@resume/shared/wanted-client`   | `src/wanted-client.js`               | Wanted API base client |
| `@resume/shared/clients/gitlab`  | `src/clients/gitlab/index.js`        | GitLab API client      |

## CONVENTIONS

- **Subpath exports** defined in `package.json` exports field
- **Pure functions** preferred; minimal side effects
- **Error handling** via custom error classes in `errors/`
- **Logging** via pino with structured JSON output
- **Browser automation** uses Playwright with stealth patches

## ANTI-PATTERNS

- Never add app-specific logic here (belongs in `apps/`)
- Never import from `apps/` packages (creates circular dependency)
- Never use `console.log` directly (use logger)

## NOTES

- This package has no `AGENTS.md` child files; all guidance lives here
- Changes require version bump and workspace reinstall
- Test coverage enforced at 90% threshold
