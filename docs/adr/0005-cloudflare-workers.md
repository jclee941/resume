# ADR 0005: Cloudflare Workers for Edge Deployment

- Status: Accepted
- Date: 2026-02-15

## Context

The system needs low-latency global delivery for portfolio traffic and lightweight operational surface for automation APIs. Traditional Node.js servers increase infrastructure maintenance, scaling concerns, and regional latency.

## Decision

Deploy runtime services on Cloudflare Workers for edge execution instead of traditional Node.js server hosting.

## Consequences

- Positive: Global edge distribution with reduced operational overhead.
- Positive: Native integration with Cloudflare primitives (KV, D1, R2, Workflows).
- Negative: Runtime constraints and platform-specific development patterns.
- Follow-up: Continue to validate Worker compatibility for new dependencies and APIs.
