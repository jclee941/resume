# SESSION BROKER KNOWLEDGE BASE

**Generated:** 2026-05-07
**Commit:** `713f507e`
**Branch:** `master`

**Scope:** Wanted session renewal via Docker + stealth browser

## OVERVIEW

Standalone service that renews Wanted.kr sessions when they expire. Runs a
Docker container with a stealth browser that performs headless login, then
serves fresh cookies to the job-server via an internal HTTP broker on port 3456.

Dual-mode design: production uses real browser I/O; tests inject mocked
stores, clocks, and browser factories.

## STRUCTURE

```text
session-broker/
├── browser/
│   ├── wanted-login-flow.js         # Browser automation sequence
│   ├── wanted-login-flow-helpers.js # DOM selectors, form helpers
│   └── cloak-browser.js             # Anti-fingerprinting wrapper
├── server/
│   └── session-broker-routes.js     # Fastify routes (port 3456)
└── services/
    ├── index.js                     # barrel exports
    ├── session-broker-service.js    # Core orchestrator (dual-mode)
    ├── session-broker-operations.js # checkSession, renewSession, getValidSession
    ├── session-broker-storage.js    # Persistent storage operations
    ├── session-broker-state.js      # In-memory state helpers
    ├── session-broker-constants.js  # TTLs, retry config, platform list
    ├── encryption-service.js        # Cookie encryption/decryption
    └── wanted-login-flow.js         # Platform-specific login logic
```

## KEY CLASSES

| Symbol                 | Location                             | Role                                       |
| ---------------------- | ------------------------------------ | ------------------------------------------ |
| `SessionBrokerService` | `services/session-broker-service.js` | Orchestrator: checks TTL, triggers renewal |
| `EncryptionService`    | `services/encryption-service.js`     | AES-256-GCM cookie encryption              |
| `WantedLoginFlow`      | `services/wanted-login-flow.js`      | OneID password flow via stealth browser    |

## CONVENTIONS

- **Dual-mode constructor:** accepts `sessionStore`, `stateStore`, `platforms`,
  `loginFlowFactories`, `now`/`sleep` clocks, and `browserFactory` for testability.
- **State entries:** `{ state: SESSION_STATES, lastError: string|null, expiresAt, renewedAt }`
- **Encryption:** cookies are encrypted at rest via `EncryptionService`.
- **Retry:** `DEFAULT_RETRY_ATTEMPTS` with `DEFAULT_RETRY_DELAY_MS` backoff.
- **Platform list:** `SUPPORTED_SESSION_BROKER_PLATFORMS` defines which platforms
  the broker manages.

## ANTI-PATTERNS

- Never instantiate `SessionBrokerService` without either a real session store
  or injected test doubles.
- Never log raw cookies or decrypted session data.
- Never hardcode OneID credentials — they come from the secrets manager.
- Never expose the broker port (3456) outside the Docker network.

## OPERATIONS

| Operation         | Entry Point                 | Description                    |
| ----------------- | --------------------------- | ------------------------------ |
| Check session     | `checkSession(platform)`    | Validate TTL and freshness     |
| Renew session     | `renewSession(platform)`    | Trigger browser login flow     |
| Get valid session | `getValidSession(platform)` | Return valid cookies or renew  |
| Health check      | `getHealth()`               | Broker + browser health status |

---

Parent: [../AGENTS.md](../AGENTS.md)
