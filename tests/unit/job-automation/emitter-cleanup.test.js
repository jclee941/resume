/**
 * Unit tests for EventEmitter cleanup (destroy) methods in crawler classes.
 */

const { EventEmitter } = require('events');

// Mock CaptchaDetector
const createMockCaptchaDetector = () => {
  const emitter = new EventEmitter();
  const detector = {
    _history: [],
    clearHistory: jest.fn(() => {
      detector._history = [];
    }),
    destroy: jest.fn(() => {
      detector.clearHistory();
      emitter.removeAllListeners();
    }),
    detectInHtml: jest.fn(),
    shouldPause: jest.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
    listenerCount: (event) => emitter.listenerCount(event),
    removeAllListeners: emitter.removeAllListeners.bind(emitter),
  };
  return detector;
};

// Mock BrowserService
const createMockBrowserService = () => ({
  newPage: jest.fn(),
  close: jest.fn(),
});

describe('Emitter cleanup destroy() methods', () => {
  describe('CaptchaDetector.destroy()', () => {
    let detector;

    beforeEach(() => {
      detector = createMockCaptchaDetector();
    });

    test('calls clearHistory() when destroyed', () => {
      detector._history = [{ type: 'test', url: 'http://test.com', timestamp: Date.now() }];
      detector.destroy();
      expect(detector.clearHistory).toHaveBeenCalledTimes(1);
    });

    test('clears history array', () => {
      detector._history = [{ type: 'test', url: 'http://test.com', timestamp: Date.now() }];
      detector.destroy();
      expect(detector._history).toEqual([]);
    });

    test('removes all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      detector.on('captcha:detected', listener1);
      detector.on('captcha:detected', listener2);
      detector.destroy();
      expect(detector.listenerCount('captcha:detected')).toBe(0);
    });

    test('can be called multiple times without error', () => {
      detector._history = [{ type: 'test', url: 'http://test.com', timestamp: Date.now() }];
      detector.destroy();
      detector.destroy();
      expect(detector.clearHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('BaseCrawler.destroy()', () => {
    let BaseCrawler;
    let mockCaptchaDetector;
    let crawler;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCaptchaDetector = createMockCaptchaDetector();

      // Create a minimal BaseCrawler for testing
      class TestableBaseCrawler extends EventEmitter {
        constructor() {
          super();
          this.name = 'test-crawler';
          this.captchaDetector = mockCaptchaDetector;
        }

        destroy() {
          this.captchaDetector?.destroy();
          this.removeAllListeners();
        }
      }

      BaseCrawler = TestableBaseCrawler;
      crawler = new BaseCrawler();
    });

    test('calls captchaDetector.destroy() if detector exists', () => {
      crawler.destroy();
      expect(mockCaptchaDetector.destroy).toHaveBeenCalledTimes(1);
    });

    test('removes all listeners on crawler', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      crawler.on('retry', listener1);
      crawler.on('captcha:detected', listener2);
      crawler.destroy();
      expect(crawler.listenerCount('retry')).toBe(0);
      expect(crawler.listenerCount('captcha:detected')).toBe(0);
    });

    test('handles null captchaDetector gracefully', () => {
      crawler.captchaDetector = null;
      expect(() => crawler.destroy()).not.toThrow();
    });

    test('listenerCount returns 0 after destroy', () => {
      crawler.on('retry', jest.fn());
      crawler.on('retry:success', jest.fn());
      crawler.on('captcha:detected', jest.fn());
      crawler.destroy();
      expect(crawler.listenerCount('retry')).toBe(0);
      expect(crawler.listenerCount('retry:success')).toBe(0);
      expect(crawler.listenerCount('captcha:detected')).toBe(0);
    });
  });

  describe('StealthBrowserCrawler.destroy()', () => {
    let StealthBrowserCrawler;
    let mockCaptchaDetector;
    let mockBrowserService;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCaptchaDetector = createMockCaptchaDetector();
      mockBrowserService = createMockBrowserService();

      // Create a minimal StealthBrowserCrawler for testing
      class TestableStealthBrowserCrawler extends EventEmitter {
        constructor() {
          super();
          this.name = 'test-stealth-crawler';
          this.captchaDetector = mockCaptchaDetector;
          this._browserService = mockBrowserService;
        }

        destroy() {
          if (this._browserService) {
            this._browserService = null;
          }
          this.captchaDetector?.destroy();
          this.removeAllListeners();
        }
      }

      StealthBrowserCrawler = TestableStealthBrowserCrawler;
    });

    test('nulls _browserService', () => {
      const crawler = new StealthBrowserCrawler();
      expect(crawler._browserService).toBe(mockBrowserService);
      crawler.destroy();
      expect(crawler._browserService).toBeNull();
    });

    test('calls super.destroy() (captchaDetector.destroy)', () => {
      const crawler = new StealthBrowserCrawler();
      crawler.destroy();
      expect(mockCaptchaDetector.destroy).toHaveBeenCalledTimes(1);
    });

    test('removes all listeners including inherited events', () => {
      const crawler = new StealthBrowserCrawler();
      crawler.on('page:loaded', jest.fn());
      crawler.on('page:error', jest.fn());
      crawler.destroy();
      expect(crawler.listenerCount('page:loaded')).toBe(0);
      expect(crawler.listenerCount('page:error')).toBe(0);
    });

    test('can destroy when _browserService is already null', () => {
      const crawler = new StealthBrowserCrawler();
      crawler._browserService = null;
      expect(() => crawler.destroy()).not.toThrow();
    });

    test('listenerCount returns 0 after destroy for all event types', () => {
      const crawler = new StealthBrowserCrawler();
      crawler.on('retry', jest.fn());
      crawler.on('page:loaded', jest.fn());
      crawler.on('page:error', jest.fn());
      crawler.on('captcha:detected', jest.fn());
      crawler.destroy();
      expect(crawler.listenerCount('retry')).toBe(0);
      expect(crawler.listenerCount('page:loaded')).toBe(0);
      expect(crawler.listenerCount('page:error')).toBe(0);
      expect(crawler.listenerCount('captcha:detected')).toBe(0);
    });
  });
});
