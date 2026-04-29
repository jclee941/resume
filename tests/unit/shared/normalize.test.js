// Coverage tests for @resume/shared/normalize.
// Closes the 0% coverage gap flagged in tech-debt audit 2026-04-29.

describe('@resume/shared/normalize', () => {
  let normalize;

  beforeAll(async () => {
    normalize = await import('../../../packages/shared/src/normalize/index.js');
  });

  describe('normalizeCompanyName — Korean corporation prefix/suffix stripping', () => {
    test('strips "(주)" prefix', () => {
      expect(normalize.normalizeCompanyName('(주)아이티센 CTS')).toBe('아이티센 CTS');
    });

    test('strips "(주)" suffix', () => {
      expect(normalize.normalizeCompanyName('아이티센 CTS(주)')).toBe('아이티센 CTS');
    });

    test('strips multiple "(주)" occurrences', () => {
      expect(normalize.normalizeCompanyName('(주)Acme(주)Corp(주)')).toBe('AcmeCorp');
    });

    test('strips "주식회사" prefix', () => {
      expect(normalize.normalizeCompanyName('주식회사 ITCEN')).toBe('ITCEN');
    });

    test('strips "주식회사" suffix', () => {
      expect(normalize.normalizeCompanyName('ITCEN 주식회사')).toBe('ITCEN');
    });

    test('strips both forms when present', () => {
      expect(normalize.normalizeCompanyName('(주)주식회사 LG')).toBe('LG');
    });

    test('trims whitespace after stripping', () => {
      expect(normalize.normalizeCompanyName('  (주)아이티센 CTS  ')).toBe('아이티센 CTS');
    });

    test('passes through company names without Korean corporation tokens', () => {
      expect(normalize.normalizeCompanyName('Acme Corp')).toBe('Acme Corp');
      expect(normalize.normalizeCompanyName('LG Electronics')).toBe('LG Electronics');
    });

    test('returns empty string for null', () => {
      expect(normalize.normalizeCompanyName(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(normalize.normalizeCompanyName(undefined)).toBe('');
    });

    test('returns empty string for empty string', () => {
      expect(normalize.normalizeCompanyName('')).toBe('');
    });

    test('coerces non-string input via String()', () => {
      expect(normalize.normalizeCompanyName(12345)).toBe('12345');
      expect(normalize.normalizeCompanyName(true)).toBe('true');
    });

    test('preserves internal whitespace', () => {
      expect(normalize.normalizeCompanyName('(주)아이티센    CTS    Korea')).toBe(
        '아이티센    CTS    Korea'
      );
    });

    test('handles real SSoT career data shapes', () => {
      // Sample from packages/data/resumes/master/resume_data.json careers
      const samples = [
        ['(주)아이티센 CTS', '아이티센 CTS'],
        ['(주)가온누리정보시스템', '가온누리정보시스템'],
        ['(주)콴텍투자일임', '콴텍투자일임'],
        ['(주)펀엔씨', '펀엔씨'],
        ['(주)조인트리', '조인트리'],
        ['(주)메타넷엠플랫폼', '메타넷엠플랫폼'],
        ['(주)엠티데이타', '엠티데이타'],
      ];
      for (const [input, expected] of samples) {
        expect(normalize.normalizeCompanyName(input)).toBe(expected);
      }
    });
  });
});
