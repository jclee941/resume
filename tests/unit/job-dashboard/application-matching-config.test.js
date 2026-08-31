describe('Application Workflow matching config', () => {
  let calculateMatchScore;
  let getMatchingConfig;

  beforeAll(async () => {
    ({ getMatchingConfig } =
      await import('../../../apps/job-dashboard/src/workflows/application/profile.js'));
    ({ calculateMatchScore } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/match-scoring.js'));
  });

  test('uses a complete scoring profile and review threshold when D1 has no config', async () => {
    const config = await getMatchingConfig(createContext([]));

    expect(config.minMatchScore).toBe(60);
    expect(config.experienceYears).toBeGreaterThan(0);
    expect(config.skills).toEqual(expect.arrayContaining(['security', '보안', 'devops']));
    expect(config.preferredLocations).toContain('서울');
  });

  test('reads the normalized review threshold from separate D1 config rows', async () => {
    const config = await getMatchingConfig(
      createContext([{ key: 'min_match_score', value: '65' }])
    );

    expect(config.minMatchScore).toBe(65);
    expect(config.skills.length).toBeGreaterThan(0);
  });

  test('scores a strong security and DevSecOps posting at review level', async () => {
    const config = await getMatchingConfig(createContext([]));
    const score = calculateMatchScore(
      {
        position: 'Cloud Infrastructure DevSecOps Security Engineer 5-10년',
        description: 'Security SIEM cloud Terraform automation',
        company: 'Example',
        location: '서울',
        postedAt: new Date().toISOString(),
      },
      config
    );

    expect(score).toBeGreaterThanOrEqual(60);
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
