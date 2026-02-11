# Contributing to Resume Monorepo

Thank you for your interest in contributing. This guide covers the conventions, processes, and standards for this project.

For a detailed architecture overview, see [AGENTS.md](./AGENTS.md).

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [SSoT (Single Source of Truth)](#ssot-single-source-of-truth)
- [Build Pipeline](#build-pipeline)
- [Common Pitfalls](#common-pitfalls)
- [Getting Help](#getting-help)

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. Be respectful, constructive, and inclusive in all interactions.

## Prerequisites

| Tool       | Version             | Purpose                                              |
| ---------- | ------------------- | ---------------------------------------------------- |
| Node.js    | >= 22.0.0           | Runtime                                              |
| npm        | Latest (workspaces) | Package management                                   |
| Bazel      | Latest              | Build coordination (Bazel coordinates, npm executes) |
| Wrangler   | Latest              | Cloudflare Workers deployment                        |
| Playwright | Latest              | E2E testing (`npx playwright install`)               |

## Getting Started

```bash
git clone git@github.com:qws941/resume.git
cd resume
npm install
npm run sync:data    # Propagate SSoT resume data
npm run build        # Build portfolio worker
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests (requires Playwright browsers)
```

## Project Structure

```
resume/
├── typescript/                 # Language-based source directory
│   ├── portfolio-worker/       # Edge-deployed portfolio (resume.jclee.me)
│   ├── job-automation/         # MCP Server + stealth crawlers
│   ├── cli/                    # Deployment CLI (Commander.js)
│   └── data/                   # SSoT resume data & schemas
├── tools/                      # Build, deploy, CI scripts
├── tests/                      # Jest unit + Playwright E2E
├── infrastructure/             # Observability (Grafana/ELK/Prometheus)
├── third_party/                # npm deps (One Version Rule)
├── docs/                       # Documentation hub
└── .github/                    # CI/CD workflows, CODEOWNERS
```

Each subdirectory contains its own `AGENTS.md` with domain-specific context. See the root [AGENTS.md](./AGENTS.md) for the full hierarchy.

## Branch Naming

Format: `{type}/{short-description}`

| Type        | Use Case             |
| ----------- | -------------------- |
| `feat/`     | New features         |
| `fix/`      | Bug fixes            |
| `docs/`     | Documentation        |
| `refactor/` | Code restructuring   |
| `test/`     | Test additions/fixes |
| `chore/`    | Maintenance tasks    |
| `ci/`       | CI/CD changes        |

Examples: `feat/parallel-crawling`, `fix/csp-hash-mismatch`, `docs/deployment-guide`

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

Format: `type(scope): description`

**Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

**Scopes**: `portfolio`, `job-automation`, `cli`, `data`, `ci`, `tests`, `infra`

Examples from this repo:

```
feat(job-automation): add 4 Korean platform crawlers
fix(ci): resolve 43 E2E failures from CI run
docs: add comprehensive job-automation architecture guide
chore: update root AGENTS.md version metadata
docs(workers): enhance AGENTS.md with handler classes and workflows
```

## Pull Request Process

1. Create a feature branch from `master` using the [branch naming](#branch-naming) convention.
2. Make changes with [conventional commits](#commit-messages).
3. Ensure all checks pass:
   ```bash
   npm run lint          # ESLint
   npm run test          # Unit tests
   npm run test:e2e      # E2E tests
   ```
4. Push your branch and open a Pull Request.
5. PR requires CODEOWNERS review (`@qws941` for all files).
6. All CI checks must pass before merge.
7. Squash merge is preferred for clean history.

## Coding Standards

### Language and Modules

- **ESM modules** — Use `import`/`export`, not `require`/`module.exports`.
- **JSDoc** — Document all public APIs with JSDoc comments.
- **Google3-style** — OWNERS files, BUILD.bazel, language-based directory structure.

### Linting

- ESLint 9 flat config (`eslint.config.cjs`). Run `npm run lint` before committing.
- Prettier is available (`npm run format`) but not strictly enforced.

### Strict Rules

| Rule                                          | Rationale                         |
| --------------------------------------------- | --------------------------------- |
| No `as any`, `@ts-ignore`, `@ts-expect-error` | Preserve type safety              |
| No empty catch blocks `catch(e) {}`           | Always handle errors meaningfully |
| No deleting failing tests                     | Fix the root cause instead        |

### Script Execution

- Always run scripts from the project root (`pwd` = project root).
- Use `npm run <script>` — see `package.json` for the full list.

## Testing

| Type     | Command                 | Framework  |
| -------- | ----------------------- | ---------- |
| Unit     | `npm test`              | Jest       |
| E2E      | `npm run test:e2e`      | Playwright |
| Coverage | `npm run test:coverage` | c8         |

**Requirements**:

- New features must include unit tests.
- Bug fixes must include regression tests.
- Never delete or skip failing tests to make the suite "pass".

## SSoT (Single Source of Truth)

All resume data flows from a single canonical source:

```
typescript/data/resumes/master/resume_data.json
```

- **Never** edit resume data in multiple places.
- After editing `resume_data.json`, run `npm run sync:data` to propagate changes.
- The portfolio worker inlines all data at build time — there is no runtime data fetching.

## Build Pipeline

```
resume_data.json (SSoT)
    -> sync-resume-data.js
index.html
    -> generate-worker.js (escape backticks, compute CSP hashes)
worker.js (GENERATED — never edit directly)
    -> wrangler deploy
resume.jclee.me (Cloudflare Edge)
```

Key commands:

```bash
npm run build          # Build portfolio worker
npm run build:full     # Build portfolio + CLI
npm run deploy         # Version bump + build + deploy
npm run sync:data      # Propagate SSoT data
```

## Common Pitfalls

| Don't                              | Do Instead                                             |
| ---------------------------------- | ------------------------------------------------------ |
| Edit `worker.js` directly          | Edit `generate-worker.js` or source HTML               |
| Use `trim()` before CSP hash       | Hash the exact source string (whitespace matters)      |
| Use naked Puppeteer/Playwright     | Use `BaseCrawler` with stealth plugins                 |
| Hardcode secrets in source         | Use `.env` or `wrangler secret`                        |
| Import across client boundaries    | Keep each client isolated in its own directory         |
| Edit resume data in multiple files | Edit only `resume_data.json`, then `npm run sync:data` |
| Skip OWNERS review                 | Get OWNERS approval on all PRs                         |

## Getting Help

- **GitHub Issues**: [qws941/resume/issues](https://github.com/qws941/resume/issues) — Report bugs or request features.
- **Architecture Context**: Each directory has an `AGENTS.md` with domain-specific documentation. Start with the root [AGENTS.md](./AGENTS.md).
- **Build System**: See [tools/AGENTS.md](./tools/AGENTS.md) for build scripts and CI utilities.
