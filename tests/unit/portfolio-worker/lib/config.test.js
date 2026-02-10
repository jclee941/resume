/**
 * Unit tests for web/lib/config.js
 */

const {
  CONFIG,
  ESCAPE_PATTERNS,
  TEMPLATE_CACHE,
} = require('../../../../typescript/portfolio-worker/lib/config');

describe('Config Module', () => {
  describe('CONFIG', () => {
    test('should have DOWNLOADS_BASE_URL', () => {
      expect(CONFIG.DOWNLOADS_BASE_URL).toBeDefined();
      expect(CONFIG.DOWNLOADS_BASE_URL).toMatch(/^https?:\/\//);
    });

    test('should have all LINK_TYPES', () => {
      expect(CONFIG.LINK_TYPES).toHaveProperty('PRIMARY');
      expect(CONFIG.LINK_TYPES).toHaveProperty('SECONDARY');
      expect(CONFIG.LINK_TYPES).toHaveProperty('PDF_FULL');
      expect(CONFIG.LINK_TYPES).toHaveProperty('PDF');
      expect(CONFIG.LINK_TYPES).toHaveProperty('DOCX');
    });

    test('should have all LINK_LABELS', () => {
      expect(CONFIG.LINK_LABELS).toHaveProperty('COMPLETE_PDF');
      expect(CONFIG.LINK_LABELS).toHaveProperty('PDF');
      expect(CONFIG.LINK_LABELS).toHaveProperty('DOCX');
      expect(CONFIG.LINK_LABELS).toHaveProperty('LIVE_DEMO');
      expect(CONFIG.LINK_LABELS).toHaveProperty('GITHUB');
      expect(CONFIG.LINK_LABELS).toHaveProperty('DOCUMENTATION');
      expect(CONFIG.LINK_LABELS).toHaveProperty('GRAFANA_HOME');
    });

    test('should have all CARD_CLASSES', () => {
      expect(CONFIG.CARD_CLASSES).toHaveProperty('DOC_CARD');
      expect(CONFIG.CARD_CLASSES).toHaveProperty('DOC_CARD_HIGHLIGHT');
      expect(CONFIG.CARD_CLASSES).toHaveProperty('PROJECT_CARD');
    });

    test('DOC_CARD_HIGHLIGHT should include all DOC_CARD classes', () => {
      const highlightClasses = CONFIG.CARD_CLASSES.DOC_CARD_HIGHLIGHT.split(' ');
      const docCardClasses = CONFIG.CARD_CLASSES.DOC_CARD.split(' ');
      docCardClasses.forEach((cls) => {
        expect(highlightClasses).toContain(cls);
      });
    });
  });

  describe('ESCAPE_PATTERNS', () => {
    test('should have BACKTICK pattern', () => {
      expect(ESCAPE_PATTERNS.BACKTICK).toBeInstanceOf(RegExp);
      expect('`test`'.match(ESCAPE_PATTERNS.BACKTICK)).toHaveLength(2);
    });

    test('should have DOLLAR pattern', () => {
      expect(ESCAPE_PATTERNS.DOLLAR).toBeInstanceOf(RegExp);
      expect('$test$'.match(ESCAPE_PATTERNS.DOLLAR)).toHaveLength(2);
    });

    test('BACKTICK pattern should be global', () => {
      expect(ESCAPE_PATTERNS.BACKTICK.flags).toContain('g');
    });

    test('DOLLAR pattern should be global', () => {
      expect(ESCAPE_PATTERNS.DOLLAR.flags).toContain('g');
    });
  });

  describe('TEMPLATE_CACHE', () => {
    test('should have dataHash property', () => {
      expect(TEMPLATE_CACHE).toHaveProperty('dataHash');
    });

    test('should have resumeCardsHtml property', () => {
      expect(TEMPLATE_CACHE).toHaveProperty('resumeCardsHtml');
    });

    test('should have projectCardsHtml property', () => {
      expect(TEMPLATE_CACHE).toHaveProperty('projectCardsHtml');
    });
  });
});
