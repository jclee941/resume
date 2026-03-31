const JA3_FORMAT = /^\d+,\d+(?:-\d+)*,\d+(?:-\d+)*,\d+(?:-\d+)*,\d+(?:-\d+)*$/;

const CHROME_JA3_MAC_120 =
  '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-11-51-45-17513-0-18-65281-16-65037-35-5-23-10-43-13,29-23-24,0';
const CHROME_JA3_MAC_131 =
  '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-13-65281-18-43-0-35-10-5-51-11-16-17513-65037-23-45,4588-29-23-24,0';
const CHROME_JA3_WIN_131 =
  '772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,45-0-65037-17513-35-10-13-65281-16-51-23-27-18-43-11-5,4588-29-23-24,0';
const FIREFOX_JA3_133 =
  '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-27-65037,4588-29-23-24-25-256-257,0';
const FIREFOX_JA3_135 =
  '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-18-51-43-13-45-28-27-65037,4588-29-23-24-25-256-257,0';
const SAFARI_JA3_17 =
  '771,4865-4866-4867-49196-49195-52393-49200-49199-52392-49162-49161-49172-49171-157-156-53-47-49160-49170-10,0-23-65281-10-11-16-5-13-18-51-45-43-27-21,29-23-24-25,0';

const CHROME_BUILD_BY_VERSION = {
  120: 6099,
  121: 6167,
  122: 6261,
  123: 6312,
  124: 6367,
  125: 6422,
  126: 6478,
  127: 6533,
  128: 6613,
  129: 6668,
  130: 6778,
  131: 6778,
};

export class TLSFingerprintManager {
  constructor(options = {}) {
    this.fingerprints = options.fingerprints?.length
      ? options.fingerprints.filter((fp) => this.isValidJA3(fp.ja3))
      : this._buildDefaultPool();
    this._usage = new Map(this.fingerprints.map((fp) => [fp.id, 0]));
    this._proxyAssignments = new Map();
  }

  isValidJA3(ja3) {
    return typeof ja3 === 'string' && JA3_FORMAT.test(ja3);
  }

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

  rotateFingerprint(options = {}) {
    return this.getRandomFingerprint(options);
  }

  getForPlatform(platform) {
    return this.fingerprints.filter((fp) => fp.platform === platform);
  }

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

  getUsageReport() {
    return new Map(this._usage);
  }

  _buildDefaultPool() {
    const fingerprints = [];

    const chromeTls = {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers:
        'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384',
      sigalgs:
        'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
      ecdhCurve: 'X25519:P-256:P-384',
      alpnProtocols: ['h2', 'http/1.1'],
    };

    const firefoxTls = {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers:
        'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305',
      sigalgs:
        'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
      ecdhCurve: 'X25519:P-256:P-384:P-521',
      alpnProtocols: ['h2', 'http/1.1'],
    };

    const safariTls = {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers:
        'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
      sigalgs:
        'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:ecdsa_sha1:rsa_pkcs1_sha1',
      ecdhCurve: 'X25519:P-256:P-384',
      alpnProtocols: ['h2', 'http/1.1'],
    };

    for (let version = 120; version <= 131; version += 1) {
      const build = CHROME_BUILD_BY_VERSION[version] ?? 6778;
      const macJa3 = version < 131 ? CHROME_JA3_MAC_120 : CHROME_JA3_MAC_131;
      const winJa3 = version < 131 ? CHROME_JA3_MAC_120 : CHROME_JA3_WIN_131;

      fingerprints.push(
        {
          id: `chrome-${version}-win`,
          browser: 'chrome',
          version: String(version),
          platform: 'win',
          ja3: winJa3,
          userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${build}.0 Safari/537.36`,
          tls: chromeTls,
        },
        {
          id: `chrome-${version}-mac`,
          browser: 'chrome',
          version: String(version),
          platform: 'mac',
          ja3: macJa3,
          userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${build}.0 Safari/537.36`,
          tls: chromeTls,
        },
        {
          id: `chrome-${version}-linux`,
          browser: 'chrome',
          version: String(version),
          platform: 'linux',
          ja3: macJa3,
          userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${build}.0 Safari/537.36`,
          tls: chromeTls,
        }
      );
    }

    for (let version = 120; version <= 124; version += 1) {
      const ja3 = version % 2 === 0 ? FIREFOX_JA3_133 : FIREFOX_JA3_135;

      fingerprints.push(
        {
          id: `firefox-${version}-win`,
          browser: 'firefox',
          version: String(version),
          platform: 'win',
          ja3,
          userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
          tls: firefoxTls,
        },
        {
          id: `firefox-${version}-mac`,
          browser: 'firefox',
          version: String(version),
          platform: 'mac',
          ja3,
          userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
          tls: firefoxTls,
        },
        {
          id: `firefox-${version}-linux`,
          browser: 'firefox',
          version: String(version),
          platform: 'linux',
          ja3,
          userAgent: `Mozilla/5.0 (X11; Linux x86_64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
          tls: firefoxTls,
        }
      );
    }

    for (const version of ['17.0', '17.1', '17.2', '17.3', '17.4', '17.5', '17.6', '18.0']) {
      const osVersion = Number.parseInt(version, 10) >= 18 ? '15_0' : '14_5';

      fingerprints.push({
        id: `safari-${version}-mac`,
        browser: 'safari',
        version,
        platform: 'mac',
        ja3: SAFARI_JA3_17,
        userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVersion}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`,
        tls: safariTls,
      });
    }

    return fingerprints;
  }
}

export default TLSFingerprintManager;
