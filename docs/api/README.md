# API Reference

This document summarizes public and internal API surfaces for the portfolio worker, job dashboard worker, MCP server tools, and CLI commands.

## Portfolio Worker (Edge)

Base URL: `https://resume.jclee.me`

### Routes

| Method | Path             | Description                                   |
| ------ | ---------------- | --------------------------------------------- |
| GET    | `/`              | Primary portfolio page (default language).    |
| GET    | `/en`            | English portfolio page.                       |
| GET    | `/healthz`       | Health endpoint for service checks.           |
| GET    | `/metrics`       | Prometheus-style metrics endpoint.            |
| GET    | `/sitemap.xml`   | XML sitemap for search engines.               |
| GET    | `/robots.txt`    | Robots policy for crawlers.                   |
| GET    | `/manifest.json` | Web app manifest for installability metadata. |

### Job Route Dispatch

| Method | Path     | Description                                                             |
| ------ | -------- | ----------------------------------------------------------------------- |
| ANY    | `/job/*` | Dispatched from portfolio entry worker to the dashboard worker handler. |

## MCP Server (Job Automation)

Source: `typescript/job-automation/src/tools`

### Tool Modules (Top-Level Entries)

- `auth-integrated.js`
- `auth.js`
- `get-categories.js`
- `get-company.js`
- `get-job-detail.js`
- `job-matcher.js`
- `optimize-resume.js`
- `profile.js`
- `resume-customize.js`
- `resume-generator.js`
- `resume-sync.js`
- `resume.js`
- `search-jobs.js`
- `search-keyword.js`
- `unified-resume-sync.js`

### Tool Directories

- `commands/`
- `resume/`

## Dashboard Worker API

Base URL (routed through portfolio): `https://resume.jclee.me/job`

### Core Endpoints

| Method         | Path                                       | Description                                          |
| -------------- | ------------------------------------------ | ---------------------------------------------------- |
| GET            | `/api/health`                              | Worker and dependency health status.                 |
| GET/POST       | `/api/applications`                        | List applications or create a new application entry. |
| GET/PUT/DELETE | `/api/applications/:id`                    | Retrieve, update, or delete one application.         |
| PUT            | `/api/applications/:id/status`             | Update application status.                           |
| POST           | `/api/workflows/job-crawling`              | Start job crawling workflow instance.                |
| POST           | `/api/workflows/application`               | Start application workflow instance.                 |
| POST           | `/api/workflows/resume-sync`               | Start resume sync workflow instance.                 |
| POST           | `/api/workflows/daily-report`              | Start daily report workflow instance.                |
| GET            | `/api/workflows/:workflowType/:instanceId` | Retrieve workflow instance status/output.            |

## CLI Reference

Binary: `resume-cli` (entrypoint: `typescript/cli/bin/run.js`)

### Commands

| Command                  | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `resume-cli deploy`      | Deploy services/workers using Wrangler wrapper options. |
| `resume-cli db status`   | Show D1 migration status.                               |
| `resume-cli db rollback` | Roll back one or more D1 migrations.                    |
