import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ProxyRotator } from '../proxy-rotator.js';

const proxyA = { url: 'http://a', region: 'kr', weight: 1 };
const proxyB = { url: 'http://b', region: 'us', weight: 3 };

beforeEach(() => {
  mock.restoreAll();
});

describe('ProxyRotator', () => {
  it('returns null when no proxies are configured', () => {
    const rotator = new ProxyRotator();
    assert.equal(rotator.getNext(), null);
    assert.equal(rotator.totalCount, 0);
    assert.equal(rotator.healthyCount, 0);
  });

  it('initializes from constructor proxies and returns next proxy', () => {
    const rotator = new ProxyRotator([proxyA, proxyB]);
    mock.method(Math, 'random', () => 0);
    const next = rotator.getNext();

    assert.equal(next, proxyA.url);
    assert.equal(rotator.totalCount, 2);
    assert.equal(rotator.healthyCount, 2);
  });

  it('filters by region when matches exist and falls back when none match', () => {
    const rotator = new ProxyRotator([proxyA, proxyB]);
    mock.method(Math, 'random', () => 0);

    const regional = rotator.getNext({ region: 'us' });
    const fallback = rotator.getNext({ region: 'jp' });

    assert.equal(regional, proxyB.url);
    assert.equal(fallback, proxyA.url);
  });

  it('supports excludeRecent and keeps single candidate unchanged', () => {
    const multi = new ProxyRotator([proxyA, proxyB]);
    mock.method(Math, 'random', () => 0);
    assert.equal(multi.getNext({ excludeRecent: proxyA.url }), proxyB.url);

    const single = new ProxyRotator([proxyA]);
    assert.equal(single.getNext({ excludeRecent: proxyA.url }), proxyA.url);
  });

  it('returns null when candidate filtering removes everything', () => {
    const rotator = new ProxyRotator();
    rotator._proxies = new Map([
      ['k1', { url: 'dup', weight: 1 }],
      ['k2', { url: 'dup', weight: 1 }],
    ]);
    rotator._health = new Map([
      [
        'dup',
        { successCount: 0, failureCount: 0, avgResponseTime: 0, lastUsed: 0, isHealthy: true },
      ],
    ]);

    assert.equal(rotator.getNext({ excludeRecent: 'dup' }), null);
  });

  it('uses weighted selection, unhealthy multiplier, and fallback path', () => {
    const weighted = new ProxyRotator([proxyA, proxyB]);
    mock.method(Math, 'random', () => 0.8);
    assert.equal(weighted.getNext(), proxyB.url);

    weighted._health.get(proxyA.url).isHealthy = false;
    mock.restoreAll();
    mock.method(Math, 'random', () => 0.5);
    assert.equal(weighted.getNext(), proxyB.url);

    const missingHealth = new ProxyRotator([proxyA]);
    missingHealth._health.delete(proxyA.url);
    mock.restoreAll();
    mock.method(Math, 'random', () => 0);
    assert.equal(missingHealth.getNext(), proxyA.url);

    const fallback = new ProxyRotator([proxyA, proxyB]);
    mock.restoreAll();
    mock.method(Math, 'random', () => Number.NaN);
    assert.equal(fallback.getNext(), proxyA.url);
  });

  it('uses default weight when proxy weight is undefined', () => {
    const rotator = new ProxyRotator([{ url: 'http://no-weight', region: 'kr' }]);
    mock.method(Math, 'random', () => 0);
    assert.equal(rotator.getNext(), 'http://no-weight');
  });

  it('updates success and failure stats and handles unknown proxies', () => {
    const rotator = new ProxyRotator([proxyA]);

    rotator.markSuccess('http://missing', 100);
    rotator.markFailure('http://missing', new Error('x'));

    rotator.markSuccess(proxyA.url, 100);
    rotator.markSuccess(proxyA.url, 300);
    let health = rotator.getHealthReport().get(proxyA.url);
    assert.equal(health.successCount, 2);
    assert.equal(health.avgResponseTime, 200);
    assert.equal(health.isHealthy, true);

    rotator.markFailure(proxyA.url, new Error('fail-1'));
    rotator.markFailure(proxyA.url, new Error('fail-2'));
    health = rotator.getHealthReport().get(proxyA.url);
    assert.equal(health.failureCount, 2);
    assert.equal(health.isHealthy, true);

    rotator.markFailure(proxyA.url, new Error('fail-3'));
    health = rotator.getHealthReport().get(proxyA.url);
    assert.equal(health.isHealthy, false);

    rotator.markSuccess(proxyA.url, 120);
    rotator.markSuccess(proxyA.url, 120);
    rotator.markSuccess(proxyA.url, 120);
    health = rotator.getHealthReport().get(proxyA.url);
    assert.equal(health.isHealthy, true);
  });

  it('manages rolling window, health evaluation edges, and report copies', () => {
    const rotator = new ProxyRotator([proxyA]);

    rotator._pushResult('http://missing', true);
    rotator._evaluateHealth(proxyA.url);

    rotator._pushResult(proxyA.url, false);
    rotator._evaluateHealth(proxyA.url);
    assert.equal(rotator.getHealthReport().get(proxyA.url).isHealthy, true);

    for (let i = 0; i < 11; i += 1) {
      rotator._pushResult(proxyA.url, i % 2 === 0);
    }

    const results = rotator._recentResults.get(proxyA.url);
    assert.equal(results.length, 10);
    assert.equal(results[0], false);

    rotator._health.delete(proxyA.url);
    rotator._evaluateHealth(proxyA.url);
    assert.equal(rotator._health.has(proxyA.url), false);

    const report = rotator.getHealthReport();
    report.set(proxyA.url, {
      successCount: 99,
      failureCount: 99,
      avgResponseTime: 99,
      lastUsed: 99,
      isHealthy: false,
    });
    assert.equal(rotator.getHealthReport().has(proxyA.url), false);
  });

  it('adds and removes proxies across internal maps and getters', () => {
    const rotator = new ProxyRotator();
    rotator.addProxy(proxyA);

    assert.equal(rotator.totalCount, 1);
    assert.equal(rotator.healthyCount, 1);
    assert.equal(rotator._proxies.has(proxyA.url), true);
    assert.equal(rotator._health.has(proxyA.url), true);
    assert.equal(rotator._recentResults.has(proxyA.url), true);

    rotator.removeProxy(proxyA.url);

    assert.equal(rotator.totalCount, 0);
    assert.equal(rotator.healthyCount, 0);
    assert.equal(rotator._proxies.has(proxyA.url), false);
    assert.equal(rotator._health.has(proxyA.url), false);
    assert.equal(rotator._recentResults.has(proxyA.url), false);
  });
});
