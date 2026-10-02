import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ApplicationsEndpoint } from '../endpoints/applications.js';
import { WantedAPIError } from '../http-client.js';

function createClient({ application = null, profileResumeKey = 'PROFILE-KEY', draft = {} } = {}) {
  const calls = [];
  return {
    calls,
    async request(endpoint, options) {
      calls.push({ api: 'request', endpoint, options });
      if (endpoint.startsWith('/jobs/')) return { job: { id: 1 }, application };
      if (endpoint === '/user') return { email: 'me@example.com', name: 'Me', mobile: '+82 10' };
      throw new Error(`unexpected request ${endpoint}`);
    },
    async chaosRequest(endpoint, options) {
      calls.push({ api: 'chaos', endpoint, options });
      if (endpoint === '/profiles/v1/resume') return { data: { resume_key: profileResumeKey } };
      if (options?.body?.status === 'write') return { id: 9, ...draft };
      if (options?.body?.status === 'apply') return { id: 9, status: 'apply', job_id: 123 };
      throw new Error(`unexpected chaos request ${endpoint}`);
    },
  };
}

const posts = (client) => client.calls.filter((call) => call.options?.method === 'POST');

describe('ApplicationsEndpoint.apply', () => {
  it('opens a draft and submits it with the profile resume, filling gaps from the account', async () => {
    const client = createClient({
      draft: {
        email: ' me@example.com ',
        username: 'Me',
        mobile: null,
        nationality_code: 'KR',
        visa: 'NONE',
      },
    });

    const result = await new ApplicationsEndpoint(client).apply('wanted-123');

    assert.deepEqual(result, { alreadyApplied: false, applicationId: 9, status: 'apply' });
    assert.deepEqual(
      posts(client).map((call) => [call.endpoint, call.options.body]),
      [
        [
          '/applications/v1',
          {
            email: 'me@example.com',
            job_id: 123,
            username: 'Me',
            mobile: '+82 10',
            resume_keys: [],
            status: 'write',
          },
        ],
        [
          '/applications/v1',
          {
            email: 'me@example.com',
            username: 'Me',
            mobile: '+82 10',
            resume_keys: ['PROFILE-KEY'],
            job_id: 123,
            nationality_code: 'KR',
            visa: 'NONE',
            status: 'apply',
          },
        ],
      ]
    );
    assert.equal(posts(client)[1].options.headers.Referer, 'https://www.wanted.co.kr/wd/123');
  });

  it('reports a job that already has a submitted application without posting', async () => {
    const client = createClient({ application: { id: 5, status_text: 'complete' } });

    const result = await new ApplicationsEndpoint(client).apply(123);

    assert.deepEqual(result, { alreadyApplied: true, applicationId: 5, status: 'complete' });
    assert.deepEqual(posts(client), []);
  });

  it('submits over an unsent draft with an explicit resume key', async () => {
    const client = createClient({ application: { id: 5, status_text: 'write' } });

    const result = await new ApplicationsEndpoint(client).apply(123, { resumeKey: 'GIVEN-KEY' });

    assert.equal(result.alreadyApplied, false);
    assert.deepEqual(posts(client)[1].options.body.resume_keys, ['GIVEN-KEY']);
    assert.equal(
      client.calls.some((call) => call.endpoint === '/profiles/v1/resume'),
      false
    );
  });

  it('refuses to post when the profile resume has no key or the job id is invalid', async () => {
    const noKey = createClient({ profileResumeKey: null });
    await assert.rejects(new ApplicationsEndpoint(noKey).apply(123), WantedAPIError);
    assert.deepEqual(posts(noKey), []);

    const invalid = createClient();
    await assert.rejects(new ApplicationsEndpoint(invalid).apply('wanted-abc'), WantedAPIError);
    assert.deepEqual(invalid.calls, []);
  });
});
