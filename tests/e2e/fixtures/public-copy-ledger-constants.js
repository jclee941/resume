const { loadPortfolioData, ownerIdentity } = require('../../helpers/owner-data');

// The dynamic-state shape and the search expectation follow the materialized content
// (career count, skill domains, skills) instead of pinning the owner's data.
const portfolioData = loadPortfolioData('ko');
const OWNER_EMAIL = ownerIdentity('ko').email;

/** Expected result of searching for the first listed skill, mirroring skill-radar-search.js. */
function skillSearchExpectation(data) {
  const domains = Object.values(data.skills);
  const term = domains[0].items[0].name;
  const needle = term.toLowerCase();
  let cards = 0;
  let items = 0;
  for (const domain of domains) {
    const titleMatches = domain.title.toLowerCase().includes(needle);
    const matched = domain.items.filter(
      (item) => titleMatches || item.name.toLowerCase().includes(needle)
    ).length;
    if (matched > 0) {
      cards += 1;
      items += matched;
    }
  }
  return { term, cards, items };
}
const SKILL_SEARCH = Object.freeze(skillSearchExpectation(portfolioData));
const SKILL_SEARCH_TOTAL = SKILL_SEARCH.cards + SKILL_SEARCH.items;

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
  timelines: portfolioData.careers.length,
  domains: Object.keys(portfolioData.skills),
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
const RUNTIME_COPY = {
  ko: {
    labels: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
    clear: '역량 선택을 해제했습니다.',
    collapse: '접기',
    detail: '상세 내용',
    clipboard: [`${OWNER_EMAIL} 복사됨`, '이메일 주소를 복사했습니다.'],
    region: ['포트폴리오 작업', '빠른 작업'],
    search: [`${SKILL_SEARCH_TOTAL}개 기술 검색됨`, `기술 ${SKILL_SEARCH.items}개를 찾았습니다.`],
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
    clipboard: [`${OWNER_EMAIL} copied`, 'Email address copied.'],
    region: ['Portfolio actions', 'Quick actions'],
    search: [`${SKILL_SEARCH_TOTAL} skills found`, `Found ${SKILL_SEARCH.items} skills.`],
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
    clipboard: [`${OWNER_EMAIL} をコピーしました`, 'メールアドレスをコピーしました。'],
    region: ['ポートフォリオ操作', 'クイック操作'],
    search: [
      `${SKILL_SEARCH_TOTAL}件のスキルが見つかりました`,
      `スキルが${SKILL_SEARCH.items}件見つかりました。`,
    ],
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
  DYNAMIC_STATE_SHAPE,
  FROZEN_STATES,
  KINDS,
  RFC6901_POINTER,
  ROUTES,
  RUNTIME_COPY,
  SKILL_SEARCH,
};
