describe('Application Workflow matching config', () => {
  let calculateMatchScore;
  let getMatchingConfig;
  let requiresDegree;

  beforeAll(async () => {
    ({ getMatchingConfig } =
      await import('../../../apps/job-dashboard/src/workflows/application/profile.js'));
    ({ calculateMatchScore, requiresDegree } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/match-scoring.js'));
  });

  test('uses a complete scoring profile and review threshold when D1 has no config', async () => {
    const config = await getMatchingConfig(createContext([]));

    expect(config.minMatchScore).toBe(60);
    expect(config.experienceYears).toBeGreaterThan(0);
    expect(config.skills).toEqual(expect.arrayContaining(['security', '보안', 'firewall', 'siem']));
    expect(config.skills).not.toContain('devops');
    expect(config.excludeTitleKeywords).toEqual(
      expect.arrayContaining(['lead', 'devops', 'sre', 'isms'])
    );
    expect(config.excludeDegreeRequired).toBe(true);
    expect(config.preferredLocations).toContain('서울');
  });

  test('reads the normalized review threshold from separate D1 config rows', async () => {
    const config = await getMatchingConfig(
      createContext([{ key: 'min_match_score', value: '65' }])
    );

    expect(config.minMatchScore).toBe(65);
    expect(config.skills.length).toBeGreaterThan(0);
  });

  test('scores a strong security infrastructure posting at review level', async () => {
    const config = await getMatchingConfig(createContext([]));
    const score = calculateMatchScore(
      {
        position: 'Security Infrastructure Engineer 5-10년',
        description: 'Security firewall FortiGate Splunk SIEM linux automation',
        company: 'Example',
        location: '서울',
        postedAt: new Date().toISOString(),
      },
      config
    );

    expect(score).toBeGreaterThanOrEqual(60);
  });

  test('counts the Korean names of the skills in a Korean posting', async () => {
    const config = await getMatchingConfig(createContext([]));
    const score = calculateMatchScore(
      {
        position: '정보보안 엔지니어 (5년 이상)',
        description: '방화벽 정책 운영, 리눅스 서버 점검, 보안관제 자동화, Splunk',
        company: 'Example',
        location: '서울',
      },
      config
    );

    expect(score).toBeGreaterThanOrEqual(60);
  });

  test('excludes lead, manager, DevOps/SRE and in-house compliance titles', async () => {
    const config = await getMatchingConfig(createContext([]));
    const score = (position) =>
      calculateMatchScore(
        { position, description: 'security firewall siem linux', company: 'Example' },
        config
      );

    for (const position of [
      'Security Lead',
      '보안 리드 (Security Lead)',
      'Cybersecurity Engineering Manager',
      'DevOps 엔지니어',
      'SRE Engineer',
      'DevSecOps 엔지니어',
      '정보보호 및 보안 담당자',
      'ISMS-P 인증 담당자',
      '클라우드보안 과차장급',
    ]) {
      expect(score(position)).toBe(0);
    }
    expect(score('정보보안 엔지니어')).toBeGreaterThan(0);
  });

  test('skips postings that require a bachelor degree unless the text waives it', async () => {
    for (const text of [
      '자격요건: 학사 이상, 보안 경력 5년',
      '4년제 대학 졸업자',
      "Bachelor's degree in Computer Science",
    ]) {
      expect(requiresDegree(text)).toBe(true);
    }
    for (const text of [
      '학력무관',
      '학사 이상 또는 동등 경력',
      '학사 이상 우대',
      '고등학교 졸업 이상',
      '',
    ]) {
      expect(requiresDegree(text)).toBe(false);
    }

    const config = await getMatchingConfig(createContext([]));
    const job = {
      position: '정보보안 엔지니어',
      description: '학사 이상, 방화벽 운영',
      company: 'Example',
    };
    expect(calculateMatchScore(job, config)).toBe(0);
    expect(calculateMatchScore(job, { ...config, excludeDegreeRequired: false })).toBeGreaterThan(
      0
    );
  });

  test('keeps a mandatory degree even when a separate clause prefers a masters', () => {
    for (const text of [
      '학사 이상 필수, 석사 이상 우대',
      '학사 이상 필수 (석사 이상 우대)',
      '학사 이상 필수 및 석사 이상 우대',
      '학사 이상 필수 석사 이상 우대',
      '학사 이상 필수, 동등한 처우 보장',
      '자격요건: 학사 이상\n우대사항: 석사 이상 우대',
    ]) {
      expect(requiresDegree(text)).toBe(true);
    }
    for (const text of [
      '석사 이상 우대',
      '학사 이상 우대, 관련 자격증 우대',
      '학사 이상 또는 동등 경력, 석사 우대',
    ]) {
      expect(requiresDegree(text)).toBe(false);
    }
  });

  test('honors a parenthetical equivalent-experience waiver only for its own degree', () => {
    for (const text of [
      '학사 이상 (또는 동등 경력)',
      "Bachelor's degree (or equivalent experience)",
      '학사 이상 (동등 경력 인정), 석사 우대',
    ]) {
      expect(requiresDegree(text)).toBe(false);
    }
    for (const text of [
      '학사 이상 필수 (동등한 처우 보장)',
      "Bachelor's degree (Seoul office, equal pay)",
      '학사 이상 필수 (석사 이상 우대), 동등 경력 우대 직무 별도',
    ]) {
      expect(requiresDegree(text)).toBe(true);
    }
  });

  test('ignores company or project age when scoring experience', () => {
    const base = { position: '보안 엔지니어', description: '', company: 'Example' };
    const config = { experienceYears: 8 };
    const score = (description, extra = {}) =>
      calculateMatchScore({ ...base, description, ...extra }, config);
    const none = score('보안 엔지니어 채용');

    expect(score('설립 8년차 스타트업')).toBe(none);
    expect(score('창립 8년, 서비스 운영 8년차')).toBe(none);
    expect(score('8년의 업력을 가진 회사')).toBe(none);
    expect(score('Founded 8 years ago')).toBe(none);
    expect(score('설립 8년차 스타트업, 경력 8년 이상')).toBe(none + 15);
    expect(score('', { experience: '8년' })).toBe(none + 15);
    expect(score('Experience: 6-10 years')).toBe(none + 15);
    for (const text of [
      '매년 8년 연속 수상',
      '8년 장기근속 포상',
      '8년간 투자 유치',
      '설립 8년 이상',
    ]) {
      expect(score(text)).toBe(none);
    }
    expect(score('경력 8년')).toBe(none + 15);
    expect(score('8년 이상의 경력자')).toBe(none + 15);
    expect(score('', { experience: '5-10' })).toBe(none + 15);
    expect(score('', { experience: 8 })).toBe(none + 15);
    expect(score('5년차 이상 엔지니어')).toBeLessThan(none + 15);
  });

  test('reads exclusion overrides from the stored auto_apply_config', async () => {
    const stored = { excludeTitleKeywords: ['intern'], excludeDegreeRequired: false };
    const config = await getMatchingConfig(
      createContext([{ key: 'auto_apply_config', value: JSON.stringify(stored) }])
    );

    expect(config.excludeTitleKeywords).toEqual(['intern']);
    expect(config.excludeDegreeRequired).toBe(false);
  });

  test('counts a skill listed under two names once', () => {
    const job = { position: '보안 엔지니어', description: '', company: 'Example' };

    expect(calculateMatchScore(job, { skills: ['보안', 'security'] })).toBe(
      calculateMatchScore(job, { skills: ['보안'] })
    );
  });
});

function createContext(rows) {
  return {
    env: {
      JOB_DB: {
        prepare() {
          return {
            async first() {
              return rows.find((row) => row.key === 'auto_apply_config') || null;
            },
            async all() {
              return { results: rows };
            },
          };
        },
      },
    },
  };
}
