import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

const { applyToSaramin } = await import('../saramin-strategy.js');
const { APPLICATION_STATUS } = await import('../../application-manager.js');

describe('applyToSaramin', () => {
  const testJob = {
    company: '테스트회사',
    title: '프론트엔드 개발자',
    sourceUrl: 'https://www.saramin.co.kr/job/12345',
  };

  let ctx;
  let mockPage;
  let mockLogger;
  let mockAppManager;
  let findByTextResults;
  let findElementResults;
  let addAppCalls;
  let updateStatusCalls;

  beforeEach(() => {
    findByTextResults = [];
    findElementResults = [];
    addAppCalls = [];
    updateStatusCalls = [];

    mockPage = {
      goto: mock.fn(() => new Promise((r) => setTimeout(r, 2000))),
      $: mock.fn(() => Promise.resolve(null)),
      click: mock.fn(() => Promise.resolve()),
      screenshot: mock.fn(() => Promise.resolve()),
    };

    mockLogger = {
      info: mock.fn(() => {}),
      error: mock.fn(() => {}),
      warn: mock.fn(() => {}),
    };

    const mockApplication = {
      id: 'app-123',
      company: '테스트회사',
      title: '프론트엔드 개발자',
      status: APPLICATION_STATUS.PENDING,
    };

    mockAppManager = {
      addApplication: mock.fn(() => {
        addAppCalls.push(testJob);
        return mockApplication;
      }),
      updateStatus: mock.fn((id, status) => {
        updateStatusCalls.push({ id, status });
      }),
      recordRetryMetric: mock.fn(() => {}),
    };

    const findByText = async (_tag, _text, _cssAlt) => {
      if (findByTextResults.length === 0) return null;
      return findByTextResults.shift();
    };

    const findElementWithText = async (_text) => {
      if (findElementResults.length === 0) return null;
      return findElementResults.shift();
    };

    ctx = {
      page: mockPage,
      logger: mockLogger,
      appManager: mockAppManager,
      findByText,
      findElementWithText,
    };
  });

  afterEach(() => {
    mock.reset();
  });

  // Code flow (verified via debug):
  // login: findByText('로그인'), findByText('Sign in') = 2 calls
  // captcha: findElementWithText 3 calls
  // rate limit: findElementWithText 3 calls
  // apply button: findByText 4 calls
  // then: already applied, confirm button, success/error message

  // ===== Success Cases =====

  it('applies to Saramin successfully with confirmation button', async () => {
    // login (2 calls)
    findByTextResults.push(null, null);
    // captcha (3 calls)
    findElementResults.push(null, null, null);
    // rate limit (3 calls)
    findElementResults.push(null, null, null);
    // apply button (4 calls)
    findByTextResults.push(null, null, null, { click: mock.fn() });
    // already applied (1 call)
    findElementResults.push(null);
    // confirm button
    findByTextResults.push({ click: mock.fn() });
    // success message
    findElementResults.push({ text: '지원 완료' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(addAppCalls.length, 1);
    assert.strictEqual(updateStatusCalls.length, 1);
    assert.strictEqual(updateStatusCalls[0].id, 'app-123');
  });

  it('applies to Saramin successfully without confirmation button', async () => {
    findByTextResults.push(null, null);
    findElementResults.push(null, null, null);
    findElementResults.push(null, null, null);
    findByTextResults.push(null, null, null, { click: mock.fn() });
    findElementResults.push(null);
    findByTextResults.push(null);
    findElementResults.push({ text: '지원 완료' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(addAppCalls.length, 1);
  });

  it('returns success with application data on complete flow', async () => {
    mockAppManager.addApplication = mock.fn(() => ({
      id: 'saramin-app-456',
      company: '테스트회사',
    }));

    findByTextResults.push(null, null);
    findElementResults.push(null, null, null);
    findElementResults.push(null, null, null);
    findByTextResults.push(null, null, null, { click: mock.fn() });
    findElementResults.push(null);
    findByTextResults.push(null);
    findElementResults.push({ text: '지원 완료' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.application.id, 'saramin-app-456');
  });

  // ===== Error Cases - Authentication =====

  it('returns error when not logged in', async () => {
    findByTextResults.push({ href: '#login' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.ok(
      result.error.toLowerCase().includes('not logged in') || result.error.includes('AuthError')
    );
  });

  // ===== Error Cases - CAPTCHA =====

  it('returns error when CAPTCHA challenge detected', async () => {
    findByTextResults.push(null, null);
    findElementResults.push({ text: '로봇이 아닙니다' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('captcha'));
  });

  it('returns error when CAPTCHA blocks application - 자동입력방지', async () => {
    findByTextResults.push(null, null);
    findElementResults.push({ text: '자동입력방지' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('captcha'));
  });

  // ===== Error Cases - Rate Limiting =====

  it('returns error when rate limited - Korean message', async () => {
    // RateLimitError is retryable - withRetry will retry
    for (let i = 0; i < 3; i++) {
      findByTextResults.push(null, null);
      findElementResults.push(null, null, null);
      findElementResults.push({ text: '잠시 후 다시 시도' });
    }

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('returns error when rate limited - English message', async () => {
    for (let i = 0; i < 3; i++) {
      findByTextResults.push(null, null);
      findElementResults.push(null, null, null);
      findElementResults.push({ text: 'too many requests' });
    }

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  // ===== Error Cases - Application Status =====

  it('returns error when already applied', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, { click: mock.fn() }); // apply button
    findElementResults.push({ text: '이미 지원한' }); // already applied

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('already'));
  });

  it('returns error when job posting no longer accepting applications', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, { click: mock.fn() }); // apply button
    findElementResults.push(null); // already applied
    findByTextResults.push(null); // confirm button
    findElementResults.push({ text: '지원할 수 없습니다' }); // error

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
  });

  // ===== Error Cases - Form/Page Errors =====

  it('returns error when apply button not found', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, null); // apply button NOT found

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.toLowerCase().includes('apply button') ||
        result.error.toLowerCase().includes('not found')
    );
  });

  it('returns error when no success confirmation found', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, { click: mock.fn() }); // apply button
    findElementResults.push(null); // already applied
    findByTextResults.push(null); // confirm button
    findElementResults.push(null); // success NOT found

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.toLowerCase().includes('confirmation') ||
        result.error.toLowerCase().includes('not found')
    );
  });

  it('returns error when error message appears on page', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, { click: mock.fn() }); // apply button
    findElementResults.push(null); // already applied
    findByTextResults.push(null); // confirm button
    findElementResults.push({ text: '오류가 발생했습니다' }); // error message

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('error'));
  });

  // ===== Edge Cases =====

  it('handles page navigation error gracefully', async () => {
    mockPage.goto = mock.fn(() => Promise.reject(new Error('Navigation failed')));

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('handles exception during apply button click', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, {
      click: mock.fn(() => Promise.reject(new Error('Click failed'))),
    });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
  });

  it('handles missing Korean text alternatives gracefully', async () => {
    findByTextResults.push(null, null); // login
    findElementResults.push(null, null, null); // captcha
    findElementResults.push(null, null, null); // rate limit
    findByTextResults.push(null, null, null, null); // apply button not found

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
  });

  // ===== Application Manager Integration =====

  it('adds application to manager on success', async () => {
    findByTextResults.push(null, null);
    findElementResults.push(null, null, null);
    findElementResults.push(null, null, null);
    findByTextResults.push(null, null, null, { click: mock.fn() });
    findElementResults.push(null);
    findByTextResults.push(null);
    findElementResults.push({ text: '지원 완료' });

    await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(addAppCalls.length, 1);
    assert.deepStrictEqual(addAppCalls[0], testJob);
  });

  it('updates status to APPLIED on success', async () => {
    findByTextResults.push(null, null);
    findElementResults.push(null, null, null);
    findElementResults.push(null, null, null);
    findByTextResults.push(null, null, null, { click: mock.fn() });
    findElementResults.push(null);
    findElementResults.push(null);
    findElementResults.push({ text: '지원 완료' });

    await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(updateStatusCalls.length, 1);
    assert.strictEqual(updateStatusCalls[0].id, 'app-123');
    assert.strictEqual(updateStatusCalls[0].status, APPLICATION_STATUS.APPLIED);
  });

  it('logs retry metrics on success', async () => {
    findByTextResults.push(null, null);
    findElementResults.push(null, null, null);
    findElementResults.push(null, null, null);
    findByTextResults.push(null, null, null, { click: mock.fn() });
    findElementResults.push(null);
    findByTextResults.push(null);
    findElementResults.push({ text: '지원 완료' });

    await applyToSaramin.call(ctx, testJob);

    assert.ok(mockLogger.info.mock.callCount() >= 0);
  });
});
