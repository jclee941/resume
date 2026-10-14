# THIRD PARTY KNOWLEDGE BASE

**Generated:** 2026-10-14
**Commit:** `493d44f6`
**Branch:** `master`

## OVERVIEW

Dependency-license coordination notes and a reserved license archive, not vendored application code.

Boundary: score 0; retained distinct license-review domain.

## WHERE TO LOOK

| Task                        | Location                                | Notes                                             |
| --------------------------- | --------------------------------------- | ------------------------------------------------- |
| Dependency review ownership | `OWNERS`                                | Maintainer routing                                |
| License records             | `licenses/`                             | Currently only a tracked `.gitkeep`               |
| Historical strategy         | `README.md`                             | Contains superseded Bazel and vendoring proposals |
| Installed dependency graph  | Root and workspace `package.json` files | Actual dependency declarations                    |
| Resolved npm versions       | Root `package-lock.json`                | Lockfile, not a file in this directory            |

## CONVENTIONS

- Record license material for critical dependencies in `licenses/` when adding it.
- Application dependencies require OSS-compatible licenses; GPL packages are excluded by local policy.
- Critical dependency additions require security review through the listed owners.
- Version coordination happens in workspace manifests and the lockfile; this directory enforces no version resolver.
- The empty archive is a reserved location, not evidence that every dependency license was audited.
- `security:audit` checks npm vulnerability advisories, not this domain's license policy.

## ANTI-PATTERNS

- Do not recreate the missing `BUILD.bazel` mentioned in the historical README.
- Do not treat the proposed `rules_js` migration as an active dependency workflow.
- Do not place installed dependency trees here to bypass npm resolution.
- Do not infer a license approval merely from successful package installation.

---

Parent: [../AGENTS.md](../AGENTS.md)
