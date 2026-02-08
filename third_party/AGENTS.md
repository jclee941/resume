# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master
**Build System:** Bazel + npm (Google3-style)

## OVERVIEW

External dependencies managed via npm and coordinated through Bazel.
Follows the "One Version Rule" where each library has a single version across the entire monorepo.

## STRUCTURE

```
third_party/
├── BUILD.bazel              # Centralized dependency declarations
├── OWNERS                   # Dependency management owners
├── README.md                # Usage instructions
└── licenses/                # License files for auditing
```

## CONVENTIONS

- **One Version Rule**: Only one version of any library is allowed.
- **npm Managed**: Dependencies are defined in the root `package.json` but exposed to Bazel via `third_party/BUILD.bazel`.
- **Explicit Visibility**: Dependencies must be explicitly exported to be used by other packages.
- **Security**: All production dependencies must have OSS-compatible licenses. No GPL dependencies in `typescript/` packages.

## ANTI-PATTERNS

- **Direct npm imports**: Avoid importing from `node_modules` directly if a Bazel target exists.
- **Multiple Versions**: Never introduce a second version of an existing library.
- **Missing Licenses**: Critical dependencies require license documentation in `third_party/licenses/`.
- **Skip Review**: Critical dependencies require security review by OWNERS.
