# MCP TOOLS (`typescript/job-automation/src/tools/`)

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-01-30

## OVERVIEW

9 atomic MCP tool implementations for Wanted Korea interactions. Each file exports a single tool definition with input schema and handler logic.

## WHERE TO LOOK

| Tool              | File                | Role                                                    |
| ----------------- | ------------------- | ------------------------------------------------------- |
| **Resume CRUD**   | `resume.js`         | 20+ actions. Careers/Edu (v2), Skills (v1).             |
| **Sync Pipeline** | `resume-sync.js`    | Local JSON ↔ Remote sync. Diff/Merge logic.             |
| **Auth**          | `auth.js`           | Session manager. Manual cookie injection required.      |
| **Profile**       | `profile.js`        | Read-only profile/application status (SNS API).         |
| **Search**        | `search-jobs.js`    | Filter-based job search (Category/Location).            |
| **Keywords**      | `search-keyword.js` | Free-text search (Company/Stack).                       |
| **Details**       | `get-*.js`          | Atomic fetchers: `job-detail`, `company`, `categories`. |

## CONVENTIONS

- **Export Pattern**: `export const {toolName}Tool = { ... }`.
- **API Segmentation**:
  - `SNS API`: Profile read/write (`profile.js`).
  - `Chaos API v2`: Careers, Education, Activities (`resume.js`).
  - `Chaos API v1`: **Skills only** (uses `text` not `name`).
- **Broken Features**: Links API returns 500. Do not implement.
- **Auth Strategy**: `auth.js` manages `.data/wanted-session.json` (project-local).
- **Parameter Validation**: Strict schema validation in `inputSchema`.
- **Error Handling**: Catch `AxiosError`, return human-readable `content: [{ type: "text", text: ... }]`.

## UNIQUE STYLES

- **Monolithic Resume Tool**: `resume.js` handles 20+ sub-actions via `action` parameter switch.
- **Sync Logic**: `resume-sync.js` implements a full state machine (Export -> Diff -> Sync).
