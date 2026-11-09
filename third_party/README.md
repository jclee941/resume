# Third-Party Dependencies

Reserved directory for dependency-license coordination and historical
vendoring proposals.

> **Historical proposal:** the Bazel and `rules_js` material below was not
> adopted. The repository currently uses npm workspaces; see the
> [package ownership guide](../packages/AGENTS.md).

## Superseded strategy

### Why not full vendoring?

| Approach    | Historical proposal                          |
| ----------- | -------------------------------------------- |
| npm         | Familiar setup; dependency graph is external |
| Full vendor | Hermetic inputs; high maintenance            |
| rules_js    | Hermetic integration; added complexity       |

## Structure

```text
third_party/
├── README.md           # This file
├── OWNERS              # Dependency maintainers
└── licenses/           # License files for auditing
```

## Adding Dependencies

1. Add to `package.json` in the appropriate workspace
2. Run `npm install`
3. For critical deps, add license to `licenses/`

## Unadopted `rules_js` proposal

When migrating to hermetic builds:

```python
# WORKSPACE.bazel
load("@aspect_rules_js//npm:npm_import.bzl", "npm_translate_lock")

npm_translate_lock(
    name = "npm",
    pnpm_lock = "//:pnpm-lock.yaml",
)
```

## Security

- All production dependencies must have OSS-compatible licenses
- No GPL dependencies in application packages
- Critical deps require security review (see OWNERS)
