import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

const { applyToSaramin } = await import('../saramin-strategy.js');
const { APPLICATION_STATUS } = await import('../../application-manager.js');
const { resetRetryState } = await import('@resume/shared/retry');

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
  let pageControls;
  let pageTexts;
  let addAppCalls;
  let updateStatusCalls;

  const button = (overrides = {}) => ({ click: mock.fn(() => Promise.resolve()), ...overrides });

  function showApplyFlow({ confirm = true, result = '지원 완료' } = {}) {
    pageControls.set('a:입사지원', button());
    if (confirm) pageControls.set('button:확인', button());
    if (result) pageTexts.push(result);
  }

  beforeEach(() => {
    resetRetryState('saramin');
    pageControls = new Map();
    pageTexts = [];
    addAppCalls = [];
    updateStatusCalls = [];

    mockPage = {
      goto: mock.fn(() => Promise.resolve()),
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
      addApplication: mock.fn((job) => {
        addAppCalls.push(job);
        return mockApplication;
      }),
      updateStatus: mock.fn((id, status) => {
        updateStatusCalls.push({ id, status });
      }),
      recordRetryMetric: mock.fn(() => {}),
    };

    ctx = {
      page: mockPage,
      logger: mockLogger,
      appManager: mockAppManager,
      findByText: async (tag, text) => pageControls.get(`${tag}:${text}`) ?? null,
      findElementWithText: async (text) => {
        const match = pageTexts.find((pageText) => pageText.includes(text));
        return match ? { text: match } : null;
      },
      sleep: mock.fn(async () => {}),
    };
  });

  afterEach(() => {
    mock.reset();
  });

  // ===== Success Cases =====

  it('applies to Saramin successfully with confirmation button', async () => {
    showApplyFlow();

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(pageControls.get('button:확인').click.mock.callCount(), 1);
    assert.strictEqual(addAppCalls.length, 1);
    assert.strictEqual(updateStatusCalls.length, 1);
    assert.strictEqual(updateStatusCalls[0].id, 'app-123');
  });

  it('applies to Saramin successfully without confirmation button', async () => {
    showApplyFlow({ confirm: false });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(addAppCalls.length, 1);
  });

  it('returns success with application data on complete flow', async () => {
    mockAppManager.addApplication = mock.fn(() => ({
      id: 'saramin-app-456',
      company: '테스트회사',
    }));
    showApplyFlow({ confirm: false });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.application.id, 'saramin-app-456');
  });

  // ===== Error Cases - Authentication =====

  it('returns error when not logged in', async () => {
    pageControls.set('a:로그인', { href: '#login' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('not logged in'));
  });

  // ===== Error Cases - CAPTCHA =====

  it('returns error when CAPTCHA challenge detected', async () => {
    pageTexts.push('로봇이 아닙니다');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('captcha'));
  });

  it('returns error when CAPTCHA blocks application - 자동입력방지', async () => {
    pageTexts.push('자동입력방지');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('captcha'));
  });

  // ===== Error Cases - Rate Limiting =====

  it('returns error when rate limited - Korean message', async () => {
    pageTexts.push('잠시 후 다시 시도해 주세요');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('rate limit'));
    assert.ok(mockPage.goto.mock.callCount() > 1, 'rate limits are retried');
    assert.ok(ctx.sleep.mock.callCount() > 0, 'retry backoff uses the injected sleep');
  });

  it('returns error when rate limited - English message', async () => {
    pageTexts.push('Too many requests', 'too many requests');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('rate limit'));
  });

  // ===== Error Cases - Application Status =====

  it('returns error when already applied', async () => {
    pageControls.set('a:입사지원', button());
    pageTexts.push('이미 지원한 공고입니다');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('already'));
    assert.strictEqual(addAppCalls.length, 0);
  });

  it('returns error when job posting no longer accepting applications', async () => {
    showApplyFlow({ result: '지원할 수 없습니다' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.strictEqual(addAppCalls.length, 0);
  });

  // ===== Error Cases - Form/Page Errors =====

  it('returns error when apply button not found', async () => {
    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('apply button not found'));
    assert.strictEqual(mockPage.screenshot.mock.callCount(), 1);
  });

  it('returns error when no success confirmation found', async () => {
    showApplyFlow({ result: null });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('confirmation not found'));
  });

  it('returns error when error message appears on page', async () => {
    showApplyFlow({ result: '오류가 발생했습니다' });

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().includes('error detected'));
  });

  // ===== Edge Cases =====

  it('handles page navigation error gracefully', async () => {
    mockPage.goto = mock.fn(() => Promise.reject(new Error('Navigation failed')));

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('handles exception during apply button click', async () => {
    pageControls.set(
      'a:입사지원',
      button({ click: mock.fn(() => Promise.reject(new Error('Click failed'))) })
    );

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, false);
    assert.strictEqual(addAppCalls.length, 0);
  });

  it('handles missing Korean text alternatives gracefully', async () => {
    pageControls.set('button:지원하기', button());
    pageTexts.push('지원하였습니다');

    const result = await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(result.success, true);
  });

  // ===== Application Manager Integration =====

  it('adds application to manager on success', async () => {
    showApplyFlow();

    await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(addAppCalls.length, 1);
    assert.deepStrictEqual(addAppCalls[0], testJob);
  });

  it('updates status to APPLIED on success', async () => {
    showApplyFlow();

    await applyToSaramin.call(ctx, testJob);

    assert.strictEqual(updateStatusCalls.length, 1);
    assert.strictEqual(updateStatusCalls[0].id, 'app-123');
    assert.strictEqual(updateStatusCalls[0].status, APPLICATION_STATUS.APPLIED);
  });

  it('records retry metrics on success', async () => {
    showApplyFlow();

    await applyToSaramin.call(ctx, testJob);

    assert.ok(mockAppManager.recordRetryMetric.mock.callCount() > 0);
  });
});
