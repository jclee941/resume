# SHARED PACKAGE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Package:** `@resume/shared`
**Type:** Cross-package utilities
**Scope:** Validation, errors, cookies, logging, clients, browser, retry, crypto, rate-limit, session, auth, normalize

## OVERVIEW

Shared runtime utilities consumed by `apps/job-server`, `apps/job-dashboard`, and other packages. Provides validation, error handling, logging, HTTP clients (Wanted, Elasticsearch), browser automation, retry/circuit-breaker, crypto, rate-limiting, session management, and auth helpers.

## STRUCTURE

```text
packages/shared/src/
├── validation/          # Input validation helpers
├── errors/              # Custom error classes
├── cookies/             # Cookie utilities
├── logger/              # Structured logging and transport adapters
├── clients/
│   └── wanted/          # Wanted.kr API client (HTTP, jobs, profile, resume)
├── browser/             # Cloudflare Puppeteer browser adapter + stealth patches
├── retry/               # HTTP retry + circuit breaker
├── crypto/              # Webcrypto + Node crypto adapters
├── rate-limit/          # Token bucket, sliding window, KV-backed limiters
├── session/             # Session store, cookies, constants
├── auth/                # Cookie auth, HMAC signing
├── normalize/           # Data normalization
├── ua.js                # User-Agent utilities
├── phone.js             # Phone number utilities
├── employment-types.js  # Employment type constants
└── job-categories.js    # Job category mappings
```

## EXPORTS (via package.json)

| Import Path                       | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `@resume/shared/validation`       | Input validation                          |
| `@resume/shared/errors`           | Custom error classes                      |
| `@resume/shared/cookies`          | Cookie utilities                          |
| `@resume/shared/logger`           | Structured logging                        |
| `@resume/shared/es-client`        | Elasticsearch client                      |
| `@resume/shared/browser`          | Cloudflare Browser Rendering adapter      |
| `@resume/shared/browser/stealth`  | Stealth patches                           |
| `@resume/shared/wanted-client`    | Wanted API base client                    |
| `@resume/shared/clients/wanted/*` | Wanted endpoints (jobs, profile, resume)  |
| `@resume/shared/retry`            | HTTP retry + circuit breaker              |
| `@resume/shared/crypto`           | Webcrypto + Node adapters                 |
| `@resume/shared/rate-limit`       | Token bucket, sliding window, KV limiters |
| `@resume/shared/session`          | Session store, cookies, constants         |
| `@resume/shared/auth`             | Cookie auth, HMAC signing                 |
| `@resume/shared/normalize`        | Data normalization                        |
| `@resume/shared/ua`               | User-Agent utilities                      |
| `@resume/shared/phone`            | Phone number utilities                    |
| `@resume/shared/employment-types` | Employment type constants                 |
| `@resume/shared/job-categories`   | Job category mappings                     |

## CONVENTIONS

- Subpath exports defined in `package.json` exports field
- Pure functions preferred; minimal side effects
- Error handling via custom error classes in `errors/`
- Logging via Logger class with pluggable transports (Elasticsearch default, Loki optional)
- Browser automation uses `@cloudflare/puppeteer` with stealth patches

## ANTI-PATTERNS

- Never add app-specific logic here (belongs in `apps/`)
- Never import from `apps/` packages (circular dependency)
- Never use `console.log` directly (use logger)

---

Parent: [../AGENTS.md](../AGENTS.md)
