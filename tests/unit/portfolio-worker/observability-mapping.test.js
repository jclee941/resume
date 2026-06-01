/**
 * Unit tests for the observability display mapping (idea A — sanitized status).
 *
 * The #observability widget must show a SAFE, recruiter-facing status set derived
 * from GET /health — NOT raw operational telemetry. Per security review:
 *   - Edge Status: Operational / Degraded / Unavailable
 *   - D1 / KV: Healthy / Degraded (booleans, NOT latency_ms)
 *   - Build: version + short git sha (7)
 *   - Last checked: local time of last successful fetch
 *   - NEVER raw uptime_seconds, latency_ms, or request counts.
 *
 * mapHealthToDisplay() is a pure function (no DOM, no network) so it is tested
 * directly without jsdom or importing the worker bundle.
 */

const path = require('path');

const MODULE_PATH = path.resolve(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/observability.js'
);

const FIXED_NOW = new Date('2026-06-01T12:34:56Z');

describe('mapHealthToDisplay()', () => {
  let mapHealthToDisplay;
  beforeAll(async () => {
    ({ mapHealthToDisplay } = await import(MODULE_PATH));
  });

  test('healthy payload -> Operational + Healthy bindings + Build sha7', () => {
    const out = mapHealthToDisplay(
      {
        status: 'healthy',
        version: '1.40.11',
        git_sha: 'abc1234defaa',
        uptime_seconds: 99999,
        bindings: { d1: { healthy: true, latency_ms: 5 }, kv: { healthy: true, latency_ms: 2 } },
      },
      FIXED_NOW
    );
    expect(out.edgeStatus).toBe('Operational');
    expect(out.d1).toBe('Healthy');
    expect(out.kv).toBe('Healthy');
    expect(out.build).toBe('1.40.11 · abc1234');
    expect(out.lastChecked).toBeTruthy();
  });

  test('degraded payload -> Degraded status + Degraded binding', () => {
    const out = mapHealthToDisplay(
      {
        status: 'degraded',
        version: '1.40.11',
        git_sha: 'deadbeef0000',
        bindings: { d1: { healthy: true }, kv: { healthy: false } },
      },
      FIXED_NOW
    );
    expect(out.edgeStatus).toBe('Degraded');
    expect(out.d1).toBe('Healthy');
    expect(out.kv).toBe('Degraded');
  });

  test('null/failed health -> Unavailable, no stale leak', () => {
    const out = mapHealthToDisplay(null, FIXED_NOW);
    expect(out.edgeStatus).toBe('Unavailable');
    expect(out.d1).toBe('Unavailable');
    expect(out.kv).toBe('Unavailable');
  });

  test('never exposes raw uptime/latency/request-count values', () => {
    const out = mapHealthToDisplay(
      {
        status: 'healthy',
        version: '1.40.11',
        git_sha: 'fedcba9',
        uptime_seconds: 86400,
        bindings: {
          d1: { healthy: true, latency_ms: 1234 },
          kv: { healthy: true, latency_ms: 5678 },
        },
        metrics: { requests_total: 999 },
      },
      FIXED_NOW
    );
    const serialized = JSON.stringify(out);
    // Raw latency/uptime/request-count numbers must never reach the display.
    expect(serialized).not.toMatch(/1234|5678|86400|999/);
    expect(serialized).not.toMatch(/ms\b/);
  });
});
