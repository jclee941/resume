const FEATURED_PROJECT_PROOFS = [
  { href: '#project-safetywallet-cf-workers-pwa', label: 'SafetyWallet' },
  { href: '#project-resume-portfolio', label: 'Resume Portfolio' },
  { href: '#project-ip-blacklist-platform', label: 'IP Blacklist' },
];

const HERO_CONTENT = {
  ko: {
    name: '이재철',
    primaryTitle: '풀스택 엔지니어',
    supportingLine: '보안 자동화 · 엣지 인프라',
    availability: '풀스택·백엔드·플랫폼 엔지니어 기회를 검토합니다.',
    proposition: '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다.',
    primaryCta: { href: '#projects', label: '대표 프로젝트 보기' },
    secondaryCta: { href: '/resume.pdf', label: '이력서 PDF' },
    proofLinks: FEATURED_PROJECT_PROOFS,
  },
  en: {
    name: 'Jaecheol Lee',
    primaryTitle: 'Full-Stack Engineer',
    supportingLine: 'Security Automation & Edge Infrastructure',
    availability: 'Open to full-stack, backend, and platform engineering opportunities.',
    proposition:
      'I design and operate products end to end, from user interfaces and APIs to data flows, deployment, and observability.',
    primaryCta: { href: '#projects', label: 'View featured builds' },
    secondaryCta: { href: '/resume.pdf', label: 'Resume PDF' },
    proofLinks: FEATURED_PROJECT_PROOFS,
  },
  ja: {
    name: '李在哲',
    primaryTitle: 'フルスタックエンジニア',
    supportingLine: 'セキュリティ自動化・エッジインフラ',
    availability:
      'フルスタック・バックエンド・プラットフォーム領域のご提案と面談依頼を検討しています。',
    proposition:
      'ユーザー画面、API、データ、デプロイ、可観測性を一貫して設計・運用します。',
    primaryCta: { href: '#projects', label: '注目プロジェクトを見る' },
    secondaryCta: { href: '/resume.pdf', label: '履歴書PDF' },
    proofLinks: FEATURED_PROJECT_PROOFS,
  },
};

module.exports = { HERO_CONTENT };
