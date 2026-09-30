// Coverage tests for @resume/shared/normalize.
// Closes the 0% coverage gap flagged in tech-debt audit 2026-04-29.
const { loadMaster } = require('../../helpers/owner-data');

describe('@resume/shared/normalize', () => {
  let normalize;
  let jobCategories;

  beforeAll(async () => {
    normalize = await import('../../../packages/shared/src/normalize/index.js');
    jobCategories = await import('../../../packages/shared/src/job-categories.js');
  });

  describe('normalizeCompanyName — Korean corporation prefix/suffix stripping', () => {
    test('strips "(주)" prefix', () => {
      expect(normalize.normalizeCompanyName('(주)예시회사 ABC')).toBe('예시회사 ABC');
    });

    test('strips "(주)" suffix', () => {
      expect(normalize.normalizeCompanyName('예시회사 ABC(주)')).toBe('예시회사 ABC');
    });

    test('strips multiple "(주)" occurrences', () => {
      expect(normalize.normalizeCompanyName('(주)Acme(주)Corp(주)')).toBe('AcmeCorp');
    });

    test('strips "주식회사" prefix', () => {
      expect(normalize.normalizeCompanyName('주식회사 EXAMPLE')).toBe('EXAMPLE');
    });

    test('strips "주식회사" suffix', () => {
      expect(normalize.normalizeCompanyName('EXAMPLE 주식회사')).toBe('EXAMPLE');
    });

    test('strips both forms when present', () => {
      expect(normalize.normalizeCompanyName('(주)주식회사 LG')).toBe('LG');
    });

    test('trims whitespace after stripping', () => {
      expect(normalize.normalizeCompanyName('  (주)예시회사 ABC  ')).toBe('예시회사 ABC');
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
      expect(normalize.normalizeCompanyName('(주)예시회사    ABC    Korea')).toBe(
        '예시회사    ABC    Korea'
      );
    });

    test('handles real SSoT career data shapes', () => {
      // Every company in packages/data/resumes/master/resume_data*.json careers
      const companies = ['ko', 'en', 'ja'].flatMap((locale) =>
        loadMaster(locale).careers.map((career) => career.company)
      );
      expect(companies.length).toBeGreaterThan(0);
      for (const company of companies) {
        const normalized = normalize.normalizeCompanyName(company);
        expect(normalized).toBe(company.replace(/\(주\)|주식회사/g, '').trim());
        expect(normalized).not.toMatch(/\(주\)|주식회사/);
        expect(normalized.length).toBeGreaterThan(0);
      }
    });
  });

  describe('career platform field normalization', () => {
    test('normalizeEducationStatus removes whitespace and handles non-string input safely', () => {
      expect(normalize.normalizeEducationStatus('재학 중')).toBe('재학중');
      expect(normalize.normalizeEducationStatus('재학중')).toBe('재학중');
      expect(normalize.normalizeEducationStatus(' 재학\t중 ')).toBe('재학중');
      expect(normalize.normalizeEducationStatus('졸업')).toBe('졸업');
      expect(normalize.normalizeEducationStatus(undefined)).toBe('');
      expect(normalize.normalizeEducationStatus(null)).toBe('');
    });

    test('normalizeCareerRole maps compact Korean security-ops roles to platform label', () => {
      expect(normalize.normalizeCareerRole('보안운영 담당')).toBe('보안 운영');
      expect(normalize.normalizeCareerRole('보안운영')).toBe('보안 운영');
      expect(normalize.normalizeCareerRole('보안 운영 담당')).toBe('보안 운영');
      expect(normalize.normalizeCareerRole('보안 운영 엔지니어')).toBe('보안 운영 엔지니어');
    });

    test('resolveJobCategoryId preserves security category across role normalization', () => {
      expect(jobCategories.resolveJobCategoryId('보안운영 담당')).toBe(672);
      expect(jobCategories.resolveJobCategoryId('보안 운영')).toBe(672);
      expect(jobCategories.hasJobCategoryMapping('보안운영 담당')).toBe(true);
    });

    test('normalizeWorkTypeForProfile removes dispatch annotation from full-time labels', () => {
      expect(normalize.normalizeWorkTypeForProfile('정규직 (파견)')).toBe('정규직');
      expect(normalize.normalizeWorkTypeForProfile('정규직(파견)')).toBe('정규직');
      expect(normalize.normalizeWorkTypeForProfile('프리랜서')).toBe('프리랜서');
    });
  });
});
