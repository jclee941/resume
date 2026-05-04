# ADR 0001: Google3-Style Monorepo Structure

- Status: Accepted (Bazel facade portion superseded by ADR-0008)
- Date: 2026-02-15

## Context

The project combines a portfolio worker, job automation worker, MCP server, data
sources, and deployment tooling in a single repository. We need a predictable
layout that supports ownership, build reproducibility, and clear boundaries
across language-specific domains.

## Decision

Adopt a Google3-style monorepo structure with layer-based directories (`apps/`,
`packages/`) and repository governance (`OWNERS`, `CODEOWNERS`). Originally also
included Bazel metadata (`BUILD.bazel`, `MODULE.bazel`) as a build orchestration
facade; that part has since been **superseded by ADR-0008** — npm workspaces is
the actual build orchestrator and BUILD.bazel files were removed in commit
`b51c0f4`.

## Consequences

- Positive: Consistent repository navigation, enforceable ownership, and
  scalable build targeting.
- Positive: Clear separation between source domains (`apps/`, `packages/`,
  `tools/`, `tests/`, `infrastructure/`).
- Negative: Higher onboarding complexity compared to a single-package layout.
- Follow-up: Keep new components aligned with language-first hierarchy and
  ownership files.
