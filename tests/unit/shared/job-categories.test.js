describe('@resume/shared/job-categories', () => {
  let mod;

  beforeAll(async () => {
    mod = await import('@resume/shared/job-categories');
  });

  describe('JOB_CATEGORY_MAPPING', () => {
    test('exports a non-empty object', () => {
      expect(typeof mod.JOB_CATEGORY_MAPPING).toBe('object');
      expect(mod.JOB_CATEGORY_MAPPING).not.toBeNull();
      expect(Object.keys(mod.JOB_CATEGORY_MAPPING).length).toBeGreaterThan(0);
    });

    test('maps security roles to category 672', () => {
      expect(mod.JOB_CATEGORY_MAPPING['보안운영 담당']).toBe(672);
      expect(mod.JOB_CATEGORY_MAPPING['보안 엔지니어']).toBe(672);
      expect(mod.JOB_CATEGORY_MAPPING['보안엔지니어']).toBe(672);
      expect(mod.JOB_CATEGORY_MAPPING['정보보안']).toBe(672);
      expect(mod.JOB_CATEGORY_MAPPING['정보보호팀']).toBe(672);
      expect(mod.JOB_CATEGORY_MAPPING['보안구축담당']).toBe(672);
    });

    test('maps infra/DevOps roles to category 674', () => {
      expect(mod.JOB_CATEGORY_MAPPING['인프라 엔지니어']).toBe(674);
      expect(mod.JOB_CATEGORY_MAPPING['인프라 담당']).toBe(674);
      expect(mod.JOB_CATEGORY_MAPPING['DevOps']).toBe(674);
      expect(mod.JOB_CATEGORY_MAPPING['SRE']).toBe(674);
      expect(mod.JOB_CATEGORY_MAPPING['SRE Engineer']).toBe(674);
      expect(mod.JOB_CATEGORY_MAPPING['클라우드 엔지니어']).toBe(674);
    });

    test('maps system/network roles to category 665', () => {
      expect(mod.JOB_CATEGORY_MAPPING['시스템 엔지니어']).toBe(665);
      expect(mod.JOB_CATEGORY_MAPPING['네트워크 엔지니어']).toBe(665);
      expect(mod.JOB_CATEGORY_MAPPING['IT지원/OA운영']).toBe(665);
      expect(mod.JOB_CATEGORY_MAPPING['IT 운영']).toBe(665);
    });

    test('maps backend dev roles to category 872', () => {
      expect(mod.JOB_CATEGORY_MAPPING['Backend Developer']).toBe(872);
      expect(mod.JOB_CATEGORY_MAPPING['백엔드 개발자']).toBe(872);
      expect(mod.JOB_CATEGORY_MAPPING['서버 개발자']).toBe(872);
    });

    test('all values are positive integers', () => {
      for (const [, id] of Object.entries(mod.JOB_CATEGORY_MAPPING)) {
        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThan(0);
      }
    });

    test('returns undefined for unmapped roles', () => {
      expect(mod.JOB_CATEGORY_MAPPING['프론트엔드 개발자']).toBeUndefined();
      expect(mod.JOB_CATEGORY_MAPPING['Designer']).toBeUndefined();
    });
  });

  describe('DEFAULT_JOB_CATEGORY', () => {
    test('equals 674 (infra/DevOps)', () => {
      expect(mod.DEFAULT_JOB_CATEGORY).toBe(674);
    });

    test('matches a valid category in the mapping', () => {
      const values = Object.values(mod.JOB_CATEGORY_MAPPING);
      expect(values).toContain(mod.DEFAULT_JOB_CATEGORY);
    });
  });
});
