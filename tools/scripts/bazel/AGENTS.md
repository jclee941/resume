# BAZEL FACADE SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Shell wrappers in this directory provide Bazel-oriented entrypoints for build/test/deploy validation tasks while day-to-day workflows remain npm-first.

## STRUCTURE

```text
bazel/
└── BUILD.bazel                # Bazel package definition
```

## CONVENTIONS

- Keep wrappers thin; delegate real logic to underlying scripts/commands.
- Preserve predictable script names for CI and Bazel targets.
- Keep shell scripts idempotent and strict-mode compatible.
- Maintain parity with repo-level deployment/verification policy.

## ANTI-PATTERNS

- Do not add product logic that belongs in TypeScript runtime modules.
- Do not bypass validation steps in wrapper shortcuts.
- Do not hardcode machine-local paths in Bazel facade scripts.
- Do not introduce wrapper divergence from canonical npm workflows.
