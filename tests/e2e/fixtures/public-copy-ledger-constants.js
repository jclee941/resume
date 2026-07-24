const KINDS = new Set([
  'dom-text',
  'dom-attribute',
  'live-region',
  'accessible-tree',
  'document-title',
  'metadata',
  'jsonld',
  'manifest',
]);
const ROUTES = new Set(['/', '/ko/', '/en/', '/ja/']);
const DYNAMIC_STATE_SHAPE = Object.freeze({
  capabilities: [
    'product-ui',
    'backend-api',
    'data-workflows',
    'delivery-operations',
    'security-reliability',
  ],
  timelines: 6,
  domains: [
    'observability',
    'cloud',
    'devops',
    'automation',
    'database',
    'security',
    'programming',
  ],
});
const FROZEN_STATES = new Set([
  'initial',
  'mobile-nav-open',
  'projects-expanded',
  'cover-expanded',
  'capability-product-ui-cleared',
  'clipboard-success',
  'mobile-actions-visible',
  'skill-search-cloudflare',
  'bootstrap-error',
  'visibility-contract',
  ...DYNAMIC_STATE_SHAPE.capabilities.map((id) => `capability-${id}`),
  ...Array.from(
    { length: DYNAMIC_STATE_SHAPE.timelines },
    (_, index) => `timeline-${index}-expanded`
  ),
  ...DYNAMIC_STATE_SHAPE.domains.map((domain) => `skill-domain-${domain}-expanded`),
]);
const RFC6901_POINTER = /^(?:\/(?:[^~/]|~[01])*)+$/;
const CAPABILITY_PROJECTS = {
  'product-ui': ['SafetyWallet (CF Workers PWA)', 'Resume Portfolio'],
  'backend-api': ['SafetyWallet (CF Workers PWA)', 'IP Blacklist Platform', 'jclee-bot GitHub App'],
  'data-workflows': [
    'SafetyWallet (CF Workers PWA)',
    'IP Blacklist Platform',
    'AI Content Automation Pipeline',
  ],
  'delivery-operations': ['Resume Portfolio', 'Terraform Homelab IaC', 'Observability Platform'],
  'security-reliability': [
    'SafetyWallet (CF Workers PWA)',
    'Security Alert System',
    'Firewall Policy Automation',
  ],
};
const RUNTIME_COPY = {
  ko: {
    labels: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
    clear: '역량 선택을 해제했습니다.',
    collapse: '접기',
    detail: '상세 내용',
    clipboard: ['qws941@kakao.com 복사됨', '이메일 주소를 복사했습니다.'],
    region: ['포트폴리오 작업', '빠른 작업'],
    search: ['4개 기술 검색됨', '기술 2개를 찾았습니다.'],
    drawer: ['근거', '경험 수준'],
    bootstrap: '포트폴리오를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    actions: [
      ['프로젝트', '#projects'],
      ['이력서 PDF', '/resume.pdf'],
      ['연락처', '#contact'],
    ],
  },
  en: {
    labels: [
      'Product UI',
      'Backend & API',
      'Data & Workflows',
      'Delivery & Operations',
      'Security & Reliability',
    ],
    clear: 'Capability selection cleared.',
    collapse: 'Collapse',
    detail: 'Details',
    clipboard: ['qws941@kakao.com copied', 'Email address copied.'],
    region: ['Portfolio actions', 'Quick actions'],
    search: ['4 skills found', 'Found 2 skills.'],
    drawer: ['Evidence', 'Experience level'],
    bootstrap: 'The portfolio could not be loaded. Please try again shortly.',
    actions: [
      ['Projects', '#projects'],
      ['Resume PDF', '/resume.pdf'],
      ['Contact', '#contact'],
    ],
  },
  ja: {
    labels: [
      'プロダクトUI',
      'バックエンド・API',
      'データ・ワークフロー',
      'デリバリー・運用',
      'セキュリティ・信頼性',
    ],
    clear: ['能力の選択を解除しました。', 'スキルの選択を解除しました。'],
    collapse: '閉じる',
    detail: '詳細',
    clipboard: ['qws941@kakao.com をコピーしました', 'メールアドレスをコピーしました。'],
    region: ['ポートフォリオ操作', 'クイック操作'],
    search: ['4件のスキルが見つかりました', 'スキルが2件見つかりました。'],
    drawer: ['根拠', '経験レベル'],
    bootstrap: 'ポートフォリオを読み込めませんでした。しばらくしてから再試行してください。',
    actions: [
      ['プロジェクト', '#projects'],
      ['履歴書PDF', '/resume.pdf'],
      ['連絡先', '#contact'],
    ],
  },
};

module.exports = {
  CAPABILITY_PROJECTS,
  DYNAMIC_STATE_SHAPE,
  FROZEN_STATES,
  KINDS,
  RFC6901_POINTER,
  ROUTES,
  RUNTIME_COPY,
};
