const CONTACT_EMAIL = 'qws941@kakao.com';
const RESUME_PDF_PATH = '/resume.pdf';

const HERO_CONTENT = {
  ko: {
    title: '이재철',
    srTitle: 'Jaecheol Lee',
    role: 'Security / SRE Engineer',
    availability: '보안 운영 · SRE · DevSecOps 역할 검토 가능',
    positioning:
      '금융권 보안 운영, SIEM 탐지 자동화, IaC 관측성 경험을 채용 검토 가능한 근거로 정리합니다.',
    proofLabel: '대표 업무 증빙',
    proofItems: [
      '거래소 망분리·엔드포인트 보안 구축·운영',
      'Splunk ES 탐지 룰·알림 워크플로 정리',
      'FortiManager API·IaC 기반 운영 자동화',
    ],
    reviewLabel: '검토 경로',
    reviewLinks: [
      ['#resume', '운영 맥락', '금융 보안 운영 경력'],
      ['#projects', '자동화 방식', '탐지·IaC·API 흐름'],
      ['#contact', '채용 자료', 'PDF·메일 연결'],
    ],
    packetLabel: '채용 검토 자료',
    packetEyebrow: '채용 검토 자료',
    packetItems: [
      ['검토 역할', '보안 운영 · SRE · DevSecOps'],
      ['검토 근거', '경력 요약 · 프로젝트 증빙 · PDF'],
      ['연락 방식', '메일로 제안 또는 면접 일정 협의'],
    ],
    actionsLabel: '주요 이동',
    mailSubject: '채용 제안 또는 면접 문의',
    actions: ['채용 문의', '경력 보기', '프로젝트 보기', '이력서 PDF'],
    downloadName: '이재철_이력서.pdf',
  },
  en: {
    title: 'Jaecheol Lee',
    role: 'Security / SRE Engineer',
    availability: 'Open to Security Ops, SRE, and DevSecOps roles',
    positioning:
      'I present financial-sector security operations, SIEM detection automation, and IaC-based observability as inspectable evidence for hiring review.',
    proofLabel: 'Representative proof of work',
    proofItems: [
      'Exchange network segmentation and endpoint security operations',
      'Splunk ES detection rules and alert workflow automation',
      'FortiManager API and IaC-based operations automation',
    ],
    reviewLabel: 'Review path',
    reviewLinks: [
      ['#resume', 'Operating context', 'Financial security operations'],
      ['#projects', 'Automation approach', 'Detection · IaC · API flow'],
      ['#contact', 'Hiring materials', 'PDF and email handoff'],
    ],
    packetLabel: 'Hiring review packet',
    packetEyebrow: 'Hiring review packet',
    packetItems: [
      ['Target roles', 'Security Ops · SRE · DevSecOps'],
      ['Evidence set', 'Career summary · project proof · resume PDF'],
      ['Contact path', 'Email for a role proposal or interview scheduling'],
    ],
    actionsLabel: 'Primary actions',
    mailSubject: 'Hiring proposal or interview request',
    actions: ['Contact about role', 'Career evidence', 'Project evidence', 'Resume PDF'],
    downloadName: 'Jaecheol-Lee-Resume.pdf',
  },
  ja: {
    title: '李在哲',
    srTitle: 'イ・ジェチョル',
    role: 'Security / SRE Engineer',
    availability: 'セキュリティ運用・SRE・DevSecOpsを検討可能',
    positioning:
      '金融セキュリティ運用、SIEM検知自動化、IaC可観測性の経験を、採用検討可能な根拠として整理します。',
    proofLabel: '代表的な業務証跡',
    proofItems: [
      '取引所ネットワーク分離・エンドポイントセキュリティ構築・運用',
      'Splunk ES検知ルール・通知ワークフロー整理',
      'FortiManager API・IaCベースの運用自動化',
    ],
    reviewLabel: '確認ルート',
    reviewLinks: [
      ['#resume', '運用文脈', '金融セキュリティ運用経験'],
      ['#projects', '自動化アプローチ', '検知・IaC・APIフロー'],
      ['#contact', '採用資料', 'PDF・メール連携'],
    ],
    packetLabel: '採用検討資料',
    packetEyebrow: '採用検討資料',
    packetItems: [
      ['検討ロール', 'セキュリティ運用・SRE・DevSecOps'],
      ['確認根拠', '経歴要約・プロジェクト証跡・PDF'],
      ['連絡方法', 'メールで提案または面接日程を相談'],
    ],
    actionsLabel: '主要導線',
    mailSubject: '採用提案または面接相談',
    actions: ['採用相談', '経歴を見る', 'プロジェクトを見る', '履歴書PDF'],
    downloadName: 'Lee-Jaecheol-Resume-JA.pdf',
  },
};

function renderHeroTitle(content) {
  const srTitle = content.srTitle ? `<span class="sr-only"> ${content.srTitle}</span>` : '';
  return `<h1 class="hero-title" role="heading" aria-level="1">${content.title}${srTitle}</h1>`;
}

function renderProofList(content) {
  const items = content.proofItems.map((item) => `<li>${item}</li>`).join('');
  return `<ul class="hero-proof-list" aria-label="${content.proofLabel}">${items}</ul>`;
}

function renderReviewPath(content) {
  const links = content.reviewLinks
    .map(
      ([href, eyebrow, label]) =>
        `<a href="${href}"><span>${eyebrow}</span><strong>${label}</strong></a>`
    )
    .join('');
  return `<nav class="hero-review-path" aria-label="${content.reviewLabel}">${links}</nav>`;
}

function renderReviewPacket(content) {
  const items = content.packetItems
    .map(([term, description]) => `<div><dt>${term}</dt><dd>${description}</dd></div>`)
    .join('');
  return (
    `<div class="hiring-review-packet" aria-label="${content.packetLabel}">` +
    `<p class="hiring-review-packet__eyebrow">${content.packetEyebrow}</p>` +
    `<dl class="hiring-review-packet__list">${items}</dl></div>`
  );
}

function buildMailHref(subject) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function renderActions(content) {
  const [contact, resume, projects, pdf] = content.actions;
  return (
    `<div class="hero-cta" role="group" aria-label="${content.actionsLabel}">` +
    `<a href="${buildMailHref(content.mailSubject)}" class="link-subtle link-subtle--primary">${contact}</a>` +
    `<a href="#resume" class="link-subtle">${resume}</a>` +
    `<a href="#projects" class="link-subtle">${projects}</a>` +
    `<a href="${RESUME_PDF_PATH}" download="${content.downloadName}" class="link-subtle">${pdf}</a>` +
    '</div>'
  );
}

function buildHeroContent(locale) {
  const content = HERO_CONTENT[locale] || HERO_CONTENT.ko;
  return [
    renderHeroTitle(content),
    `<p class="hero-role">${content.role}</p>`,
    `<p class="hero-availability">${content.availability}</p>`,
    `<p class="hero-positioning">${content.positioning}</p>`,
    renderProofList(content),
    renderReviewPath(content),
    renderReviewPacket(content),
    renderActions(content),
  ].join('');
}

module.exports = { buildHeroContent };
