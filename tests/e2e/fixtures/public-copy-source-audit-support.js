const { decodePointerSegment } = require('./public-copy-source-audit-pointers');

function hasControlCharacter(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isRepoRelative(value) {
  return typeof value === 'string' && value && !value.startsWith('/') && !value.includes('\\') && !/^[A-Za-z]:\//.test(value) && !hasControlCharacter(value) && value.split('/').every((part) => part && part !== '.' && part !== '..');
}

function isSortedUnique(values) {
  return new Set(values).size === values.length && JSON.stringify(values) === JSON.stringify([...values].sort());
}

function resolvePointer(document, pointer) {
  let value = document;
  for (const segment of pointer.split('/').slice(1).map(decodePointerSegment)) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

module.exports = { isRepoRelative, isSortedUnique, resolvePointer };
