'use strict';

const { escapeHtml } = require('../template-sanitizer');

const BOUND_NOUN =
  /^(?:수|것|데|때|줄|듯|뿐|바|중|적|만큼|대로|채)(?:[은는이가을를도에의만]|이다|입니다)?$/;
const AUXILIARY_VERB =
  /^(?:온|왔|와|오[고며는던]|간|갔|가[고며는던]|둔|뒀|두[고었는며]|놓|본|봤|보[고았는며]|준|줬|주[고었는며]|낸|냈|내[고었는며]|버리|버린|버렸)/;
const DETERMINERS = new Set([
  '그',
  '이',
  '저',
  '각',
  '두',
  '세',
  '네',
  '몇',
  '첫',
  '새',
  '옛',
  '매',
  '한',
  '전',
]);
// Medial vowels of a bare -아/-어 connective syllable: ㅏ ㅐ ㅓ ㅕ ㅘ ㅝ.
const CONNECTIVE_MEDIALS = new Set([0, 1, 4, 6, 9, 14]);
const HYPHENATED_TOKEN = /(?<![\w-])[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+){1,2}(?![\w-])/g;
const KANJI_KANA_SEAM =
  /(?<=[\u4e00-\u9fff])(?=[\u30a0-\u30ff])|(?<=[\u30a0-\u30ff])(?=[\u4e00-\u9fff])/g;
// Kanji and katakana words of two or more characters each, and ように before its verb.
const JAPANESE_WORD_SEAM =
  /(?<=[\u4e00-\u9fff]{2})(?=[\u30a1-\u30fa\u30fc]{2})|(?<=[\u30a1-\u30fa\u30fc]{2})(?=[\u4e00-\u9fff]{2})|(?<=ように)(?=[しなす])/g;

/** @param {string} word */
function lastSyllable(word) {
  const code = word ? word.charCodeAt(word.length - 1) - 0xac00 : -1;
  if (code < 0 || code > 11171) return null;
  return { final: code % 28, medial: Math.floor(code / 28) % 21 };
}

/**
 * Korean word pairs that read as one phrase: credential + grade, determiner + noun,
 * modifier + bound noun, bound noun 수 + 있다/없다, -아/-어 verb + auxiliary, -고 + 있다.
 * @param {string} a
 * @param {string} b
 */
function readsAsOnePhrase(a, b) {
  if (/^\d+급/.test(b)) return true;
  const last = lastSyllable(a);
  if (!last || !/^[\uac00-\ud7a3]/.test(b)) return false;
  if (DETERMINERS.has(a)) return true;
  if ((last.final === 4 || last.final === 8) && BOUND_NOUN.test(b)) return true;
  if (/^수[가도는]?$/.test(a) && /^[있없]/.test(b)) return true;
  if (last.final === 0 && CONNECTIVE_MEDIALS.has(last.medial) && AUXILIARY_VERB.test(b)) {
    return true;
  }
  return a.endsWith('고') && b.startsWith('있');
}

/**
 * Joins Korean words that read as one phrase with a no-break space so a line never breaks
 * inside the phrase. Expects escaped text without markup; other scripts pass through.
 * @param {string} text
 * @returns {string}
 */
function glueKoreanPhrases(text) {
  const words = text.split(' ');
  return words
    .map((word, i) =>
      i === 0 ? word : (readsAsOnePhrase(words[i - 1], word) ? '\u00a0' : ' ') + word
    )
    .join('');
}

/**
 * Wraps short Latin hyphenated tokens (Wi-Fi, NSX-T) so they never break at the hyphen.
 * @param {string} html - escaped text
 * @param {string} className - a class that sets white-space: nowrap
 * @returns {string}
 */
function keepHyphenatedTokens(html, className) {
  return html.replace(HYPHENATED_TOKEN, (token) =>
    token.length <= 16 ? `<span class="${className}">${token}</span>` : token
  );
}

/**
 * Award names stay verbatim; a leading year is joined to the next word and Japanese names
 * may break where kanji meet katakana instead of inside a word.
 * @param {string} name
 * @returns {string} escaped HTML
 */
function formatAwardName(name) {
  return glueKoreanPhrases(escapeHtml(name))
    .replace(/^(\d{4}) /, '$1\u00a0')
    .replace(KANJI_KANA_SEAM, '<wbr>');
}

/**
 * Lets a Japanese phrase too long for a narrow line wrap between words instead of before its
 * last kana. Expects escaped text without markup; other scripts pass through.
 * @param {string} text
 * @returns {string} HTML
 */
function breakJapanesePhrases(text) {
  return text.replace(JAPANESE_WORD_SEAM, '<wbr>');
}

module.exports = {
  breakJapanesePhrases,
  formatAwardName,
  glueKoreanPhrases,
  keepHyphenatedTokens,
};
