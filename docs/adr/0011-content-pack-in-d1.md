# ADR 0011: Keep personal content in D1, not in git

**Status:** Accepted
**Date:** 2026-09-30
**Deciders:** Owner (history is not rewritten)

## Context

This repository is PUBLIC, and it tracked the owner's personal resume and
portfolio content: the master resume data, per-role application packets, TA
decks, portfolio pages and their data modules, Open Graph images, the profile
photo, generated PDFs, downloads, and planning notes. Those files carry the
owner's name, contact details, employers, and school. A public repository
cannot hold them.

Production is Cloudflare-native (ADR 0009, ADR 0010): the `JOB_DB` D1 database
(`job-dashboard-db`) is the Worker's only database, and Cloudflare Workers Builds
runs `npm run build` on every deploy.

## Decision

- **D1 `content_files` is the single source of truth for personal content.** One row
  per repo-relative POSIX path holds the bytes (`body BLOB`), `sha256`, `size`,
  `content_type`, and `updated_at` (migration `0006_content_files.sql`).
- **The pack is defined by `tools/scripts/content/content-pack.json`**: include and
  exclude globs. AGENTS.md files, the resume JSON schema, and `.gitkeep` files are
  code, not content, and stay in git.
- **Content is materialized at build and edit time** by `npm run content:pull`, which
  downloads every row, verifies each sha256, writes the file atomically, and records
  `.content/manifest.json` (gitignored). `content:push` uploads local edits
  (`--prune` also deletes rows missing locally) and refreshes the `resumes` master row
  the platform sync reads.
- **CI and tests use fake fixtures** under `tests/fixtures/content-pack/`, selected
  explicitly with `CONTENT_SOURCE=fixtures`.
- **The build fails closed.** With source `d1` and no credentials, `pull` exits
  non-zero and names the missing variables. It never falls back to fixtures, on
  Workers Builds (`WORKERS_CI=1`) or anywhere else, so a deploy cannot ship fake or
  empty content by accident.
- **`content:guard` keeps content out of git.** It fails when a staged or tracked path
  matches the pack, or when text contains a realistic Korean mobile number, the
  personal mail domain, or an identifier read from the materialized master data. It
  reports paths, token kinds, and counts, never values.
- **Git history is not rewritten**, by the owner's decision. Content already published
  stays in past commits; this ADR stops new exposure and moves the working tree, and
  it does not claim to retract what was public.

## Consequences

- A fresh clone has no personal content until `content:pull` runs with D1
  credentials (`CONTENT_API_TOKEN` or `CLOUDFLARE_API_TOKEN`, plus
  `CONTENT_ACCOUNT_ID` or `CLOUDFLARE_ACCOUNT_ID`). Contributors without them
  use `CONTENT_SOURCE=fixtures`.
- Editing content is pull, edit, `content:push`. D1 is the copy of record, so a push
  that skips a pull can overwrite newer rows; `content:status` shows the difference first.
- The Workers Builds project needs D1 read credentials as build secrets.
- Rows hold whole files. `content:push` sends one file per request and `content:pull`
  reads pages of about 20 rows to stay inside D1 request limits.
- The CLI is JavaScript, an exception to the Go-first rule for operational scripts
  (see `tools/scripts/AGENTS.md`).
- Untracking the existing content files and wiring `content:pull` into `npm run build`
  are separate follow-up changes; this ADR delivers the schema, the CLI, and the guard.
