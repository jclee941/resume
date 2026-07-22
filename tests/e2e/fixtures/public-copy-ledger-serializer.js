const crypto = require('crypto');

const KINDS = new Set([
  'dom-text', 'dom-attribute', 'live-region', 'accessible-tree',
  'document-title', 'metadata', 'jsonld', 'manifest',
]);
const ROUTES = new Set(['/', '/ko/', '/en/', '/ja/']);
const DYNAMIC_STATE_SHAPE = Object.freeze({
  capabilities: ['product-ui', 'backend-api', 'data-workflows', 'delivery-operations', 'security-reliability'],
  timelines: 6,
  domains: ['observability', 'cloud', 'devops', 'automation', 'database', 'security', 'programming'],
});
const FROZEN_STATES = new Set(['initial', 'mobile-nav-open', 'projects-expanded', 'cover-expanded', 'capability-product-ui-cleared', 'clipboard-success', 'mobile-actions-visible', 'skill-search-cloudflare', 'bootstrap-error', 'visibility-contract', ...DYNAMIC_STATE_SHAPE.capabilities.map((id) => `capability-${id}`), ...Array.from({ length: DYNAMIC_STATE_SHAPE.timelines }, (_, index) => `timeline-${index}-expanded`), ...DYNAMIC_STATE_SHAPE.domains.map((domain) => `skill-domain-${domain}-expanded`)]);
const RFC6901_POINTER = /^(?:\/(?:[^~/]|~[01])*)+$/;
const CAPABILITY_PROJECTS = {
  'product-ui': ['SafetyWallet (CF Workers PWA)', 'Resume Portfolio'],
  'backend-api': ['SafetyWallet (CF Workers PWA)', 'IP Blacklist Platform', 'jclee-bot GitHub App'],
  'data-workflows': ['SafetyWallet (CF Workers PWA)', 'IP Blacklist Platform', 'AI Content Automation Pipeline'],
  'delivery-operations': ['Resume Portfolio', 'Terraform Homelab IaC', 'Observability Platform'],
  'security-reliability': ['SafetyWallet (CF Workers PWA)', 'Security Alert System', 'Firewall Policy Automation'],
};
const RUNTIME_COPY = {
  ko: {
    labels: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
    clear: '역량 선택을 해제했습니다.', collapse: '접기', detail: '상세 내용',
    clipboard: ['qws941@kakao.com 복사됨', '이메일 주소를 복사했습니다.'],
    region: ['포트폴리오 작업', '빠른 작업'], search: ['4개 기술 검색됨', '기술 2개를 찾았습니다.'],
    drawer: ['근거', '경험 수준'], bootstrap: '포트폴리오를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    actions: [['프로젝트', '#projects'], ['이력서 PDF', '/resume.pdf'], ['연락처', '#contact']],
  },
  en: {
    labels: ['Product UI', 'Backend & API', 'Data & Workflows', 'Delivery & Operations', 'Security & Reliability'],
    clear: 'Capability selection cleared.', collapse: 'Collapse', detail: 'Details',
    clipboard: ['qws941@kakao.com copied', 'Email address copied.'],
    region: ['Portfolio actions', 'Quick actions'], search: ['4 skills found', 'Found 2 skills.'],
    drawer: ['Evidence', 'Experience level'], bootstrap: 'The portfolio could not be loaded. Please try again shortly.',
    actions: [['Projects', '#projects'], ['Resume PDF', '/resume.pdf'], ['Contact', '#contact']],
  },
  ja: {
    labels: ['プロダクトUI', 'バックエンド・API', 'データ・ワークフロー', 'デリバリー・運用', 'セキュリティ・信頼性'],
    clear: ['能力の選択を解除しました。', 'スキルの選択を解除しました。'], collapse: '閉じる', detail: '詳細',
    clipboard: ['qws941@kakao.com をコピーしました', 'メールアドレスをコピーしました。'],
    region: ['ポートフォリオ操作', 'クイック操作'], search: ['4件のスキルが見つかりました', 'スキルが2件見つかりました。'],
    drawer: ['根拠', '経験レベル'], bootstrap: 'ポートフォリオを読み込めませんでした。しばらくしてから再試行してください。',
    actions: [['プロジェクト', '#projects'], ['履歴書PDF', '/resume.pdf'], ['連絡先', '#contact']],
  },
};

function occurrenceAddress(item) {
  return JSON.stringify([
    item.locale, item.route, item.state, item.viewport.key, item.kind,
    item.selector, item.attribute, item.accessiblePath, item.occurrenceIndex,
  ]);
}

function compareOccurrences(left, right) {
  return occurrenceAddress(left).localeCompare(occurrenceAddress(right), 'en');
}

function fail(message) {
  throw new Error(`Invalid public-copy baseline: ${message}`);
}

function isFrozenLedgerState(value) { return typeof value === 'string' && FROZEN_STATES.has(value); }

function isRfc6901Pointer(value) { return typeof value === 'string' && RFC6901_POINTER.test(value); }

function isLedgerSelector(kind, value) {
  if (typeof value !== 'string' || !value || value.includes('*')) return false;
  if (kind === 'document-title') return value === 'document:title';
  if (kind === 'metadata') return /^meta:.+:\d+$/.test(value);
  if (kind === 'jsonld') return /^jsonld:\d+:(?:\/(?:[^~/]|~[01])*)+$/.test(value);
  if (kind === 'manifest') return /^manifest:\/[^:]+:(?:\/(?:[^~/]|~[01])*)+$/.test(value);
  return !/^(?:document:|meta:|jsonld:|manifest:)/.test(value);
}

function isFragmentRecord(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(['startUtf16', 'endUtf16', 'template']) && Number.isInteger(value.startUtf16) && Number.isInteger(value.endUtf16) && value.startUtf16 >= 0 && value.endUtf16 > value.startUtf16 && typeof value.template === 'string'); }

function validateOccurrence(item) {
  if (!['ko', 'en', 'ja'].includes(item.locale)) fail('locale');
  if (!ROUTES.has(item.route)) fail('route');
  if (!isFrozenLedgerState(item.state)) fail('state');
  const viewport = item.viewport;
  if (!viewport || typeof viewport.key !== 'string' || !viewport.key) fail('viewport key');
  for (const key of ['width', 'height']) {
    if (!Number.isInteger(viewport[key]) || viewport[key] < 1) fail(`viewport ${key}`);
  }
  if (viewport.dpr !== 1) fail('viewport dpr');
  if (!KINDS.has(item.kind)) fail('kind');
  if (!isLedgerSelector(item.kind, item.selector)) fail('selector');
  if (item.attribute !== null && typeof item.attribute !== 'string') fail('attribute');
  const hasPath = isRfc6901Pointer(item.accessiblePath);
  if ((item.kind === 'accessible-tree') !== hasPath) fail('accessiblePath');
  if (!Number.isInteger(item.occurrenceIndex) || item.occurrenceIndex < 0) fail('occurrenceIndex');
  if (typeof item.value !== 'string' || !item.value.trim()) fail('value');
}

function validateBaseline(document) {
  const keys = Object.keys(document);
  const expected = ['version', 'capturedAt', 'baseSha', 'expectedHealthSha', 'sourceUrl', 'occurrences'];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) fail('root keys');
  if (document.version !== 1) fail('version');
  if (new Date(document.capturedAt).toISOString() !== document.capturedAt) fail('capturedAt');
  if (!/^[0-9a-f]{40}$/.test(document.baseSha)) fail('baseSha');
  if (document.expectedHealthSha !== document.baseSha) fail('health SHA');
  if (document.sourceUrl !== 'https://resume.jclee.me') fail('sourceUrl');
  if (!Array.isArray(document.occurrences) || document.occurrences.length === 0) fail('occurrences');
  document.occurrences.forEach(validateOccurrence);
  const addresses = document.occurrences.map(occurrenceAddress);
  if (new Set(addresses).size !== addresses.length) fail('duplicate address');
  const sorted = [...document.occurrences].sort(compareOccurrences);
  if (JSON.stringify(sorted) !== JSON.stringify(document.occurrences)) fail('sort order');
  return document;
}

function serializeBaseline(document) {
  validateBaseline(document);
  return `${JSON.stringify(document, null, 2)}\n`;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}

function serializeCompactSorted(value) {
  return `${JSON.stringify(sortObject(value))}\n`;
}

function canonicalBaselineCommand({ baseSha, sourceUrl, output }) {
  return `SKIP_WEBSERVER=1 PORTFOLIO_LEDGER_MODE=baseline PORTFOLIO_LEDGER_URL=${sourceUrl} PORTFOLIO_LEDGER_EXPECTED_SHA=${baseSha} PORTFOLIO_LEDGER_OUTPUT=${output} npx playwright test tests/e2e/portfolio-public-copy-ledger.spec.js --project=chromium --workers=1`;
}

function runtimeCopy(locale, mode) {
  const copy = RUNTIME_COPY[locale];
  const target = mode !== 'baseline';
  const ids = Object.keys(CAPABILITY_PROJECTS);
  const capabilities = Object.fromEntries(ids.map((id, index) => {
    const names = CAPABILITY_PROJECTS[id].map((name) => {
      if (name !== 'AI Content Automation Pipeline') return name;
      if (locale === 'ko') return 'AI 콘텐츠 자동화 파이프라인';
      if (locale === 'ja') return 'AIコンテンツ自動化パイプライン';
      return name;
    });
    const count = names.length;
    const label = copy.labels[index];
    const value = locale === 'ko'
      ? `${label}: ${target ? `프로젝트 ${count}개` : `${count}개 프로젝트`} — ${names.join(', ')}`
      : locale === 'ja'
        ? `${label}: ${target ? `該当プロジェクト${count}件` : `${count}件のプロジェクト`} — ${names.join(', ')}`
        : `${label}: ${count} project${count === 1 ? '' : 's'} — ${names.join(', ')}`;
    return [id, value];
  }));
  const select = (value) => Array.isArray(value) ? value[target ? 1 : 0] : value;
  return {
    ...copy,
    capabilities,
    clear: select(copy.clear), clipboard: select(copy.clipboard), region: select(copy.region),
    search: select(copy.search), drawer: select(copy.drawer),
  };
}

function validateBaselineReceipt(receipt, ledgerBytes) {
  const expectedKeys = [
    'baseSha', 'capturedAt', 'command', 'ledgerSha256', 'liveHealthSha',
    'mode', 'occurrenceCount', 'routes', 'version',
  ];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) fail('receipt object');
  if (JSON.stringify(Object.keys(receipt)) !== JSON.stringify(expectedKeys)) fail('receipt keys');
  if (receipt.version !== 1 || receipt.mode !== 'baseline') fail('receipt identity');
  if (typeof ledgerBytes !== 'string') fail('receipt ledger bytes');
  let ledger;
  try {
    ledger = validateBaseline(JSON.parse(ledgerBytes));
  } catch (error) {
    fail(`receipt ledger schema: ${error.message}`);
  }
  if (!/^[0-9a-f]{40}$/.test(receipt.baseSha)) fail('receipt baseSha');
  if (receipt.baseSha !== ledger.baseSha) fail('receipt base SHA binding');
  if (receipt.liveHealthSha !== ledger.expectedHealthSha) fail('receipt health SHA binding');
  if (!/^[0-9a-f]{64}$/.test(receipt.ledgerSha256)) fail('receipt ledger SHA');
  if (receipt.ledgerSha256 !== sha256(ledgerBytes)) {
    fail('receipt ledger digest');
  }
  if (JSON.stringify(receipt.routes) !== JSON.stringify(['/', '/ko/', '/en/', '/ja/'])) {
    fail('receipt routes');
  }
  if (receipt.occurrenceCount !== ledger.occurrences.length) fail('receipt occurrenceCount binding');
  if (receipt.capturedAt !== ledger.capturedAt) fail('receipt capturedAt binding');
  const output = '.omo/evidence/portfolio-copy-cleanup/ledger-baseline.json';
  if (receipt.command !== canonicalBaselineCommand({
    baseSha: ledger.baseSha, sourceUrl: ledger.sourceUrl, output,
  })) fail('receipt command binding');
  return receipt;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = {
  canonicalBaselineCommand,
  compareOccurrences,
  DYNAMIC_STATE_SHAPE,
  isFragmentRecord,
  isFrozenLedgerState,
  isLedgerSelector,
  isRfc6901Pointer,
  occurrenceAddress,
  runtimeCopy,
  serializeBaseline,
  serializeCompactSorted,
  sha256,
  validateBaseline,
  validateBaselineReceipt,
};
