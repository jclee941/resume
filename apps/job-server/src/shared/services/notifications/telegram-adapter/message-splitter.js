import { TELEGRAM_MAX_LENGTH } from './constants.js';

/**
 * Split an HTML message into Telegram-safe chunks (each <= maxLen) WITHOUT
 * breaking inside an HTML tag or an <a>…</a> entity. Splitting mid-tag or
 * mid-anchor triggers Telegram's 400 "can't parse entities".
 *
 * Strategy: scan the text tracking (a) whether we are inside a `<...>` tag and
 * (b) whether an `<a ...>` is open but not yet `</a>`-closed. The only legal
 * boundaries are positions that are NOT inside a tag and NOT inside an open
 * anchor. We greedily take the largest legal prefix that fits maxLen, preferring
 * to break at the last newline/space; if no legal break exists within maxLen
 * (pathological unbreakable run), we fall back to the last legal boundary even
 * if it exceeds maxLen-by-content — but still never inside a tag/anchor.
 *
 * @param {string} html
 * @param {number} [maxLen=TELEGRAM_MAX_LENGTH]
 * @returns {string[]}
 */
export function splitForTelegram(html, maxLen = TELEGRAM_MAX_LENGTH) {
  if (html == null) return [];
  const text = String(html);
  if (text.length === 0) return [];
  if (text.length <= maxLen) return [text];

  // Precompute, for every index, whether a split BEFORE that index is legal
  // (i.e. index is a boundary that is not inside a tag and not inside an anchor).
  const legal = computeLegalBoundaries(text);

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    if (text.length - start <= maxLen) {
      chunks.push(text.slice(start));
      break;
    }

    const hardEnd = start + maxLen; // exclusive upper bound for this chunk
    // Find the best legal boundary in (start, hardEnd]. Prefer newline, then
    // space, then any legal index. legal[i] === true means a split before i is safe.
    let best = -1;
    let bestNewline = -1;
    let bestSpace = -1;
    for (let i = start + 1; i <= hardEnd && i <= text.length; i += 1) {
      if (!legal[i]) continue;
      best = i;
      const prev = text[i - 1];
      if (prev === '\n') bestNewline = i;
      else if (prev === ' ') bestSpace = i;
    }

    let cut = bestNewline !== -1 ? bestNewline : bestSpace !== -1 ? bestSpace : best;

    if (cut === -1 || cut <= start) {
      // No legal boundary within maxLen — extend to the next legal boundary
      // beyond maxLen so we never cut inside a tag/anchor.
      cut = nextLegalBoundary(legal, hardEnd, text.length);
      if (cut === -1) cut = text.length;
    }

    if (cut - start > maxLen) {
      // The segment up to the next safe boundary is itself larger than maxLen
      // (e.g. a single <a>…</a> anchor longer than the limit). It cannot be sent
      // as valid HTML within one chunk, so degrade it to plain text (strip tags)
      // and hard-split the plain text into <=maxLen pieces.
      const plain = text.slice(start, cut).replace(/<[^>]*>/g, '');
      for (let p = 0; p < plain.length; p += maxLen) {
        chunks.push(plain.slice(p, p + maxLen));
      }
      start = cut;
      continue;
    }

    chunks.push(text.slice(start, cut));
    start = cut;
  }

  return chunks;
}

/**
 * Returns boolean[] of length text.length+1 where entry[i] is true if a split
 * BEFORE character i is safe (not inside a `<...>` tag and not inside an open
 * `<a>…</a>`). Index 0 and length are always boundaries.
 */
function computeLegalBoundaries(text) {
  const legal = new Array(text.length + 1).fill(false);
  legal[0] = true;
  legal[text.length] = true;

  let anchorDepth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '<') {
      // A boundary before '<' is legal only when not inside an open anchor.
      if (anchorDepth === 0) legal[i] = true;
      // Scan to the end of this tag, then update anchor depth from the tag text.
      i += 1;
      let tag = '<';
      while (i < text.length && text[i] !== '>') {
        tag += text[i];
        i += 1;
      }
      if (i < text.length) {
        tag += '>';
        i += 1; // consume '>'
      }
      const lower = tag.toLowerCase();
      if (/^<a\b/.test(lower)) anchorDepth += 1;
      else if (lower === '</a>') anchorDepth = Math.max(0, anchorDepth - 1);
      continue;
    }

    // Normal character: a boundary before i is legal iff not inside an anchor.
    if (anchorDepth === 0) legal[i] = true;
    i += 1;
  }

  return legal;
}

function nextLegalBoundary(legal, from, max) {
  for (let i = from + 1; i <= max; i += 1) {
    if (legal[i]) return i;
  }
  return -1;
}
