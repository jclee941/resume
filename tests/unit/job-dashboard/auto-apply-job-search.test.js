// Regression: auto-apply searched Wanted with searchJobs(keyword, options), but
// WantedAPI.searchJobs takes a filter object, so every Wanted search ignored the keyword.
describe('auto-apply platform keyword search', () => {
  let searchPlatformJobs;
  let createSearchResults;

  beforeAll(async () => {
    ({ searchPlatformJobs } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/job-search.js'));
    ({ createSearchResults } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/job-selection.js'));
  });

  test('searches Wanted by keyword through searchByKeyword', async () => {
    const wanted = {
      searchJobs: jest.fn(async () => ({ jobs: [] })),
      searchByKeyword: jest.fn(async () => ({
        jobs: [{ id: 1, company: 'Acme', position: 'SRE' }],
      })),
    };

    const jobs = await searchPlatformJobs({
      clients: { wanted },
      activePlatforms: ['wanted'],
      searchKeywords: ['SRE'],
      searchResults: createSearchResults(),
      profile: {},
    });

    expect(wanted.searchByKeyword).toHaveBeenCalledWith('SRE', { limit: 20 });
    expect(wanted.searchJobs).not.toHaveBeenCalled();
    expect(jobs).toEqual([expect.objectContaining({ id: 1, source: 'wanted', keyword: 'SRE' })]);
  });

  test('passes the keyword and matching profile to (keyword, options) clients', async () => {
    const cliproxy = { searchJobs: jest.fn(async () => ({ jobs: [] })) };
    const profile = { skills: ['security'] };

    await searchPlatformJobs({
      clients: { cliproxy },
      activePlatforms: ['cliproxy'],
      searchKeywords: ['DevOps'],
      searchResults: createSearchResults(),
      profile,
    });

    expect(cliproxy.searchJobs).toHaveBeenCalledWith('DevOps', { limit: 20, profile });
  });
});
