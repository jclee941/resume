/**
 * Unit tests for apps/portfolio/lib/cards/cover-letter — the build-time HTML
 * renderer that turns the SSoT `coverLetter` asset into a first-class visual
 * section on the scrollable portfolio page.
 *
 * Asserts against the real SSoT data (zero fabricated fixtures) so any content
 * drift is caught. The renderer must emit ESCAPED HTML (unlike the plain-text
 * terminal formatter) and must NEVER fabricate copy.
 */

const { generateCoverLetterSection } = require('../../../../apps/portfolio/lib/cards/cover-letter');

const ssot = require('../../../../packages/data/resumes/master/resume_data.json');
const coverLetter = ssot.coverLetter;

describe('generateCoverLetterSection', () => {
  // The visual renderer is HTML, so SSoT copy is HTML-ESCAPED (unlike the
  // plain-text terminal formatter which emits verbatim). We assert the escaped
  // forms are present and ordered.
  const esc = require('../../../../apps/portfolio/lib/template-sanitizer').escapeHtml;

  test('S1 (happy): KO entry renders escaped headline, every paragraph, and closing', () => {
    const ko = coverLetter.ko;
    const html = generateCoverLetterSection(ko);

    expect(typeof html).toBe('string');
    expect(html).toContain(esc(ko.headline));
    ko.paragraphs.forEach((p) => {
      expect(html).toContain(esc(p));
    });
    expect(html).toContain(esc(ko.closing));

    // Order: headline before first paragraph before closing.
    expect(html.indexOf(esc(ko.headline))).toBeLessThan(html.indexOf(esc(ko.paragraphs[0])));
    expect(html.indexOf(esc(ko.paragraphs[0]))).toBeLessThan(html.indexOf(esc(ko.closing)));
  });

  test('S1 (happy): output is HTML with the expected structural hooks', () => {
    const html = generateCoverLetterSection(coverLetter.ko);
    // Card container + headline + paragraph rail nodes + closing.
    expect(html).toMatch(/class="cover-letter-card"/);
    expect(html).toMatch(/class="cover-letter__headline"/);
    expect(html).toMatch(/class="cover-letter__paragraphs"/);
    expect(html).toMatch(/class="cover-letter__closing"/);
  });

  test('S1 (happy): renders one numbered rail marker per paragraph', () => {
    const ko = coverLetter.ko;
    const html = generateCoverLetterSection(ko);
    const markers = html.match(/class="cover-letter__index"/g) || [];
    expect(markers.length).toBe(ko.paragraphs.length);
  });

  test('S3 (locale): EN entry renders the English copy, not the KO copy', () => {
    const html = generateCoverLetterSection(coverLetter.en);
    expect(html).toContain(coverLetter.en.headline);
    expect(html).not.toContain(coverLetter.ko.headline);
  });

  test('S3 (locale): JA entry renders the Japanese copy, not the KO copy', () => {
    const html = generateCoverLetterSection(coverLetter.ja);
    expect(html).toContain(coverLetter.ja.headline);
    expect(html).not.toContain(coverLetter.ko.headline);
  });

  test('S3 (locale): keeps Japanese katakana phrases atomic without changing their text', () => {
    const entry = {
      headline: '見出し',
      paragraphs: ['(株)ガオンヌリでセキュリティ基盤を担当'],
      closing: '以上',
    };

    const html = generateCoverLetterSection(entry);

    expect(html).toContain('<span class="cover-letter__atomic-phrase">(株)ガオンヌリ</span>');
    expect(html).toContain('<span class="cover-letter__atomic-phrase">セキュリティ</span>');
    expect(html.replace(/<[^>]+>/g, '')).toContain(entry.paragraphs[0]);
  });

  test('S2 (edge): null/empty/malformed entry returns empty string, never throws', () => {
    expect(() => generateCoverLetterSection(null)).not.toThrow();
    expect(generateCoverLetterSection(null)).toBe('');
    expect(generateCoverLetterSection({})).toBe('');
    expect(generateCoverLetterSection({ headline: 'x' })).toBe('');
    expect(generateCoverLetterSection({ headline: 'x', paragraphs: [], closing: '' })).toBe('');
  });

  test('S4 (regression/XSS): HTML-bearing copy is escaped, no live markup injected', () => {
    const malicious = {
      headline: 'Hi <img src=x onerror=alert(1)>',
      paragraphs: ['<script>alert(2)</script>', 'plain & safe'],
      closing: 'bye </div><script>alert(3)</script>',
    };
    const html = generateCoverLetterSection(malicious);
    // No raw executable markup from the data survives.
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).not.toContain('<script>alert(3)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    // Escaped forms are present instead.
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; safe');
  });

  test('S4 (no fabrication): renderer adds no copy beyond SSoT text + structural chrome', () => {
    const entry = {
      headline: 'HEAD_TOKEN',
      paragraphs: ['PARA_TOKEN_ONE', 'PARA_TOKEN_TWO'],
      closing: 'CLOSE_TOKEN',
    };
    const html = generateCoverLetterSection(entry);
    // Strip all tags; remaining visible text must only be our tokens + numeric rail labels.
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&gt;|&lt;|&amp;|&#39;|&quot;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toContain('HEAD_TOKEN');
    expect(text).toContain('PARA_TOKEN_ONE');
    expect(text).toContain('PARA_TOKEN_TWO');
    expect(text).toContain('CLOSE_TOKEN');
    // No invented marketing words leaked in (sample of forbidden fabrications).
    expect(text.toLowerCase()).not.toContain('lorem');
  });
});
