const { buildLanguageLink } = require('./nav.js');

const LANGUAGE_LINK_RE = /<a\b([^>]*\bhreflang="(ko|en|ja)"[^>]*)>\s*(KO|EN|JA)\s*<\/a\s*>/g;

function applyJapaneseMeta(html) {
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(
      /<title>[^<]*<\/title>/i,
      '<title>イ・ジェチョル - Security Operations / Infrastructure Engineer</title>'
    )
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
      '<meta property="og:title" content="イ・ジェチョル - Security Operations / Infrastructure Engineer" />'
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
      '<meta name="twitter:title" content="イ・ジェチョル - Security Operations / Infrastructure Engineer" />'
    )
    .replace(
      /"name": "이재철 - Security Operations \/ Infrastructure Engineer"/g,
      '"name": "イ・ジェチョル - Security Operations / Infrastructure Engineer"'
    )
    .replace(/"name": "이재철"/g, '"name": "イ・ジェチョル"')
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, '"url": "https://resume.jclee.me/ja/"')
    .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, '"item": "https://resume.jclee.me/ja/"')
    .replace(
      /"image": "https:\/\/resume\.jclee\.me\/og-image\.webp"/g,
      '"image": "https://resume.jclee.me/og-image-ja.webp"'
    )
    .replace(
      /"jobTitle": "Security Operations \/ Infrastructure Engineer"/g,
      '"jobTitle": "Security Operations / Infrastructure Engineer"'
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      '<meta name="description" content="イ・ジェチョル - Security Operations / Infrastructure Engineer ポートフォリオ" />'
    )
    .replace(
      /<meta\s+name="keywords"[\s\S]*?\/>/i,
      '<meta name="keywords" content="イ・ジェチョル, Lee Jaecheol, Security Operations, Security Infrastructure" />'
    )
    .replace(
      /<meta\s+name="author"[\s\S]*?\/>/i,
      '<meta name="author" content="イ・ジェチョル (Lee Jaecheol)" />'
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      '<meta property="og:description" content="イ・ジェチョル - Security Operations / Infrastructure Engineer ポートフォリオ" />'
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      '<meta name="twitter:description" content="イ・ジェチョル - Security Operations / Infrastructure Engineer ポートフォリオ" />'
    )
    .replace(
      /"description": "[^"]*"/g,
      '"description": "イ・ジェチョル - Security Operations / Infrastructure Engineer ポートフォリオ"'
    )
    .replace(LANGUAGE_LINK_RE, (_match, attrs, lang, label) =>
      buildLanguageLink(attrs, lang, label)
    );
}

module.exports = { applyJapaneseMeta };
