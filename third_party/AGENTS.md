# THIRD PARTY KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Bazel dependency coordination layer. One Version Rule enforced.

## CONVENTIONS

- One Version Rule: single version per dependency across workspace.
- npm-managed dependencies (not Bazel-managed).
- Explicit visibility declarations.
- OSS licenses required — no GPL in `typescript/`.

## ANTI-PATTERNS

- Never introduce conflicting dependency versions.
- Never use GPL-licensed packages in `typescript/`.
- Never bypass explicit visibility rules.
