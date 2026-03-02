import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const createMockHttpClient = () => ({
  request: mock.fn(),
  snsRequest: mock.fn(),
  chaosRequest: mock.fn(),
  setCookies: mock.fn(),
  getCookies: mock.fn(() => 'test-cookie'),
});

describe('HttpClient', async () => {
  const { HttpClient } = await import('../http-client.js');

  describe('constructor', () => {
    it('initializes with null cookies by default', () => {
      const client = new HttpClient();
      assert.strictEqual(client.getCookies(), null);
    });

    it('accepts cookies in constructor', () => {
      const client = new HttpClient('my-cookie');
      assert.strictEqual(client.getCookies(), 'my-cookie');
    });
  });

  describe('setCookies/getCookies', () => {
    it('updates and retrieves cookies', () => {
      const client = new HttpClient();
      client.setCookies('new-cookie');
      assert.strictEqual(client.getCookies(), 'new-cookie');
    });
  });
});

describe('WantedAPIError', async () => {
  const { WantedAPIError } = await import('../http-client.js');

  it('creates error with statusCode and response', () => {
    const error = new WantedAPIError('Test error', 401, 'Unauthorized');

    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.statusCode, 401);
    assert.strictEqual(error.response, 'Unauthorized');
    assert.strictEqual(error.name, 'WantedAPIError');
  });
});

describe('JobsEndpoint', async () => {
  const { JobsEndpoint } = await import('../endpoints/jobs.js');
  let mockClient;
  let endpoint;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new JobsEndpoint(mockClient);
  });

  describe('search()', () => {
    it('calls request with correct params', async () => {
      mockClient.request = mock.fn(async () => ({
        data: [{ id: 1, company: { name: 'Toss' }, position: 'DevOps' }],
      }));

      const result = await endpoint.search({ category: 'devops', limit: 10 });

      assert.strictEqual(mockClient.request.mock.calls.length, 1);
      const callArg = mockClient.request.mock.calls[0].arguments[0];
      assert.ok(callArg.includes('limit=10'));
      assert.ok(Array.isArray(result.jobs));
    });

    it('returns normalized jobs', async () => {
      mockClient.request = mock.fn(async () => ({
        data: [
          {
            id: 123,
            company: { id: 1, name: 'Toss', industry_name: 'Fintech' },
            position: 'DevOps Engineer',
            reward: { total: 1000000 },
          },
        ],
      }));

      const result = await endpoint.search({});

      assert.strictEqual(result.jobs.length, 1);
      assert.strictEqual(result.jobs[0].id, 123);
      assert.strictEqual(result.jobs[0].company, 'Toss');
      assert.strictEqual(result.jobs[0].position, 'DevOps Engineer');
    });

    it('handles empty response', async () => {
      mockClient.request = mock.fn(async () => ({ data: [] }));

      const result = await endpoint.search({});

      assert.strictEqual(result.jobs.length, 0);
    });
  });

  describe('searchByKeyword()', () => {
    it('passes keyword as query param', async () => {
      mockClient.request = mock.fn(async () => ({ data: [], total_count: 0 }));

      await endpoint.searchByKeyword('kubernetes');

      const callArg = mockClient.request.mock.calls[0].arguments[0];
      assert.ok(callArg.includes('query=kubernetes'));
    });
  });

  describe('getDetail()', () => {
    it('fetches job by ID', async () => {
      mockClient.request = mock.fn(async () => ({
        data: {
          id: 456,
          company: { name: 'Kakao' },
          position: 'Backend',
          detail: { requirements: '5+ years' },
        },
      }));

      const result = await endpoint.getDetail(456);

      assert.strictEqual(result.id, 456);
      const callArg = mockClient.request.mock.calls[0].arguments[0];
      assert.ok(callArg.includes('/jobs/456'));
    });
  });

  describe('getTags()', () => {
    it('fetches tag list', async () => {
      mockClient.request = mock.fn(async () => ({
        data: [{ id: 674, name: 'DevOps' }],
      }));

      const result = await endpoint.getTags();

      assert.ok(Array.isArray(result));
    });
  });
});

describe('CompaniesEndpoint', async () => {
  const { CompaniesEndpoint } = await import('../endpoints/jobs.js');
  let mockClient;
  let endpoint;

  beforeEach(() => {
    mockClient = createMockHttpClient();
    endpoint = new CompaniesEndpoint(mockClient);
  });

  describe('get()', () => {
    it('fetches company by ID', async () => {
      mockClient.request = mock.fn(async () => ({
        data: { id: 100, name: 'Toss', industry_name: 'Fintech' },
      }));

      const result = await endpoint.get(100);

      assert.strictEqual(result.id, 100);
      assert.strictEqual(result.name, 'Toss');
    });
  });

  describe('getJobs()', () => {
    it('fetches company job listings', async () => {
      mockClient.request = mock.fn(async () => ({
        data: [{ id: 1, company: { name: 'Toss' }, position: 'DevOps' }],
        total_count: 5,
      }));

      const result = await endpoint.getJobs(100, { limit: 10 });

      assert.ok(Array.isArray(result.jobs));
      assert.strictEqual(result.total, 5);
    });
  });
});

describe('WantedAPI', async () => {
  const { WantedAPI } = await import('../wanted-api.js');

  describe('constructor', () => {
    it('initializes all endpoints', () => {
      const api = new WantedAPI();

      assert.ok(api.jobs);
      assert.ok(api.companies);
      assert.ok(api.auth);
      assert.ok(api.profile);
      assert.ok(api.resume);
    });

    it('accepts cookies', () => {
      const api = new WantedAPI('test-cookie');
      assert.strictEqual(api.getCookies(), 'test-cookie');
    });
  });

  describe('setCookies/getCookies', () => {
    it('delegates to HttpClient', () => {
      const api = new WantedAPI();
      api.setCookies('new-cookie');
      assert.strictEqual(api.getCookies(), 'new-cookie');
    });
  });

  describe('convenience methods', () => {
    it('searchJobs delegates to jobs.search', async () => {
      const api = new WantedAPI();
      api.jobs.search = mock.fn(async () => ({ jobs: [], total: 0 }));

      await api.searchJobs({ category: 'devops' });

      assert.strictEqual(api.jobs.search.mock.calls.length, 1);
    });

    it('searchByKeyword delegates to jobs.searchByKeyword', async () => {
      const api = new WantedAPI();
      api.jobs.searchByKeyword = mock.fn(async () => ({ jobs: [], total: 0 }));

      await api.searchByKeyword('kubernetes');

      assert.strictEqual(api.jobs.searchByKeyword.mock.calls.length, 1);
    });

    it('getJobDetail delegates to jobs.getDetail', async () => {
      const api = new WantedAPI();
      api.jobs.getDetail = mock.fn(async () => ({ id: 123 }));

      await api.getJobDetail(123);

      assert.strictEqual(api.jobs.getDetail.mock.calls.length, 1);
    });

    it('getCompany delegates to companies.get', async () => {
      const api = new WantedAPI();
      api.companies.get = mock.fn(async () => ({ id: 100 }));

      await api.getCompany(100);

      assert.strictEqual(api.companies.get.mock.calls.length, 1);
    });

    it('getProfile delegates to profile.get', async () => {
      const api = new WantedAPI();
      api.profile.get = mock.fn(async () => ({ name: 'Test' }));

      await api.getProfile();

      assert.strictEqual(api.profile.get.mock.calls.length, 1);
    });

    it('getResumeList delegates to resume.list', async () => {
      const api = new WantedAPI();
      api.resume.list = mock.fn(async () => []);

      await api.getResumeList();

      assert.strictEqual(api.resume.list.mock.calls.length, 1);
    });
  });
});

describe('JOB_CATEGORIES', async () => {
  const { JOB_CATEGORIES } = await import('../types.js');

  it('exports category ID mappings', () => {
    assert.ok(JOB_CATEGORIES);
    assert.ok(typeof JOB_CATEGORIES === 'object');
  });
});
