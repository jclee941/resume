describe('@resume/shared/phone', () => {
  let mod;

  beforeAll(async () => {
    mod = await import('@resume/shared/phone');
  });

  describe('toE164()', () => {
    test('converts local 010 format to E.164', () => {
      expect(mod.toE164('01012345678')).toBe('+821012345678');
    });

    test('converts hyphenated local format to E.164', () => {
      expect(mod.toE164('010-1234-5678')).toBe('+821012345678');
    });

    test('converts local format with spaces to E.164', () => {
      expect(mod.toE164('010 1234 5678')).toBe('+821012345678');
    });

    test('adds + prefix to bare 82 country code', () => {
      expect(mod.toE164('821012345678')).toBe('+821012345678');
    });

    test('handles already-E.164 format (strips + then re-adds)', () => {
      expect(mod.toE164('+821012345678')).toBe('+821012345678');
    });

    test('passes through non-Korean numbers unchanged', () => {
      expect(mod.toE164('12345')).toBe('12345');
      expect(mod.toE164('+14155551234')).toBe('+14155551234');
    });

    test('returns empty string for falsy input', () => {
      expect(mod.toE164('')).toBe('');
      expect(mod.toE164(null)).toBe('');
      expect(mod.toE164(undefined)).toBe('');
    });

    test('handles landline numbers starting with 0', () => {
      expect(mod.toE164('0212345678')).toBe('+82212345678');
    });
  });

  describe('normalizePhone()', () => {
    test('is an alias for toE164', () => {
      expect(mod.normalizePhone('01012345678')).toBe('+821012345678');
      expect(mod.normalizePhone('')).toBe('');
      expect(mod.normalizePhone(null)).toBe('');
    });
  });

  describe('toKoreanPhone()', () => {
    test('converts E.164 to local hyphenated format', () => {
      expect(mod.toKoreanPhone('+821012345678')).toBe('010-1234-5678');
    });

    test('formats already-local 11-digit number', () => {
      expect(mod.toKoreanPhone('01012345678')).toBe('010-1234-5678');
    });

    test('formats hyphenated input by re-normalizing', () => {
      expect(mod.toKoreanPhone('010-1234-5678')).toBe('010-1234-5678');
    });

    test('returns raw digits for non-11-digit input', () => {
      expect(mod.toKoreanPhone('0212345678')).toBe('0212345678');
    });

    test('returns digits without +82 prefix for bare country code', () => {
      expect(mod.toKoreanPhone('821012345678')).toBe('821012345678');
    });

    test('returns empty string for falsy input', () => {
      expect(mod.toKoreanPhone('')).toBe('');
      expect(mod.toKoreanPhone(null)).toBe('');
      expect(mod.toKoreanPhone(undefined)).toBe('');
    });
  });
});
