const { escapeHtml } = require('../template-sanitizer');

/**
 * A cover-letter locale entry is renderable only when it carries the three
 * required SSoT fields with content. Mirrors the validity contract of the
 * plain-text formatter so the visual section and plain-text output never diverge.
 * @param {*} entry - Candidate `coverLetter[locale]` object.
 * @returns {boolean} True when the entry can be rendered.
 */
function isRenderable(entry) {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof entry.headline === 'string' &&
    entry.headline.length > 0 &&
    Array.isArray(entry.paragraphs) &&
    entry.paragraphs.some((p) => typeof p === 'string' && p.length > 0) &&
    typeof entry.closing === 'string' &&
    entry.closing.length > 0
  );
}

/**
 * Render a single SSoT cover-letter locale entry as a first-class visual
 * section (clean manuscript card) for the scrollable portfolio page.
 *
 * Content is sourced VERBATIM from the SSoT and HTML-escaped — this renderer
 * never fabricates copy and never emits unescaped data. The numbered left rail
 * is purely structural (locale-neutral numerals), so it adds no narrative.
 *
 * Pure and cache-free: callers pass one locale entry at a time, so there is no
 * cross-locale cache key to leak (KO/EN/JA each render independently).
 *
 * @param {Object|null} entry - `coverLetter[locale]` = { headline, paragraphs[], closing }.
 * @returns {string} HTML for the card body, or '' when the entry is unrenderable.
 */
function generateCoverLetterSection(entry) {
  if (!isRenderable(entry)) return '';

  const paragraphs = entry.paragraphs.filter(
    (p) => typeof p === 'string' && p.length > 0
  );

  const paragraphsHtml = paragraphs
    .map((paragraph, i) => {
      const index = String(i + 1).padStart(2, '0');
      return `<li class="cover-letter__para">
            <span class="cover-letter__index" aria-hidden="true">${index}</span>
            <p class="cover-letter__text">${escapeHtml(paragraph)}</p>
          </li>`;
    })
    .join('\n          ');

  return `<article class="cover-letter-card">
        <header class="cover-letter__chrome">
          <span class="cover-letter__path">~/resume/coverletter.txt</span>
          <span class="cover-letter__hint" aria-hidden="true">read-only</span>
        </header>
        <blockquote class="cover-letter__headline">${escapeHtml(entry.headline)}</blockquote>
        <ol class="cover-letter__paragraphs">
          ${paragraphsHtml}
        </ol>
        <p class="cover-letter__closing">${escapeHtml(entry.closing)}</p>
      </article>`;
}

module.exports = { generateCoverLetterSection };
