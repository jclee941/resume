# Contributing

This guide covers local development and review conventions for the repository.
For repository structure and current ownership boundaries, see the root
[AGENTS.md](AGENTS.md).

## Prerequisites

- Node.js 22 or later
- npm

## Local development

Run commands from the repository root:

```bash
npm ci
npm run dev
```

The root development command uses `wrangler.jsonc`. A Worker build may require
the content pack to be materialized locally. Resume and application content is
owned by D1 and materialized into the working tree; see the
[content pack guide](docs/guides/CONTENT_PACK.md) before working with it.

The repository is organized into:

- `apps/` — portfolio and job-dashboard runtimes
- `packages/` — shared data, schemas, types, contracts, and environment packages
- `tests/` — unit, integration, and browser tests
- `tools/` — build, content, verification, and operator tooling
- `docs/` — architecture decisions, current contracts, and historical records

## Changes and review

Use a branch prefix and pull request title convention shown in the
[pull request template](.github/PULL_REQUEST_TEMPLATE.md). Keep changes focused
and update the owning documentation when behavior or a contract changes.

Before opening a pull request, run the checks relevant to your change:

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` runs the root JavaScript, Python, and Go test targets. Playwright
browser tests are separate and can be run with `npm run test:e2e`; they are not
a step in the current GitHub Actions validation workflow. The workflow's
current validation steps are defined in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Content and generated files

The full resume and application content is not tracked in Git. D1
`content_files` is its source of truth; local copies are materialized and
gitignored. The content pack guide describes that boundary and its procedures.
Role-specific variants remain separately owned rather than being mirrored
automatically from the master resume.

Do not hand-edit generated Worker bundles or derived content. Update their
source and use the owning build or generation command.

## Build and deployment

The root `wrangler.jsonc` is the runtime configuration. GitHub Actions validates
changes; production deployment is owned by Cloudflare Workers Builds. A local
build or a successful CI run does not establish that a production deployment
occurred.

## Getting help

Start with the root [AGENTS.md](AGENTS.md) and the relevant guide under
[`docs/`](docs/README.md). Use the repository issue forms for project questions
or defects.
