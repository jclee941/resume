# Multi-Region Architecture

This directory contains baseline configuration for Cloudflare-based multi-region routing and failover for the resume platform.

## Files

- `geo-routing.json`: region selection rules based on client geography.
- `edge-cache-config.json`: cache TTL profile per region.
- `failover.json`: health-check-driven regional failover policy.

## Architecture

- **Traffic steering**: clients are routed to APAC, EU, or US region using geo rules.
- **Edge cache**: each region applies independent TTL strategy for HTML and static assets.
- **Failover**: if a higher-priority region is unhealthy, requests are served from next healthy region.

## Operational Flow

1. Evaluate geo routing rule.
2. Resolve primary region.
3. Run health check against region endpoint.
4. If unhealthy, fallback by priority order.
5. Apply region-specific edge cache behavior.

## Notes

- Keep `/healthz` and `/metrics` uncached for accurate monitoring.
- Align health check thresholds with `infrastructure/monitoring/uptime/healthchecks.json`.
- Validate routing rules in staging before production rollout.
