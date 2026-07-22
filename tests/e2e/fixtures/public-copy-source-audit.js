const ALLOWED = [
  /^\/careers\/\d+\/(role|myRole|description)$/,
  /^\/careers\/\d+\/projects\/\d+\/achievements\/\d+$/,
  /^\/personalProjects\/\d+\/(description|tagline)$/,
  /^\/personalProjects\/\d+\/fullStackEvidence\/(userSurface|backendApi|dataAsync|deliveryOperations|securityReliability)$/,
  /^\/personalProjects\/\d+\/fullStackEvidence\/architectureSteps\/\d+$/,
  /^\/summary\/(expertise|coreCompetencies)\/\d+$/,
  /^\/summary\/aboutSection\/careerHighlights\/\d+$/,
  /^\/achievements\/\d+$/,
  /^\/education\/status$/,
  /^\/languages\/\d+\/(level|note)$/,
  /^\/military\/status$/,
];
const EMPTY_ARRAY = Symbol('empty-array');
const EMPTY_OBJECT = Symbol('empty-object');
const KINDS = new Set([
  'dom-text', 'dom-attribute', 'live-region', 'accessible-tree',
  'document-title', 'metadata', 'jsonld', 'manifest',
]);
const JSON_PATH = /^\$(?:(?:\.[A-Za-z_$][A-Za-z0-9_$]*)|(?:\[(?:0|[1-9]\d*)\]))*$/;
const { isFragmentRecord, isFrozenLedgerState, isLedgerSelector, isRfc6901Pointer } =
  require('./public-copy-ledger-serializer');

function hasControlCharacter(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isRepoRelative(value) {
  return typeof value === 'string' && value && !value.startsWith('/') && !value.includes('\\')
    && !/^[A-Za-z]:\//.test(value) && !hasControlCharacter(value)
    && value.split('/').every((part) => part && part !== '.' && part !== '..');
}

function isSortedUnique(values) {
  return new Set(values).size === values.length
    && JSON.stringify(values) === JSON.stringify([...values].sort());
}

function encodePointerSegment(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function decodePointerSegment(value) {
  return value.replaceAll('~1', '/').replaceAll('~0', '~');
}

function flattenJsonPointers(value, pointer = '', output = new Map()) {
  if (Array.isArray(value)) {
    if (value.length === 0) output.set(pointer || '/', EMPTY_ARRAY);
    value.forEach((item, index) => flattenJsonPointers(item, `${pointer}/${index}`, output));
    return output;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) output.set(pointer || '/', EMPTY_OBJECT);
    for (const key of keys) {
      flattenJsonPointers(value[key], `${pointer}/${encodePointerSegment(key)}`, output);
    }
    return output;
  }
  output.set(pointer || '/', value);
  return output;
}

function publicValue(value) {
  if (value === EMPTY_ARRAY) return [];
  if (value === EMPTY_OBJECT) return {};
  return value;
}

function diffJsonPointers(before, after) {
  const left = flattenJsonPointers(before);
  const right = flattenJsonPointers(after);
  const pointers = [...new Set([...left.keys(), ...right.keys()])].sort();
  return pointers.flatMap((pointer) => {
    const leftPresent = left.has(pointer);
    const rightPresent = right.has(pointer);
    const previous = left.get(pointer);
    const next = right.get(pointer);
    if (leftPresent === rightPresent && (!leftPresent || Object.is(previous, next))) return [];
    return [{
      pointer,
      before: leftPresent ? publicValue(previous) : undefined,
      after: rightPresent ? publicValue(next) : undefined,
    }];
  });
}

function resolvePointer(document, pointer) {
  let value = document;
  for (const segment of pointer.split('/').slice(1).map(decodePointerSegment)) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function isAllowedPublicCopyPath(pointer, locale, context = {}) {
  if (ALLOWED.some((pattern) => pattern.test(pointer))) return true;
  if (/^\/languages\/\d+\/name$/.test(pointer)) return locale !== 'en';
  const cover = pointer.match(/^\/coverLetter\/(ko|en|ja)\/(headline|closing|paragraphs\/\d+)$/);
  if (!cover) return false;
  if (cover[1] === locale) return true;
  if (locale !== 'ko' || !['en', 'ja'].includes(cover[1])) return false;
  const owner = context.nativeOwners && context.nativeOwners[cover[1]];
  if (!owner || context.after === undefined) return false;
  return JSON.stringify(context.after) === JSON.stringify(resolvePointer(owner, pointer));
}

function auditSource(before, after, locale, nativeOwners = {}) {
  return diffJsonPointers(before, after).map((entry) => ({
    ...entry,
    allowed: isAllowedPublicCopyPath(entry.pointer, locale, {
      after: entry.after,
      nativeOwners,
    }),
  }));
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) {
    throw new Error(`Invalid public-copy source map: ${label}`);
  }
}

function validateFragmentMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid public-copy source map: ${label}`);
  if (!isSortedUnique(Object.keys(value))) throw new Error(`Invalid public-copy source map: ${label} order`);
  for (const [key, fragment] of Object.entries(value)) {
    if (!key) throw new Error(`Invalid public-copy source map: ${label} key`);
    exactKeys(fragment, ['startUtf16', 'endUtf16', 'template'], `${label} fragment`);
    if (!Number.isInteger(fragment.startUtf16) || !Number.isInteger(fragment.endUtf16)
      || fragment.startUtf16 < 0 || fragment.endUtf16 <= fragment.startUtf16
      || typeof fragment.template !== 'string') throw new Error(`Invalid public-copy source map: ${label} fragment values`);
  }
}

function validateSourceRef(ref, fragments) {
  exactKeys(ref, [
    'sourceOwner', 'jsonPath', 'sourceSpan', 'decisionId',
    'bindings', 'matchMode', 'fragmentPath',
  ], 'source ref');
  if (!isRepoRelative(ref.sourceOwner)
    || ((ref.jsonPath === null) === (ref.sourceSpan === null))
    || !['whole', 'fragment'].includes(ref.matchMode)
    || (ref.matchMode === 'whole' && ref.fragmentPath !== null)
    || (ref.matchMode === 'fragment' && (!isRfc6901Pointer(ref.fragmentPath)
      || !isFragmentRecord(resolvePointer(fragments, ref.fragmentPath))))
    || (ref.decisionId !== null && (typeof ref.decisionId !== 'string' || !ref.decisionId.trim()))) {
    throw new Error('Invalid public-copy source map: source ref values');
  }
  if (!ref.bindings || typeof ref.bindings !== 'object' || Array.isArray(ref.bindings)) {
    throw new Error('Invalid public-copy source map: source ref bindings');
  }
  if (ref.jsonPath !== null && (typeof ref.jsonPath !== 'string' || !JSON_PATH.test(ref.jsonPath)))
    throw new Error('Invalid public-copy source map: source ref jsonPath');
  if (ref.sourceSpan !== null) {
    exactKeys(ref.sourceSpan, ['startByte', 'endByte', 'sha256'], 'source span');
    if (!Number.isInteger(ref.sourceSpan.startByte) || !Number.isInteger(ref.sourceSpan.endByte)
      || ref.sourceSpan.startByte < 0 || ref.sourceSpan.endByte <= ref.sourceSpan.startByte
      || !/^[0-9a-f]{64}$/.test(ref.sourceSpan.sha256)) throw new Error('Invalid public-copy source map: source span values');
  }
  for (const [key, binding] of Object.entries(ref.bindings)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw new Error('Invalid public-copy source map: binding key');
    exactKeys(binding, ['sourceOwner', 'jsonPath', 'value'], 'binding');
    if (!isRepoRelative(binding.sourceOwner) || typeof binding.value !== 'string'
      || typeof binding.jsonPath !== 'string' || !JSON_PATH.test(binding.jsonPath))
      throw new Error('Invalid public-copy source map: binding values');
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
    const dimensions = entry.viewport.key === 'desktop-1280x900' ? [1280, 900]
      : entry.viewport.key === 'mobile-375x812' ? [375, 812] : [];
    const routeLocale = { '/': 'ko', '/ko/': 'ko', '/en/': 'en', '/ja/': 'ja' }[entry.route];
    if (!['ko', 'en', 'ja'].includes(entry.locale) || routeLocale !== entry.locale
      || !isFrozenLedgerState(entry.state) || !KINDS.has(entry.kind)
      || !isLedgerSelector(entry.kind, entry.selector)
      || dimensions[0] !== entry.viewport.width || dimensions[1] !== entry.viewport.height
      || entry.viewport.dpr !== 1
      || ((entry.kind === 'dom-attribute') !== (typeof entry.attribute === 'string' && Boolean(entry.attribute)))
      || ((entry.kind === 'accessible-tree') !== isRfc6901Pointer(entry.accessiblePath))
      || !Number.isInteger(entry.occurrenceIndex) || entry.occurrenceIndex < 0
      || !Array.isArray(entry.beforeSourceRefs) || !Array.isArray(entry.afterSourceRefs)) {
      throw new Error('Invalid public-copy source map: entry values');
    }
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

module.exports = {
  auditSource,
  diffJsonPointers,
  flattenJsonPointers,
  isAllowedPublicCopyPath,
  validateSourceMapBootstrap,
};
