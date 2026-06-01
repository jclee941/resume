/**
 * Unit tests for apps/portfolio/lib/cover-letter-formatter.
 *
 * Pure, locale-aware plain-text formatter that renders the SSoT `coverLetter`
 * asset for the terminal `coverletter`/`cl` command. Asserts against the real
 * SSoT data (zero fabricated fixtures) so any drift is caught.
 */

const { formatCoverLetter } = require('../../../../apps/portfolio/lib/cover-letter-formatter');

const ssot = require('../../../../packages/data/resumes/master/resume_data.json');
const coverLetter = ssot.coverLetter;

describe('formatCoverLetter', () => {
  test('S2: KO output contains headline, every paragraph, and closing in order', () => {
    const ko = coverLetter.ko;
    const out = formatCoverLetter(coverLetter, 'ko');

    expect(typeof out).toBe('string');
    expect(out).toContain(ko.headline);
    ko.paragraphs.forEach((p) => {
      expect(out).toContain(p);
    });
    expect(out).toContain(ko.closing);

    // Order: headline before first paragraph before closing.
    expect(out.indexOf(ko.headline)).toBeLessThan(out.indexOf(ko.paragraphs[0]));
    expect(out.indexOf(ko.paragraphs[0])).toBeLessThan(out.indexOf(ko.closing));
  });

  test('S2: output is plain text (no HTML tags)', () => {
    const out = formatCoverLetter(coverLetter, 'ko');
    expect(out).not.toMatch(/<[^>]+>/);
  });

  test('S3: EN locale selects the English headline', () => {
    const out = formatCoverLetter(coverLetter, 'en');
    expect(out).toContain(coverLetter.en.headline);
    expect(out).not.toContain(coverLetter.ko.headline);
  });

  test('S3: JA locale selects the Japanese headline', () => {
    const out = formatCoverLetter(coverLetter, 'ja');
    expect(out).toContain(coverLetter.ja.headline);
    expect(out).not.toContain(coverLetter.ko.headline);
  });

  test('S3: unknown locale falls back to KO', () => {
    const out = formatCoverLetter(coverLetter, 'fr');
    expect(out).toContain(coverLetter.ko.headline);
  });

  test('S3: locale tags like "en-US" normalize to "en"', () => {
    const out = formatCoverLetter(coverLetter, 'en-US');
    expect(out).toContain(coverLetter.en.headline);
  });

  test('S3: missing lang argument defaults to KO', () => {
    const out = formatCoverLetter(coverLetter);
    expect(out).toContain(coverLetter.ko.headline);
  });

  test('S4: null data returns a friendly unavailable message without throwing', () => {
    expect(() => formatCoverLetter(null, 'ko')).not.toThrow();
    expect(formatCoverLetter(null, 'ko').toLowerCase()).toContain('cover letter unavailable');
  });

  test('S4: empty object returns a friendly unavailable message', () => {
    expect(formatCoverLetter({}, 'ko').toLowerCase()).toContain('cover letter unavailable');
  });

  test('S4: locale entry missing required fields falls back, else unavailable', () => {
    // Only a malformed ko entry present -> no valid locale -> unavailable.
    const malformed = { ko: { headline: 'x' } };
    expect(() => formatCoverLetter(malformed, 'ko')).not.toThrow();
    expect(formatCoverLetter(malformed, 'ko').toLowerCase()).toContain(
      'cover letter unavailable'
    );
  });

  test('S4: when requested locale absent, falls back to KO then first valid', () => {
    const koOnly = { ko: coverLetter.ko };
    const out = formatCoverLetter(koOnly, 'en');
    expect(out).toContain(coverLetter.ko.headline);

    const enOnly = { en: coverLetter.en };
    const out2 = formatCoverLetter(enOnly, 'ja');
    expect(out2).toContain(coverLetter.en.headline);
  });
});
