/**
 * @fileoverview Proxy rotation with health tracking.
 *
 * Weighted random selection favoring healthy proxies.
 * Graceful no-op when no proxies are configured.
 *
 * @module shared/services/stealth/proxy-rotator
 */

/**
 * @typedef {object} ProxyConfig
 * @property {string} url - Proxy URL (http://user:pass@host:port)
 * @property {string} [region] - Geographic region
 * @property {number} [weight] - Selection weight (default: 1)
 */

/**
 * @typedef {object} ProxyHealth
 * @property {number} successCount
 * @property {number} failureCount
 * @property {number} avgResponseTime - Average response time in ms
 * @property {number} lastUsed - Timestamp of last use
 * @property {boolean} isHealthy
 */

const HEALTH_WINDOW = 10; // Number of recent results to evaluate health

/**
 * Proxy rotator with weighted random selection and health tracking.
 */
export class ProxyRotator {
  /**
   * @param {ProxyConfig[]} proxies
   */
  constructor(proxies = []) {
    /** @type {Map<string, ProxyConfig>} */
    this._proxies = new Map();

    /** @type {Map<string, ProxyHealth>} */
    this._health = new Map();

    /** @type {Map<string, boolean[]>} Rolling window of recent results */
    this._recentResults = new Map();

    for (const proxy of proxies) {
      this.addProxy(proxy);
    }
  }

  /**
   * Get the next proxy URL using weighted random selection favoring healthy proxies.
   *
   * @param {object} [options={}]
   * @param {string} [options.region] - Filter by geographic region
   * @param {string} [options.excludeRecent] - Proxy URL to exclude (avoid immediate reuse)
   * @returns {string|null} Proxy URL or null if no proxies configured
   */
  getNext(options = {}) {
    if (this._proxies.size === 0) return null;

    let candidates = [...this._proxies.values()];

    // Filter by region
    if (options.region) {
      const filtered = candidates.filter((p) => p.region === options.region);
      if (filtered.length > 0) candidates = filtered;
    }

    // Exclude recently used
    if (options.excludeRecent && candidates.length > 1) {
      candidates = candidates.filter((p) => p.url !== options.excludeRecent);
    }

    if (candidates.length === 0) return null;

    // Weighted random selection — healthy proxies get full weight, unhealthy get 0.1x
    const weighted = candidates.map((proxy) => {
      const health = this._health.get(proxy.url);
      const baseWeight = proxy.weight ?? 1;
      const healthMultiplier = health && !health.isHealthy ? 0.1 : 1;
      return { proxy, weight: baseWeight * healthMultiplier };
    });

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const { proxy, weight } of weighted) {
      random -= weight;
      if (random <= 0) {
        const health = this._health.get(proxy.url);
        if (health) health.lastUsed = Date.now();
        return proxy.url;
      }
    }

    // Fallback (should not reach here)
    return candidates[0].url;
  }

  /**
   * Mark a proxy request as successful.
   * @param {string} proxyUrl
   * @param {number} responseTimeMs
   */
  markSuccess(proxyUrl, responseTimeMs) {
    const health = this._health.get(proxyUrl);
    if (!health) return;

    health.successCount++;
    health.avgResponseTime =
      (health.avgResponseTime * (health.successCount - 1) + responseTimeMs) / health.successCount;

    this._pushResult(proxyUrl, true);
    this._evaluateHealth(proxyUrl);
  }

  /**
   * Mark a proxy request as failed.
   * Marks unhealthy if failure rate > 50% over last HEALTH_WINDOW requests.
   * @param {string} proxyUrl
   * @param {Error} _error
   */
  markFailure(proxyUrl, _error) {
    const health = this._health.get(proxyUrl);
    if (!health) return;

    health.failureCount++;
    this._pushResult(proxyUrl, false);
    this._evaluateHealth(proxyUrl);
  }

  /**
   * Get health report for all proxies.
   * @returns {Map<string, ProxyHealth>}
   */
  getHealthReport() {
    return new Map([...this._health.entries()].map(([url, health]) => [url, { ...health }]));
  }

  /**
   * Add a proxy at runtime.
   * @param {ProxyConfig} config
   */
  addProxy(config) {
    this._proxies.set(config.url, config);
    this._health.set(config.url, {
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      lastUsed: 0,
      isHealthy: true,
    });
    this._recentResults.set(config.url, []);
  }

  /**
   * Remove a proxy.
   * @param {string} url
   */
  removeProxy(url) {
    this._proxies.delete(url);
    this._health.delete(url);
    this._recentResults.delete(url);
  }

  /** @returns {number} Number of healthy proxies */
  get healthyCount() {
    let count = 0;
    for (const health of this._health.values()) {
      if (health.isHealthy) count++;
    }
    return count;
  }

  /** @returns {number} Total proxy count */
  get totalCount() {
    return this._proxies.size;
  }

  /**
   * Push a result into the rolling window.
   * @param {string} proxyUrl
   * @param {boolean} success
   * @private
   */
  _pushResult(proxyUrl, success) {
    const results = this._recentResults.get(proxyUrl);
    if (!results) return;
    results.push(success);
    if (results.length > HEALTH_WINDOW) {
      results.shift();
    }
  }

  /**
   * Evaluate proxy health based on rolling window.
   * @param {string} proxyUrl
   * @private
   */
  _evaluateHealth(proxyUrl) {
    const results = this._recentResults.get(proxyUrl);
    const health = this._health.get(proxyUrl);
    if (!results || !health || results.length < 2) return;

    const failures = results.filter((r) => !r).length;
    health.isHealthy = failures / results.length <= 0.5;
  }
}
