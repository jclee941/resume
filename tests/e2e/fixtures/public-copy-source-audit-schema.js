const { KINDS } = require('./public-copy-ledger-constants');
const {
  isFragmentRecord,
  isFrozenLedgerState,
  isLedgerSelector,
  isRfc6901Pointer,
} = require('./public-copy-ledger-serializer');
const { isRepoRelative, isSortedUnique, resolvePointer } = require('./public-copy-source-audit-support');

const JSON_PATH = /^\$(?:(?:\.[A-Za-z_$][A-Za-z0-9_$]*)|(?:\[(?:0|[1-9]\d*)\]))*$/;

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) {
    throw new Error(`Invalid public-copy source map: ${label}`);
  }
}

function validateFragmentMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid public-copy source map: ${label}`);
  if (!isSortedUnique(Object.keys(value))) throw new Error(`Invalid public-copy source map: ${label} order`);
  for (const [key, fragment] of Object.entries(value)) {
    if (!key) throw new Error(`Invalid public-copy source map: ${label} key`);
    exactKeys(fragment, ['startUtf16', 'endUtf16', 'template'], `${label} fragment`);
    if (!Number.isInteger(fragment.startUtf16) || !Number.isInteger(fragment.endUtf16) || fragment.startUtf16 < 0 || fragment.endUtf16 <= fragment.startUtf16 || typeof fragment.template !== 'string') {
      throw new Error(`Invalid public-copy source map: ${label} fragment values`);
    }
  }
}

function validateSourceRef(ref, fragments) {
  exactKeys(ref, ['sourceOwner', 'jsonPath', 'sourceSpan', 'decisionId', 'bindings', 'matchMode', 'fragmentPath'], 'source ref');
  if (!isRepoRelative(ref.sourceOwner) || (ref.jsonPath === null) === (ref.sourceSpan === null) || !['whole', 'fragment'].includes(ref.matchMode) || (ref.matchMode === 'whole' && ref.fragmentPath !== null) || (ref.matchMode === 'fragment' && (!isRfc6901Pointer(ref.fragmentPath) || !isFragmentRecord(resolvePointer(fragments, ref.fragmentPath)))) || (ref.decisionId !== null && (typeof ref.decisionId !== 'string' || !ref.decisionId.trim()))) {
    throw new Error('Invalid public-copy source map: source ref values');
  }
  if (!ref.bindings || typeof ref.bindings !== 'object' || Array.isArray(ref.bindings)) throw new Error('Invalid public-copy source map: source ref bindings');
  if (ref.jsonPath !== null && (typeof ref.jsonPath !== 'string' || !JSON_PATH.test(ref.jsonPath))) throw new Error('Invalid public-copy source map: source ref jsonPath');
  if (ref.sourceSpan !== null) {
    exactKeys(ref.sourceSpan, ['startByte', 'endByte', 'sha256'], 'source span');
    if (!Number.isInteger(ref.sourceSpan.startByte) || !Number.isInteger(ref.sourceSpan.endByte) || ref.sourceSpan.startByte < 0 || ref.sourceSpan.endByte <= ref.sourceSpan.startByte || !/^[0-9a-f]{64}$/.test(ref.sourceSpan.sha256)) throw new Error('Invalid public-copy source map: source span values');
  }
  for (const [key, binding] of Object.entries(ref.bindings)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw new Error('Invalid public-copy source map: binding key');
    exactKeys(binding, ['sourceOwner', 'jsonPath', 'value'], 'binding');
    if (!isRepoRelative(binding.sourceOwner) || typeof binding.value !== 'string' || typeof binding.jsonPath !== 'string' || !JSON_PATH.test(binding.jsonPath)) throw new Error('Invalid public-copy source map: binding values');
  }
  if (!isSortedUnique(Object.keys(ref.bindings))) throw new Error('Invalid public-copy source map: binding order');
}

function validateSourceMapBootstrap(sourceMap) {
  exactKeys(sourceMap, ['version', 'entries'], 'root');
  if (sourceMap.version !== 1 || !Array.isArray(sourceMap.entries)) throw new Error('Invalid public-copy source map: identity');
  const keys = ['locale', 'route', 'state', 'viewport', 'kind', 'selector', 'attribute', 'accessiblePath', 'occurrenceIndex', 'beforeFragments', 'afterFragments', 'beforeSourceRefs', 'afterSourceRefs'];
  const addresses = sourceMap.entries.map((entry) => JSON.stringify(keys.slice(0, 9).map((key) => entry[key])));
  if (!isSortedUnique(addresses)) throw new Error('Invalid public-copy source map: entry order');
  for (const entry of sourceMap.entries) {
    exactKeys(entry, keys, 'entry');
    exactKeys(entry.viewport, ['key', 'width', 'height', 'dpr'], 'viewport');
    const dimensions = entry.viewport.key === 'desktop-1280x900' ? [1280, 900] : entry.viewport.key === 'mobile-375x812' ? [375, 812] : [];
    const routeLocale = { '/': 'ko', '/ko/': 'ko', '/en/': 'en', '/ja/': 'ja' }[entry.route];
    if (!['ko', 'en', 'ja'].includes(entry.locale) || routeLocale !== entry.locale || !isFrozenLedgerState(entry.state) || !KINDS.has(entry.kind) || !isLedgerSelector(entry.kind, entry.selector) || dimensions[0] !== entry.viewport.width || dimensions[1] !== entry.viewport.height || entry.viewport.dpr !== 1 || (entry.kind === 'dom-attribute') !== (typeof entry.attribute === 'string' && Boolean(entry.attribute)) || (entry.kind === 'accessible-tree') !== isRfc6901Pointer(entry.accessiblePath) || !Number.isInteger(entry.occurrenceIndex) || entry.occurrenceIndex < 0 || !Array.isArray(entry.beforeSourceRefs) || !Array.isArray(entry.afterSourceRefs)) throw new Error('Invalid public-copy source map: entry values');
    validateFragmentMap(entry.beforeFragments, 'beforeFragments');
    validateFragmentMap(entry.afterFragments, 'afterFragments');
    entry.beforeSourceRefs.forEach((ref) => validateSourceRef(ref, entry.beforeFragments));
    entry.afterSourceRefs.forEach((ref) => validateSourceRef(ref, entry.afterFragments));
    for (const refs of [entry.beforeSourceRefs, entry.afterSourceRefs]) {
      if (!isSortedUnique(refs.map(JSON.stringify))) throw new Error('Invalid public-copy source map: ref order');
    }
  }
  return sourceMap;
}

module.exports = { validateSourceMapBootstrap };
