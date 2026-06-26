const JAPANESE_LANGUAGE = 'ja';

function buildLanguageLink(attrs, lang, label) {
  const baseAttrs = attrs
    .replace(/\s+aria-current="true"/g, '')
    .replace(/\s+class="([^"]*)"/, (_, classValue) => {
      const classes = classValue
        .split(/\s+/)
        .filter((className) => className && className !== 'lang-link--active');

      if (lang === JAPANESE_LANGUAGE) {
        classes.push('lang-link--active');
      }

      return ` class="${classes.join(' ')}"`;
    });

  return `<a${baseAttrs}${lang === JAPANESE_LANGUAGE ? ' aria-current="true"' : ''}>${label}</a>`;
}

module.exports = { buildLanguageLink };
