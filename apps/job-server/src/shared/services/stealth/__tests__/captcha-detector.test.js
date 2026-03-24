import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CaptchaDetector } from '../captcha-detector.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('CaptchaDetector', () => {
  it('detectInHtml handles empty input, no match, recaptcha with siteKey, and hcaptcha without siteKey', () => {
    let now = 1000;
    mock.method(Date, 'now', () => {
      now += 1;
      return now;
    });

    const detector = new CaptchaDetector();

    assert.equal(detector.detectInHtml('', 'https://example.com'), null);
    assert.equal(detector.detectInHtml('<html>plain</html>', 'https://example.com'), null);

    const recaptcha = detector.detectInHtml(
      '<div class="g-recaptcha" data-sitekey="abc123"></div>',
      'https://a.com'
    );
    assert.equal(recaptcha.type, 'recaptcha');
    assert.equal(recaptcha.url, 'https://a.com');
    assert.equal(recaptcha.siteKey, 'abc123');

    const hcaptcha = detector.detectInHtml('<div class="h-captcha"></div>', 'https://b.com');
    assert.equal(hcaptcha.type, 'hcaptcha');
    assert.equal(hcaptcha.url, 'https://b.com');
    assert.equal('siteKey' in hcaptcha, false);
  });

  it('detectInHtml detects cloudflare signature without siteKey regex', () => {
    mock.method(Date, 'now', () => 2000);
    const detector = new CaptchaDetector();

    const detection = detector.detectInHtml('<title>Just a moment</title>', 'https://cf.com');

    assert.deepEqual(detection, {
      type: 'cloudflare',
      url: 'https://cf.com',
      timestamp: 2000,
    });
  });

  it('detectFromStatusCode returns null for missing headers and non-cloudflare responses', () => {
    const detector = new CaptchaDetector();

    assert.equal(detector.detectFromStatusCode(403, null, 'https://x.com'), null);
    assert.equal(
      detector.detectFromStatusCode(200, { 'cf-mitigated': 'challenge' }, 'https://x.com'),
      null
    );
    assert.equal(
      detector.detectFromStatusCode(401, { server: 'cloudflare' }, 'https://x.com'),
      null
    );
    assert.equal(detector.detectFromStatusCode(403, { server: 'nginx' }, 'https://x.com'), null);
  });

  it('detectFromStatusCode detects cloudflare via cf-mitigated, cf-chl-bypass, and server header', () => {
    let now = 3000;
    mock.method(Date, 'now', () => {
      now += 1;
      return now;
    });

    const detector = new CaptchaDetector();

    const byMitigated = detector.detectFromStatusCode(
      403,
      { 'CF-Mitigated': 'challenge' },
      'https://m.com'
    );
    const byBypass = detector.detectFromStatusCode(403, { 'cf-chl-bypass': '1' }, 'https://b.com');
    const byServer = detector.detectFromStatusCode(503, { Server: 'cloudflare' }, 'https://s.com');

    assert.equal(byMitigated.type, 'cloudflare');
    assert.equal(byBypass.type, 'cloudflare');
    assert.equal(byServer.type, 'cloudflare');
    assert.equal(detector.detectionCount, 3);
  });

  it('shouldPause and recentDetectionCount respect rolling window and threshold', () => {
    let now = 10_000;
    mock.method(Date, 'now', () => now);

    const detector = new CaptchaDetector({ maxDetectionsBeforePause: 2, rollingWindowMs: 1000 });

    detector._history.push({ type: 'cloudflare', url: 'u1', timestamp: 5000 });
    assert.equal(detector.recentDetectionCount, 0);
    assert.equal(detector.shouldPause(), false);

    detector._history.push({ type: 'recaptcha', url: 'u2', timestamp: 9501 });
    assert.equal(detector.recentDetectionCount, 1);
    assert.equal(detector.shouldPause(), false);

    detector._history.push({ type: 'hcaptcha', url: 'u3', timestamp: 9502 });
    assert.equal(detector.recentDetectionCount, 2);
    assert.equal(detector.shouldPause(), true);

    now = 11_000;
    assert.equal(detector.recentDetectionCount, 0);
    assert.equal(detector.shouldPause(), false);
  });

  it('notifyIfConfigured is a noop without callback', async () => {
    const detector = new CaptchaDetector();
    await assert.doesNotReject(
      detector.notifyIfConfigured({ type: 'cloudflare', url: 'u', timestamp: 1 })
    );
  });

  it('notifyIfConfigured calls callback and handles callback errors', async () => {
    const okCallback = mock.fn(async () => {});
    const errorLogger = { error: mock.fn() };
    const badError = new Error('boom');
    const badCallback = mock.fn(async () => {
      throw badError;
    });

    const okDetector = new CaptchaDetector({ notifyCallback: okCallback });
    const badDetector = new CaptchaDetector({ notifyCallback: badCallback, logger: errorLogger });

    const payload = { type: 'recaptcha', url: 'https://n.com', timestamp: 123 };

    await okDetector.notifyIfConfigured(payload);
    await badDetector.notifyIfConfigured(payload);

    assert.equal(okCallback.mock.callCount(), 1);
    assert.deepEqual(okCallback.mock.calls[0].arguments, [payload]);

    assert.equal(badCallback.mock.callCount(), 1);
    assert.equal(errorLogger.error.mock.callCount(), 1);
    assert.equal(
      errorLogger.error.mock.calls[0].arguments[0],
      'Failed to send captcha detection notification:'
    );
    assert.equal(errorLogger.error.mock.calls[0].arguments[1], badError);
  });

  it('record emits event, appends history, and calls notifyIfConfigured', () => {
    const detector = new CaptchaDetector();
    const notifySpy = mock.method(detector, 'notifyIfConfigured', () => Promise.resolve());

    let emitted = null;
    detector.on('captcha:detected', (detection) => {
      emitted = detection;
    });

    const detection = { type: 'cloudflare', url: 'https://x.com', timestamp: 456 };
    detector._record(detection);

    assert.equal(detector.detectionCount, 1);
    assert.equal(detector.getDetectionHistory()[0], detection);
    assert.equal(emitted, detection);
    assert.equal(notifySpy.mock.callCount(), 1);
    assert.deepEqual(notifySpy.mock.calls[0].arguments, [detection]);
  });

  it('getDetectionHistory returns a copy, clearHistory empties, and destroy clears listeners/history', () => {
    const detector = new CaptchaDetector();

    detector._history.push({ type: 'cloudflare', url: 'a', timestamp: 1 });
    const snapshot = detector.getDetectionHistory();
    snapshot.push({ type: 'recaptcha', url: 'b', timestamp: 2 });

    assert.equal(detector.detectionCount, 1);

    detector.clearHistory();
    assert.equal(detector.detectionCount, 0);

    detector.on('captcha:detected', () => {});
    assert.equal(detector.listenerCount('captcha:detected'), 1);

    detector._history.push({ type: 'hcaptcha', url: 'c', timestamp: 3 });
    detector.destroy();

    assert.equal(detector.detectionCount, 0);
    assert.equal(detector.listenerCount('captcha:detected'), 0);
  });
});
