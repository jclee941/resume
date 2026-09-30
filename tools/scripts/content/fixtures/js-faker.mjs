import { fakeText } from './text-faker.mjs';

// typeof results and locale/level codes are code, not prose.
const KEEP_LITERALS = new Set([
  'use strict',
  'ko',
  'en',
  'ja',
  'expert',
  'advanced',
  'intermediate',
  'beginner',
  'string',
  'number',
  'object',
  'function',
  'boolean',
  'undefined',
  'symbol',
  'bigint',
]);
const MODULE_CONTEXT = /(?:require\(\s*|\bfrom\s+|\bimport\s+|\bimport\(\s*)$/;
const REGEX_PRECEDERS = /[(,=:[!&|?{};]$|\breturn$|\btypeof$/;

/**
 * Keep structural literals: anchors, paths, module specifiers, markup, and object keys.
 * @param {string} inner
 * @param {string} before code preceding the literal
 * @param {string} after code following the literal
 * @returns {boolean}
 */
function isStructural(inner, before, after) {
  return (
    KEEP_LITERALS.has(inner) ||
    /^[#/.]/.test(inner) ||
    inner.startsWith('<svg') ||
    MODULE_CONTEXT.test(before.trimEnd()) ||
    /^\s*:/.test(after)
  );
}

/**
 * @param {string} source
 * @param {number} start index of an opening quote
 * @returns {number} index just past the closing quote (template literals end at the closing backtick)
 */
function endOfString(source, start) {
  const quote = source[start];
  let depth = 0;
  for (let i = start + 1; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\\') i += 1;
    else if (quote === '`' && char === '$' && source[i + 1] === '{') depth += 1;
    else if (quote === '`' && char === '}' && depth > 0) depth -= 1;
    else if (char === quote && depth === 0) return i + 1;
  }
  throw new Error('unterminated string literal');
}

/**
 * @param {string} source
 * @param {number} start index of a slash that opens a regex literal
 * @returns {number}
 */
function endOfRegex(source, start) {
  let inClass = false;
  for (let i = start + 1; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\\') i += 1;
    else if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) return i + 1;
  }
  throw new Error('unterminated regex literal');
}

/**
 * Fake the prose inside the string literals of a JavaScript data module. Comments, regex
 * literals, code, keys, anchors, module specifiers, and markup literals stay byte for byte.
 * Template literals holding `${}` keep their expressions.
 * @param {string} source
 * @returns {string}
 */
export function fakeJs(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += source.slice(i, stop);
      i = stop;
    } else if (char === '/' && next === '*') {
      const stop = source.indexOf('*/', i + 2) + 2;
      out += source.slice(i, stop);
      i = stop;
    } else if (char === '/' && REGEX_PRECEDERS.test(source.slice(0, i).trimEnd())) {
      const stop = endOfRegex(source, i);
      out += source.slice(i, stop);
      i = stop;
    } else if (char === "'" || char === '"' || char === '`') {
      const stop = endOfString(source, i);
      const inner = source.slice(i + 1, stop - 1);
      const keep = isStructural(inner, source.slice(0, i), source.slice(stop, stop + 8));
      out += keep ? source.slice(i, stop) : `${char}${fakeText(inner, { escapes: true })}${char}`;
      i = stop;
    } else {
      out += char;
      i += 1;
    }
  }
  return out;
}
