---
project_name: "resume"
user_name: "jclee"
date: "2025-12-30"
sections_completed:
  [
    "technology_stack",
    "language_rules",
    "framework_rules",
    "testing_rules",
    "quality_rules",
    "workflow_rules",
    "anti_patterns",
  ]
status: "complete"
rule_count: 12
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (ES2022+)
- **Edge Runtime**: Cloudflare Workers (Wrangler v4.54.0)
- **Database**: Cloudflare D1 (SQLite-based)
- **Automation Core**: Go (v1.23+)
- **Browser Automation**: Playwright (v1.57.0) with Stealth Patches
- **Secret Management**: Infisical SDK
- **Observability**: Prometheus & Loki (Grafana)
- **Testing**: Jest (v30.2.0) for unit tests, Playwright for E2E

## Critical Implementation Rules

### Language & Framework Specific

- **The "Snake" Standard**: All Cloudflare D1 table/column names and API JSON keys MUST be `snake_case`.
- **Go-JSON Mapping**: In Go, use explicit `json:"field_name"` tags matching the `snake_case` standard.
- **Asset Inlining**: NEVER edit `typescript/portfolio-worker/worker.js` manually. All changes to the portfolio UI must be made in `typescript/portfolio-worker/index.html` or `typescript/portfolio-worker/app.js` and built using `npm run build`.

### Testing & Quality

- **Test Co-location**: Place tests next to the code they cover (e.g., `adapter_test.go` or `utils.test.js`).
- **Filenames**: Use `kebab-case` for all new source files and directories.
- **Time/Date**: Use ISO 8601 strings (UTC) for all stored and transmitted timestamps.

### Workflow & Security

- **Infisical First**: All platform-specific credentials (session cookies, API keys) MUST be fetched via the Infisical SDK; no local `.env` usage for production data.
- **Adapter Pattern**: New job platforms MUST be implemented as standalone adapters in `internal/automation/adapters/`.
- **Stealth Protocol**: Browser automation must utilize the stealth container pattern to avoid detection.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review quarterly for outdated rules.

Last Updated: 2025-12-30
