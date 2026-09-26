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
    });

    expect(wanted.searchByKeyword).toHaveBeenCalledWith('SRE', { limit: 20 });
    expect(wanted.searchJobs).not.toHaveBeenCalled();
    expect(jobs).toEqual([expect.objectContaining({ id: 1, source: 'wanted', keyword: 'SRE' })]);
  });

  test('passes the keyword and limit to (keyword, options) clients', async () => {
    const linkedin = { searchJobs: jest.fn(async () => ({ jobs: [] })) };

    await searchPlatformJobs({
      clients: { linkedin },
      activePlatforms: ['linkedin'],
      searchKeywords: ['DevOps'],
      searchResults: createSearchResults(),
    });

    expect(linkedin.searchJobs).toHaveBeenCalledWith('DevOps', { limit: 20 });
  });
});
