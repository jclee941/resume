# SERVICES KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

10 domain service directories. Stateless, DI-based, domain-focused.

## SERVICES

| Service         | Key Class/Function    | Role                             |
| --------------- | --------------------- | -------------------------------- |
| `apply/`        | ApplyService          | application submission           |
| `matching/`     | JobMatcher, AIMatcher | <60 skip, 60-74 review, ≥75 auto |
| `session/`      | SessionManager        | 24h TTL, cookie persistence      |
| `applications/` | ApplicationService    | CRUD + analytics                 |
| `analytics/`    | AnalyticsService      | usage tracking                   |
| `slack/`        | SlackService          | notification delivery            |
| `profile/`      | ProfileService        | user profile operations          |
| `auth/`         | AuthService           | authentication flows             |
| `resume/`       | ResumeService         | resume operations                |
| `stats/`        | StatsService          | statistics aggregation           |

## CONVENTIONS

- DI via constructor — inject clients, not instantiate.
- Stateless — no module-level mutable state.
- Domain barrel exports per directory.
- Internal imports use relative paths only.

## ANTI-PATTERNS

- Never use raw fetch/sqlite — go through clients.
- Never create circular dependencies between services.
- Tools are thin wrappers — logic lives here.
