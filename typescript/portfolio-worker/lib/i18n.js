/**
 * Internationalization (i18n) Module
 * Provides multi-language support for the resume portfolio
 *
 * @module i18n
 */

/**
 * Supported languages
 * @typedef {'ko' | 'en' | 'ja'} Language
 */

/**
 * Translation strings for all supported languages
 * @type {Record<Language, Record<string, string>>}
 */
const TRANSLATIONS = {
  ko: {
    // Navigation
    'nav.home': '홈',
    'nav.about': '소개',
    'nav.projects': '프로젝트',
    'nav.experience': '경력',
    'nav.resume': '이력서',
    'nav.contact': '연락처',

    // Hero section
    'hero.title': '이재철',
    'hero.subtitle': 'DevOps & Security Engineer',
    'hero.description': '보안 자동화와 인프라 최적화를 통해 안전하고 효율적인 시스템을 구축합니다',
    'hero.download.complete': '완전한 이력서 다운로드',
    'hero.download.pdf': 'PDF',
    'hero.download.docx': 'DOCX',

    // Projects section
    'projects.title': '주요 프로젝트',
    'projects.subtitle': '실제 프로덕션 환경에서 운영 중인 프로젝트들',
    'projects.viewMore': '더 보기',

    // Resume section
    'resume.title': '이력서',
    'resume.subtitle': '다양한 형식으로 제공되는 이력서',
    'resume.download': '다운로드',

    // Footer
    'footer.copyright': '© 2025 Jaecheol Lee. All rights reserved.',
    'footer.builtWith': '다음으로 제작됨',

    // Accessibility
    'aria.toggleTheme': '다크 모드 전환',
    'aria.downloadResume': '이력서 다운로드',
    'aria.viewProject': '프로젝트 보기',

    // Common
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.retry': '다시 시도',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.experience': 'Experience',
    'nav.resume': 'Resume',
    'nav.contact': 'Contact',

    // Hero section
    'hero.title': 'Jaecheol Lee',
    'hero.subtitle': 'DevOps & Security Engineer',
    'hero.description':
      'Building secure and efficient systems through security automation and infrastructure optimization',
    'hero.download.complete': 'Download Complete Resume',
    'hero.download.pdf': 'PDF',
    'hero.download.docx': 'DOCX',

    // Projects section
    'projects.title': 'Featured Projects',
    'projects.subtitle': 'Production-ready projects in real environments',
    'projects.viewMore': 'View More',

    // Resume section
    'resume.title': 'Resume',
    'resume.subtitle': 'Available in multiple formats',
    'resume.download': 'Download',

    // Footer
    'footer.copyright': '© 2025 Jaecheol Lee. All rights reserved.',
    'footer.builtWith': 'Built with',

    // Accessibility
    'aria.toggleTheme': 'Toggle dark mode',
    'aria.downloadResume': 'Download resume',
    'aria.viewProject': 'View project',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
  },

  ja: {
    // Navigation
    'nav.home': 'ホーム',
    'nav.about': '紹介',
    'nav.projects': 'プロジェクト',
    'nav.experience': '経歴',
    'nav.resume': '履歴書',
    'nav.contact': '連絡先',

    // Hero section
    'hero.title': 'イ・ジェチョル',
    'hero.subtitle': 'DevOps・セキュリティエンジニア',
    'hero.description':
      'セキュリティ自動化とインフラ最適化を通じて、安全で効率的なシステムを構築します',
    'hero.download.complete': '完全版履歴書をダウンロード',
    'hero.download.pdf': 'PDF',
    'hero.download.docx': 'DOCX',

    // Projects section
    'projects.title': '主要プロジェクト',
    'projects.subtitle': '実運用環境で稼働しているプロジェクト',
    'projects.viewMore': 'もっと見る',

    // Resume section
    'resume.title': '履歴書',
    'resume.subtitle': '複数形式で提供',
    'resume.download': 'ダウンロード',

    // Footer
    'footer.copyright': '© 2025 Jaecheol Lee. All rights reserved.',
    'footer.builtWith': 'Built with',

    // Accessibility
    'aria.toggleTheme': 'ダークモードを切り替え',
    'aria.downloadResume': '履歴書をダウンロード',
    'aria.viewProject': 'プロジェクトを表示',

    // Common
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.retry': '再試行',
  },
};

/**
 * Default language
 * @type {Language}
 */
const DEFAULT_LANGUAGE = 'ko';

/**
 * Detect user's preferred language from browser settings
 * @returns {Language} Detected language code
 */
function detectLanguage() {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const browserLang = navigator.language || /** @type {any} */ (navigator).userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();

  if (langCode === 'en') {
    return 'en';
  }

  if (langCode === 'ja') {
    return 'ja';
  }

  return 'ko';
}

/**
 * Get translation for a key in the specified language
 * @param {string} key - Translation key (e.g., 'hero.title')
 * @param {Language} [lang] - Language code (defaults to detected language)
 * @returns {string} Translated string or key if not found
 */
function t(key, lang) {
  const language = lang || detectLanguage();
  const translations = TRANSLATIONS[language];

  if (!translations) {
    console.warn(`Language not supported: ${language}`);
    return key;
  }

  const translation = translations[key];

  if (!translation) {
    console.warn(`Translation not found: ${key} (${language})`);
    return key;
  }

  return translation;
}

/**
 * Get all translations for a language
 * @param {Language} [lang] - Language code
 * @returns {Record<string, string>} All translations for the language
 */
function getTranslations(lang) {
  const language = lang || detectLanguage();
  return TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
}

/**
 * Check if a language is supported
 * @param {string} lang - Language code to check
 * @returns {boolean} True if language is supported
 */
function isLanguageSupported(lang) {
  return lang in TRANSLATIONS;
}

/**
 * Get list of supported languages
 * @returns {Language[]} Array of supported language codes
 */
function getSupportedLanguages() {
  return /** @type {Language[]} */ (Object.keys(TRANSLATIONS));
}

module.exports = {
  t,
  getTranslations,
  detectLanguage,
  isLanguageSupported,
  getSupportedLanguages,
  DEFAULT_LANGUAGE,
  TRANSLATIONS,
};
