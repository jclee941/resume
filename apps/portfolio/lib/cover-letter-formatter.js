/**
 * Pure, locale-aware plain-text formatter for the SSoT `coverLetter` asset.
 *
 * Rendered by the terminal `coverletter` / `cl` command. Output is plain text
 * with `\n` separators (the terminal renders results via textContent with
 * white-space:pre), so this module emits NO HTML. Content is sourced verbatim
 * from the resume SSoT — this formatter never fabricates copy.
 * @module cover-letter-formatter
 */

const UNAVAILABLE = '> cover letter unavailable';

/**
 * Normalize a BCP-47-ish language tag to a supported locale key.
 * @param {string} [lang] - Language tag (e.g. 'en', 'en-US', 'ja').
 * @returns {string} Lowercased primary subtag, defaulting to 'ko'.
 */
function normalizeLang(lang) {
  return String(lang || 'ko')
    .toLowerCase()
    .split('-')[0];
}

/**
 * A locale entry is valid only when it carries the three required fields.
 * @param {*} entry - Candidate locale object.
 * @returns {boolean} True when the entry can be rendered.
 */
function isValidEntry(entry) {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof entry.headline === 'string' &&
    entry.headline.length > 0 &&
    Array.isArray(entry.paragraphs) &&
    entry.paragraphs.length > 0 &&
    typeof entry.closing === 'string'
  );
}

/**
 * Pick the best locale entry: requested → 'ko' → first valid.
 * @param {Object} coverLetter - Map of locale key to entry.
 * @param {string} lang - Normalized locale key.
 * @returns {Object|null} A valid entry, or null when none exists.
 */
function pickEntry(coverLetter, lang) {
  const candidates = [coverLetter[lang], coverLetter.ko];
  for (const candidate of candidates) {
    if (isValidEntry(candidate)) return candidate;
  }
  for (const value of Object.values(coverLetter)) {
    if (isValidEntry(value)) return value;
  }
  return null;
}

/**
 * Render the cover letter for the given locale as terminal plain text.
 * @param {Object|null} coverLetter - SSoT coverLetter map ({ ko, en, ja }).
 * @param {string} [lang] - Requested language tag; defaults to 'ko'.
 * @returns {string} Plain-text cover letter, or a friendly unavailable line.
 */
function formatCoverLetter(coverLetter, lang) {
  if (!coverLetter || typeof coverLetter !== 'object') return UNAVAILABLE;

  const entry = pickEntry(coverLetter, normalizeLang(lang));
  if (!entry) return UNAVAILABLE;

  const blocks = [`> ${entry.headline}`];
  entry.paragraphs.forEach((paragraph) => {
    if (typeof paragraph === 'string' && paragraph.length > 0) {
      blocks.push(paragraph);
    }
  });
  if (entry.closing.length > 0) blocks.push(entry.closing);

  return blocks.join('\n\n');
}

module.exports = { formatCoverLetter };
