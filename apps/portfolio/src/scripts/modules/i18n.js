import { translations } from '../data/translations.js';

const languageToggle = document.querySelector('.language-toggle');
const langText = document.querySelector('.lang-text');
const html = document.documentElement;

export function initLanguage() {
  // Load saved language or detect from browser
  const savedLang =
    localStorage.getItem('language') ||
    (navigator.language.startsWith('ko') ? 'ko' : 'en');
  html.setAttribute('lang', savedLang === 'ko' ? 'ko' : 'en');
  updateLanguage(savedLang);

  // Click event
  languageToggle.addEventListener('click', toggleLanguage);

  // Keyboard navigation support (Space and Enter keys)
  languageToggle.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleLanguage();
    }
  });
}

function toggleLanguage() {
  const currentLang = html.getAttribute('lang') === 'ko' ? 'ko' : 'en';
  const newLang = currentLang === 'ko' ? 'en' : 'ko';

  html.setAttribute('lang', newLang);
  localStorage.setItem('language', newLang);
  languageToggle.setAttribute(
    'aria-pressed',
    newLang === 'en' ? 'true' : 'false',
  );
  updateLanguage(newLang);
}

function updateLanguage(lang) {
  // Update toggle button text
  langText.textContent = lang === 'ko' ? 'EN' : 'KO';

  // Update all elements with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    const translation = getTranslation(key, lang);
    if (translation) {
      element.textContent = translation;
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = getTranslation(key, lang);
    if (translation) {
      element.setAttribute('placeholder', translation);
    }
  });

  // Update aria-labels
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria');
    const translation = getTranslation(key, lang);
    if (translation) {
      element.setAttribute('aria-label', translation);
    }
  });
}

function getTranslation(key, lang) {
  return translations[lang]?.[key];
}
