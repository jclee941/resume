const { FROZEN_STATES, KINDS, RFC6901_POINTER, ROUTES } = require('./public-copy-ledger-constants');

function occurrenceAddress(item) {
  return JSON.stringify([
    item.locale,
    item.route,
    item.state,
    item.viewport.key,
    item.kind,
    item.selector,
    item.attribute,
    item.accessiblePath,
    item.occurrenceIndex,
  ]);
}

function compareOccurrences(left, right) {
  return occurrenceAddress(left).localeCompare(occurrenceAddress(right), 'en');
}

function fail(message) {
  throw new Error(`Invalid public-copy baseline: ${message}`);
}

function isFrozenLedgerState(value) {
  return typeof value === 'string' && FROZEN_STATES.has(value);
}

function isRfc6901Pointer(value) {
  return typeof value === 'string' && RFC6901_POINTER.test(value);
}

function isLedgerSelector(kind, value) {
  if (typeof value !== 'string' || !value || value.includes('*')) return false;
  if (kind === 'document-title') return value === 'document:title';
  if (kind === 'metadata') return /^meta:.+:\d+$/.test(value);
  if (kind === 'jsonld') return /^jsonld:\d+:(?:\/(?:[^~/]|~[01])*)+$/.test(value);
  if (kind === 'manifest') return /^manifest:\/[^:]+:(?:\/(?:[^~/]|~[01])*)+$/.test(value);
  return !/^(?:document:|meta:|jsonld:|manifest:)/.test(value);
}

function isFragmentRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value)) === JSON.stringify(['startUtf16', 'endUtf16', 'template']) &&
    Number.isInteger(value.startUtf16) &&
    Number.isInteger(value.endUtf16) &&
    value.startUtf16 >= 0 &&
    value.endUtf16 > value.startUtf16 &&
    typeof value.template === 'string'
  );
}

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

module.exports = {
  compareOccurrences,
  fail,
  isFragmentRecord,
  isFrozenLedgerState,
  isLedgerSelector,
  isRfc6901Pointer,
  occurrenceAddress,
  validateBaseline,
};
