# SECURITY SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-06-30
**Commit:** `766d220c`
**Branch:** `master`

## OVERVIEW

Security guard scripts validate committed config and secret boundaries for CI
and local preflight checks.

## WHERE TO LOOK

| Task                  | Location                                    | Notes                                               |
| --------------------- | ------------------------------------------- | --------------------------------------------------- |
| Wrangler secret guard | `check-wrangler-secrets.go`                 | fails when secret-like values are committed as vars |
| Vars/secrets policy   | `docs/security/wrangler-vars-vs-secrets.md` | canonical classification guidance                   |
| Cloudflare config     | `apps/portfolio/wrangler.jsonc`             | production Worker binding surface                   |

## CONVENTIONS

- Run from repository root unless a script documents otherwise.
- Keep checks deterministic and CI-friendly; exit non-zero on policy failure.
- Treat allowlists as code-reviewed policy, not a way to hide questionable
  config.
- Report key names and file paths only. Do not print resolved secret values.

## ANTI-PATTERNS

- Do not broaden secret allowlists without updating the security guide.
- Do not read local `.env*`, session JSON, cookies, or 1Password material in
  committed guard scripts.
- Do not turn security checks into deploy actions.
- Do not suppress failures to keep CI green.

---

Parent: [../AGENTS.md](../AGENTS.md)
