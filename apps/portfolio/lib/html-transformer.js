/**
 * HTML transformation utilities for worker generation
 * @module html-transformer
 */

const { minify } = require('html-minifier-terser');

const EXTERNAL_SRI = {
  GOOGLE_GSI: 'sha384-Li3+JwrJUjnnr4ZvOP9SRczNCfPkOLWRVCzUTrD2TOhgQLBfRKs5Q5/lxh2tWguw',
};

function applyExternalSri(html) {
  return html.replace(
    /<script\s+src="https:\/\/accounts\.google\.com\/gsi\/client"\s+async\s+defer><\/script>/g,
    `<script src="https://accounts.google.com/gsi/client" async defer integrity="${EXTERNAL_SRI.GOOGLE_GSI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`
  );
}

/**
 * Replace known HTML placeholders.
 * @param {string} html - Raw HTML template.
 * @param {Object} options - Placeholder values.
 * @param {string} options.cssContent - Bundled CSS.
 * @param {string} options.heroContentHtml - Hero section.
 * @param {string} options.resumeDescriptionHtml - Resume description.
 * @param {string} options.resumeCardsHtml - Resume cards.
 * @param {string} options.projectCardsHtml - Project cards.
 * @param {string} options.infrastructureCardsHtml - Infrastructure cards.
 * @param {string} options.certCardsHtml - Certification cards.
 * @param {string} options.skillsHtml - Skills list.
 * @param {string} options.contactGridHtml - Contact grid.
 * @param {string} options.resumePdfUrl - Resume PDF URL.
 * @param {string} options.resumeDocxUrl - Resume DOCX URL.
 * @param {string} options.resumeMdUrl - Resume markdown URL.
 * @param {string} [options.resumeChatDataBase64] - Base64-encoded resume JSON for client chat.
 * @returns {string} HTML with placeholders replaced.
 */
function injectPlaceholders(html, options) {
  return html
    .replace('/* CSS_PLACEHOLDER */', options.cssContent)
    .replace('<!-- CSS_PLACEHOLDER -->', options.cssContent)
    .replace('<!-- HERO_CONTENT_PLACEHOLDER -->', options.heroContentHtml)
    .replace('<!-- RESUME_DESCRIPTION_PLACEHOLDER -->', options.resumeDescriptionHtml)
    .replace('<!-- RESUME_CARDS_PLACEHOLDER -->', options.resumeCardsHtml)
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', options.projectCardsHtml)
    .replace('<!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->', options.infrastructureCardsHtml)
    .replace('<!-- CERTIFICATION_CARDS_PLACEHOLDER -->', options.certCardsHtml)
    .replace('<!-- SKILLS_LIST_PLACEHOLDER -->', options.skillsHtml)
    .replace('<!-- CONTACT_GRID_PLACEHOLDER -->', options.contactGridHtml)
    .replace('<!-- ABOUT_CONTENT_PLACEHOLDER -->', options.aboutContentHtml || '')
    .replace('<!-- RESUME_PDF_URL -->', options.resumePdfUrl)
    .replace('<!-- RESUME_DOCX_URL -->', options.resumeDocxUrl)
    .replace('<!-- RESUME_MD_URL -->', options.resumeMdUrl)
    .replace("/* RESUME_CHAT_DATA_B64_PLACEHOLDER */ ''", options.resumeChatDataBase64 || "''");
}

function buildJapaneseTemplate(html) {
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(/<title>[^<]*<\/title>/i, '<title>イ・ジェチョル - DevSecOps/SRE/Platform Engineer</title>')
    .replace(/<link rel="canonical" href="https:\/\/resume\.jclee\.me" \/>/i, '<link rel="canonical" href="https://resume.jclee.me/ja/" />')
    .replace(
      /<link rel="alternate" hreflang="en-US" href="https:\/\/resume\.jclee\.me\/en\/" \/>/i,
      '<link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/" />\n    <link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/" />'
    )
    .replace(/<meta property="og:url" content="https:\/\/resume\.jclee\.me" \/>/i, '<meta property="og:url" content="https://resume.jclee.me/ja/" />')
    .replace(/<meta property="og:title" content="[^"]*" \/>/i, '<meta property="og:title" content="イ・ジェチョル - DevSecOps/SRE/Platform Engineer" />')
    .replace(/<meta property="og:locale" content="ko_KR" \/>/i, '<meta property="og:locale" content="ja_JP" />\n    <meta property="og:locale:alternate" content="ko_KR" />')
    .replace(/<meta name="twitter:url" content="https:\/\/resume\.jclee\.me" \/>/i, '<meta name="twitter:url" content="https://resume.jclee.me/ja/" />')
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/i, '<meta name="twitter:title" content="イ・ジェチョル - DevSecOps/SRE/Platform Engineer" />')
    .replace(/"name": "이재철 - DevSecOps\/SRE\/Platform Engineer"/g, '"name": "イ・ジェチョル - DevSecOps/SRE/Platform Engineer"')
    .replace(/"name": "이재철"/g, '"name": "イ・ジェチョル"')
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    // === JA meta tags (description, keywords, og:description, twitter:description) ===
    .replace(/<meta\s+name="description"[\s\S]*?\/>/i, '<meta name="description" content="イ・ジェチョル - DevSecOps/SREエンジニア | 金融・公共セキュリティインフラ設計·運用、SIEM/SOAR、Observability、IaC自動化" />')
    .replace(/<meta\s+name="keywords"[\s\S]*?\/>/i, '<meta name="keywords" content="DevSecOps, SRE, SIEM, SOAR, Observability, Grafana, Prometheus, Splunk, FortiGate, Terraform, Ansible, セキュリティインフラ, IaC, 自動化, イ・ジェチョル" />')
    .replace(/<meta\s+name="author"[\s\S]*?\/>/i, '<meta name="author" content="イ・ジェチョル (Lee Jaecheol)" />')
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/i, '<meta property="og:description" content="DevSecOps/SRE/Platform Engineer | セキュリティインフラ、SIEM/SOAR、Observability、IaC自動化" />')
    .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/i, '<meta name="twitter:description" content="DevSecOps/SRE/Platform Engineer | セキュリティインフラ、SIEM/SOAR、Observability、IaC自動化" />')
    // === JA hero copy (replace KO hero text with Japanese) ===
    .replace(/<span class="typing-effect glow-cyan">이재철<\/span/g, '<span class="typing-effect glow-cyan">イ・ジェチョル</span')
    .replace(/<span class="sr-only">이재철<\/span>/g, '<span class="sr-only">イ・ジェチョル</span>')
    .replace(
      /9년차 DevSecOps\/SRE — OA에서 시작해 자동화·SIEM·금융 보안 인프라까지/g,
      '9年目 DevSecOps/SRE — OAから始まり自動化・SIEM・金融セキュリティインフラへ'
    )
    .replace(
      /KAI 폐쇄망 OA 운영 → Linux 자격증 재무장 → Ansible·Python 자동화 → 넥스트레이드 FortiGate HA · Splunk ES · n8n SOC 24\/7/g,
      'KAI閉鎖網OA運用 → Linux資格再武装 → Ansible・Python自動化 → Nextrade FortiGate HA · Splunk ES · n8n SOC 24/7'
    )
    .replace(/<div class="hero-context__label">OA → DevSecOps 9년 성장<\/div>/g, '<div class="hero-context__label">OA → DevSecOps 9年間の成長</div>')
    .replace(/<div class="hero-context__label">금융위 본인가 · 금융감독원 감사 대응<\/div>/g, '<div class="hero-context__label">FSC本認可 · 金融監督院監査対応</div>')
    .replace(/<div class="hero-context__label">Splunk ES · n8n 자동 탐지·대응<\/div>/g, '<div class="hero-context__label">Splunk ES · n8n 自動検知・対応</div>')
    .replace(/<div class="hero-context__label">FortiGate HA · IaC · Observability 표준화<\/div>/g, '<div class="hero-context__label">FortiGate HA · IaC · Observability 標準化</div>')
    .replace(/aria-label="주요 경험 영역"/g, 'aria-label="主要な経験領域"')
    // === Status seeking strip ===
    .replace(/aria-label="구직 중 · 즉시 투입 가능"/g, 'aria-label="求職中 · 即時入社可能"')
    .replace(/<span class="status-seeking__label">구직 중<\/span>/g, '<span class="status-seeking__label">求職中</span>')
    .replace(/<span class="status-seeking__availability">즉시 투입 가능<\/span>/g, '<span class="status-seeking__availability">即時入社可能</span>')
    .replace(/<a href="#resume" class="status-seeking__cta">경력 근거 보기<\/a>/g, '<a href="#resume" class="status-seeking__cta">経歴を見る</a>')
    // === PDF / Contact CTA ===
    .replace(/aria-label="채용 문의 옵션"/g, 'aria-label="採用お問い合わせオプション"')
    .replace(/download="이재철_이력서\.pdf"/g, 'download="Lee-Jaecheol-Resume-JA.pdf"')
    .replace(/aria-label="이력서 PDF 다운로드"/g, 'aria-label="履歴書PDFダウンロード"')
    .replace(/>📄 이력서 PDF 다운로드</g, '>📄 履歴書PDFダウンロード<')
    .replace(/aria-label="채용 또는 면접 문의하기"/g, 'aria-label="採用・面接お問い合わせ"')
    .replace(/>채용·면접 문의하기</g, '>採用・面接お問い合わせ<')
    // === Skip link ===
    .replace(/>바로 본문으로 이동</g, '>メインコンテンツへスキップ<')
    // === sr-only section headings ===
    .replace(/<h2 id="about-heading" class="sr-only">소개<\/h2>/g, '<h2 id="about-heading" class="sr-only">紹介</h2>')
    .replace(/<h2 id="skills-heading" class="sr-only">기술<\/h2>/g, '<h2 id="skills-heading" class="sr-only">スキル</h2>')
    .replace(/<h2 id="infrastructure-heading" class="sr-only">인프라<\/h2>/g, '<h2 id="infrastructure-heading" class="sr-only">インフラ</h2>')
    .replace(/<h2 id="status-heading" class="sr-only">상태<\/h2>/g, '<h2 id="status-heading" class="sr-only">ステータス</h2>');
}

/**
 * Minify generated HTML.
 * @param {string} html - HTML content.
 * @returns {Promise<string>} Minified HTML.
 */
async function minifyHtml(html) {
  return minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: { level: 0 },
    minifyJS: true,
  });
}

/**
 * Escape HTML for safe JavaScript template literal embedding.
 * CRITICAL: Escape order matters: backslash first, then backtick and dollar.
 * @param {string} html - HTML content.
 * @param {{BACKSLASH: RegExp, BACKTICK: RegExp, DOLLAR: RegExp}} escapePatterns - Escape patterns.
 * @returns {string} Escaped HTML.
 */
function escapeForTemplateLiteral(html, escapePatterns) {
  return html
    .replace(escapePatterns.BACKSLASH, '\\\\')
    .replace(escapePatterns.BACKTICK, '\\`')
    .replace(escapePatterns.DOLLAR, '\\$');
}

/**
 * Build and minify localized HTML page from template data.
 * @param {string} html - Raw HTML template.
 * @param {Object} options - Placeholder replacement values.
 * @returns {Promise<string>} Minified HTML page.
 */
async function buildLocalizedHtml(html, options) {
  const injected = injectPlaceholders(html, options);
  return minifyHtml(applyExternalSri(injected));
}

module.exports = {
  buildJapaneseTemplate,
  injectPlaceholders,
  minifyHtml,
  escapeForTemplateLiteral,
  buildLocalizedHtml,
};
