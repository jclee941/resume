# ADR 0001: Google3-Style Monorepo Structure

- Status: Accepted
- Date: 2026-02-15

## Context

The project combines a portfolio worker, job automation worker, MCP server, data sources, and deployment tooling in a single repository. We need a predictable layout that supports ownership, build reproducibility, and clear boundaries across language-specific domains.

## Decision

Adopt a Google3-style monorepo structure with language-first directories (`typescript/`), repository governance (`OWNERS`, `CODEOWNERS`), and Bazel metadata (`BUILD.bazel`, `MODULE.bazel`) as the build orchestration facade.

## Consequences

- Positive: Consistent repository navigation, enforceable ownership, and scalable build targeting.
- Positive: Clear separation between source domains (`typescript/`, `tools/`, `tests/`, `infrastructure/`).
- Negative: Higher onboarding complexity compared to a single-package layout.
- Follow-up: Keep new components aligned with language-first hierarchy and ownership files.
