const { buildLanguageLink } = require('./nav.js');

const LANGUAGE_LINK_RE = /<a\b([^>]*\bhreflang="(ko|en|ja)"[^>]*)>\s*(KO|EN|JA)\s*<\/a\s*>/g;

function applyJapaneseMeta(html) {
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(/<title>[^<]*<\/title>/i, '<title>イ・ジェチョル - セキュリティエンジニア</title>')
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
      '<meta property="og:title" content="イ・ジェチョル - セキュリティエンジニア" />'
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
      '<meta name="twitter:title" content="イ・ジェチョル - セキュリティエンジニア" />'
    )
    .replace(
      /"name": "이재철 - 보안 엔지니어"/g,
      '"name": "イ・ジェチョル - セキュリティエンジニア"'
    )
    .replace(/"name": "이재철"/g, '"name": "イ・ジェチョル"')
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, '"url": "https://resume.jclee.me/ja/"')
    .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, '"item": "https://resume.jclee.me/ja/"')
    .replace(
      /"image": "https:\/\/resume\.jclee\.me\/og-image\.webp"/g,
      '"image": "https://resume.jclee.me/og-image-ja.webp"'
    )
    .replace(/"jobTitle": "보안 엔지니어"/g, '"jobTitle": "セキュリティエンジニア"')
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      '<meta name="description" content="イ・ジェチョル - セキュリティエンジニア ポートフォリオ" />'
    )
    .replace(
      /<meta\s+name="keywords"[\s\S]*?\/>/i,
      '<meta name="keywords" content="イ・ジェチョル, Lee Jaecheol, Security Engineer" />'
    )
    .replace(
      /<meta\s+name="author"[\s\S]*?\/>/i,
      '<meta name="author" content="イ・ジェチョル (Lee Jaecheol)" />'
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      '<meta property="og:description" content="イ・ジェチョル - セキュリティエンジニア ポートフォリオ" />'
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      '<meta name="twitter:description" content="イ・ジェチョル - セキュリティエンジニア ポートフォリオ" />'
    )
    .replace(
      /"description": "[^"]*"/g,
      '"description": "イ・ジェチョル - セキュリティエンジニア ポートフォリオ"'
    )
    .replace(LANGUAGE_LINK_RE, (_match, attrs, lang, label) =>
      buildLanguageLink(attrs, lang, label)
    );
}

module.exports = { applyJapaneseMeta };
