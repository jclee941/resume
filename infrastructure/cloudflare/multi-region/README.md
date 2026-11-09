# Multi-Region Architecture

This directory contains baseline configuration for Cloudflare-based multi-region
routing and failover.

> **Illustrative examples only; not an active deployment.** These files are not
> wired into the root Worker configuration or a deployment workflow. They do
> not establish that regional routing, caches, or failover are provisioned.
> See the [Cloudflare infrastructure guide](../README.md) for ownership
> boundaries.

## Files

- `geo-routing.json`: region selection rules based on client geography.
- `edge-cache-config.json`: cache TTL profile per region.
- `failover.json`: health-check-driven regional failover policy.

## Architecture

- **Traffic steering**: the example describes geographic routing rules.
- **Edge cache**: the example describes regional cache TTL settings.
- **Failover**: the example describes a health-check fallback policy.

## Operational Flow

1. Evaluate geo routing rule.
2. Resolve primary region.
3. Run health check against region endpoint.
4. If unhealthy, fallback by priority order.
5. Apply region-specific edge cache behavior.

## Notes

- Keep `/health`, `/job/health`, and `/metrics` uncached for accurate
  monitoring.
- Align proposed health-check thresholds with the
  [uptime reference](../../monitoring/uptime/healthchecks.json) before any
  separately authorized design review.
