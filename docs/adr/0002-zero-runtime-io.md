# ADR 0002: Zero-Runtime I/O for Portfolio Worker

- Status: Accepted
- Date: 2026-02-15

## Context

The portfolio worker serves globally at the edge where latency and cold-path performance are critical. Runtime asset fetching adds avoidable request overhead and can degrade reliability under edge constraints.

## Decision

Use a zero-runtime I/O architecture: compile and inline HTML, CSS, and data at build time into the worker artifact so request handling avoids runtime asset reads.

## Consequences

- Positive: Lower request latency and fewer runtime dependency points.
- Positive: Deterministic deploy artifacts for edge execution.
- Negative: Build pipeline complexity increases due to generation and hash management.
- Follow-up: Maintain generation tooling and avoid direct edits to generated worker output.
