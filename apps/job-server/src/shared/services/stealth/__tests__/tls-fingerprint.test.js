import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TLSFingerprintManager } from '../tls-fingerprint.js';

describe('TLSFingerprintManager', () => {
  it('builds a 50+ fingerprint pool with valid JA3 strings', () => {
    const manager = new TLSFingerprintManager();

    assert.ok(manager.fingerprints.length >= 50);
    assert.ok(manager.fingerprints.some((fp) => fp.platform === 'win'));
    assert.ok(manager.fingerprints.some((fp) => fp.platform === 'mac'));
    assert.ok(manager.fingerprints.some((fp) => fp.platform === 'linux'));
    assert.ok(manager.fingerprints.some((fp) => fp.browser === 'chrome'));
    assert.ok(manager.fingerprints.some((fp) => fp.browser === 'firefox'));
    assert.ok(manager.fingerprints.some((fp) => fp.browser === 'safari'));

    for (const fingerprint of manager.fingerprints) {
      assert.equal(manager.isValidJA3(fingerprint.ja3), true);
      assert.equal(typeof fingerprint.userAgent, 'string');
      assert.ok(fingerprint.userAgent.length > 10);
    }
  });

  it('filters by platform and browser constraints', () => {
    const manager = new TLSFingerprintManager();

    const macOnly = manager.getForPlatform('mac');
    assert.ok(macOnly.length > 0);
    assert.ok(macOnly.every((fp) => fp.platform === 'mac'));

    const firefoxLinux = manager.getRandomFingerprint({ platform: 'linux', browser: 'firefox' });
    assert.equal(firefoxLinux.platform, 'linux');
    assert.equal(firefoxLinux.browser, 'firefox');
  });

  it('keeps proxy to fingerprint mapping stable unless forced', () => {
    const manager = new TLSFingerprintManager();

    const first = manager.getForProxy('http://proxy-a:8080');
    const second = manager.getForProxy('http://proxy-a:8080');
    const third = manager.getForProxy('http://proxy-a:8080', { forceRotate: true });

    assert.equal(first.id, second.id);
    assert.notEqual(first.id, third.id);
  });

  it('produces connect options aligned with selected fingerprint', () => {
    const manager = new TLSFingerprintManager();
    const fingerprint = manager.getRandomFingerprint({ platform: 'win' });
    const connect = manager.buildTlsConnectOptions(fingerprint);

    assert.equal(connect.minVersion, 'TLSv1.2');
    assert.equal(connect.maxVersion, 'TLSv1.3');
    assert.ok(connect.ciphers.includes('TLS_AES_128_GCM_SHA256'));
    assert.ok(Array.isArray(connect.ALPNProtocols));
    assert.ok(connect.ALPNProtocols.includes('h2'));
  });

  it('tracks usage counts as fingerprints are selected', () => {
    const manager = new TLSFingerprintManager();
    const selected = manager.getRandomFingerprint();
    const usage = manager.getUsageReport();

    assert.ok((usage.get(selected.id) ?? 0) >= 1);
  });
});
