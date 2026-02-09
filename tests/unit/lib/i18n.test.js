/**
 * Unit tests for web/lib/i18n.js
 */

const {
  t,
  getTranslations,
  detectLanguage,
  isLanguageSupported,
  getSupportedLanguages,
  DEFAULT_LANGUAGE,
} = require('../../../typescript/portfolio-worker/lib/i18n');

describe('i18n Module', () => {
  describe('detectLanguage', () => {
    it('should return default language when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      delete global.navigator;
      const result = detectLanguage();
      global.navigator = originalNavigator;
      expect(result).toBe(DEFAULT_LANGUAGE);
    });

    it('should detect English from browser language', () => {
      const originalNavigator = global.navigator;
      global.navigator = { language: 'en-US' };

      const result = detectLanguage();
      expect(result).toBe('en');

      global.navigator = originalNavigator;
    });

    it('should detect Korean from browser language', () => {
      const originalNavigator = global.navigator;
      global.navigator = { language: 'ko-KR' };

      const result = detectLanguage();
      expect(result).toBe('ko');

      global.navigator = originalNavigator;
    });

    it('should default to Korean for unsupported languages', () => {
      const originalNavigator = global.navigator;
      global.navigator = { language: 'fr-FR' };

      const result = detectLanguage();
      expect(result).toBe('ko');

      global.navigator = originalNavigator;
    });
  });

  describe('t (translate)', () => {
    it('should translate Korean strings', () => {
      expect(t('hero.title', 'ko')).toBe('이재철');
      expect(t('hero.subtitle', 'ko')).toBe('DevOps & Security Engineer');
    });

    it('should translate English strings', () => {
      expect(t('hero.title', 'en')).toBe('Jaecheol Lee');
      expect(t('hero.subtitle', 'en')).toBe('DevOps & Security Engineer');
    });

    it('should return key if translation not found', () => {
      const key = 'nonexistent.key';
      expect(t(key, 'ko')).toBe(key);
    });

    it('should return key if language not supported', () => {
      const key = 'hero.title';
      expect(t(key, 'fr')).toBe(key);
    });

    it('should use detected language if not specified', () => {
      const result = t('hero.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getTranslations', () => {
    it('should return all Korean translations', () => {
      const translations = getTranslations('ko');
      expect(translations).toBeDefined();
      expect(translations['hero.title']).toBe('이재철');
      expect(Object.keys(translations).length).toBeGreaterThan(0);
    });

    it('should return all English translations', () => {
      const translations = getTranslations('en');
      expect(translations).toBeDefined();
      expect(translations['hero.title']).toBe('Jaecheol Lee');
      expect(Object.keys(translations).length).toBeGreaterThan(0);
    });

    it('should return default language translations for unsupported language', () => {
      const translations = getTranslations('fr');
      expect(translations).toBeDefined();
      expect(translations['hero.title']).toBe('이재철');
    });

    it('should have same keys for all languages', () => {
      const koKeys = Object.keys(getTranslations('ko')).sort();
      const enKeys = Object.keys(getTranslations('en')).sort();
      expect(koKeys).toEqual(enKeys);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for Korean', () => {
      expect(isLanguageSupported('ko')).toBe(true);
    });

    it('should return true for English', () => {
      expect(isLanguageSupported('en')).toBe(true);
    });

    it('should return false for unsupported language', () => {
      expect(isLanguageSupported('fr')).toBe(false);
      expect(isLanguageSupported('ja')).toBe(false);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('ko');
      expect(languages).toContain('en');
    });

    it('should return exactly 2 languages', () => {
      const languages = getSupportedLanguages();
      expect(languages.length).toBe(2);
    });
  });

  describe('Translation completeness', () => {
    it('should have all navigation translations', () => {
      const koTrans = getTranslations('ko');
      const enTrans = getTranslations('en');

      expect(koTrans['nav.home']).toBeDefined();
      expect(koTrans['nav.projects']).toBeDefined();
      expect(koTrans['nav.resume']).toBeDefined();
      expect(koTrans['nav.contact']).toBeDefined();

      expect(enTrans['nav.home']).toBeDefined();
      expect(enTrans['nav.projects']).toBeDefined();
      expect(enTrans['nav.resume']).toBeDefined();
      expect(enTrans['nav.contact']).toBeDefined();
    });

    it('should have all hero section translations', () => {
      const koTrans = getTranslations('ko');
      const enTrans = getTranslations('en');

      expect(koTrans['hero.title']).toBeDefined();
      expect(koTrans['hero.subtitle']).toBeDefined();
      expect(koTrans['hero.description']).toBeDefined();

      expect(enTrans['hero.title']).toBeDefined();
      expect(enTrans['hero.subtitle']).toBeDefined();
      expect(enTrans['hero.description']).toBeDefined();
    });

    it('should have all ARIA labels', () => {
      const koTrans = getTranslations('ko');
      const enTrans = getTranslations('en');

      expect(koTrans['aria.toggleTheme']).toBeDefined();
      expect(koTrans['aria.downloadResume']).toBeDefined();
      expect(koTrans['aria.viewProject']).toBeDefined();

      expect(enTrans['aria.toggleTheme']).toBeDefined();
      expect(enTrans['aria.downloadResume']).toBeDefined();
      expect(enTrans['aria.viewProject']).toBeDefined();
    });
  });
});
