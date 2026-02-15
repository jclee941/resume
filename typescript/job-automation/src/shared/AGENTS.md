# SHARED DOMAIN KNOWLEDGE BASE

**Generated:** 2026-01-30
**Reason:** Core business logic

## OVERVIEW

The heart of the Job Automation engine. Implements the Hexagonal Architecture (Ports & Adapters) to decouple business logic from infrastructure (Wanted API, D1, Browser).

## STRUCTURE

```
typescript/job-automation/src/shared/
├── services/           # CORE: Business logic (Pure & Testable)
│   ├── apply/          # UnifiedApplySystem (Orchestrator)
│   ├── session/        # SessionManager (Auth rotation)
│   └── matching/       # Keyword scoring engine
├── clients/            # ADAPTERS: External interfaces
│   ├── wanted/         # Wanted API v1/v2 wrappers
│   └── database/       # D1 / SQLite repositories
└── tools/              # UTILS: Shared helpers
```

## WHERE TO LOOK

| Task                | Location                         | Notes                               |
| ------------------- | -------------------------------- | ----------------------------------- |
| **Job Application** | `services/apply/UnifiedApply.js` | Main flow: Search -> Score -> Apply |
| **Auth Handling**   | `services/session/Session.js`    | Token refresh & cookie management   |
| **API Integration** | `clients/wanted/WantedClient.js` | REST implementation                 |
| **State Storage**   | `clients/database/`              | Persistence layer                   |

## CONVENTIONS

- **Dependency Injection**: Services receive clients via constructor (e.g., `new ApplyService(apiClient)`).
- **Stateless Services**: Logic should not hold state between requests; use D1 for persistence.
- **Error Handling**: Use typed errors from `shared/errors/` for predictable control flow.
- **Interface Segregation**: Clients implement specific interfaces (IJobProvider, IAuthProvider).

## ANTI-PATTERNS

- **Global State**: Avoid singletons for stateful logic; breaks parallelism.
- **Leaky Abstractions**: Do not expose API-specific types (e.g., AxiosResponse) in Service layer.
- **Direct DB Access**: Services must use Repositories, not SQL directly.
