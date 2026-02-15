# API CLIENTS

**Parent**: [`../AGENTS.md`](../AGENTS.md)

## OVERVIEW

External API client modules for job-automation. Each subdirectory is an isolated client with its own types and tests.

## CLIENTS

| Client     | Purpose                       | Pattern              |
| ---------- | ----------------------------- | -------------------- |
| `d1/`      | Cloudflare D1 database client | SQL via REST API     |
| `secrets/` | Secret management (Vault/env) | Sync secret fetching |
| `wanted/`  | Wanted.co.kr job platform API | HTTP client + types  |

## STRUCTURE (per client)

```
{client}/
├── index.js         # Public exports
├── http-client.js   # HTTP layer (if applicable)
├── types.js         # TypeScript-like JSDoc types
└── __tests__/       # Jest unit tests
```

## CONVENTIONS

- Clients export factory functions, not singletons
- All HTTP clients accept base URL from config (no hardcoded URLs)
- Types use JSDoc for TypeScript compatibility

## ANTI-PATTERNS

- **NEVER** import across client boundaries (each client is isolated)
- **NEVER** store credentials in client code - use `secrets/` client
