# SERVICES KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Dashboard integrations for authentication, platform sessions, resume/history sync, and notifications.

Scope reason: score 14; integration and persistence domain.

## STRUCTURE

```text
services/
  application-history/    Adapters, timestamps, repository, sync orchestration
  notification/           Singular compatibility export barrel
  notifications/          Delivery, formatting, history, Telegram actions
  remember/               Login, search, apply, Browser Rendering REST
  resume-platform-sync/   Platform-specific resume editors and dispatch
  skcareers/              Login and resume editor/save helpers
  rate-limiter/           Tests of shared limiter behavior; no service implementation
  __tests__/              Service integration tests
```

## WHERE TO LOOK

| Task                   | Location                               | Notes                                        |
| ---------------------- | -------------------------------------- | -------------------------------------------- |
| Auth and replay policy | `auth.js`, `auth-webhook-signature.js` | Session tokens, HMAC, nonces                 |
| Config                 | `config.js`                            | Persistent dashboard configuration           |
| Browser lifecycle      | `browser-session.js`                   | Borrow/release sessions via broker           |
| Session storage        | `platform-session.js`                  | Encrypted KV values under platform keys      |
| Request filtering      | `jobkorea-request-filter.js`           | Avoid slow third-party browser traffic       |
| Notification facade    | `notifications.js`                     | Both facade and singular barrel have callers |
| Platform dispatch      | `resume-platform-sync/index.js`        | Supported sync list and structured outcomes  |

## CONVENTIONS

- Sync covers Wanted, JobKorea, SK Careers, and Remember; unsupported platforms return explicit outcomes.
- Remember uses Browser Rendering REST because Worker and binding egress are blocked by its WAF.
- Keep application-history adapters separate from the idempotent repository and sync orchestration.
- Preserve exact application timestamps through platform-specific normalization.
- Keep session encryption and expiry in `platform-session.js`, not individual clients.
- Preserve both live notification entry paths when changing exports.

## ANTI-PATTERNS

- Do not make services import route modules or request handlers.
- Do not treat a failed platform sync as a successful empty result.
- Do not restore a token-bucket implementation in the test-only `rate-limiter/` directory.
- Do not discard a concurrent history update merely to avoid an insert conflict.

Parent: [../AGENTS.md](../AGENTS.md)
