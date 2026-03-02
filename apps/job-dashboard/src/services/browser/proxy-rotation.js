/**
 * Round-robin proxy rotation with temporary blacklisting.
 */
export class ProxyRotator {
  /**
   * @param {string} [proxyList] Comma-separated proxy list.
   */
  constructor(proxyList = '') {
    this.proxies = proxyList
      .split(',')
      .map((proxy) => proxy.trim())
      .filter(Boolean);
    this.currentIndex = 0;
    this.blacklist = new Map();
    this.cooldownMs = 5 * 60 * 1000;
  }

  /**
   * @returns {string[]}
   */
  getHealthy() {
    const now = Date.now();
    for (const [proxy, until] of this.blacklist.entries()) {
      if (until <= now) {
        this.blacklist.delete(proxy);
      }
    }
    return this.proxies.filter((proxy) => !this.blacklist.has(proxy));
  }

  /**
   * @returns {string|null}
   */
  getNext() {
    if (this.proxies.length === 0) {
      return null;
    }

    const healthy = this.getHealthy();
    if (healthy.length === 0) {
      let earliest = null;
      for (const [proxy, until] of this.blacklist.entries()) {
        if (!earliest || until < earliest.until) {
          earliest = { proxy, until };
        }
      }

      if (earliest) {
        this.blacklist.delete(earliest.proxy);
        return earliest.proxy;
      }

      return this.proxies[0] || null;
    }

    const selected = healthy[this.currentIndex % healthy.length];
    this.currentIndex = (this.currentIndex + 1) % Math.max(healthy.length, 1);
    return selected;
  }

  /**
   * @param {string} proxy
   */
  markFailed(proxy) {
    if (!proxy) {
      return;
    }
    this.blacklist.set(proxy, Date.now() + this.cooldownMs);
  }
}

export default ProxyRotator;
