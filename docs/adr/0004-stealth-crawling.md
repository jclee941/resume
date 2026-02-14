# ADR 0004: Stealth-First Crawling Strategy

- Status: Accepted
- Date: 2026-02-15

## Context

Job platforms apply anti-bot detection and aggressive request heuristics. Naive crawling patterns increase block rates and reduce automation reliability.

## Decision

Standardize on `BaseCrawler` as the foundation for crawling behavior, including user-agent rotation, request jitter/delay, and anti-detection handling patterns for platform adapters.

## Consequences

- Positive: Improved resilience against bot detection and request throttling.
- Positive: Shared crawling safeguards across platform integrations.
- Negative: Additional complexity in crawler configuration and testing.
- Follow-up: Keep crawler defaults current with platform behavior and detection changes.
