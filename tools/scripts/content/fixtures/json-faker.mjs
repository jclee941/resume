import { FAKE_PHONE, PHONE_PATTERN, fakeText } from './text-faker.mjs';

// Keys whose string values are machine-read constants, never prose.
const KEEP_KEYS = new Set([
  'icon',
  'lang',
  'locale',
  'type',
  '@type',
  '@context',
  '$schema',
  'version',
  'workType',
  'totalExperience',
]);
// Dates and periods: digits and separators, optionally ending in a present-tense marker.
// `parent.key` pairs whose values other code selects on: dashboard tool names, and the
// node kinds, node ids and edge endpoints the project diagram renderer validates.
const KEEP_PAIRS = new Set(['dashboards.name', 'nodes.kind', 'nodes.id', 'edges.from', 'edges.to']);
// Skill proficiency codes are read by the radar widgets; language-level prose is not.
const SKILL_LEVELS = new Set(['expert', 'advanced', 'intermediate', 'beginner']);
const DIGITS_ONLY = /^[\d\s.:/~+-]*(?:현재|Present|現在)?$/;

/**
 * Collect every enum member of a JSON Schema so enum-typed strings survive faking.
 * @param {unknown} schema
 * @param {Set<string>} [found]
 * @returns {Set<string>}
 */
export function collectEnums(schema, found = new Set()) {
  if (Array.isArray(schema)) {
    for (const item of schema) collectEnums(item, found);
  } else if (schema && typeof schema === 'object') {
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'enum' && Array.isArray(value)) {
        for (const member of value) if (typeof member === 'string') found.add(member);
      } else collectEnums(value, found);
    }
  }
  return found;
}

/**
 * Structure-preserving fake of a JSON document: keys, numbers, booleans, nulls, array lengths,
 * enum members, and dates stay; every other string becomes deterministic fake text.
 * `keyParents` names objects whose own keys are identity-bearing (for example a map keyed by
 * employer name); those keys are faked with the same function as the matching values.
 * @param {unknown} value
 * @param {{ enums?: Set<string>, keep?: Set<string>, keyParents?: Set<string> }} [options]
 * @param {string} [key]
 * @returns {unknown}
 */
export function fakeJson(value, options = {}, key = '', parent = '') {
  const { enums = new Set(), keep = new Set(), keyParents = new Set() } = options;
  if (Array.isArray(value)) return value.map((item) => fakeJson(item, options, key, parent));
  if (value && typeof value === 'object') {
    const renameKeys = keyParents.has(key);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        renameKeys ? fakeText(k) : k,
        fakeJson(v, options, k, key),
      ])
    );
  }
  if (typeof value !== 'string') return value;
  if (
    KEEP_KEYS.has(key) ||
    (key === 'level' && SKILL_LEVELS.has(value)) ||
    KEEP_PAIRS.has(`${parent}.${key}`) ||
    keep.has(key) ||
    enums.has(value)
  ) {
    return value;
  }
  // Dates and periods stay; a phone number is digits too and must not.
  if (DIGITS_ONLY.test(value)) return value.replace(PHONE_PATTERN, FAKE_PHONE);
  return fakeText(value);
}
