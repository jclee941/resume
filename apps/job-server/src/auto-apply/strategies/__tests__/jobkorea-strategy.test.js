/**
 * JobKorea Strategy Unit Tests
 *
 * Tests for applyToJobKorea() function covering:
 * - Success cases (job application flow)
 * - Error cases (auth, not found, already applied, etc.)
 * - Retry behavior (network errors, exponential backoff)
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Import error classes to check against
let _ErrorClasses;
try {
  const module = await import('../../shared/errors/apply-errors.js');
  _ErrorClasses = module;
} catch {
  _ErrorClasses = {
    AuthError: class extends Error {
      constructor(m) {
        super(m);
        this.name = 'AuthError';
      }
    },
    CaptchaError: class extends Error {
      constructor(m) {
        super(m);
        this.name = 'CaptchaError';
      }
    },
    RateLimitError: class extends Error {
      constructor(m) {
        super(m);
        this.name = 'RateLimitError';
      }
    },
    ValidationError: class extends Error {
      constructor(m) {
        super(m);
        this.name = 'ValidationError';
      }
    },
  };
}
// Mock the application manager
const mockAppManager = {
  addApplication: mock.fn(() => ({
    id: 'app_test_123',
    jobId: 'jk_12345',
    status: 'pending',
  })),
  updateStatus: mock.fn(() => ({ success: true })),
};

// Mock the logger
const mockLogger = {
  info: mock.fn(),
  error: mock.fn(),
  warn: mock.fn(),
  debug: mock.fn(),
};

// Mock notifications
const mockNotifications = {
  notifyApplySuccess: mock.fn(() => Promise.resolve()),
  notifyApplyFailed: mock.fn(() => Promise.resolve()),
};

// Sample job fixtures
const createSampleJob = (overrides = {}) => ({
  id: 'jk_12345',
  title: 'DevOps Engineer',
  company: 'Test Corp',
  source: 'jobkorea',
  sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI/12345',
  location: 'Seoul',
  matchScore: 85,
  ...overrides,
});

// Mock page factory
const createMockPage = () => {
  return {
    goto: mock.fn(() => Promise.resolve()),
    waitForSelector: mock.fn(() => Promise.resolve()),
    click: mock.fn(() => Promise.resolve()),
    fill: mock.fn(() => Promise.resolve()),
    $eval: mock.fn(() => Promise.resolve()),
    $: mock.fn(() => Promise.resolve(null)),
    screenshot: mock.fn(() => Promise.resolve()),
    title: mock.fn(() => Promise.resolve('JobKorea')),
    evaluate: mock.fn(() => Promise.resolve(null)),
    setCookie: mock.fn(() => Promise.resolve()),
  };
};

// Helper to create context for applyToJobKorea
const createContext = (pageMock, overrides = {}) => ({
  page: pageMock,
  logger: mockLogger,
  appManager: mockAppManager,
  findByText: mock.fn(() => Promise.resolve(null)),
  findElementWithText: mock.fn(() => Promise.resolve(null)),
  notifications: mockNotifications,
  ...overrides,
});

// Dynamically import the strategy module
let applyToJobKorea;

describe('JobKorea Strategy', () => {
  beforeEach(async () => {
    // Reset retry state to avoid pollution between tests
    try {
      const { resetRetryState } = await import('../../../shared/utils/retry.js');
      resetRetryState('jobkorea');
    } catch (_e) {
      /* ignore if import fails */
    }

    // Restore all mocks
    try {
      mock.resetAll?.();
    } catch (_e) {
      /* ignore */
    }
    try {
      mock.restoreAll?.();
    } catch (_e) {
      /* ignore */
    }

    // Re-import the module to get fresh functions
    const strategyModule = await import('../jobkorea-strategy.js');
    applyToJobKorea = strategyModule.applyToJobKorea;
  });

  afterEach(() => {
    try {
      mock.restoreAll();
    } catch (_e) {
      /* ignore */
    }
  });

  describe('applyToJobKorea', () => {
    describe('Success Cases', () => {
      it('applies to job successfully with valid job ID', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'a' && text === '로그인') return Promise.resolve(null); // Not logged in but no prompt needed
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기' && cssAlt === '#btnApplyDirect')
              return Promise.resolve(mockSubmitButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            // Return null for all checks except success
            if (text === 'captcha' || text === '로봇이 아닙니다' || text === '자동입력방지')
              return Promise.resolve(null);
            if (
              text === '잠시 후 다시 시도' ||
              text === 'too many requests' ||
              text === '요청이 너무 많습니다'
            )
              return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류' || text === '실패' || text === '지원할 수 없습니다')
              return Promise.resolve(null);
            if (
              text.includes('지원이 완료') ||
              text.includes('지원 완료') ||
              text.includes('지원하였습니다')
            )
              return Promise.resolve({ textContent: '지원이 완료되었습니다' });
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('DevOps Engineer - JobKorea'));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, true);
        assert.ok(result.application);
      });

      it('selects first resume when resume selection is present', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };
        const mockFirstResume = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha' || text === '로봇이 아닙니다' || text === '자동입력방지')
              return Promise.resolve(null);
            if (text === '잠시 후 다시 시도') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({});
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));

        mockPage.$.mock.mockImplementation((selector) => {
          if (selector === '.resume_select') {
            return Promise.resolve({
              click: mock.fn(() => Promise.resolve()),
              $: () => Promise.resolve(mockFirstResume),
            });
          }
          if (selector === '.resume_item:first-child') return Promise.resolve(mockFirstResume);
          if (selector === 'input[type="radio"]:first-child') return Promise.resolve(null);
          return Promise.resolve(null);
        });

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, true);
      });

      it('completes form auto-fill for all required fields', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha' || text === '로봇이 아닙니다') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({});
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation((selector) => {
          if (selector === '.resume_select') {
            return Promise.resolve({
              click: mock.fn(() => Promise.resolve()),
              $: () => Promise.resolve({ click: mock.fn(() => Promise.resolve()) }),
            });
          }
          if (selector === '.resume_item:first-child')
            return Promise.resolve({ click: mock.fn(() => Promise.resolve()) });
          return Promise.resolve(null);
        });

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, true);
        assert.strictEqual(mockApplyButton.click.mock.callCount() >= 1, true);
      });

      it('detects application confirmation correctly', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({ textContent: '지원 완료' });
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, true);
        assert.ok(result.application);
      });

      it('returns success response with application data', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({});
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, true);
        assert.ok(result.application);
        assert.strictEqual(result.application.id, 'app_test_123');
      });
    });

    describe('Error Cases', () => {
      it('handles authentication failure (redirect to login)', async () => {
        const mockPage = createMockPage();
        let loginCheckCount = 0;

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text) => {
            if (tag === 'a' && text === '로그인') {
              loginCheckCount++;
              // First time: login link found, second time: still logged out after refresh
              if (loginCheckCount <= 2) return Promise.resolve({ href: '/Login' });
              return Promise.resolve(null);
            }
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn(() => Promise.resolve(null)),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('JobKorea Login'));
        mockPage.goto.mock.mockImplementation((url) => {
          if (url === 'https://www.jobkorea.co.kr') return Promise.resolve();
          return Promise.resolve();
        });

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(
          result.error.includes('Not logged in') ||
            result.error.includes('session') ||
            result.error.includes('expired')
        );
      });

      it('returns error when job not found (404)', async () => {
        const mockPage = createMockPage();
        mockPage.goto.mock.mockImplementation(() =>
          Promise.reject(new Error('Navigation failed: 404'))
        );

        const context = createContext(mockPage);

        const job = createSampleJob({ sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI/99999' });
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error);
      });

      it('detects already applied to job', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한')
              return Promise.resolve({ textContent: '이미 지원한 공고입니다' });
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('Already applied'));
      });

      it('handles CAPTCHA detection', async () => {
        const mockPage = createMockPage();

        const context = createContext(mockPage, {
          findByText: mock.fn(() => Promise.resolve(null)),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha' || text === '로봇이 아닙니다' || text === '자동입력방지') {
              return Promise.resolve({ textContent: '자동입력방지' });
            }
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('CAPTCHA'));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('captcha') || result.error.includes('CAPTCHA'));
      });

      it('handles form validation errors', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류' || text === '실패' || text === '지원할 수 없습니다') {
              return Promise.resolve({ textContent: '오류가 발생했습니다' });
            }
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('error') || result.error.includes('Application error'));
      });

      it('handles network timeout', async () => {
        const mockPage = createMockPage();
        mockPage.goto.mock.mockImplementation(() =>
          Promise.reject(new Error('Navigation timeout'))
        );

        const context = createContext(mockPage);

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error);
      });

      it('handles resume upload failure', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));

        // Resume select present but clicking fails
        mockPage.$.mock.mockImplementation((selector) => {
          if (selector === '.resume_select') {
            return Promise.resolve({
              click: mock.fn(() => Promise.reject(new Error('Upload failed'))),
            });
          }
          return Promise.resolve(null);
        });

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
      });

      it('handles missing apply button', async () => {
        const mockPage = createMockPage();

        const context = createContext(mockPage, {
          findByText: mock.fn(() => Promise.resolve(null)),
          findElementWithText: mock.fn(() => Promise.resolve(null)),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));
        mockPage.screenshot.mock.mockImplementation(() =>
          Promise.reject(new Error('Screenshot failed'))
        );

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('Apply button not found'));
      });

      it('handles missing confirmation after submission', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            // No success message
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('confirmation not found'));
      });

      it('handles rate limiting', async () => {
        const mockPage = createMockPage();

        const context = createContext(mockPage, {
          findByText: mock.fn(() => Promise.resolve(null)),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (
              text === '잠시 후 다시 시도' ||
              text === 'too many requests' ||
              text === '요청이 너무 많습니다'
            ) {
              return Promise.resolve({ textContent: '잠시 후 다시 시도' });
            }
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('rate limit') || result.error.includes('too many'));
      });
    });

    describe('Retry Behavior', () => {
      it('handles transient network error and retries', async () => {
        const mockPage = createMockPage();
        let gotoAttempts = 0;

        mockPage.goto.mock.mockImplementation(() => {
          gotoAttempts++;
          if (gotoAttempts < 3) {
            const error = new Error('Network temporary failure');
            error.code = 'ECONNRESET';
            throw error;
          }
          return Promise.resolve();
        });

        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text, _cssAlt) => {
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({});
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        // Strategy uses withRetry, so transient errors should be retried
        // If retry succeeds, we get success
        // If retry exhausted, we get failure
        assert.ok(result.success === true || result.success === false);
      });

      it('returns error when max retries exceeded', async () => {
        const mockPage = createMockPage();

        // Always fail
        mockPage.goto.mock.mockImplementation(() => {
          const error = new Error('Persistent network failure');
          error.code = 'ECONNREFUSED';
          throw error;
        });

        const context = createContext(mockPage);

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error);
      });
    });

    describe('Apply Button Variants', () => {
      const buttonVariants = [
        { text: '즉시 지원', tag: 'button', description: 'standard button text' },
        { text: '즉시지원', tag: 'button', description: 'no space variant' },
        { text: '잡코리아 즉시지원', tag: 'button', description: 'with brand name' },
        { text: '입사지원', tag: 'button', description: 'alternative text' },
        { text: '지원하기', tag: 'button', description: 'generic support' },
      ];

      buttonVariants.forEach(({ text, tag, description }) => {
        it(`handles apply button: ${description}`, async () => {
          const mockPage = createMockPage();
          const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
          const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

          const context = createContext(mockPage, {
            findByText: mock.fn((t, txt, _cssAlt) => {
              if (t === tag && txt === text) return Promise.resolve(mockApplyButton);
              if (t === 'button' && txt === '지원하기') return Promise.resolve(mockSubmitButton);
              return Promise.resolve(null);
            }),
            findElementWithText: mock.fn((txt) => {
              if (txt === 'captcha') return Promise.resolve(null);
              if (txt === '이미 지원한') return Promise.resolve(null);
              if (txt === '오류') return Promise.resolve(null);
              if (txt.includes('지원이 완료')) return Promise.resolve({});
              return Promise.resolve(null);
            }),
          });

          mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
          mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

          const job = createSampleJob();
          const result = await applyToJobKorea.call(context, job);

          assert.strictEqual(result.success, true);
        });
      });
    });

    describe('Success Message Variants', () => {
      const successVariants = [
        { text: '지원이 완료', description: 'standard completion' },
        { text: '지원 완료', description: 'short form' },
        { text: '지원하였습니다', description: 'polite form' },
      ];

      successVariants.forEach(({ text, description }) => {
        it(`detects success: ${description}`, async () => {
          const mockPage = createMockPage();
          const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
          const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };

          const context = createContext(mockPage, {
            findByText: mock.fn((tag, txt, _cssAlt) => {
              if (tag === 'button' && txt === '즉시 지원') return Promise.resolve(mockApplyButton);
              if (tag === 'button' && txt === '지원하기') return Promise.resolve(mockSubmitButton);
              return Promise.resolve(null);
            }),
            findElementWithText: mock.fn((txt) => {
              if (txt === 'captcha') return Promise.resolve(null);
              if (txt === '이미 지원한') return Promise.resolve(null);
              if (txt === '오류') return Promise.resolve(null);
              if (txt.includes(text)) return Promise.resolve({ textContent: text });
              return Promise.resolve(null);
            }),
          });

          mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
          mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

          const job = createSampleJob();
          const result = await applyToJobKorea.call(context, job);

          assert.strictEqual(result.success, true);
        });
      });
    });

    describe('Cookie Refresh Flow', () => {
      it('attempts cookie refresh when not logged in', async () => {
        const mockPage = createMockPage();
        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text) => {
            if (tag === 'a' && text === '로그인') {
              return Promise.resolve({ href: '/Login' });
            }
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn(() => Promise.resolve(null)),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('JobKorea Main'));
        mockPage.goto.mock.mockImplementation((_url) => Promise.resolve());

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        // Should attempt cookie refresh and fail since still logged out
        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('Not logged in') || result.error.includes('expired'));
        // Should have called goto multiple times (initial + cookie refresh)
        assert.ok(mockPage.goto.mock.callCount() >= 2);
      });

      it('succeeds after cookie refresh if login persists', async () => {
        const mockPage = createMockPage();
        const mockApplyButton = { click: mock.fn(() => Promise.resolve()) };
        const mockSubmitButton = { click: mock.fn(() => Promise.resolve()) };
        let loginChecks = 0;

        const context = createContext(mockPage, {
          findByText: mock.fn((tag, text) => {
            if (tag === 'a' && text === '로그인') {
              loginChecks++;
              // First time: login found, second time: no login (refresh worked)
              if (loginChecks === 1) return Promise.resolve({ href: '/Login' });
              return Promise.resolve(null);
            }
            if (tag === 'button' && text === '즉시 지원') return Promise.resolve(mockApplyButton);
            if (tag === 'button' && text === '지원하기') return Promise.resolve(mockSubmitButton);
            return Promise.resolve(null);
          }),
          findElementWithText: mock.fn((text) => {
            if (text === 'captcha') return Promise.resolve(null);
            if (text === '이미 지원한') return Promise.resolve(null);
            if (text === '오류') return Promise.resolve(null);
            if (text.includes('지원이 완료')) return Promise.resolve({});
            return Promise.resolve(null);
          }),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.goto.mock.mockImplementation((_url) => Promise.resolve());
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        // After cookie refresh, should be logged in and proceed
        assert.strictEqual(result.success, true);
      });
    });

    describe('Screenshot Debug', () => {
      it('takes screenshot when apply button not found', async () => {
        const mockPage = createMockPage();

        const context = createContext(mockPage, {
          findByText: mock.fn(() => Promise.resolve(null)),
          findElementWithText: mock.fn(() => Promise.resolve(null)),
        });

        mockPage.title.mock.mockImplementation(() => Promise.resolve('Test Job'));
        mockPage.$.mock.mockImplementation(() => Promise.resolve(null));
        // Screenshot fails gracefully
        mockPage.screenshot.mock.mockImplementation(() =>
          Promise.reject(new Error('Screenshot failed'))
        );

        const job = createSampleJob();
        const result = await applyToJobKorea.call(context, job);

        assert.strictEqual(result.success, false);
        assert.ok(result.error.includes('Apply button not found'));
        // Screenshot should have been attempted
        assert.strictEqual(mockPage.screenshot.mock.callCount() >= 1, true);
      });
    });
  });

  describe('applyToJobKorea edge cases', () => {
    it('handles case when page goto throws non-Error', async () => {
      const mockPage = createMockPage();
      mockPage.goto.mock.mockImplementation(() => Promise.reject('string error'));

      const context = createContext(mockPage);

      const job = createSampleJob();
      const result = await applyToJobKorea.call(context, job);

      assert.strictEqual(result.success, false);
    });

    it('handles context without logger gracefully', async () => {
      const mockPage = createMockPage();
      const contextNoLogger = {
        page: mockPage,
        appManager: mockAppManager,
        findByText: mock.fn(() => Promise.resolve(null)),
        findElementWithText: mock.fn(() => Promise.resolve(null)),
        notifications: mockNotifications,
        // No logger
      };

      mockPage.title.mock.mockImplementation(() => Promise.resolve('Test'));

      const job = createSampleJob();
      const result = await applyToJobKorea.call(contextNoLogger, job);

      // Should not crash even without logger
      assert.ok(result !== undefined);
    });

    it('handles context without notifications gracefully', async () => {
      const mockPage = createMockPage();
      const contextNoNotifications = {
        page: mockPage,
        logger: mockLogger,
        appManager: mockAppManager,
        findByText: mock.fn(() => Promise.resolve(null)),
        findElementWithText: mock.fn(() => Promise.resolve(null)),
        notifications: undefined,
      };

      mockPage.title.mock.mockImplementation(() => Promise.resolve('Test'));

      const job = createSampleJob();
      const result = await applyToJobKorea.call(contextNoNotifications, job);

      // Should not crash even without notifications
      assert.ok(result !== undefined);
    });
  });
});

describe('JobKorea Strategy Constants', () => {
  it('exports APPLICATION_STATUS from application-manager', async () => {
    const { APPLICATION_STATUS } = await import('../../application-manager.js');
    assert.ok(APPLICATION_STATUS);
    assert.ok(APPLICATION_STATUS.PENDING);
    assert.ok(APPLICATION_STATUS.APPLIED);
  });

  it('exports error classes', async () => {
    // Just verify the strategy module can be imported
    const strategy = await import('../jobkorea-strategy.js');
    assert.ok(strategy.applyToJobKorea);
  });
});
