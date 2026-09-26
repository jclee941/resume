const JAPANESE_LANGUAGE = 'ja';

/**
 * @param {string} attrs
 * @param {string} lang
 * @param {string} label
 * @returns {string}
 */
function buildLanguageLink(attrs, lang, label) {
  const baseAttrs = attrs
    .replace(/\s+aria-current="true"/g, '')
    .replace(/\s+class="([^"]*)"/, (_, /** @type {string} */ classValue) => {
      const classes = classValue
        .split(/\s+/)
        .filter(
          /** @param {string} className */ (className) =>
            className && className !== 'lang-link--active'
        );

      if (lang === JAPANESE_LANGUAGE) {
        classes.push('lang-link--active');
      }

      return ` class="${classes.join(' ')}"`;
    });

  return `<a${baseAttrs}${lang === JAPANESE_LANGUAGE ? ' aria-current="true"' : ''}>${label}</a>`;
}

module.exports = { buildLanguageLink };
