import { createHash } from 'node:crypto';

const SALT = 'content-pack-fixture-v1';
const LATIN_CONSONANTS = 'bdfgklmnprstvz';
const LATIN_VOWELS = 'aeiou';
const ALPHABETS = {
  hangul: [
    ...'가나다라마바사아자차카타파하고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후',
  ],
  hiragana: [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめも'],
  katakana: [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ'],
  han: [...'山川田木花石雨風空海森林星月日火水土金'],
};
// Public infrastructure hosts that identify no one; every other host becomes example.com.
const PUBLIC_HOSTS = new Set([
  'www.w3.org',
  'schema.org',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.googletagmanager.com',
  'static.cloudflareinsights.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'resume.jclee.me',
  'cdnjs.cloudflare.com',
]);
// Public platforms whose host stays so link classification keeps working; the account path is faked.
const PLATFORM_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'linkedin.com',
  'www.linkedin.com',
  'velog.io',
]);
export const PHONE_PATTERN = /(?<!\d)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/g;
export const FAKE_PHONE = '010-0000-0000';
const FAKE_EMAIL = 'fixture@example.com';

const SEGMENT = [
  '\\p{Script=Hangul}+',
  '\\p{Script=Hiragana}+',
  '\\p{Script=Katakana}+',
  '\\p{Script=Han}+',
  '[\\p{L}\\p{M}]+',
].join('|');
const SHARED = [
  '(?<url>https?:\\/\\/[^\\s"\'`<>)\\]\\\\]+)',
  '(?<bare>\\b(?:www\\.)?(?:linkedin\\.com\\/in|github\\.com|velog\\.io)\\/[\\w./@%-]+)',
  '(?<token>\\b(?=[A-Za-z0-9]*\\d)[A-Za-z0-9]{16,}\\b)',
  '(?<mail>[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+)',
  '(?<phone>(?<!\\d)01[016789][-. ]?\\d{3,4}[-. ]?\\d{4}(?!\\d))',
  '(?<tag><\\/?[A-Za-z][\\w:-]*(?:\\s[^<>]*)?\\/?>)',
  '(?<entity>&#?\\w+;)',
  '(?<hold>\\{\\{[^}]*\\}\\}|\\$\\{[^}]*\\}|__[A-Za-z0-9_]+__|\\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\\b)',
];
const ESCAPE = '(?<esc>\\\\(?:u\\{[0-9a-fA-F]+\\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\\s\\S]))';
/** @type {RegExp} */
let PLAIN;
/** @type {RegExp} */
let ESCAPED;

/**
 * Phrases that stay verbatim wherever they occur: generic interface labels and role titles that
 * the templates and tests address by exact text. Replaces the previous set.
 * @param {string[]} phrases
 */
export function setKeepPhrases(phrases) {
  const alternatives = [...new Set(phrases)]
    .sort((a, b) => b.length - a.length)
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`));
  const keep = alternatives.length > 0 ? [`(?<ui>${alternatives.join('|')})`] : [];
  PLAIN = new RegExp([...keep, ...SHARED, `(?<seg>${SEGMENT})`].join('|'), 'gu');
  ESCAPED = new RegExp([...keep, ...SHARED, ESCAPE, `(?<seg>${SEGMENT})`].join('|'), 'gu');
}
setKeepPhrases([]);

/**
 * @param {string} segment
 * @returns {'hangul' | 'hiragana' | 'katakana' | 'han' | 'latin'}
 */
function scriptOf(segment) {
  for (const script of Object.keys(ALPHABETS)) {
    if (new RegExp(`^\\p{Script=${script[0].toUpperCase()}${script.slice(1)}}`, 'u').test(segment))
      return /** @type {'hangul' | 'hiragana' | 'katakana' | 'han'} */ (script);
  }
  return 'latin';
}

/**
 * Replace one run of letters with a deterministic fake run of the same length and case shape.
 * Single characters stay: they carry no identity.
 * @param {string} segment
 * @returns {string}
 */
export function fakeSegment(segment) {
  const chars = [...segment];
  if (chars.length < 2) return segment;
  const bytes = createHash('sha256').update(`${SALT}\0${segment}`).digest();
  const script = scriptOf(segment);
  const consonants = [...LATIN_CONSONANTS];
  const vowels = [...LATIN_VOWELS];
  const out = [];
  chars.forEach((char, index) => {
    const alphabet = script !== 'latin' ? ALPHABETS[script] : index % 2 === 0 ? consonants : vowels;
    let at = bytes[index % bytes.length];
    // Never repeat a character or an ABAB pair: prose linters flag those as duplicated tokens.
    while (
      alphabet[at % alphabet.length] === out.at(-2) ||
      alphabet[at % alphabet.length] === out.at(-1)
    )
      at += 1;
    const letter = alphabet[at % alphabet.length];
    out.push(script === 'latin' && char !== char.toLowerCase() ? letter.toUpperCase() : letter);
  });
  // Korean declaratives end in 다; keep that ending so sentence-form linters see a sentence.
  if (script === 'hangul' && chars.at(-1) === '다') out[out.length - 1] = '다';
  return out.join('');
}

/**
 * Long alphanumeric tokens (verification codes, hashes, keys) become deterministic hex of the same length.
 * @param {string} token
 * @returns {string}
 */
function fakeToken(token) {
  let hex = '';
  for (let block = 0; hex.length < token.length; block += 1) {
    hex += createHash('sha256').update(`${SALT}\0${token}\0${block}`).digest('hex');
  }
  return hex.slice(0, token.length);
}

/**
 * @param {string} url
 * @returns {string}
 */
export function fakeUrl(url) {
  const [, tail = ''] = /([.,;:!?]+)$/.exec(url) ?? [];
  const body = tail ? url.slice(0, -tail.length) : url;
  const parts = /^(https?:\/\/)([^/?#]+)(.*)$/.exec(body);
  if (!parts) return url;
  const [, scheme, host, rest] = parts;
  if (PUBLIC_HOSTS.has(host)) return url;
  const shown = PLATFORM_HOSTS.has(host) || host.endsWith('.jclee.me') ? host : 'example.com';
  // `/in/` marks a LinkedIn profile URL; only the account name after it is identifying.
  const [, kind = '', account] = /^(\/in\/)?(.*)$/s.exec(rest);
  return `${scheme}${shown}${kind}${account.replace(new RegExp(SEGMENT, 'gu'), fakeSegment)}${tail}`;
}

/**
 * Fake every identifying token of a text while keeping its shape: word lengths, punctuation,
 * whitespace, markup tags, entities, placeholders, and digits stay; URLs move to example.com.
 * @param {string} text
 * @param {{ escapes?: boolean }} [options] escapes: keep backslash escape sequences intact
 * @returns {string}
 */
export function fakeText(text, { escapes = false } = {}) {
  return text.replace(escapes ? ESCAPED : PLAIN, (...args) => {
    const groups = args.at(-1);
    if (groups.url) return fakeUrl(groups.url);
    if (groups.bare) return fakeUrl(`https://${groups.bare}`).slice('https://'.length);
    if (groups.token) return fakeToken(groups.token);
    if (groups.mail) return FAKE_EMAIL;
    if (groups.phone) return FAKE_PHONE;
    if (groups.seg) return fakeSegment(groups.seg);
    return args[0];
  });
}
