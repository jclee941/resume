# SHARED LAYER KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Hexagonal architecture core. Services hold domain logic; clients are external adapters.

## STRUCTURE

```text
shared/
├── services/         # 10 domain service directories
│   ├── apply/        # application submission
│   ├── matching/     # job scoring + gates
│   ├── session/      # cookie/token management
│   ├── applications/ # CRUD + analytics
│   ├── analytics/    # usage tracking
│   ├── slack/        # notifications
│   ├── profile/      # user profile
│   ├── auth/         # authentication
│   ├── resume/       # resume operations
│   └── stats/        # statistics
├── clients/          # external adapters
│   ├── wanted/       # Wanted API (40+ methods)
│   ├── d1/           # D1 REST client
│   └── secrets/      # Vault/env secrets
└── tools/            # shared tool utilities
```

## CONVENTIONS

- DI via constructor injection — no global state.
- Services are stateless — inject dependencies.
- Typed errors for domain failures.
- Interface segregation — small focused interfaces.
- Internal imports use relative paths.

## ANTI-PATTERNS

- No global state or singletons.
- No leaky abstractions — clients don't expose transport details.
- No direct DB access from services — use client adapters.
- No circular dependencies between services.
