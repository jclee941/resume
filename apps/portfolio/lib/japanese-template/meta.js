const { buildLanguageLink } = require('./nav.js');
const { defaultOwnerIdentity, escapeRegExp, familyNameFirst } = require('../owner-identity');

const LANGUAGE_LINK_RE = /<a\b([^>]*\bhreflang="(ko|en|ja)"[^>]*)>\s*(KO|EN|JA)\s*<\/a\s*>/g;

/**
 * @param {string} html
 * @param {import('../owner-identity').OwnerIdentity} [identity]
 * @returns {string}
 */
function applyJapaneseMeta(html, identity = defaultOwnerIdentity()) {
  const { nameKo, nameJa } = identity;
  const latinName = familyNameFirst(identity.nameEn);
  const title = `${nameJa} - Security & Infrastructure Engineer`;
  const description = `${title} ポートフォリオ`;
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<link rel="canonical" href="https:\/\/resume\.jclee\.me\/?" \/>/i,
      '<link rel="canonical" href="https://resume.jclee.me/ja/" />'
    )
    .replace(
      /<link rel="alternate" hreflang="en-US" href="https:\/\/resume\.jclee\.me\/en\/" \/>/i,
      '<link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/" />\n    <link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/" />'
    )
    .replace(
      /<meta property="og:url" content="https:\/\/resume\.jclee\.me\/?" \/>/i,
      '<meta property="og:url" content="https://resume.jclee.me/ja/" />'
    )
    .replace(
      /<meta property="og:image" content="https:\/\/resume\.jclee\.me\/og-image\.webp" \/>/i,
      '<meta property="og:image" content="https://resume.jclee.me/og-image-ja.webp" />'
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/i,
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      /<meta property="og:locale" content="ko_KR" \/>/i,
      '<meta property="og:locale" content="ja_JP" />\n    <meta property="og:locale:alternate" content="ko_KR" />'
    )
    .replace(/\s*<meta property="og:locale:alternate" content="ja_JP" \/>/g, '')
    .replace(
      /<meta name="twitter:url" content="https:\/\/resume\.jclee\.me\/?" \/>/i,
      '<meta name="twitter:url" content="https://resume.jclee.me/ja/" />'
    )
    .replace(
      /<meta name="twitter:image" content="https:\/\/resume\.jclee\.me\/og-image\.webp" \/>/i,
      '<meta name="twitter:image" content="https://resume.jclee.me/og-image-ja.webp" />'
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/i,
      `<meta name="twitter:title" content="${title}" />`
    )
    .replace(
      new RegExp(escapeRegExp(`"name": "${nameKo} - Security & Infrastructure Engineer"`), 'g'),
      `"name": "${title}"`
    )
    .replace(new RegExp(escapeRegExp(`"name": "${nameKo}"`), 'g'), `"name": "${nameJa}"`)
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, '"url": "https://resume.jclee.me/ja/"')
    .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, '"item": "https://resume.jclee.me/ja/"')
    .replace(
      /"image": "https:\/\/resume\.jclee\.me\/og-image\.webp"/g,
      '"image": "https://resume.jclee.me/og-image-ja.webp"'
    )
    .replace(
      /"name": "Security & Infrastructure Engineer — 면접 제안 접수 중"/g,
      '"name": "Security & Infrastructure Engineer — 面接依頼受付中"'
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta\s+name="keywords"[\s\S]*?\/>/i,
      `<meta name="keywords" content="${nameJa}, ${latinName}, Security Automation, Security Infrastructure" />`
    )
    .replace(
      /<meta\s+name="author"[\s\S]*?\/>/i,
      `<meta name="author" content="${nameJa} (${latinName})" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${description}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      `<meta name="twitter:description" content="${description}" />`
    )
    .replace(/"description": "[^"]*"/g, `"description": "${description}"`)
    .replace(
      LANGUAGE_LINK_RE,
      /**
       * @param {string} _match
       * @param {string} attrs
       * @param {string} lang
       * @param {string} label
       * @returns {string}
       */
      (_match, attrs, lang, label) => buildLanguageLink(attrs, lang, label)
    );
}

module.exports = { applyJapaneseMeta };
