# THIRD PARTY KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Bazel dependency coordination layer. One Version Rule enforced.

## CONVENTIONS

- One Version Rule: single version per dependency across workspace.
- npm-managed dependencies (not Bazel-managed).
- Explicit visibility declarations.
- OSS licenses required — no GPL in application packages.

## ANTI-PATTERNS

- Never introduce conflicting dependency versions.
- Never use GPL-licensed packages in application code.
- Never bypass explicit visibility rules.
