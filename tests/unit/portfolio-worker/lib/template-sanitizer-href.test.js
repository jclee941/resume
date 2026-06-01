/**
 * Characterization tests for sanitizeHref() — the XSS-critical URL boundary in
 * apps/portfolio/lib/template-sanitizer.js. The function is exported but was
 * previously untested. These pin its current (correct) behavior so future edits
 * cannot silently regress the security boundary.
 */

const { sanitizeHref } = require('../../../../apps/portfolio/lib/template-sanitizer');

describe('sanitizeHref()', () => {
  describe('blocks dangerous / malformed input (returns empty string)', () => {
    const blocked = [
      ['javascript: protocol', 'javascript:alert(1)'],
      ['JavaScript mixed case', 'JaVaScRiPt:alert(1)'],
      ['data: protocol', 'data:text/html,<script>alert(1)</script>'],
      ['vbscript: protocol', 'vbscript:msgbox(1)'],
      ['protocol-relative URL', '//evil.com/path'],
      ['null-byte smuggling', 'https://x\u0000.com'],
      ['tab/newline smuggling', 'java\tscript:alert(1)'],
      ['ftp (non-allowlisted) protocol', 'ftp://host/file'],
      ['non-string (number)', 12345],
      ['non-string (null)', null],
      ['empty string', ''],
      ['whitespace only', '   '],
    ];
    test.each(blocked)('%s -> ""', (_label, input) => {
      expect(sanitizeHref(input)).toBe('');
    });
  });

  describe('allows safe URLs (returns the url unchanged)', () => {
    const allowed = [
      ['absolute root path', '/resume.pdf'],
      ['dot-relative path', './section'],
      ['hash anchor', '#contact'],
      ['https url', 'https://resume.jclee.me/'],
      ['http url', 'http://example.com/'],
      ['mailto', 'mailto:qws941@kakao.com'],
      ['tel', 'tel:01012345678'],
    ];
    test.each(allowed)('%s -> unchanged', (_label, input) => {
      expect(sanitizeHref(input)).toBe(input);
    });
  });
});
