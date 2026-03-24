describe('@resume/shared/wanted-client', () => {
  let mod;
  let fetchSpy;

  const jsonResponse = (data, init = {}) => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(init.text ?? ''),
  });

  beforeAll(async () => {
    mod = await import('@resume/shared/wanted-client');
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exports WantedClient as default', () => {
    expect(mod.default).toBe(mod.WantedClient);
  });

  test('WantedAPIError constructor sets fields', () => {
    const err = new mod.WantedAPIError('boom', 418, 'teapot');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('WantedAPIError');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(418);
    expect(err.response).toBe('teapot');
  });

  test('constructor and setCookies update cookie state', () => {
    const client = new mod.WantedClient();
    expect(client.cookies).toBe('');
    client.setCookies('sid=abc');
    expect(client.cookies).toBe('sid=abc');
  });

  test('request/chaosRequest/snsRequest build correct URLs', async () => {
    const client = new mod.WantedClient('sid=abc');
    const fetchImpl = jest.spyOn(client, '_fetch').mockResolvedValue({ ok: true });

    await client.request('/jobs');
    await client.chaosRequest('/resumes/v1');
    await client.snsRequest('/profile');

    expect(fetchImpl).toHaveBeenNthCalledWith(1, 'https://www.wanted.co.kr/api/v4/jobs', {});
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://www.wanted.co.kr/api/chaos/resumes/v1',
      {}
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'https://www.wanted.co.kr/api/sns-api/profile',
      {}
    );
  });

  test('_fetch builds GET headers and omits body', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new mod.WantedClient();

    const out = await client._fetch('https://example.test/path', {
      method: 'GET',
      body: { ignored: true },
      headers: { 'X-Trace': '1' },
    });

    expect(out).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://example.test/path');
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
    expect(options.headers.Accept).toBe('application/json');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Accept-Language']).toContain('ko-KR');
    expect(options.headers.Referer).toBe('https://www.wanted.co.kr/');
    expect(options.headers.Origin).toBe('https://www.wanted.co.kr');
    expect(options.headers['X-Trace']).toBe('1');
    expect(options.headers.Cookie).toBeUndefined();
  });

  test('_fetch adds Cookie and stringified body for non-GET methods', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ saved: true }));
    const client = new mod.WantedClient('sid=abc; uid=1');

    await client._fetch('https://example.test/post', {
      method: 'PATCH',
      body: { a: 1 },
    });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Cookie).toBe('sid=abc; uid=1');
    expect(options.body).toBe('{"a":1}');
  });

  test('_fetch throws WantedAPIError with text payload on non-ok response', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(null, {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: 'bad',
      })
    );
    const client = new mod.WantedClient();

    await expect(client._fetch('https://example.test/fail')).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 500,
      response: 'bad',
      message: 'HTTP 500: Server Error',
    });
  });

  test('_fetch handles text() rejection by storing null response in error', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn(),
      text: jest.fn().mockRejectedValue(new Error('no text')),
    });
    const client = new mod.WantedClient();

    await expect(client._fetch('https://example.test/fail')).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 404,
      response: null,
    });
  });

  test('searchJobs builds query params and normalizes data', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({ data: [{ id: 1 }] });
    const normalizeSpy = jest
      .spyOn(client, 'normalizeJobs')
      .mockReturnValue([{ id: 1, title: 'T' }]);

    const result = await client.searchJobs('backend', { limit: 7, offset: 3 });

    expect(requestSpy).toHaveBeenCalledWith('/jobs?tag_type_ids=674&limit=7&offset=3&country=kr');
    expect(normalizeSpy).toHaveBeenCalledWith([{ id: 1 }]);
    expect(result).toEqual([{ id: 1, title: 'T' }]);
  });

  test('searchJobs uses defaults and normalizes empty data when API payload is missing', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({});
    const normalizeSpy = jest.spyOn(client, 'normalizeJobs').mockReturnValue([]);

    const result = await client.searchJobs('dev');

    expect(requestSpy).toHaveBeenCalledWith('/jobs?tag_type_ids=674&limit=20&offset=0&country=kr');
    expect(normalizeSpy).toHaveBeenCalledWith([]);
    expect(result).toEqual([]);
  });

  test('searchByCategory builds category params and normalizes data', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({ data: [{ id: 2 }] });
    const normalizeSpy = jest
      .spyOn(client, 'normalizeJobs')
      .mockReturnValue([{ id: 2, title: 'T2' }]);

    const result = await client.searchByCategory({ tagTypeIds: [1, 2], limit: 4, offset: 5 });

    expect(requestSpy).toHaveBeenCalledWith('/jobs?tag_type_ids=1%2C2&limit=4&offset=5&country=kr');
    expect(normalizeSpy).toHaveBeenCalledWith([{ id: 2 }]);
    expect(result).toEqual([{ id: 2, title: 'T2' }]);
  });

  test('searchByCategory uses default params and empty normalization fallback', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({});
    const normalizeSpy = jest.spyOn(client, 'normalizeJobs').mockReturnValue([]);

    const result = await client.searchByCategory();

    expect(requestSpy).toHaveBeenCalledWith('/jobs?tag_type_ids=674&limit=20&offset=0&country=kr');
    expect(normalizeSpy).toHaveBeenCalledWith([]);
    expect(result).toEqual([]);
  });

  test('getJobDetail normalizes job from data.job fallback path', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
      job: { id: 11, position: 'A' },
    });
    const normalizeSpy = jest.spyOn(client, 'normalizeJobDetail').mockReturnValue({ id: 11 });

    const result = await client.getJobDetail(11);

    expect(requestSpy).toHaveBeenCalledWith('/jobs/11');
    expect(normalizeSpy).toHaveBeenCalledWith({ id: 11, position: 'A' });
    expect(result).toEqual({ id: 11 });
  });

  test('getJobDetail normalizes when payload is already the job object', async () => {
    const client = new mod.WantedClient('sid=abc');
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({ id: 12, position: 'B' });
    const normalizeSpy = jest.spyOn(client, 'normalizeJobDetail').mockReturnValue({ id: 12 });

    const result = await client.getJobDetail(12);

    expect(requestSpy).toHaveBeenCalledWith('/jobs/12');
    expect(normalizeSpy).toHaveBeenCalledWith({ id: 12, position: 'B' });
    expect(result).toEqual({ id: 12 });
  });

  test('apply requires auth and throws 401 without cookies', async () => {
    const client = new mod.WantedClient();
    await expect(client.apply(1)).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 401,
    });
  });

  test('apply posts payload with optional resume_id', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ applied: true }))
      .mockResolvedValueOnce(jsonResponse({ applied: true }));
    const client = new mod.WantedClient('sid=abc');

    const res1 = await client.apply('123', 'r-1');
    const res2 = await client.apply('124');

    expect(res1).toEqual({ applied: true });
    expect(res2).toEqual({ applied: true });

    const [, opt1] = fetchSpy.mock.calls[0];
    const [, opt2] = fetchSpy.mock.calls[1];
    expect(opt1.method).toBe('POST');
    expect(opt1.headers.Cookie).toBe('sid=abc');
    expect(opt1.headers.Referer).toBe('https://www.wanted.co.kr/wd/123');
    expect(JSON.parse(opt1.body)).toEqual({ job_id: 123, resume_id: 'r-1' });
    expect(JSON.parse(opt2.body)).toEqual({ job_id: 124 });
  });

  test('apply throws WantedAPIError when API returns non-ok', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn(),
      text: jest.fn().mockResolvedValue('invalid'),
    });
    const client = new mod.WantedClient('sid=abc');

    await expect(client.apply(1)).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 400,
      response: 'invalid',
      message: 'Application failed: 400',
    });
  });

  test('getProfile requires auth and validates non-ok response path', async () => {
    const noAuth = new mod.WantedClient();
    await expect(noAuth.getProfile()).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 401,
    });

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn(),
    });

    const auth = new mod.WantedClient('sid=abc');
    await expect(auth.getProfile()).rejects.toMatchObject({
      name: 'WantedAPIError',
      statusCode: 403,
      message: 'Profile fetch failed: 403',
    });
  });

  test('getProfile fetches current user profile successfully', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ user: { id: 1 } }));
    const client = new mod.WantedClient('sid=abc');

    const result = await client.getProfile();

    expect(result).toEqual({ user: { id: 1 } });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://www.wanted.co.kr/api/v4/users/status');
    expect(options.headers.Cookie).toBe('sid=abc');
  });

  test('chaos resume/profile methods call correct endpoints and methods', async () => {
    const client = new mod.WantedClient('sid=abc');
    const chaosSpy = jest.spyOn(client, 'chaosRequest').mockResolvedValue({ data: [1], ok: true });
    const snsSpy = jest.spyOn(client, 'snsRequest').mockResolvedValue({ ok: true });

    const list = await client.getResumeList();
    expect(list).toEqual([1]);
    expect(chaosSpy).toHaveBeenNthCalledWith(1, '/resumes/v1');

    chaosSpy.mockResolvedValueOnce({ id: 1 });
    const detail = await client.getResumeDetail('r1');
    expect(detail).toEqual({ id: 1 });
    expect(chaosSpy).toHaveBeenNthCalledWith(2, '/resumes/v1/r1');

    await client.saveResume('r1');
    await client.updateCareer('r1', 'c1', { x: 1 });
    await client.addCareer('r1', { y: 2 });
    await client.deleteCareer('r1', 'c2');
    await client.addProject('r1', 'c1', { p: 1 });
    await client.deleteProject('r1', 'c1', 'p1');
    await client.updateEducation('r1', 'e1', { e: 1 });
    await client.addEducation('r1', { e: 2 });
    await client.deleteEducation('r1', 'e2');
    await client.addSkill('r1', 674);
    await client.deleteSkill('r1', 's1');
    await client.updateActivity('r1', 'a1', { a: 1 });
    await client.addActivity('r1', { a: 2 });
    await client.deleteActivity('r1', 'a2');
    await client.updateLanguageCert('r1', 'l1', { l: 1 });
    await client.addLanguageCert('r1', { l: 2 });
    await client.deleteLanguageCert('r1', 'l2');
    await client.updateResumeFields('r1', { about: 'x' });
    await client.updateProfile({ name: 'kim' });

    expect(chaosSpy).toHaveBeenCalledWith('/resumes/r1/pdf', { method: 'POST' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/careers/c1', {
      method: 'PATCH',
      body: { x: 1 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/careers', {
      method: 'POST',
      body: { y: 2 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/careers/c2', { method: 'DELETE' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/careers/c1/projects', {
      method: 'POST',
      body: { p: 1 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/careers/c1/projects/p1', {
      method: 'DELETE',
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/educations/e1', {
      method: 'PATCH',
      body: { e: 1 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/educations', {
      method: 'POST',
      body: { e: 2 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/educations/e2', { method: 'DELETE' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v1/r1/skills', {
      method: 'POST',
      body: { tag_type_id: 674 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v1/r1/skills/s1', { method: 'DELETE' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/activities/a1', {
      method: 'PATCH',
      body: { a: 1 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/activities', {
      method: 'POST',
      body: { a: 2 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/activities/a2', { method: 'DELETE' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/language_certs/l1', {
      method: 'PUT',
      body: { l: 1 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/language_certs', {
      method: 'POST',
      body: { l: 2 },
    });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v2/r1/language_certs/l2', { method: 'DELETE' });
    expect(chaosSpy).toHaveBeenCalledWith('/resumes/v1/r1', {
      method: 'PUT',
      body: { about: 'x' },
    });
    expect(snsSpy).toHaveBeenCalledWith('/profile', { method: 'PATCH', body: { name: 'kim' } });
  });

  test('resume detail/list return raw payload when data wrapper is absent', async () => {
    const client = new mod.WantedClient('sid=abc');
    const chaosSpy = jest.spyOn(client, 'chaosRequest');
    chaosSpy.mockResolvedValueOnce({ items: [1] }).mockResolvedValueOnce({ id: 'resume' });

    const list = await client.getResumeList();
    const detail = await client.getResumeDetail('r1');

    expect(list).toEqual({ items: [1] });
    expect(detail).toEqual({ id: 'resume' });
  });

  test('all auth-required methods throw when cookies are missing', async () => {
    const client = new mod.WantedClient();
    const calls = [
      () => client.getResumeList(),
      () => client.getResumeDetail('r1'),
      () => client.saveResume('r1'),
      () => client.updateCareer('r1', 'c1', {}),
      () => client.addCareer('r1', {}),
      () => client.deleteCareer('r1', 'c1'),
      () => client.addProject('r1', 'c1', {}),
      () => client.deleteProject('r1', 'c1', 'p1'),
      () => client.updateEducation('r1', 'e1', {}),
      () => client.addEducation('r1', {}),
      () => client.deleteEducation('r1', 'e1'),
      () => client.addSkill('r1', 1),
      () => client.deleteSkill('r1', 's1'),
      () => client.updateActivity('r1', 'a1', {}),
      () => client.addActivity('r1', {}),
      () => client.deleteActivity('r1', 'a1'),
      () => client.updateLanguageCert('r1', 'l1', {}),
      () => client.addLanguageCert('r1', {}),
      () => client.deleteLanguageCert('r1', 'l1'),
      () => client.updateProfile({}),
      () => client.updateResumeFields('r1', {}),
    ];

    for (const run of calls) {
      await expect(run()).rejects.toMatchObject({ name: 'WantedAPIError', statusCode: 401 });
    }
  });

  test('_requireAuth throws without cookie and passes with cookie', () => {
    const noAuth = new mod.WantedClient();
    expect(() => noAuth._requireAuth()).toThrow(mod.WantedAPIError);

    const auth = new mod.WantedClient('sid=abc');
    expect(() => auth._requireAuth()).not.toThrow();
  });

  test('normalizeJobs transforms both rich and fallback job payloads', () => {
    const client = new mod.WantedClient();
    const out = client.normalizeJobs([
      {
        id: 1,
        position: 'Backend Engineer',
        company: { name: 'Wanted' },
        address: { full_location: 'Seoul' },
        skill_tags: ['Node.js'],
        career: { min: 3, max: 5 },
        reward: { formatted_total: '1,000,000원' },
      },
      {
        id: 2,
        title: 'Fallback Title',
        company_name: 'Fallback Co',
        location: 'Busan',
        skill_tags: null,
      },
      {
        id: 3,
        career: { min: 2 },
        address: { location: 'Incheon' },
      },
      {
        id: 4,
      },
    ]);

    expect(out).toEqual([
      {
        id: 1,
        title: 'Backend Engineer',
        company: 'Wanted',
        location: 'Seoul',
        skills: ['Node.js'],
        experienceLevel: '3-5년',
        salary: '1,000,000원',
        url: 'https://www.wanted.co.kr/wd/1',
      },
      {
        id: 2,
        title: 'Fallback Title',
        company: 'Fallback Co',
        location: 'Busan',
        skills: [],
        experienceLevel: null,
        salary: null,
        url: 'https://www.wanted.co.kr/wd/2',
      },
      {
        id: 3,
        title: 'Unknown',
        company: 'Unknown',
        location: 'Incheon',
        skills: [],
        experienceLevel: '2-년',
        salary: null,
        url: 'https://www.wanted.co.kr/wd/3',
      },
      {
        id: 4,
        title: 'Unknown',
        company: 'Unknown',
        location: null,
        skills: [],
        experienceLevel: null,
        salary: null,
        url: 'https://www.wanted.co.kr/wd/4',
      },
    ]);
  });

  test('normalizeJobDetail transforms rich and fallback detail payloads', () => {
    const client = new mod.WantedClient();

    const rich = client.normalizeJobDetail({
      id: 10,
      position: 'Platform Engineer',
      company: { name: 'Wanted', id: 33, industry_name: 'IT' },
      detail: {
        intro: 'intro',
        main_tasks: 'tasks',
        requirements: 'req',
        preferred: 'pref',
        benefits: 'benefit',
      },
      address: { location: 'Seoul' },
      skill_tags: ['TypeScript'],
    });

    const fallback = client.normalizeJobDetail({
      id: 11,
      title: 'Fallback',
      description: 'desc',
      location: 'Busan',
    });

    const unknown = client.normalizeJobDetail({ id: 12 });

    expect(rich).toEqual({
      id: 10,
      title: 'Platform Engineer',
      company: { name: 'Wanted', id: 33, industry: 'IT' },
      description: 'intro',
      requirements: 'tasks',
      qualifications: 'req',
      preferred: 'pref',
      benefits: 'benefit',
      location: 'Seoul',
      skills: ['TypeScript'],
      url: 'https://www.wanted.co.kr/wd/10',
    });

    expect(fallback).toEqual({
      id: 11,
      title: 'Fallback',
      company: { name: 'Unknown', id: null, industry: null },
      description: 'desc',
      requirements: '',
      qualifications: '',
      preferred: '',
      benefits: '',
      location: 'Busan',
      skills: [],
      url: 'https://www.wanted.co.kr/wd/11',
    });

    expect(unknown).toEqual({
      id: 12,
      title: 'Unknown',
      company: { name: 'Unknown', id: null, industry: null },
      description: '',
      requirements: '',
      qualifications: '',
      preferred: '',
      benefits: '',
      location: null,
      skills: [],
      url: 'https://www.wanted.co.kr/wd/12',
    });
  });
});
