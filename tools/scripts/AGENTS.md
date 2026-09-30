# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Automation suite for build, deployment, verification, release, and enrichment. New operational scripts are Go-first. Existing JS-domain generators and deterministic validators are explicit exceptions.

## STRUCTURE

```text
scripts/
├── build/              # asset generation (PDF, PPTX, icons, screenshots)
├── content/            # personal content pack CLI (D1 content_files <-> working tree)
├── deployment/         # deploy helpers and preflight checks
├── local-dev-up/       # local dev environment orchestrator
├── verification/      # deterministic validators and remote probes
├── release/           # version decisions and GitHub release publication
├── enrichment/        # resume data proposal generators
├── onepassword/       # secret-safe local operator wrappers
├── security/          # committed security guard scripts
├── monitoring/        # observability config helpers and deployers
├── sync/              # data sync and proposal application
├── utils/             # shared utilities and SSoT helpers
└── setup/             # environment setup
```

## CHILD GUIDES

- `build/AGENTS.md` — Asset generation pipeline guardrails for artifacts and snapshots.
- `deployment/AGENTS.md` — Deploy helper safety constraints and preflight checks.
- `verification/AGENTS.md` — Deterministic validators and remote probes.
- `release/AGENTS.md` — Version decisions and GitHub release publication.
- `enrichment/AGENTS.md` — Resume data proposal generators.

## CONTENT PACK CLI

`content/` moves personal resume and portfolio content between the D1
`content_files` table and the working tree (ADR 0011). The pack is defined by
`content/content-pack.json`; run everything through the root scripts.

| Command                                                     | Purpose                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run content:pull`                                      | Materialize the pack. Source: `--source d1\|fixtures`, else `CONTENT_SOURCE`, else `d1`.                 |
| `npm run content:push -- [--dry-run] [--prune]`             | Upload new/changed files; `--prune` deletes D1 rows missing locally; refreshes the `resumes` master row. |
| `npm run content:status`                                    | Local vs D1 added/changed/deleted/unchanged counts and paths.                                            |
| `npm run content:manifest -- [--out f]`                     | Local pack manifest (path, sha256, size) to prove D1 parity.                                             |
| `npm run content:ensure -- [--force]`                       | Build-time policy run by `npm run build`: fixtures, D1 (`WORKERS_CI=1`), or a required pulled pack.      |
| `node tools/scripts/content/make-fixtures.mjs`              | Regenerate `tests/fixtures/content-pack/` from a materialized real pack (fakers in `fixtures/`).         |
| `npm run content:guard -- [--staged\|--tracked] [--report]` | Fail on pack paths or personal tokens in git; prints paths, kinds, and counts only.                      |

Environment: `CONTENT_API_TOKEN` or `CLOUDFLARE_API_TOKEN` (Bearer), or
`CLOUDFLARE_API_KEY` with `CLOUDFLARE_EMAIL`; `CONTENT_ACCOUNT_ID` or
`CLOUDFLARE_ACCOUNT_ID`. The database id comes from the `JOB_DB` entry in the root
`wrangler.jsonc`.

Rules:

- `pull` fails closed: source `d1` without credentials exits non-zero and never falls back to
  fixtures, including under `WORKERS_CI=1`. Fixtures (`tests/fixtures/content-pack/`) are used only
  when `CONTENT_SOURCE=fixtures` or `--source fixtures` is explicit.
- Never print file contents, request bodies, tokens, or matched personal values; output is paths,
  counts, and token kinds.
- Keep every file under 200 LOC and add no npm dependencies (globs use the in-tree `glob.mjs`, so the guards run before `npm ci`).

**Why JavaScript, not Go:** this CLI runs inside `npm run build` on Cloudflare Workers Builds, where
only the Node toolchain is guaranteed. A Go binary would add a toolchain requirement to the deploy
path. This is a documented exception to the Go-first rule, not a precedent for other scripts.

## CONVENTIONS

- Child scripts inherit root/`tools/` conventions: prefer root package scripts,
  respect Go module working directories, and prefer Go for operational behavior.
- Node scripts are acceptable for existing JS-specific data sync/build helpers; do not broaden that exception without documenting why.
- Generated-output ownership and tracking vary by child guide and `.gitignore`;
  do not assume every generated file is committed.
- Cloudflare Workers Builds owns production deploy authority; local helpers are emergency/operator tools only.

## ANTI-PATTERNS

- Never use absolute paths.
- Never add new `.sh` operational wrappers.
- Never print resolved secret values or session contents.
- Never treat local deployment helpers as production deploy authority.

---

Parent: [../AGENTS.md](../AGENTS.md)
