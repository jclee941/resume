const crypto = require('crypto');
const {
  CAPABILITY_PROJECTS,
  DYNAMIC_STATE_SHAPE,
  RUNTIME_COPY,
} = require('./public-copy-ledger-constants');
const {
  compareOccurrences,
  fail,
  isFragmentRecord,
  isFrozenLedgerState,
  isLedgerSelector,
  isRfc6901Pointer,
  occurrenceAddress,
  validateBaseline,
} = require('./public-copy-ledger-validation');

function serializeBaseline(document) {
  validateBaseline(document);
  return `${JSON.stringify(document, null, 2)}\n`;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObject(value[key])])
  );
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
  const capabilities = Object.fromEntries(
    ids.map((id, index) => {
      const names = CAPABILITY_PROJECTS[id].map((name) => {
        if (name !== 'AI Content Automation Pipeline') return name;
        if (locale === 'ko') return 'AI 콘텐츠 자동화 파이프라인';
        if (locale === 'ja') return 'AIコンテンツ自動化パイプライン';
        return name;
      });
      const count = names.length;
      const label = copy.labels[index];
      const value =
        locale === 'ko'
          ? `${label}: ${target ? `프로젝트 ${count}개` : `${count}개 프로젝트`} — ${names.join(', ')}`
          : locale === 'ja'
            ? `${label}: ${target ? `該当プロジェクト${count}件` : `${count}件のプロジェクト`} — ${names.join(', ')}`
            : `${label}: ${count} project${count === 1 ? '' : 's'} — ${names.join(', ')}`;
      return [id, value];
    })
  );
  const select = (value) => (Array.isArray(value) ? value[target ? 1 : 0] : value);
  return {
    ...copy,
    capabilities,
    clear: select(copy.clear),
    clipboard: select(copy.clipboard),
    region: select(copy.region),
    search: select(copy.search),
    drawer: select(copy.drawer),
  };
}

function validateBaselineReceipt(receipt, ledgerBytes) {
  const expectedKeys = [
    'baseSha',
    'capturedAt',
    'command',
    'ledgerSha256',
    'liveHealthSha',
    'mode',
    'occurrenceCount',
    'routes',
    'version',
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
  if (receipt.occurrenceCount !== ledger.occurrences.length)
    fail('receipt occurrenceCount binding');
  if (receipt.capturedAt !== ledger.capturedAt) fail('receipt capturedAt binding');
  const output = '.omo/evidence/portfolio-copy-cleanup/ledger-baseline.json';
  if (
    receipt.command !==
    canonicalBaselineCommand({
      baseSha: ledger.baseSha,
      sourceUrl: ledger.sourceUrl,
      output,
    })
  )
    fail('receipt command binding');
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
