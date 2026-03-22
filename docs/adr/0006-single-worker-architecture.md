# ADR 0006: Single-Worker Architecture for Portfolio and Dashboard

- Status: Superseded by [ADR 0007](0007-msa-service-split.md)
- Date: 2026-03-21

## Context

The portfolio and job-dashboard share several Cloudflare bindings, including D1, KV, Workflows, and Queues. Currently, entry.js serves as a unified edge router that imports both workers. This architecture requires a decision on whether to maintain the unified structure or split them into separate Cloudflare Workers as the project grows.

## Decision

The project maintains a single-worker architecture with a unified entry.js. Shared concerns like Elasticsearch logging and authentication headers are refactored into the @resume/shared package instead of being duplicated across separate workers.

## Rationale

Cloudflare Workers Builds deploys a single worker. Splitting the applications requires complex subdomain routing, separate deployment pipelines, and cross-worker RPC calls. This complexity is not justified for the current scale. A unified worker keeps the deployment process simple and maintains a shared context for all edge operations.

## Consequences

- Positive: Simplified deployment pipeline and reduced infrastructure overhead.
- Positive: Easier sharing of Cloudflare bindings and state across the portfolio and dashboard.
- Negative: Single failure domain where a bug in one component affects the entire worker.
- Follow-up: MSA refactoring focuses on code organization by extracting modules to packages/shared rather than pursuing infrastructure separation.
