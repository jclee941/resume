// Regression: selectMatchedJobs used to pass search keywords as the scoring config,
// which calculateMatchScore ignores, so discovered jobs without a provider score
// never reached the threshold.
describe('auto-apply job selection scoring', () => {
  let selectMatchedJobs;
  let createSearchResults;
  let profile;

  beforeAll(async () => {
    ({ selectMatchedJobs, createSearchResults } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/job-selection.js'));
    ({ DEFAULT_MATCHING_CONFIG: profile } =
      await import('../../../apps/job-dashboard/src/workflows/application/matching-config.js'));
  });

  function select(allJobs) {
    const searchResults = createSearchResults();
    const matched = selectMatchedJobs({ allJobs, profile, minScore: 60, searchResults });
    return { matched, searchResults };
  }

  test('scores unscored discovery results against the matching profile', () => {
    const { matched, searchResults } = select([
      {
        id: 'security-lead',
        company: 'Enterprise Co',
        position: 'Security Engineer',
        description: '보안 security devops cloud linux automation siem terraform',
        experience: '7~10년',
        location: '서울',
      },
      { id: 'unrelated', company: 'Other Co', position: 'Pastry Chef', description: 'baking' },
    ]);

    expect(matched.map((job) => job.id)).toEqual(['security-lead']);
    expect(matched[0].matchScore).toBeGreaterThanOrEqual(60);
    expect(searchResults).toMatchObject({ searched: 2, matched: 1 });
  });

  test('keeps a provider-supplied matchScore', () => {
    const { matched } = select([{ id: 'scored', company: 'X', position: 'Y', matchScore: 90 }]);

    expect(matched.map((job) => job.matchScore)).toEqual([90]);
  });
});
