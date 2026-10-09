# SECURITY SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Committed Wrangler configuration guard checks secret classification without resolving operator credentials.

Boundary: retained narrow security-policy domain rather than general deployment tooling.

## WHERE TO LOOK

| Task                     | Location                                               | Notes                                      |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------ |
| Executable guard         | `check-wrangler-secrets.go`                            | Standalone Go program                      |
| Classification policy    | Repository `docs/security/wrangler-vars-vs-secrets.md` | Vars versus secrets                        |
| Input configuration      | Root `wrangler.jsonc`                                  | Worker variables and bindings              |
| Related operator tooling | `../onepassword/AGENTS.md`                             | Resolution is separate from classification |

## CONVENTIONS

- Invoke from the repository root: `go run ./tools/scripts/security/check-wrangler-secrets.go`.
- Keep checks deterministic over committed configuration.
- Allowlist changes are policy changes; update the classification document alongside them.
- Report offending key names and file paths rather than resolved values.
- A passing classification check does not establish that production secrets exist or authenticate.
- This standalone guard is not currently a root npm script or a tested Go package target.

## ANTI-PATTERNS

- Do not read local env files, session JSON, or secret-store material to classify committed vars.
- Do not add deployment or provisioning side effects to the guard.
- Do not widen allowlists merely to silence a newly failing configuration.
- Do not confuse example placeholders with evidence of valid production credentials.

---

Parent: [../AGENTS.md](../AGENTS.md)
