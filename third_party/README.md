# Third-Party Dependencies

Google3-style vendored dependencies directory.

## Current Strategy

This project uses **npm** for dependency management with Bazel as a build coordination layer.

### Why not full vendoring?

| Approach      | Pros                 | Cons             |
| ------------- | -------------------- | ---------------- |
| npm (current) | Familiar, fast setup | Non-hermetic     |
| Full vendor   | Hermetic, auditable  | High maintenance |
| rules_js      | Best of both         | Complex setup    |

## Structure

```
third_party/
├── README.md           # This file
├── OWNERS              # Dependency maintainers
├── BUILD.bazel         # Build definitions
└── licenses/           # License files for auditing
```

## Adding Dependencies

1. Add to `package.json` in the appropriate workspace
2. Run `npm install`
3. For critical deps, add license to `licenses/`

## Future: rules_js Migration

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
