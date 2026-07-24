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
    return [{ pointer, before: leftPresent ? publicValue(previous) : undefined, after: rightPresent ? publicValue(next) : undefined }];
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
    allowed: isAllowedPublicCopyPath(entry.pointer, locale, { after: entry.after, nativeOwners }),
  }));
}

module.exports = { auditSource, decodePointerSegment, diffJsonPointers, flattenJsonPointers, isAllowedPublicCopyPath };
