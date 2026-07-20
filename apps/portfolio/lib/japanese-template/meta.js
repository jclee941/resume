const { buildLanguageLink } = require('./nav.js');

const LANGUAGE_LINK_RE = /<a\b([^>]*\bhreflang="(ko|en|ja)"[^>]*)>\s*(KO|EN|JA)\s*<\/a\s*>/g;
const TITLE = '李在哲 | フルスタックエンジニア';
const DESCRIPTION =
  'ユーザー画面、API、データフロー、デプロイ、可観測性まで扱う李在哲のフルスタックポートフォリオ。セキュリティ自動化とエッジインフラの経験を信頼性につなげます。';
const KEYWORDS =
  '李在哲, Jaecheol Lee, フルスタックエンジニア, Full-Stack Engineering, TypeScript, JavaScript, Next.js, Cloudflare Workers, Backend APIs, PostgreSQL, Data Workflows, Security Automation, Edge Infrastructure, Observability, DevOps';
const AVAILABILITY =
  'フルスタック・バックエンド・プラットフォーム領域のご提案と面談依頼を検討しています。';

function applyJapaneseMeta(html) {
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(/<title>[^<]*<\/title>/i, `<title>${TITLE}</title>`)
    .replace(
      /<link rel="canonical" href="https:\/\/resume\.jclee\.me\/?" \/>/i,
      '<link rel="canonical" href="https://resume.jclee.me/ja/" />'
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
      `<meta property="og:title" content="${TITLE}" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${DESCRIPTION}" />`
    )
    .replace(
      /<meta\s+property="og:image:alt"[\s\S]*?\/>/i,
      `<meta property="og:image:alt" content="${TITLE}" />`
    )
    .replace(
      /<meta property="og:image:locale" content="ko_KR" \/>/i,
      '<meta property="og:image:locale" content="ja_JP" />\n    <meta property="og:image:locale:alternate" content="ko_KR" />'
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
      `<meta name="twitter:title" content="${TITLE}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      `<meta name="twitter:description" content="${DESCRIPTION}" />`
    )
    .replace(/"name": "이재철"/g, '"name": "李在哲"')
    .replace(/"jobTitle": "풀스택 엔지니어"/g, '"jobTitle": "フルスタックエンジニア"')
    .replace(
      /"name": "풀스택·백엔드·플랫폼 엔지니어 기회를 검토합니다\."/g,
      `"name": "${AVAILABILITY}"`
    )
    .replace(/"name": "이재철 \| 풀스택 엔지니어"/g, `"name": "${TITLE}"`)
    .replace(
      /"description": "사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오\. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다\."/g,
      `"description": "${DESCRIPTION}"`
    )
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, '"url": "https://resume.jclee.me/ja/"')
    .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, '"item": "https://resume.jclee.me/ja/"')
    .replace(
      /"image": "https:\/\/resume\.jclee\.me\/og-image\.webp"/g,
      '"image": "https://resume.jclee.me/og-image-ja.webp"'
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      `<meta name="description" content="${DESCRIPTION}" />`
    )
    .replace(
      /<meta\s+name="keywords"[\s\S]*?\/>/i,
      `<meta name="keywords" content="${KEYWORDS}" />`
    )
    .replace(
      /<meta\s+name="author"[\s\S]*?\/>/i,
      '<meta name="author" content="李在哲 (Jaecheol Lee)" />'
    )
    .replace(LANGUAGE_LINK_RE, (_match, attrs, lang, label) =>
      buildLanguageLink(attrs, lang, label)
    );
}

module.exports = { applyJapaneseMeta };
