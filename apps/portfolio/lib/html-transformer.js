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
    .replace('<!-- ACHIEVEMENTS_PLACEHOLDER -->', options.achievementsHtml || '')
    .replace('<!-- EXPERTISE_PLACEHOLDER -->', options.expertiseHtml || '')
    .replace('<!-- COVER_LETTER_PLACEHOLDER -->', options.coverLetterHtml || '')
    .replace(/<!-- BUILD_VERSION_PLACEHOLDER -->/g, options.buildVersion || '')
    .replace(/<!-- BUILD_DEPLOYED_AT_PLACEHOLDER -->/g, options.buildDeployedAt || '')
    .replace(
      /<!-- BUILD_CACHE_KEY_PLACEHOLDER -->/g,
      `${options.buildVersion || '0'}-${String(options.buildDeployedAt || '')
        .replace(/[^0-9]/g, '')
        .slice(0, 14)}`
    )
    .replace(/<!-- BUILD_DEPLOYED_DATE_PLACEHOLDER -->/g, options.buildDeployedDate || '')
    .replace("/* RESUME_CHAT_DATA_B64_PLACEHOLDER */ ''", options.resumeChatDataBase64 || "''");
}

// ARCHITECTURE TODO (future refactor — intentionally NOT done in this pass):
// The site renders 3 locales from a tri-source model that must be kept in sync:
//   KO  -> index.html (hand-authored)
//   EN  -> index-en.html (hand-authored, parallel copy)
//   JA  -> buildJapaneseTemplate() below, by string .replace() over the KO source
// This is the real architectural smell: every content change touches 2 templates
// plus a brittle replace-list here, and drift between locales is easy. The future
// target is a single locale-aware template + data/strings registry that renders
// KO/EN/JA from shared components. Scoped as a separate refactor; do not expand it
// inline with unrelated changes.
function buildJapaneseTemplate(html) {
  return (
    html
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
      // === JA meta tags (description, keywords, og:description, twitter:description) ===
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
      // === JA JSON-LD description ===
      .replace(
        /"description": "[^"]*"/g,
        '"description": "イ・ジェチョル - セキュリティエンジニア ポートフォリオ"'
      )
      // === JA hero copy (replace KO hero text with Japanese) ===
      .replace(
        /<span class="typing-effect glow-cyan">이재철<\/span/g,
        '<span class="typing-effect glow-cyan">イ・ジェチョル</span'
      )
      .replace(
        /<span class="sr-only">이재철<\/span>/g,
        '<span class="sr-only">イ・ジェチョル</span>'
      )
      .replace(/이재철/g, '李在哲')
      // === JA hero positioning / tagline / KPI grid ===
      .replace(
        /금융권 보안 인프라 설계·운영, SIEM 탐지·대응 자동화, IaC 기반 관측성을\s+실무 문제 해결에 연결합니다\./g,
        '金融セキュリティインフラの設計・運用、SIEM検知・対応の自動化、IaCベースの可観測性を、実務の課題解決につなげています。'
      )
      .replace(
        /<p class="hero-positioning">\s*8년차 보안·SRE 엔지니어 — 금융권 보안 인프라 설계·운영\s*<\/p>/g,
        '<p class="hero-positioning">8年目のセキュリティ・SREエンジニア — 金融業界セキュリティインフラの設計・運用</p>'
      )
      .replace(
        /<p class="hero-tagline">\s*FSC 본인가 통과 · SIEM 탐지·대응 자동화 · IaC 기반 관측성 · 이 사이트도 직접\s*빌드해 Cloudflare에 배포\s*<\/p>/g,
        '<p class="hero-tagline">FSC本認可審査対応 · SIEM検知・対応の自動化 · IaCベースの可観測性 · このサイトも自作・自前デプロイ</p>'
      )
      .replace(/aria-label="핵심 성과 지표"/g, 'aria-label="主要な実績指標"')
      .replace(/<dd class="hero-kpi__value">8년\+<\/dd>/g, '<dd class="hero-kpi__value">8年+</dd>')
      .replace(
        /<dt class="hero-kpi__label">보안·인프라 경력<\/dt>/g,
        '<dt class="hero-kpi__label">セキュリティ・インフラ経験</dt>'
      )
      .replace(
        /<dd class="hero-kpi__value">FSC 통과<\/dd>/g,
        '<dd class="hero-kpi__value">FSC通過</dd>'
      )
      .replace(
        /<dt class="hero-kpi__label">금융권 본인가<\/dt>/g,
        '<dt class="hero-kpi__label">金融業界 本認可</dt>'
      )
      .replace(
        /<dd class="hero-kpi__value">5계층 HA<\/dd>/g,
        '<dd class="hero-kpi__value">5層 HA</dd>'
      )
      .replace(
        /<dt class="hero-kpi__label">FortiGate 망분리 설계<\/dt>/g,
        '<dt class="hero-kpi__label">FortiGate 網分離設計</dt>'
      )
      .replace(
        /<dd class="hero-kpi__value">6 \+ CKS<\/dd>/g,
        '<dd class="hero-kpi__value">6 + CKS</dd>'
      )
      .replace(
        /<dt class="hero-kpi__label">보유·취득예정 자격증<\/dt>/g,
        '<dt class="hero-kpi__label">保有・取得予定の資格</dt>'
      )
      // === Status seeking strip ===
      .replace(/aria-label="구직 중 · 즉시 투입 가능"/g, 'aria-label="求職中 · 即時入社可能"')
      .replace(
        /<span class="status-seeking__label">구직 중<\/span>/g,
        '<span class="status-seeking__label">求職中</span>'
      )
      .replace(
        /<span class="status-seeking__availability">즉시 투입 가능<\/span>/g,
        '<span class="status-seeking__availability">即時入社可能</span>'
      )
      .replace(/aria-label="주요 이동"/g, 'aria-label="主なナビゲーション"')
      .replace(
        /<a href="#resume" class="link-subtle">경력 보기<\/a>/g,
        '<a href="#resume" class="link-subtle">経歴を見る</a>'
      )
      .replace(
        /<a href="mailto:qws941@kakao\.com" class="link-subtle">이메일<\/a>/g,
        '<a href="mailto:qws941@kakao.com" class="link-subtle">メール</a>'
      )
      // === PDF / Contact CTA ===
      .replace(/aria-label="채용 문의 옵션"/g, 'aria-label="採用お問い合わせオプション"')
      .replace(/download="이재철_이력서\.pdf"/g, 'download="Lee-Jaecheol-Resume-JA.pdf"')
      .replace(/aria-label="이력서 PDF 다운로드"/g, 'aria-label="履歴書PDFダウンロード"')
      .replace(/>📄 이력서 PDF 다운로드</g, '>📄 履歴書PDFダウンロード<')
      .replace(/이력서 PDF/g, '履歴書PDF')
      .replace(/이력서/g, '履歴書')
      .replace(/aria-label="채용 또는 면접 문의하기"/g, 'aria-label="採用・面接お問い合わせ"')
      .replace(/>채용·면접 문의하기</g, '>採用・面接お問い合わせ<')
      // === Skip link ===
      .replace(/>바로 본문으로 이동</g, '>メインコンテンツへスキップ<')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)소개(<\/h2>)/g, '$1概要$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)커버레터(<\/h2>)/g, '$1カバーレター$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)경력(<\/h2>)/g, '$1経歴$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)자격증(<\/h2>)/g, '$1資格$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)프로젝트(<\/h2>)/g, '$1プロジェクト$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)기술(<\/h2>)/g, '$1スキル$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)운영(<\/h2>)/g, '$1運用$2')
      .replace(/(<h2[^>]*class="section-title"[^>]*>)연락처(<\/h2>)/g, '$1連絡先$2')
      // === JA JSON-LD jobTitle + address ===
      .replace(
        /"jobTitle": "Security Engineer \/ SRE \(보안·SRE 엔지니어\)"/g,
        '"jobTitle": "Security Engineer / SRE (セキュリティ・SREエンジニア)"'
      )
      .replace(/"addressRegion": "경기도"/g, '"addressRegion": "京畿道"')
      .replace(/"addressLocality": "시흥시"/g, '"addressLocality": "帋興市"')
      // === JA nav + region aria-labels ===
      .replace(/aria-label="~\/jclee 홈으로 이동"/g, 'aria-label="~/jclee ホームへ移動"')
      .replace(/aria-label="언어 선택 \/ Language"/g, 'aria-label="言語選択 / Language"')
      .replace(/aria-label="기술 역량 카드"/g, 'aria-label="スキルカード"')
      .replace(/aria-label="연락처 및 소셜 링크"/g, 'aria-label="連絡先・ソーシャルリンク"')
      // === JA cover-letter sr-only heading ===
      .replace(
        /<h2 id="cover-letter-heading" class="sr-only">커버레터<\/h2>/g,
        '<h2 id="cover-letter-heading" class="sr-only">カバーレター</h2>'
      )
      // === JA section-cmd storytelling intros ===
      .replace(
        /<span class="section-cmd__story">수작업을 줄이는 방식으로 보안 운영을 배워 온 엔지니어입니다\.<\/span>/g,
        '<span class="section-cmd__story">手作業を減らす方法でセキュリティ運用を学んできたエンジニアです。</span>'
      )
      .replace(
        /<span class="section-cmd__story">폐쇄망 운영에서 금융권 보안 운영까지, 같은 질문은 반복되었습니다: 무엇을 자동화할 수 있는가\.<\/span>/g,
        '<span class="section-cmd__story">閉鎖網運用から金融業界のセキュリティ運用まで、同じ問いが繰り返されました：何を自動化できるか。</span>'
      )
      .replace(
        /<span class="section-cmd__story">Linux 기반을 다시 다진 뒤, 보안·네트워크·컨테이너 보안으로 학습 축을 확장했습니다\.<\/span>/g,
        '<span class="section-cmd__story">Linuxの基礎を再構築した後、セキュリティ・ネットワーク・コンテナセキュリティへと学習軸を拡張しました。</span>'
      )
      .replace(
        /<span class="section-cmd__story">현장에서 만난 반복 문제를 개인 프로젝트와 운영 도구로 다시 검증했습니다\.<\/span>/g,
        '<span class="section-cmd__story">現場で出会った繰り返しの問題を、個人プロジェクトや運用ツールで検証し直しました。</span>'
      )
      .replace(
        /<span class="section-cmd__story">기술 스택은 목적지가 아니라, 운영 문제를 자동화하기 위해 선택한 도구 목록입니다\.<\/span>/g,
        '<span class="section-cmd__story">技術スタックは目的地ではなく、運用課題を自動化するために選んだツールのリストです。</span>'
      )
      .replace(
        /<span class="section-cmd__story">다음 문제도 운영 문제에서 출발해 자동화 가능한 구조로 바꾸고 싶습니다\.<\/span>/g,
        '<span class="section-cmd__story">次の問題も運用課題から出発し、自動化できる構造へと変えていきたいです。</span>'
      )
      // === sr-only section headings ===
      .replace(
        /<h2 id="about-heading" class="sr-only">소개<\/h2>/g,
        '<h2 id="about-heading" class="sr-only">紹介</h2>'
      )
      .replace(
        /<h2 id="skills-heading" class="sr-only">기술<\/h2>/g,
        '<h2 id="skills-heading" class="sr-only">スキル</h2>'
      )
      .replace(
        /<h2 id="operated-heading" class="sr-only">이 사이트는 이렇게 운영됩니다<\/h2>/g,
        '<h2 id="operated-heading" class="sr-only">このサイトの運用方法</h2>'
      )
      .replace(/cat operated\.md/g, 'cat operated.md')
      .replace(/이 포트폴리오는 정적 문서가 아니라 보안 헤더, 관측, 자동화로 관리되는 작은 운영 시스템입니다\./g, 'このポートフォリオは、セキュリティヘッダー・可観測性・自動化で管理される小さな運用システムです。')
      .replace(/Edge 런타임 \+ 보안 헤더/g, 'Edgeランタイム + セキュリティヘッダー')
      .replace(/관측성 스택/g, '可観測性スタック')
      .replace(/자동화·IaC/g, '自動化・IaC')
      .replace(/aria-label="사이트 운영 방식"/g, 'aria-label="サイト運用方法"')
      .replace(
        /Cloudflare Workers에서 제공하며 CSP nonce·strict-dynamic, HSTS,\s+COOP\/CORP, frame-ancestors none을 응답 헤더로 적용합니다\./g,
        'Cloudflare WorkersでCSP nonce・strict-dynamic、HSTS、COOP/CORP、frame-ancestors noneをレスポンスヘッダーとして適用します。'
      )
      .replace(
        /Grafana, Prometheus, Loki, ELK로 로그와 운영 이벤트를 확인하고\s+대시보드 기반으로 상태를 검토합니다\./g,
        'Grafana・Prometheus・Loki・ELKでログと運用イベントを確認し、ダッシュボードで状態を確認します。'
      )
      .replace(
        /n8n, MCP, Terraform, GitHub Actions를 통해 반복 운영 절차와 배포 검증을\s+코드로 관리합니다\./g,
        'n8n・MCP・Terraform・GitHub Actionsで反復的な運用手順とデプロイ検証をコードとして管理します。'
      )
      .replace(
        /<h2 id="resume-heading" class="sr-only">경력사항<\/h2>/g,
        '<h2 id="resume-heading" class="sr-only">職歴</h2>'
      )
      .replace(
        /<h2 id="projects-heading" class="sr-only">주요 프로젝트<\/h2>/g,
        '<h2 id="projects-heading" class="sr-only">主要プロジェクト</h2>'
      )
      .replace(
        /<h2 id="contact-heading" class="sr-only">연락처<\/h2>/g,
        '<h2 id="contact-heading" class="sr-only">連絡先</h2>'
      )
      .replace(
        /<h2 id="contact-section-heading" class="sr-only">연락처<\/h2>/g,
        '<h2 id="contact-section-heading" class="sr-only">連絡先</h2>'
      )
      // === Certifications + profile sr-only headings & labels ===
      .replace(
        /<h2 id="certifications-heading" class="sr-only">자격증<\/h2>/g,
        '<h2 id="certifications-heading" class="sr-only">資格</h2>'
      )
      .replace(
        /"name": "Security\/Infrastructure Engineer — 구직 중"/g,
        '"name": "Security / Infrastructure Engineer — 求職中"'
      )
      // === Inline JS terminal commands KO -> JA ===
      .replace(/'보안 엔지니어'/g, "'セキュリティエンジニア'")
      .replace(
        /> 보안 엔지니어\\n> Scrolling to #about\.\.\./g,
        '> セキュリティエンジニア\\n> Scrolling to #about...'
      )
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
      .replace(
        /이 포트폴리오는 설명하는 보안 원칙을 사이트 자체에 적용했습니다\. 아래 항목은 배포된\s+응답 헤더·워커 코드·CI 설정에서 실제로 동작하는 통제입니다\./g,
        'このポートフォリオは、説明するセキュリティ原則をサイト自体に適用しています。以下の項目はデプロイされた応答ヘッダー・ワーカーコード・CI設定で実際に動作する統制です。'
      )
      .replace(
        /응답마다 nonce를 발급하고 strict-dynamic를 사용해 unsafe-inline·unsafe-eval 없이\s+인라인 스크립트를 허용합니다\./g,
        '応答ごとにnonceを発行し、strict-dynamicを使ってunsafe-inline・unsafe-evalなしでインラインスクリプトを許可します。'
      )
      .replace(
        /<h3 class="security-card__title">HSTS preload-ready · 전송 강제<\/h3>/g,
        '<h3 class="security-card__title">HSTS preload-ready · 転送強制</h3>'
      )
      .replace(
        /Strict-Transport-Security와 upgrade-insecure-requests로 HTTPS를 강제하고,\s+X-Content-Type-Options·X-Frame-Options DENY·frame-ancestors none을 적용합니다\./g,
        'Strict-Transport-Securityとupgrade-insecure-requestsでHTTPSを強制し、X-Content-Type-Options・X-Frame-Options DENY・frame-ancestors noneを適用します。'
      )
      .replace(
        /<h3 class="security-card__title">Cross-origin 격리 · 모니터링<\/h3>/g,
        '<h3 class="security-card__title">Cross-origin 隔離 · モニタリング</h3>'
      )
      .replace(
        /COOP·CORP를 강제하고, COEP·Trusted Types는 report-only로 운영합니다\. 3rd-party\s+분석·Grafana 임베드가 있고 cross-origin-isolated API가 필요 없어 강제는\s+보류했습니다\./g,
        'COOP・CORPを強制し、COEP・Trusted Typesはreport-onlyで運用します。サードパーティ分析と自社のGrafana埋め込みがあり、cross-origin-isolated APIが不要なため強制は見送っています。'
      )
      .replace(
        /Reporting-Endpoints와 CSP report-to로 위반을 수집하고, RFC 9116\s+\/\.well-known\/security\.txt로 취약점 제보 창구를 공개합니다\./g,
        'Reporting-EndpointsとCSP report-toで違反を収集し、RFC 9116 /.well-known/security.txtで脆弱性報告窓口を公開します。'
      )
      .replace(
        /<h3 class="security-card__title">서명 세션 · 입력 방어<\/h3>/g,
        '<h3 class="security-card__title">署名セッション · 入力防御</h3>'
      )
      .replace(
        /관리자 세션은 HMAC 서명 \+ HttpOnly·SameSite=Strict·Secure 쿠키를 쓰고,\s+게스트북·챗 API는 레이트 제한·입력 정규화·하니팟으로 보호합니다\./g,
        '管理者セッションはHMAC署名 + HttpOnly・SameSite=Strict・Secureクッキーを使い、ゲストブック・チャットAPIはレート制限・入力正規化・ハニーポットで保護します。'
      )
      .replace(
        /<h3 class="security-card__title">CI 보안 스캔<\/h3>/g,
        '<h3 class="security-card__title">CIセキュリティスキャン</h3>'
      )
      .replace(
        /CodeQL·gitleaks·OpenSSF Scorecard·Dependabot으로 코드·시크릿·의존성 위험을\s+지속스캔하고, harden-runner로 CI 런너의 egress를 제한·감시합니다\./g,
        'CodeQL・gitleaks・OpenSSF Scorecard・Dependabotでコード・シークレット・依存リスクを継続スキャンし、harden-runnerでCIランナーのegressを制限・監視します。'
      )
      // === About principles / current focus (#about-principles) KO -> JA ===
      .replace(
        /<h3 class="about-principles__title">엔지니어링 원칙<\/h3>/g,
        '<h3 class="about-principles__title">エンジニアリング原則</h3>'
      )
      .replace(
        /관측 가능하지 않은 것은 운영할 수 없다 \(You can't operate what you can't\s+observe\)\./g,
        '「観測できなければ、運用できない」'
      )
      .replace(
        /수작업 → 자동화 파이프라인 → AI 에이전트 — 한 단계씩 점진적으로\./g,
        '手作業 → 自動化パイプライン → AI エージェント'
      )
      .replace(
        /Defense in Depth: 네트워크 → ID → 워크로드 → 데이터\./g,
        'Infrastructure as Code、GitOps、宣言的構成'
      )
      .replace(
        /코드만 PR을 받는다 — 정책도, 인프라도, 운영 절차도\./g,
        'Defense in Depth: ネットワーク → ID → ワークロード → データ'
      )
      .replace(
        /<h3 class="about-principles__title">현재 집중 영역<\/h3>/g,
        '<h3 class="about-principles__title">現在の注力領域</h3>'
      )
      .replace(
        /Splunk ES \+ n8n \+ FortiManager API 기반 SOC 운영/g,
        'Splunk ES検知ルール・n8n・FortiManager APIによるSOC自動対応'
      )
      .replace(
        /Cloudflare Workers Edge 기반 정책·관측·인증 통합 구조 학습/g,
        'Cloudflare Workers Edge・IaCホームラボでDevOps能力拡張'
      )
      .replace(
        /MCP\/AI 에이전트로 보안 운영 수작업 아이템 정리 시도/g,
        'MCP/AIエージェント基盤のセキュリティ運用自動化ツール自社開発'
      )
      .replace(
        /GitOps\(ArgoCD\) \+ 정책 자동화\(OPA\) 학습/g,
        'GitOps(ArgoCD)・ポリシー自動化(OPA)学習中'
      )
  );
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
