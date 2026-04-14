# SHARED LAYER KNOWLEDGE BASE

**Generated:** 2026-04-14
**Commit:** `c2629c9`
**Branch:** `master`

## OVERVIEW

Hexagonal architecture core. Services hold domain logic, clients are external adapters.

## STRUCTURE

```text
shared/
├── services/ # 22 domain service entries
│ ├── core groups # ai, analytics, applications, apply, auth
│ ├── flow groups # matching, migration, orchestrator, queue, webhook
│ ├── user groups # profile, resume, session, stats, slack
│ ├── infra groups # browser-pool.js, cache.js, lazy-loader.js, parallel.js, performance-metrics.js
│ └── safety groups # notifications, stealth
├── clients/ # external adapters
│ ├── wanted/ # Wanted API
│ ├── d1/ # D1 REST client
│ ├── elasticsearch/ # log and search client
│ └── secrets/ # Vault/env secrets
└── tools/ # shared tool utilities
```

## CONVENTIONS

- DI via constructor injection.
- Services are stateless, inject dependencies.
- Typed errors for domain failures.
- Interface segregation, keep interfaces small.
- Internal imports use relative paths.

## ANTI-PATTERNS

- No global state or singletons.
- No leaky abstractions, clients don't expose transport details.
- No direct DB access from services, use client adapters.
- No circular dependencies between services.
