import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseCrawler } from '../../../../crawlers/base-crawler.js';

class TestCrawler extends BaseCrawler {
  buildSearchQuery(params) {
    return params;
  }

  async searchJobs() {
    return [];
  }

  async getJobDetail() {
    return null;
  }

  normalizeJob(rawJob) {
    return rawJob;
  }
}

describe('BaseCrawler TLS + proxy coordination', () => {
  it('rotates fingerprint when proxy changes and keeps UA consistency', async () => {
    const proxySequence = ['http://proxy-a:8080', 'http://proxy-b:8080'];
    const proxySuccess = [];
    const proxyFailure = [];
    const proxyRotator = {
      getNext() {
        return proxySequence.shift() ?? null;
      },
      markSuccess(proxyUrl, responseTimeMs) {
        proxySuccess.push({ proxyUrl, responseTimeMs });
      },
      markFailure(proxyUrl, error) {
        proxyFailure.push({ proxyUrl, error: error?.message || String(error) });
      },
    };

    const fp1 = {
      id: 'fp-1',
      userAgent: 'UA-CHROME-131-WIN',
      tls: {
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ciphers: 'TLS_AES_128_GCM_SHA256',
        sigalgs: 'rsa_pss_rsae_sha256',
        ecdhCurve: 'X25519',
        alpnProtocols: ['h2', 'http/1.1'],
      },
    };
    const fp2 = {
      ...fp1,
      id: 'fp-2',
      userAgent: 'UA-FIREFOX-124-LINUX',
    };

    const tlsCalls = [];
    const tlsFingerprintManager = {
      getRandomFingerprint() {
        return fp1;
      },
      rotateFingerprint() {
        return fp2;
      },
      getForProxy(proxyUrl, options) {
        tlsCalls.push({ proxyUrl, forceRotate: options?.forceRotate });
        return proxyUrl.includes('proxy-a') ? fp1 : fp2;
      },
      buildTlsConnectOptions(fingerprint) {
        return {
          minVersion: fingerprint.tls.minVersion,
          maxVersion: fingerprint.tls.maxVersion,
          ALPNProtocols: fingerprint.tls.alpnProtocols,
        };
      },
    };

    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return new Response('ok', { status: 200, headers: {} });
    };

    const crawler = new TestCrawler('tls-test', {
      timeout: 1000,
      timing: {
        minDelay: 0,
        maxDelay: 0,
        burstProbability: 0,
        burstMinDelay: 0,
        burstMaxDelay: 0,
        longPauseProbability: 0,
        longPauseMin: 0,
        longPauseMax: 0,
      },
      proxyRotator,
      tlsFingerprintManager,
      tlsFingerprint: {
        enabled: true,
        rotatePerRequest: false,
      },
    });

    try {
      await crawler.rateLimitedFetch('https://example.com/one');
      await crawler.rateLimitedFetch('https://example.com/two');
    } finally {
      crawler.destroy();
      globalThis.fetch = originalFetch;
    }

    assert.equal(requests.length, 2);
    assert.equal(requests[0].options.headers['User-Agent'], fp1.userAgent);
    assert.equal(requests[1].options.headers['User-Agent'], fp2.userAgent);
    assert.equal(proxySuccess.length, 2);
    assert.equal(proxyFailure.length, 0);
    assert.equal(tlsCalls.length, 2);
    assert.equal(tlsCalls[0].forceRotate, true);
    assert.equal(tlsCalls[1].forceRotate, true);
  });
});
