import { fakeJs } from './js-faker.mjs';
import { fakeJson } from './json-faker.mjs';
import { fakeText } from './text-faker.mjs';

// A tag body may hold quoted attribute values that contain `>` (for example a comment marker).
const BODY = '(?:"[^"]*"|\'[^\']*\'|[^>"\'])*';
const TOKEN = new RegExp(
  `<!--[\\s\\S]*?-->|<(script|style)\\b${BODY}>[\\s\\S]*?<\\/\\1>|<\\/?[A-Za-z!]${BODY}>|[^<]+|<`,
  'g'
);
const OPEN_TAG = new RegExp(`^<${BODY}>`);
const ATTRIBUTE = /([\w:-]+)(\s*=\s*)("([^"]*)"|'([^']*)')/g;
const PROSE_ATTRIBUTES = new Set([
  'alt',
  'title',
  'aria-label',
  'aria-description',
  'placeholder',
  'download',
]);
const KEEP_META = new Set([
  'viewport',
  'robots',
  'theme-color',
  'og:type',
  'og:image:width',
  'og:image:height',
  'og:image:type',
  'og:image:locale',
  'og:image:locale:alternate',
  'og:locale',
  'og:locale:alternate',
  'twitter:card',
  'format-detection',
  'color-scheme',
]);

/**
 * @param {string} tag
 * @returns {string}
 */
function fakeTag(tag) {
  const isMeta = /^<meta\b/i.test(tag);
  const metaKey = /\b(?:name|property|itemprop|http-equiv)\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
  return tag.replace(ATTRIBUTE, (whole, name, equals, quoted, dq, sq) => {
    const value = dq ?? sq ?? '';
    const quote = quoted[0];
    const lower = name.toLowerCase();
    const prose = PROSE_ATTRIBUTES.has(lower);
    const meta = isMeta && lower === 'content' && !KEEP_META.has(metaKey ?? '');
    const link = /^(?:href|src|action|content)$/.test(lower) && /^https?:/.test(value);
    return prose || meta || link ? `${name}${equals}${quote}${fakeText(value)}${quote}` : whole;
  });
}

/**
 * @param {string} block a whole <script>...</script> or <style>...</style> element
 * @returns {string}
 */
function fakeBlock(block) {
  const open = OPEN_TAG.exec(block)[0];
  const close = /<\/[^>]*>$/.exec(block)[0];
  const body = block.slice(open.length, block.length - close.length);
  if (/^<style/i.test(open) || !body.trim()) return block;
  if (/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(open)) {
    return `${fakeTag(open)}${JSON.stringify(fakeJson(JSON.parse(body)), null, 2)}${close}`;
  }
  return `${fakeTag(open)}${fakeJs(body)}${close}`;
}

/**
 * Fake the text nodes, prose attributes, JSON-LD, and inline scripts of an HTML document while
 * keeping its element tree, ids, classes, comments, styles, and relative links.
 * @param {string} html
 * @returns {string}
 */
export function fakeHtml(html) {
  return html.replace(TOKEN, (token, block) => {
    if (token.startsWith('<!--')) return token;
    if (block) return fakeBlock(token);
    if (token.startsWith('<') && token.length > 1) return fakeTag(token);
    return fakeText(token);
  });
}
