# SERVICES KNOWLEDGE BASE

**Generated:** 2026-02-24 12:34:06 KST
**Commit:** 055bcc5
**Branch:** master

## OVERVIEW

10 domain service directories. Stateless, DI-based, domain-focused. Matching has a dedicated child AGENTS for scoring/AI details.

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

## CHILD GUIDES

- `matching/AGENTS.md` owns threshold, weighting, and AI fallback rules for this domain.

## CONVENTIONS

- DI via constructor — inject clients, not instantiate.
- Stateless — no module-level mutable state.
- Domain barrel exports per directory.
- Internal imports use relative paths only.
- Keep service-level AGENTS concise; deep behavior belongs in child guides.

## ANTI-PATTERNS

- Never use raw fetch/sqlite — go through clients.
- Never create circular dependencies between services.
- Tools are thin wrappers — logic lives here.
