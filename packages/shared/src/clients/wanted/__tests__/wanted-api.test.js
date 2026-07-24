import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { HttpClient, WantedAPIError } from '../http-client.js';
import { JobsEndpoint, CompaniesEndpoint, AuthEndpoint } from '../endpoints/jobs.js';
import { WantedAPI, JOB_CATEGORIES } from '../wanted-api.js';
import { normalizeJob, normalizeJobDetail, normalizeCompany } from '../types.js';

const createMockHttpClient = () => ({
  request: mock.fn(),
  snsRequest: mock.fn(),
  chaosRequest: mock.fn(),
  snsProfileRequest: mock.fn(),
  setCookies: mock.fn(),
  getCookies: mock.fn(() => 'test-cookie'),
});

const createResponse = ({
  ok = true,
  status = 200,
  contentType = 'application/json',
  jsonData = { ok: true },
  textData = 'ok',
  textReject = false,
} = {}) => ({
  ok,
  status,
  headers: {
    get: () => contentType,
  },
  json: async () => jsonData,
  text: textReject ? async () => Promise.reject(new Error('text failed')) : async () => textData,
});

describe('HttpClient', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('initializes with null cookies by default and allows set/get', () => {
    const client = new HttpClient();
    assert.strictEqual(client.getCookies(), null);
    client.setCookies('session=abc');
    assert.strictEqual(client.getCookies(), 'session=abc');
  });

  it('request() uses BASE_URL and returns json for json content-type', async () => {
    const client = new HttpClient();
    const payload = { data: [1, 2, 3] };
    mock.method(globalThis, 'fetch', async (url) => {
      assert.strictEqual(url, 'https://www.wanted.co.kr/api/v4/jobs');
      return createResponse({ contentType: 'application/json; charset=utf-8', jsonData: payload });
    });

    const result = await client.request('/jobs');
    assert.deepStrictEqual(result, payload);
  });

  it('request() returns text for non-json content-type', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async () =>
      createResponse({ contentType: 'text/plain', textData: 'plain-text-response' })
    );

    const result = await client.request('/status');
    assert.strictEqual(result, 'plain-text-response');
  });

  it('snsRequest() uses SNS_API_URL prefix', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async (url) => {
      assert.strictEqual(url, 'https://www.wanted.co.kr/api/sns/v1/user/skills');
      return createResponse();
    });

    await client.snsRequest('/user/skills');
  });

  it('chaosRequest() uses CHAOS_API_URL prefix', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async (url) => {
      assert.strictEqual(url, 'https://www.wanted.co.kr/api/chaos/resumes/v1');
      return createResponse();
    });

    await client.chaosRequest('/resumes/v1');
  });

  it('snsProfileRequest() uses SNS_PROFILE_URL prefix', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async (url) => {
      assert.strictEqual(url, 'https://www.wanted.co.kr/sns-api/profile');
      return createResponse();
    });

    await client.snsProfileRequest('/profile');
  });

  it('adds Cookie header when cookies are set and merges custom headers', async () => {
    const client = new HttpClient('a=1; b=2');
    mock.method(globalThis, 'fetch', async (_url, options) => {
      assert.strictEqual(options.headers.Cookie, 'a=1; b=2');
      assert.strictEqual(options.headers['X-Custom'], 'yes');
      assert.strictEqual(options.headers.Accept, 'application/json');
      return createResponse();
    });

    await client.request('/jobs', { headers: { 'X-Custom': 'yes' } });
  });

  it('does not include Cookie header when cookies are null', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async (_url, options) => {
      assert.ok(!('Cookie' in options.headers));
      return createResponse();
    });

    await client.request('/jobs');
  });

  it('sends POST with JSON.stringify body and method', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async (_url, options) => {
      assert.strictEqual(options.method, 'POST');
      assert.strictEqual(options.body, JSON.stringify({ email: 'a@b.com', password: 'pw' }));
      return createResponse();
    });

    await client.request('/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'pw' },
    });
  });

  it('throws WantedAPIError with status and response text on non-ok response', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async () =>
      createResponse({ ok: false, status: 401, textData: 'Unauthorized' })
    );

    await assert.rejects(
      async () => client.request('/secure'),
      (error) => {
        assert.ok(error instanceof WantedAPIError);
        assert.strictEqual(error.statusCode, 401);
        assert.strictEqual(error.response, 'Unauthorized');
        assert.strictEqual(error.message, 'API request failed: 401');
        return true;
      }
    );
  });

  it('uses empty error response when response.text() fails', async () => {
    const client = new HttpClient();
    mock.method(globalThis, 'fetch', async () =>
      createResponse({ ok: false, status: 500, textReject: true })
    );

    await assert.rejects(
      async () => client.request('/broken'),
      (error) => {
        assert.ok(error instanceof WantedAPIError);
        assert.strictEqual(error.statusCode, 500);
        assert.strictEqual(error.response, '');
        return true;
      }
    );
  });
});

describe('WantedAPIError', () => {
  it('creates error with name, statusCode, and response', () => {
    const error = new WantedAPIError('Test error', 403, 'Forbidden');
    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.name, 'WantedAPIError');
    assert.strictEqual(error.statusCode, 403);
    assert.strictEqual(error.response, 'Forbidden');
  });
});

describe('JobsEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new JobsEndpoint(client);
  });

  it('search() appends years when valid and omits when -1', async () => {
    const responses = [
      { data: [], total: 0 },
      { data: [], total: 0 },
    ];
    client.request = mock.fn(async () => responses.shift());

    await endpoint.search({ category: 'devops', years: 3 });
    await endpoint.search({ category: 'devops', years: -1 });

    const withYears = client.request.mock.calls[0].arguments[0];
    const withoutYears = client.request.mock.calls[1].arguments[0];
    assert.ok(withYears.includes('years=3'));
    assert.ok(!withoutYears.includes('years='));
  });

  it('search() supports tag_type_ids array, locations filtering, and normalization', async () => {
    client.request.mock.mockImplementation(async () => ({
      data: [
        {
          id: 10,
          company_name: 'Fallback Co',
          company_id: 91,
          position: 'Backend Engineer',
          location: 'Seoul',
        },
      ],
      total: 1,
      links: { next: null },
    }));

    const result = await endpoint.search({
      tag_type_ids: [JOB_CATEGORIES.backend, JOB_CATEGORIES.devops],
      locations: 'seoul',
      limit: 10,
      offset: 5,
    });

    const url = client.request.mock.calls[0].arguments[0];
    assert.ok(url.includes('tag_type_ids=872'));
    assert.ok(url.includes('tag_type_ids=674'));
    assert.ok(url.includes('locations=seoul'));
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.jobs[0].company, 'Fallback Co');
  });

  it('search() handles scalar tag_type_ids and unknown category value fallback', async () => {
    const responses = [{ data: [] }, { data: [] }];
    client.request = mock.fn(async () => responses.shift());

    await endpoint.search({ tag_type_ids: 777 });
    await endpoint.search({ category: 'custom-category' });

    const scalarTagUrl = client.request.mock.calls[0].arguments[0];
    const categoryFallbackUrl = client.request.mock.calls[1].arguments[0];
    assert.ok(scalarTagUrl.includes('tag_type_ids=777'));
    assert.ok(categoryFallbackUrl.includes('tag_type_ids=custom-category'));
  });

  it('search() handles missing data array', async () => {
    client.request = mock.fn(async () => ({ total: 0 }));

    const result = await endpoint.search({});

    assert.deepStrictEqual(result.jobs, []);
    assert.strictEqual(result.total, 0);
  });

  it('searchByKeyword() handles years undefined, -1, and valid', async () => {
    const responses = [
      { data: [], total_count: 0 },
      { data: [], total_count: 0 },
      { data: [], total_count: 0 },
    ];
    client.request = mock.fn(async () => responses.shift());

    await endpoint.searchByKeyword('node');
    await endpoint.searchByKeyword('node', { years: -1 });
    await endpoint.searchByKeyword('node', { years: 5 });

    const undefinedYears = client.request.mock.calls[0].arguments[0];
    const minusOneYears = client.request.mock.calls[1].arguments[0];
    const validYears = client.request.mock.calls[2].arguments[0];
    assert.ok(!undefinedYears.includes('years='));
    assert.ok(!minusOneYears.includes('years='));
    assert.ok(validYears.includes('years=5'));
  });

  it('searchByKeyword() handles missing data array', async () => {
    client.request = mock.fn(async () => ({ total_count: 0 }));

    const result = await endpoint.searchByKeyword('missing');

    assert.deepStrictEqual(result.jobs, []);
    assert.strictEqual(result.total, 0);
  });

  it('getDetail() normalizes response.data or response fallback', async () => {
    const responses = [
      {
        data: {
          id: 456,
          company: { id: 9, name: 'Kakao' },
          position: 'Backend',
          skill_tags: [{ title: 'Node.js' }],
          category_tags: [{ title: 'IT' }],
        },
      },
      {
        id: 789,
        company_name: 'NoData Inc',
        position: 'DevOps',
      },
    ];
    client.request = mock.fn(async () => responses.shift());

    const dataResult = await endpoint.getDetail(456);
    const fallbackResult = await endpoint.getDetail(789);

    assert.strictEqual(dataResult.id, 456);
    assert.deepStrictEqual(dataResult.skills, ['Node.js']);
    assert.strictEqual(fallbackResult.id, 789);
    assert.strictEqual(fallbackResult.company, 'NoData Inc');
  });

  it('getTags() returns response.data or response', async () => {
    const responses = [{ data: [{ id: 674, title: 'DevOps' }] }, [{ id: 1, title: 'RawTag' }]];
    client.request = mock.fn(async () => responses.shift());

    const dataResult = await endpoint.getTags();
    const fallbackResult = await endpoint.getTags();

    assert.deepStrictEqual(dataResult, [{ id: 674, title: 'DevOps' }]);
    assert.deepStrictEqual(fallbackResult, [{ id: 1, title: 'RawTag' }]);
  });
});

describe('CompaniesEndpoint', () => {
  let client;
  let endpoint;

  beforeEach(() => {
    client = createMockHttpClient();
    endpoint = new CompaniesEndpoint(client);
  });

  it('get() normalizes response.data and fallback response', async () => {
    const responses = [
      {
        data: {
          id: 100,
          name: 'Toss',
          logo_img: { thumb: 'logo.png' },
          industry_name: 'Fintech',
        },
      },
      {
        id: 101,
        name: 'Raw Co',
        industry_name: 'IT',
      },
    ];
    client.request = mock.fn(async () => responses.shift());

    const fromData = await endpoint.get(100);
    const fromRaw = await endpoint.get(101);

    assert.strictEqual(fromData.id, 100);
    assert.strictEqual(fromData.logo, 'logo.png');
    assert.strictEqual(fromRaw.name, 'Raw Co');
  });

  it('getJobs() applies defaults and returns normalized jobs with total fallback', async () => {
    const responses = [
      {
        data: [{ id: 1, company_name: 'A', position: 'Engineer' }],
        total_count: 5,
      },
      {
        data: [{ id: 2, company_name: 'B', position: 'SRE' }],
      },
    ];
    client.request = mock.fn(async () => responses.shift());

    const explicit = await endpoint.getJobs(100, { limit: 10, offset: 2 });
    const fallback = await endpoint.getJobs(100);

    const explicitUrl = client.request.mock.calls[0].arguments[0];
    const fallbackUrl = client.request.mock.calls[1].arguments[0];
    assert.strictEqual(explicitUrl, '/companies/100/jobs?limit=10&offset=2');
    assert.strictEqual(fallbackUrl, '/companies/100/jobs?limit=20&offset=0');
    assert.strictEqual(explicit.total, 5);
    assert.strictEqual(fallback.total, 1);
  });

  it('getJobs() handles missing data and total_count', async () => {
    client.request = mock.fn(async () => ({}));

    const result = await endpoint.getJobs(200);

    assert.deepStrictEqual(result.jobs, []);
    assert.strictEqual(result.total, 0);
  });
});

describe('AuthEndpoint', () => {
  it('login() posts credentials and returns response', async () => {
    const client = createMockHttpClient();
    client.request.mock.mockImplementation(async () => ({ token: 'abc' }));
    const endpoint = new AuthEndpoint(client);

    const result = await endpoint.login('user@example.com', 'pw');

    assert.deepStrictEqual(client.request.mock.calls[0].arguments, [
      '/login',
      { method: 'POST', body: { email: 'user@example.com', password: 'pw' } },
    ]);
    assert.deepStrictEqual(result, { token: 'abc' });
  });
});

describe('types normalization', () => {
  it('normalizeJob() covers company_name fallback, missing skill_tags, and is_remote default', () => {
    const normalized = normalizeJob({
      id: 1,
      company_name: 'Fallback Company',
      company_id: 99,
      position: 'Engineer',
      location: 'Seoul',
      annual_from: 2,
      annual_to: 5,
      reward: { formatted_total: '1,000,000' },
      title_img: {},
      employment_type: 'FULL_TIME',
      created_at: '2026-01-01',
      due_time: '2026-02-01',
    });

    assert.strictEqual(normalized.company, 'Fallback Company');
    assert.deepStrictEqual(normalized.techStack, []);
    assert.strictEqual(normalized.isRemote, false);
  });

  it('normalizeJobDetail() handles missing skill_tags/category_tags', () => {
    const normalized = normalizeJobDetail({
      id: 2,
      company_name: 'Company B',
      company_id: 88,
      position: 'SRE',
      main_tasks: 'Operate systems',
      requirements: '3+ years',
      preferred_points: 'Cloud',
      benefits: 'Insurance',
    });

    assert.deepStrictEqual(normalized.skills, []);
    assert.deepStrictEqual(normalized.category, []);
    assert.strictEqual(normalized.description, 'Operate systems');
  });

  it('normalizeCompany() handles missing logo_img', () => {
    const normalized = normalizeCompany({
      id: 3,
      name: 'No Logo Co',
      industry_name: 'SaaS',
      employee_count: 10,
      description: 'Desc',
      homepage_url: 'https://example.com',
    });

    assert.strictEqual(normalized.logo, undefined);
    assert.strictEqual(normalized.name, 'No Logo Co');
  });
});

describe('WantedAPI', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('initializes endpoint fields and cookies passthrough works', () => {
    const api = new WantedAPI('cookie=value');
    assert.ok(api.jobs);
    assert.ok(api.companies);
    assert.ok(api.auth);
    assert.ok(api.profile);
    assert.ok(api.experience);
    assert.ok(api.education);
    assert.ok(api.skills);
    assert.ok(api.resume);
    assert.ok(api.resumeCareer);
    assert.ok(api.resumeEducation);
    assert.ok(api.resumeSkills);
    assert.ok(api.resumeActivity);
    assert.ok(api.resumeLanguageCert);
    assert.strictEqual(api.getCookies(), 'cookie=value');
    api.setCookies('next-cookie=value');
    assert.strictEqual(api.getCookies(), 'next-cookie=value');
  });

  it('chaosRequest() delegates to HttpClient chaos endpoint', async () => {
    const api = new WantedAPI();
    mock.method(globalThis, 'fetch', async (url) => {
      assert.strictEqual(url, 'https://www.wanted.co.kr/api/chaos/resumes/v1');
      return createResponse({ jsonData: { ok: true } });
    });

    const result = await api.chaosRequest('/resumes/v1');
    assert.deepStrictEqual(result, { ok: true });
  });

  it('delegates all job/company/auth convenience methods', async () => {
    const api = new WantedAPI();
    api.jobs.search = mock.fn(async () => ({ jobs: [1], total: 1 }));
    api.jobs.searchByKeyword = mock.fn(async () => ({ jobs: [2], total: 1 }));
    api.jobs.getDetail = mock.fn(async () => ({ id: 10 }));
    api.jobs.getTags = mock.fn(async () => [{ id: 674 }]);
    api.companies.get = mock.fn(async () => ({ id: 20 }));
    api.companies.getJobs = mock.fn(async () => ({ jobs: [], total: 0 }));
    api.auth.login = mock.fn(async () => ({ token: 't' }));

    assert.deepStrictEqual(await api.searchJobs({ limit: 1 }), { jobs: [1], total: 1 });
    assert.deepStrictEqual(await api.searchByKeyword('node', { years: 2 }), {
      jobs: [2],
      total: 1,
    });
    assert.deepStrictEqual(await api.getJobDetail(10), { id: 10 });
    assert.deepStrictEqual(await api.getTags(), [{ id: 674 }]);
    assert.deepStrictEqual(await api.getCompany(20), { id: 20 });
    assert.deepStrictEqual(await api.getCompanyJobs(20, { limit: 5 }), { jobs: [], total: 0 });
    assert.deepStrictEqual(await api.login('a@b.com', 'pw'), { token: 't' });

    assert.deepStrictEqual(api.jobs.search.mock.calls[0].arguments, [{ limit: 1 }]);
    assert.deepStrictEqual(api.jobs.searchByKeyword.mock.calls[0].arguments, [
      'node',
      { years: 2 },
    ]);
    assert.deepStrictEqual(api.jobs.getDetail.mock.calls[0].arguments, [10]);
    assert.strictEqual(api.jobs.getTags.mock.calls.length, 1);
    assert.deepStrictEqual(api.companies.get.mock.calls[0].arguments, [20]);
    assert.deepStrictEqual(api.companies.getJobs.mock.calls[0].arguments, [20, { limit: 5 }]);
    assert.deepStrictEqual(api.auth.login.mock.calls[0].arguments, ['a@b.com', 'pw']);
  });

  it('delegates all profile convenience methods', async () => {
    const api = new WantedAPI();
    api.profile.get = mock.fn(async () => ({ name: 'Jane' }));
    api.profile.getSnsProfile = mock.fn(async () => ({ user: {} }));
    api.profile.update = mock.fn(async () => ({ ok: true }));
    api.profile.getApplications = mock.fn(async () => [{ id: 1 }]);
    api.profile.getBookmarks = mock.fn(async () => [{ id: 2 }]);
    api.profile.getResumes = mock.fn(async () => [{ id: 3 }]);

    assert.deepStrictEqual(await api.getProfile(), { name: 'Jane' });
    assert.deepStrictEqual(await api.getSnsProfile(), { user: {} });
    assert.deepStrictEqual(await api.updateProfile({ description: 'x' }), { ok: true });
    assert.deepStrictEqual(await api.getApplications({ limit: 1 }), [{ id: 1 }]);
    assert.deepStrictEqual(await api.getBookmarks({ limit: 2 }), [{ id: 2 }]);
    assert.deepStrictEqual(await api.getResumes(), [{ id: 3 }]);

    assert.strictEqual(api.profile.get.mock.calls.length, 1);
    assert.strictEqual(api.profile.getSnsProfile.mock.calls.length, 1);
    assert.deepStrictEqual(api.profile.update.mock.calls[0].arguments, [{ description: 'x' }]);
    assert.deepStrictEqual(api.profile.getApplications.mock.calls[0].arguments, [{ limit: 1 }]);
    assert.deepStrictEqual(api.profile.getBookmarks.mock.calls[0].arguments, [{ limit: 2 }]);
    assert.strictEqual(api.profile.getResumes.mock.calls.length, 1);
  });

  it('delegates all resume convenience methods', async () => {
    const api = new WantedAPI();
    api.resume.list = mock.fn(async () => [{ id: 'r1' }]);
    api.resume.getDetail = mock.fn(async () => ({ id: 'r1' }));
    api.resume.save = mock.fn(async () => ({ ok: true }));
    api.resume.updateStatus = mock.fn(async () => ({ ok: true }));
    api.resume.regeneratePdf = mock.fn(async () => ({ ok: true }));

    assert.deepStrictEqual(await api.getResumeList(), [{ id: 'r1' }]);
    assert.deepStrictEqual(await api.getResumeDetail('r1'), { id: 'r1' });
    assert.deepStrictEqual(await api.saveResume('r1', { title: 'new' }), { ok: true });
    assert.deepStrictEqual(await api.updateResumeStatus('r1', true), { ok: true });
    assert.deepStrictEqual(await api.regenerateResumePdf('r1'), { ok: true });

    assert.strictEqual(api.resume.list.mock.calls.length, 1);
    assert.deepStrictEqual(api.resume.getDetail.mock.calls[0].arguments, ['r1']);
    assert.deepStrictEqual(api.resume.save.mock.calls[0].arguments, ['r1', { title: 'new' }]);
    assert.deepStrictEqual(api.resume.updateStatus.mock.calls[0].arguments, ['r1', true]);
    assert.deepStrictEqual(api.resume.regeneratePdf.mock.calls[0].arguments, ['r1']);
  });
});

describe('JOB_CATEGORIES', () => {
  it('exports stable mappings object', () => {
    assert.ok(JOB_CATEGORIES);
    assert.strictEqual(typeof JOB_CATEGORIES, 'object');
    assert.strictEqual(JOB_CATEGORIES.devops, 674);
  });
});
