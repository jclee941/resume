# CLI KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Commander-based ESM command entry for manual Worker deployment and endpoint verification.

Scope reason: required existing operator-command boundary.

## WHERE TO LOOK

| Task                    | Location                             | Notes                                                |
| ----------------------- | ------------------------------------ | ---------------------------------------------------- |
| Executable entry        | `bin/run.js`                         | `resume-cli` bin; loads root `.env` with dotenv      |
| Deploy options          | `bin/run.js`                         | `--worker-file`, `--dir`, `--env`                    |
| Invocation construction | `src/commands/deploy.js`             | `createWranglerDeployInvocation`                     |
| Health probes           | `src/commands/verify.js`             | HEAD requests to fixed portfolio/dashboard endpoints |
| Command tests           | `src/__tests__/commands.test.js`     | Argument and verification behavior                   |
| Ownership               | `OWNERS`, `bin/OWNERS`, `src/OWNERS` | Command-specific review scope                        |

## CONVENTIONS

- `--worker-file` or `--dir` selects the starting directory for upward root-config discovery.
- Deploy always invokes root `wrangler.jsonc`, not an application-local config.
- Accepted environments are `production` and `preview`; only preview adds `--env preview`.
- Clear `CLOUDFLARE_ENV` in the child process to avoid inherited environment selection.
- The current deploy command requires the configured API-key/email credentials before spawning.
- Verify probes both published endpoints and exits nonzero if either check fails.
- Run `npm run test:cli` for command coverage and `npm run cli:verify` for live checks.
- The package build command is intentionally a no-op; source executes directly.

## ANTI-PATTERNS

- Do not assume `--worker-file` overrides Wrangler's configured entry point.
- Do not claim verify endpoints are environment-configurable; the current list is fixed.
- Do not silently accept unknown environment names.
- Do not replace argument-array spawning with interpolated shell command strings.

Parent: [../AGENTS.md](../AGENTS.md)
