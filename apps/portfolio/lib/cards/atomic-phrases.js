const { escapeHtml } = require('../template-sanitizer');

const KATAKANA_RUN = /(?:\(株\))?[\p{Script=Katakana}ー]{2,}/gu;

/**
 * Escapes prose and, on Japanese pages, keeps every katakana run on one line so a word such as a
 * loanword never breaks in the middle when the column is narrow.
 * @param {string} value
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function renderProse(value, locale) {
  const escaped = escapeHtml(value);
  if (locale !== 'ja') return escaped;
  return escaped.replace(KATAKANA_RUN, '<span class="atomic-phrase">$&</span>');
}

module.exports = { renderProse };
