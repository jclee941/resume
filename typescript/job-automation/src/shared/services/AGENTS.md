# DOMAIN SERVICES (shared/services/)

> Parent: [../AGENTS.md](../AGENTS.md)

## OVERVIEW

Core domain logic layer implementing the "Services" part of the Ports-and-Adapters architecture. These services are stateless, testable, and handle business rules independent of the delivery mechanism (MCP/HTTP/CLI).

## STRUCTURE

- `apply/`: Multi-platform application orchestrator and job filters.
- `matching/`: Heuristic (`JobMatcher`) and AI (`AIMatcher`) matching engines.
- `session/`: Persistence and rotation of authentication sessions.
- `applications/`: Management of the local application tracking store.
- `analytics/`: Business intelligence and daily/weekly reporting.
- `slack/`: Notification orchestration and template formatting.
- `profile/`: Aggregation of user profiles across different platforms.
- `auth/`: Shared authentication logic and token management.
- `resume/`: Resume data optimization and platform-specific mapping.
- `stats/`: System-wide performance and activity metrics.

## WHERE TO LOOK

| Service         | Primary Class        | Role                                              |
| --------------- | -------------------- | ------------------------------------------------- |
| **Application** | `ApplyOrchestrator`  | Orchestrates search -> match -> apply flow.       |
| **Session**     | `SessionManager`     | Singleton handling cookie persistence & rotation. |
| **Matching**    | `JobMatcher`         | Keyword-based heuristic scoring engine.           |
| **Tracking**    | `ApplicationService` | CRUD for `applications.json` data store.          |
| **Notifier**    | `SlackService`       | High-level API for structured Slack alerts.       |

## CONVENTIONS

- **Dependency Injection**: Services MUST receive dependencies (Clients/Other Services) via constructors.
- **Statelessness**: No module-level global state. Use instance properties initialized in `src/server/plugins/services.js`.
- **Contracts**: Use shared schemas in `../contracts/` for all cross-service data exchange.
- **Domain Barrels**: Each directory must have an `index.js` as the sole entry point for other layers.
- **Internal Imports**: Use same-layer relative paths (e.g., `import { X } from "../session/index.js"`) for resilience.

## ANTI-PATTERNS

- **Direct Infrastructure**: Never use raw `fetch` or `sqlite`. Use `shared/clients/` adapters.
- **Sibling Coupling**: Avoid direct circular dependencies between services. Use orchestrators or events.
- **Business Logic in Tools**: MCP tools in `src/tools/` should only be thin wrappers around these services.
- **Hardcoded Logic**: Extract configurable business rules (e.g., matching thresholds) into `config.js` or constructor options.
