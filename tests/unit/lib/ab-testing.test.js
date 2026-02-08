/**
 * Unit tests for web/lib/ab-testing.js
 */

const {
  assignVariant,
  getVariant,
  trackConversion,
  getAnalytics,
  getTestSummary,
  clearAllTests,
  TESTS,
} = require('../../../typescript/portfolio-worker/lib/ab-testing');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

global.localStorage = localStorageMock;

describe('A/B Testing Module', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearAllTests();
  });

  describe('assignVariant', () => {
    it('should assign variant A or B', () => {
      const config = {
        id: 'test1',
        name: 'Test 1',
        splitRatio: 0.5,
      };

      const variant = assignVariant(config);
      expect(['A', 'B']).toContain(variant);
    });

    it('should respect split ratio', () => {
      const config = {
        id: 'test_always_a',
        name: 'Always A',
        splitRatio: 1.0, // Always A
      };

      const variant = assignVariant(config);
      expect(variant).toBe('A');
    });

    it('should persist assignment in localStorage', () => {
      const config = {
        id: 'test_persist',
        name: 'Persistent Test',
        splitRatio: 0.5,
        persistent: true,
      };

      const variant1 = assignVariant(config);
      const variant2 = assignVariant(config);

      expect(variant1).toBe(variant2);
    });

    it('should not persist if persistent is false', () => {
      const config = {
        id: 'test_no_persist',
        name: 'Non-Persistent Test',
        splitRatio: 0.5,
        persistent: false,
      };

      assignVariant(config);
      const stored = localStorage.getItem('ab_test_test_no_persist');
      expect(stored).toBeNull();
    });
  });

  describe('getVariant', () => {
    it('should return assigned variant', () => {
      const config = {
        id: 'test_get',
        name: 'Get Test',
        splitRatio: 0.5,
      };

      const assigned = assignVariant(config);
      const retrieved = getVariant('test_get');

      expect(retrieved).toBe(assigned);
    });

    it('should return null for non-existent test', () => {
      const variant = getVariant('non_existent');
      expect(variant).toBeNull();
    });

    it('should retrieve from localStorage', () => {
      const config = {
        id: 'test_storage',
        name: 'Storage Test',
        splitRatio: 0.5,
        persistent: true,
      };

      // Assign variant (will be stored in localStorage)
      const assignedVariant = assignVariant(config);

      // Get variant again - should retrieve from memory or localStorage
      const variant = getVariant('test_storage');
      expect(variant).toBe(assignedVariant);
      expect(['A', 'B']).toContain(variant);
    });
  });

  describe('trackConversion', () => {
    it('should track conversion event', () => {
      const config = {
        id: 'test_conversion',
        name: 'Conversion Test',
        splitRatio: 0.5,
      };

      assignVariant(config);
      trackConversion('test_conversion', 'download');

      const analytics = getAnalytics();
      expect(analytics.length).toBeGreaterThan(0);
      expect(analytics[0].eventName).toBe('download');
    });

    it('should include metadata in conversion', () => {
      const config = {
        id: 'test_metadata',
        name: 'Metadata Test',
        splitRatio: 0.5,
      };

      assignVariant(config);
      trackConversion('test_metadata', 'click', { button: 'primary' });

      const analytics = getAnalytics();
      expect(analytics[0].button).toBe('primary');
    });

    it('should warn if no variant assigned', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      trackConversion('non_existent', 'event');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAnalytics', () => {
    it('should return empty array initially', () => {
      const analytics = getAnalytics();
      expect(Array.isArray(analytics)).toBe(true);
      expect(analytics.length).toBe(0);
    });

    it('should return tracked events', () => {
      const config = {
        id: 'test_analytics',
        name: 'Analytics Test',
        splitRatio: 0.5,
      };

      assignVariant(config);
      trackConversion('test_analytics', 'event1');
      trackConversion('test_analytics', 'event2');

      const analytics = getAnalytics();
      expect(analytics.length).toBe(2);
    });
  });

  describe('getTestSummary', () => {
    it('should return empty summary initially', () => {
      const summary = getTestSummary();
      expect(typeof summary).toBe('object');
      expect(Object.keys(summary).length).toBe(0);
    });

    it('should summarize test results', () => {
      const config = {
        id: 'test_summary',
        name: 'Summary Test',
        splitRatio: 0.5,
      };

      assignVariant(config);
      trackConversion('test_summary', 'download');
      trackConversion('test_summary', 'click');

      const summary = getTestSummary();
      expect(summary.test_summary).toBeDefined();
      expect(summary.test_summary.A || summary.test_summary.B).toBeDefined();
    });

    it('should count events correctly', () => {
      const config = {
        id: 'test_count',
        name: 'Count Test',
        splitRatio: 1.0, // Always A
      };

      assignVariant(config);
      trackConversion('test_count', 'download');
      trackConversion('test_count', 'download');
      trackConversion('test_count', 'click');

      const summary = getTestSummary();
      expect(summary.test_count.A.total).toBe(3);
      expect(summary.test_count.A.events.download).toBe(2);
      expect(summary.test_count.A.events.click).toBe(1);
    });
  });

  describe('clearAllTests', () => {
    it('should clear all test data', () => {
      const config = {
        id: 'test_clear',
        name: 'Clear Test',
        splitRatio: 0.5,
      };

      assignVariant(config);
      trackConversion('test_clear', 'event');

      // Clear localStorage manually to ensure clean state
      localStorageMock.clear();
      clearAllTests();

      const variant = getVariant('test_clear');
      const analytics = getAnalytics();

      expect(variant).toBeNull();
      expect(analytics.length).toBe(0);
    });
  });

  describe('TESTS configuration', () => {
    it('should have predefined tests', () => {
      expect(TESTS).toBeDefined();
      expect(TESTS.RESUME_LAYOUT).toBeDefined();
      expect(TESTS.DOWNLOAD_BUTTON).toBeDefined();
      expect(TESTS.PROJECT_CARDS).toBeDefined();
    });

    it('should have valid test configurations', () => {
      Object.values(TESTS).forEach((test) => {
        expect(test.id).toBeDefined();
        expect(test.name).toBeDefined();
        expect(test.splitRatio).toBeDefined();
        expect(test.splitRatio).toBeGreaterThanOrEqual(0);
        expect(test.splitRatio).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data', () => {
      const config = {
        id: 'test_corrupted',
        name: 'Corrupted Test',
        splitRatio: 0.5,
        persistent: true,
      };

      // Store corrupted data
      localStorageMock.setItem('ab_test_test_corrupted', 'invalid json {');

      // Should handle gracefully and assign new variant
      const variant = assignVariant(config);
      expect(['A', 'B']).toContain(variant);
    });

    it('should handle localStorage quota exceeded', () => {
      const config = {
        id: 'test_quota',
        name: 'Quota Test',
        splitRatio: 0.5,
        persistent: true,
      };

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should handle gracefully
      const variant = assignVariant(config);
      expect(['A', 'B']).toContain(variant);

      // Restore
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle missing localStorage', () => {
      const config = {
        id: 'test_no_storage',
        name: 'No Storage Test',
        splitRatio: 0.5,
        persistent: false,
      };

      const variant = assignVariant(config);
      expect(['A', 'B']).toContain(variant);
    });

    it('should handle conversion tracking without assignment', () => {
      // Track conversion for non-existent test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      trackConversion('non_existent_test', 'click');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle getVariant for non-existent test', () => {
      const variant = getVariant('non_existent_test');
      expect(variant).toBeNull();
    });

    it('should handle edge case split ratios', () => {
      // Test with 0% split (always B)
      const configZero = {
        id: 'test_zero',
        name: 'Zero Split',
        splitRatio: 0,
      };

      const variantZero = assignVariant(configZero);
      expect(variantZero).toBe('B');

      // Test with 100% split (always A)
      const configOne = {
        id: 'test_one',
        name: 'One Split',
        splitRatio: 1,
      };

      const variantOne = assignVariant(configOne);
      expect(variantOne).toBe('A');
    });
  });

  describe('Edge Cases and Branch Coverage', () => {
    it('should handle analytics trimming (>100 events)', () => {
      const config = { id: 'trim_test', name: 'Trim Test' };
      assignVariant(config);

      // Track 105 events
      for (let i = 0; i < 105; i++) {
        trackConversion('trim_test', `event_${i}`);
      }

      const analytics = getAnalytics();
      expect(analytics.length).toBe(100);
      expect(analytics[0].eventName).toBe('event_5');
    });

    it('should log to console in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const config = { id: 'dev_test', name: 'Dev Test' };
      assignVariant(config);
      trackConversion('dev_test', 'click');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📊 A/B Test Conversion:'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle localStorage availability in clearAllTests', () => {
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Should not throw
      expect(() => clearAllTests()).not.toThrow();

      global.localStorage = originalLocalStorage;
    });

    it('should handle missing keys in localStorage during clearAllTests', () => {
      // Setup some keys
      localStorage.setItem('other_key', 'value');
      localStorage.setItem('ab_test_1', '{"variant":"A"}');

      // Mock key() to return null for some indices if possible,
      // but standard behavior is handled by the loop limit
      clearAllTests();

      expect(localStorage.getItem('other_key')).toBe('value');
      expect(localStorage.getItem('ab_test_1')).toBeNull();
    });
  });
});
