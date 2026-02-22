# CLIENTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

3 external adapter clients following hexagonal architecture.

## CLIENTS

| Client     | Location | Role                     |
| ---------- | -------- | ------------------------ |
| `wanted/`  | 6 files  | Wanted API (40+ methods) |
| `d1/`      | index.js | D1 REST adapter          |
| `secrets/` | index.js | Vault/env secrets        |

## PER-CLIENT STRUCTURE

```text
client/
├── index.js          # factory function
├── http-client.js    # transport layer
├── types.js          # type definitions
└── __tests__/        # unit tests
```

## CONVENTIONS

- Factory functions, not singletons.
- Each client self-contained with own types.
- No cross-client imports (d1 ↛ wanted ↛ secrets).

## ANTI-PATTERNS

- Never import one client from another.
- Never expose transport details to services.
- Never use singletons — use factory pattern.
