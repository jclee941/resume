# MCP TOOLS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

9 MCP tool definitions exposing 32 actions for job automation.

## TOOLS

| Tool                | Actions | Notes                     |
| ------------------- | ------- | ------------------------- |
| `resume.js`         | 20+     | Chaos v2 except Skills v1 |
| `resume-sync.js`    | 12      | state machine sync        |
| `auth.js`           | varies  | session management        |
| `profile.js`        | varies  | SNS read-only             |
| `search-jobs.js`    | varies  | job search                |
| `search-keyword.js` | varies  | keyword search            |
| `get-*.js`          | varies  | data retrieval tools      |

## EXPORT PATTERN

```javascript
export const {name}Tool = {
  name: '...',
  description: '...',
  inputSchema: { ... },
  handler: async (params) => { ... }
};
```

## CONVENTIONS

- Tools are thin wrappers around `shared/services/`.
- Skills v1 only (v2 broken). Links API broken (500).
- Each tool in its own file with `__tests__/` alongside.

## ANTI-PATTERNS

- Never put business logic in tool handlers — delegate to services.
- Never call clients directly from tools — use services.
