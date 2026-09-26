const COMMON_STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function toTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

/**
 * @template T
 * @param {T[]} list
 * @returns {T[]}
 */
export function unique(list) {
  return [...new Set(list)];
}

/**
 * @param {string[]} leftTokens
 * @param {string[]} rightTokens
 * @returns {number}
 */
export function jaccardSimilarity(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * @param {unknown} requirements
 * @returns {string}
 */
export function parseRequirements(requirements) {
  return Array.isArray(requirements) ? requirements.join(' ') : String(requirements || '');
}
