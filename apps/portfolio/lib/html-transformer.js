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
    .replace('<!-- HERO_CONTENT_PLACEHOLDER -->', options.heroContentHtml || '')
    .replace('<!-- RESUME_DESCRIPTION_PLACEHOLDER -->', options.resumeDescriptionHtml || '')
    .replace('<!-- RESUME_CARDS_PLACEHOLDER -->', options.resumeCardsHtml)
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', options.projectCardsHtml)
    .replace('<!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->', options.infrastructureCardsHtml)
    .replace('<!-- CERTIFICATION_CARDS_PLACEHOLDER -->', options.certCardsHtml || '')
    .replace('<!-- SKILLS_LIST_PLACEHOLDER -->', options.skillsHtml)
    .replace('<!-- CONTACT_GRID_PLACEHOLDER -->', options.contactGridHtml)
    .replace('<!-- RESUME_PDF_URL -->', options.resumePdfUrl || '')
    .replace('<!-- RESUME_DOCX_URL -->', options.resumeDocxUrl || '')
    .replace('<!-- RESUME_MD_URL -->', options.resumeMdUrl || '')
    .replace('<!-- ABOUT_CONTENT_PLACEHOLDER -->', options.aboutContentHtml || '')
    .replace('<!-- PROFILE_BENTO_PLACEHOLDER -->', options.profileBentoHtml || '')
    .replace(/<!-- BUILD_VERSION_PLACEHOLDER -->/g, options.buildVersion || '')
    .replace(/<!-- BUILD_DEPLOYED_AT_PLACEHOLDER -->/g, options.buildDeployedAt || '')
    .replace(/<!-- BUILD_CACHE_KEY_PLACEHOLDER -->/g, `${options.buildVersion || '0'}-${String(options.buildDeployedAt || '').replace(/[^0-9]/g, '').slice(0, 14)}`)
    .replace(/<!-- BUILD_DEPLOYED_DATE_PLACEHOLDER -->/g, options.buildDeployedDate || '')
    .replace("/* RESUME_CHAT_DATA_B64_PLACEHOLDER */ ''", options.resumeChatDataBase64 || "''");
}

function buildJapaneseTemplate(html) {
  return html
    .replace(/<html lang="ko"/i, '<html lang="ja"')
    .replace(/<title>[^<]*<\/title>/i, '<title>イ・ジェチョル - Security エンジニア</title>')
    .replace(/<link rel="canonical" href="https:\/\/resume\.jclee\.me\/?" \/>/i, '<link rel="canonical" href="https://resume.jclee.me/ja/" />')
    .replace(
      /<link rel="alternate" hreflang="en-US" href="https:\/\/resume\.jclee\.me\/en\/" \/>/i,
      '<link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/" />\n    <link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/" />'
    )
    .replace(/<meta property="og:url" content="https:\/\/resume\.jclee\.me\/?" \/>/i, '<meta property="og:url" content="https://resume.jclee.me/ja/" />')
    .replace(/<meta property="og:image" content="https:\/\/resume\.jclee\.me\/og-image\.webp" \/>/i, '<meta property="og:image" content="https://resume.jclee.me/og-image-ja.webp" />')
    .replace(/<meta property="og:title" content="[^"]*" \/>/i, '<meta property="og:title" content="イ・ジェチョル - Security エンジニア" />')
    .replace(/<meta property="og:locale" content="ko_KR" \/>/i, '<meta property="og:locale" content="ja_JP" />\n    <meta property="og:locale:alternate" content="ko_KR" />')
    .replace(/\s*<meta property="og:locale:alternate" content="ja_JP" \/>/g, '')
    .replace(/<meta name="twitter:url" content="https:\/\/resume\.jclee\.me\/?" \/>/i, '<meta name="twitter:url" content="https://resume.jclee.me/ja/" />')
    .replace(/<meta name="twitter:image" content="https:\/\/resume\.jclee\.me\/og-image\.webp" \/>/i, '<meta name="twitter:image" content="https://resume.jclee.me/og-image-ja.webp" />')
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/i, '<meta name="twitter:title" content="イ・ジェチョル - Security エンジニア" />')
    .replace(/"name": "이재철 - Security 엔지니어"/g, '"name": "イ・ジェチョル - Security エンジニア"')
    .replace(/"name": "이재철"/g, '"name": "イ・ジェチョル"')
    .replace(/"inLanguage": "ko-KR"/g, '"inLanguage": "ja-JP"')
    .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, '"url": "https://resume.jclee.me/ja/"')
    .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, '"item": "https://resume.jclee.me/ja/"')
    .replace(/"image": "https:\/\/resume\.jclee\.me\/og-image\.webp"/g, '"image": "https://resume.jclee.me/og-image-ja.webp"')
    .replace(/"jobTitle": "Security 엔지니어"/g, '"jobTitle": "Security エンジニア"')
    // === JA meta tags (description, keywords, og:description, twitter:description) ===
    .replace(/<meta\s+name="description"[\s\S]*?\/>/i, '<meta name="description" content="イ・ジェチョル - Security エンジニア ポートフォリオ" />')
    .replace(/<meta\s+name="keywords"[\s\S]*?\/>/i, '<meta name="keywords" content="イ・ジェチョル, Lee Jaecheol, Security Engineer" />')
    .replace(/<meta\s+name="author"[\s\S]*?\/>/i, '<meta name="author" content="イ・ジェチョル (Lee Jaecheol)" />')
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/i, '<meta property="og:description" content="イ・ジェチョル - Security エンジニア ポートフォリオ" />')
    .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/i, '<meta name="twitter:description" content="イ・ジェチョル - Security エンジニア ポートフォリオ" />')
    // === JA JSON-LD description ===
    .replace(/"description": "[^"]*"/g, '"description": "イ・ジェチョル - Security エンジニア ポートフォリオ"')
    // === JA hero copy (replace KO hero text with Japanese) ===
    .replace(/<span class="typing-effect glow-cyan">이재철<\/span/g, '<span class="typing-effect glow-cyan">イ・ジェチョル</span')
    .replace(/<span class="sr-only">이재철<\/span>/g, '<span class="sr-only">イ・ジェチョル</span>')
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
    .replace(/<h2 id="status-heading" class="sr-only">상태<\/h2>/g, '<h2 id="status-heading" class="sr-only">ステータス</h2>')
    .replace(/<h2 id="observability-heading" class="sr-only">옵저버빌리티<\/h2>/g, '<h2 id="observability-heading" class="sr-only">オブザーバビリティ</h2>')
    .replace(/<h2 id="resume-heading" class="sr-only">경력사항<\/h2>/g, '<h2 id="resume-heading" class="sr-only">職歴</h2>')
    .replace(/<h2 id="projects-heading" class="sr-only">주요 프로젝트<\/h2>/g, '<h2 id="projects-heading" class="sr-only">主要プロジェクト</h2>')
    .replace(/<h2 id="contact-heading" class="sr-only">연락처<\/h2>/g, '<h2 id="contact-heading" class="sr-only">連絡先</h2>')
    .replace(/<h2 id="contact-section-heading" class="sr-only">연락처<\/h2>/g, '<h2 id="contact-section-heading" class="sr-only">連絡先</h2>')
    // === Certifications + Guestbook + profile sr-only headings & labels ===
    .replace(/<h2 id="certifications-heading" class="sr-only">자격증<\/h2>/g, '<h2 id="certifications-heading" class="sr-only">資格</h2>')
    .replace(/<h2 id="guestbook-heading" class="sr-only">방명록<\/h2>/g, '<h2 id="guestbook-heading" class="sr-only">ゲストブック</h2>')
    .replace(/<label for="guestbook-name"[^>]*>이름<\/label>/g, (mm) => mm.replace('이름', 'お名前'))
    .replace(/<label for="guestbook-message"[^>]*>메시지<\/label>/g, (mm) => mm.replace('메시지', 'メッセージ'))
    .replace(/<button type="submit" class="guestbook-submit"[^>]*>남기기<\/button>/g, (mm) => mm.replace('남기기', '投稿'))
    .replace(/placeholder="이름"/g, 'placeholder="お名前"')
    .replace(/placeholder="메시지를 남겨주세요"/g, 'placeholder="メッセージを残してください"')
    .replace(/aria-label="방명록 목록"/g, 'aria-label="ゲストブック一覧"')
    .replace(/"name": "Security\/Infrastructure Engineer — 구직 중"/g, '"name": "Security / Infrastructure Engineer — 求職中"')
    // === Inline JS terminal commands KO -> JA ===
    .replace(/'Security 엔지니어'/g, "'Security エンジニア'")
    .replace(/> Security 엔지니어\\n> Scrolling to #about\.\.\./g, '> Security エンジニア\\n> Scrolling to #about...')
    // === Inline JS terminal command keywords KO -> JA ===
    .replace(/'연락', '이메일', '전화'/g, "'連絡', 'メール', '電話'")
    .replace(/'기술', '스킬', '역량'/g, "'技術', 'スキル', 'スタック'")
    .replace(/'사이드', '프로젝트'/g, "'サイド', 'プロジェクト'")
    .replace(/'자격증', '인증'/g, "'資格', '認証'")
    .replace(/'경력', '경험', '회사', '업무'/g, "'経歴', '経験', '会社', '業務'")
    // === JSON-LD knowsAbout KO -> JA ===
    .replace(/"Security"/g, '"Security"')
    .replace(/"name": "홈"/g, '"name": "ホーム"')
    // === Inline JS character class: extend Korean-only range to also cover Japanese ===
    .replace(/\[\^a-z0-9가-힣\\s\]/g, '[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\\s]')
    // === Language switcher: KO active -> JA active ===
    .replace(
      /<a href="\/" hreflang="ko" aria-current="true" class="lang-link lang-link--active" lang="ko">KO<\/a>/g,
      '<a href="/" hreflang="ko" class="lang-link" lang="ko">KO</a>'
    )
    .replace(
      /<a href="\/ja\/" hreflang="ja" class="lang-link" lang="ja">JA<\/a>/g,
      '<a href="/ja/" hreflang="ja" aria-current="true" class="lang-link lang-link--active" lang="ja">JA</a>'
    )
    .replace(/aria-label="언어 선택 \/ Language"/g, 'aria-label="言語"');
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
