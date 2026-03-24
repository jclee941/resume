describe('@resume/shared/ua', () => {
  let mod;

  beforeAll(async () => {
    mod = await import('@resume/shared/ua');
  });

  describe('CHROME_USER_AGENTS', () => {
    test('exports an array of 12 Chrome UA strings', () => {
      expect(Array.isArray(mod.CHROME_USER_AGENTS)).toBe(true);
      expect(mod.CHROME_USER_AGENTS).toHaveLength(12);
    });

    test('every entry is a Chrome UA string', () => {
      for (const ua of mod.CHROME_USER_AGENTS) {
        expect(typeof ua).toBe('string');
        expect(ua).toMatch(/Chrome\/\d+/);
        expect(ua).toMatch(/^Mozilla\/5\.0/);
      }
    });

    test('covers Windows, Mac, and Linux platforms', () => {
      const joined = mod.CHROME_USER_AGENTS.join('\n');
      expect(joined).toContain('Windows NT');
      expect(joined).toContain('Macintosh');
      expect(joined).toContain('Linux');
    });

    test('covers Chrome versions 128-131', () => {
      const versions = mod.CHROME_USER_AGENTS.map((ua) => {
        const m = ua.match(/Chrome\/(\d+)\./);
        return m ? Number(m[1]) : null;
      });
      expect(versions.every((v) => v !== null)).toBe(true);
      expect(Math.min(...versions)).toBe(128);
      expect(Math.max(...versions)).toBe(131);
    });
  });

  describe('getRandomUA()', () => {
    test('returns a string from the pool', () => {
      const result = mod.getRandomUA();
      expect(typeof result).toBe('string');
      expect(mod.CHROME_USER_AGENTS).toContain(result);
    });

    test('multiple calls produce valid pool members (not always same)', () => {
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        const ua = mod.getRandomUA();
        expect(mod.CHROME_USER_AGENTS).toContain(ua);
        results.add(ua);
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('DEFAULT_USER_AGENT', () => {
    test('is a specific Chrome 131 Mac UA string', () => {
      expect(typeof mod.DEFAULT_USER_AGENT).toBe('string');
      expect(mod.DEFAULT_USER_AGENT).toContain('Chrome/131');
      expect(mod.DEFAULT_USER_AGENT).toContain('Macintosh');
    });

    test('is distinct from the pool (deterministic, not rotated)', () => {
      expect(mod.DEFAULT_USER_AGENT).toContain('Mac OS X 10_15_7');
    });
  });
});
