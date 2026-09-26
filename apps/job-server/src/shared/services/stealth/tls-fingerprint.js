import { JA3_FORMAT, buildDefaultFingerprintPool } from './tls-fingerprint-pool.js';

/**
 * @typedef {Object} TLSConfig
 * @property {string} minVersion
 * @property {string} maxVersion
 * @property {string} ciphers
 * @property {string} sigalgs
 * @property {string} ecdhCurve
 * @property {string[]} alpnProtocols
 */

/**
 * @typedef {Object} TLSFingerprint
 * @property {string} id
 * @property {string} browser
 * @property {string} version
 * @property {string} platform
 * @property {string} ja3
 * @property {string} userAgent
 * @property {TLSConfig} tls
 */

/**
 * @typedef {Object} TLSFingerprintOptions
 * @property {TLSFingerprint[]} [fingerprints]
 * @property {string} [platform]
 * @property {string} [browser]
 * @property {boolean} [forceRotate]
 */

/**
 * @typedef {Object} TLSConnectOptions
 * @property {string} minVersion
 * @property {string} maxVersion
 * @property {string[]} ALPNProtocols
 * @property {string} [ciphers]
 * @property {string} [sigalgs]
 * @property {string} [ecdhCurve]
 * @property {boolean} [honorCipherOrder]
 */

export class TLSFingerprintManager {
  /**
   * @param {TLSFingerprintOptions} [options]
   */
  constructor(options = {}) {
    /** @type {TLSFingerprint[]} */
    this.fingerprints = options.fingerprints?.length
      ? options.fingerprints.filter((fp) => this.isValidJA3(fp.ja3))
      : this._buildDefaultPool();
    /** @type {Map<string, number>} */
    this._usage = new Map(this.fingerprints.map((fp) => [fp.id, 0]));
    /** @type {Map<string, string>} */
    this._proxyAssignments = new Map();
  }

  /**
   * @param {unknown} ja3
   * @returns {boolean}
   */
  isValidJA3(ja3) {
    return typeof ja3 === 'string' && JA3_FORMAT.test(ja3);
  }

  /**
   * @param {TLSFingerprintOptions} [options]
   * @returns {TLSFingerprint | null}
   */
  getRandomFingerprint(options = {}) {
    let candidates = this.fingerprints;

    if (options.platform) {
      const byPlatform = candidates.filter((fp) => fp.platform === options.platform);
      if (byPlatform.length > 0) candidates = byPlatform;
    }

    if (options.browser) {
      const byBrowser = candidates.filter((fp) => fp.browser === options.browser);
      if (byBrowser.length > 0) candidates = byBrowser;
    }

    if (candidates.length === 0) return null;

    let minUsage = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      minUsage = Math.min(minUsage, this._usage.get(candidate.id) ?? 0);
    }

    const leastUsed = candidates.filter(
      (candidate) => (this._usage.get(candidate.id) ?? 0) === minUsage
    );
    const selected = leastUsed[Math.floor(Math.random() * leastUsed.length)] ?? candidates[0];
    this._usage.set(selected.id, (this._usage.get(selected.id) ?? 0) + 1);
    return selected;
  }

  /**
   * @param {TLSFingerprintOptions} [options]
   * @returns {TLSFingerprint | null}
   */
  rotateFingerprint(options = {}) {
    return this.getRandomFingerprint(options);
  }

  /**
   * @param {string} platform
   * @returns {TLSFingerprint[]}
   */
  getForPlatform(platform) {
    return this.fingerprints.filter((fp) => fp.platform === platform);
  }

  /**
   * @param {string} [proxyUrl]
   * @param {TLSFingerprintOptions} [options]
   * @returns {TLSFingerprint | null}
   */
  getForProxy(proxyUrl, options = {}) {
    if (!proxyUrl) return this.getRandomFingerprint(options);

    const assignedId = this._proxyAssignments.get(proxyUrl);
    if (assignedId && !options.forceRotate) {
      const existing = this.fingerprints.find((fp) => fp.id === assignedId);
      if (existing) return existing;
    }

    const next = this.rotateFingerprint(options);
    if (!next) return null;

    this._proxyAssignments.set(proxyUrl, next.id);
    return next;
  }

  /**
   * @param {TLSFingerprint} [fingerprint]
   * @returns {TLSConnectOptions}
   */
  buildTlsConnectOptions(fingerprint) {
    if (!fingerprint) {
      return {
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ALPNProtocols: ['h2', 'http/1.1'],
      };
    }

    return {
      minVersion: fingerprint.tls.minVersion,
      maxVersion: fingerprint.tls.maxVersion,
      ciphers: fingerprint.tls.ciphers,
      sigalgs: fingerprint.tls.sigalgs,
      ecdhCurve: fingerprint.tls.ecdhCurve,
      ALPNProtocols: fingerprint.tls.alpnProtocols,
      honorCipherOrder: true,
    };
  }

  /**
   * @returns {Map<string, number>}
   */
  getUsageReport() {
    return new Map(this._usage);
  }

  /**
   * @returns {TLSFingerprint[]}
   */
  _buildDefaultPool() {
    return buildDefaultFingerprintPool();
  }
}

export default TLSFingerprintManager;
