import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createForeignAtsAdapterRegistry } from '../index.js';

describe('foreign-ats public discovery boundaries', () => {
  it('Given default Greenhouse adapter When searching Then it fetches and filters public board jobs', async () => {
    const fetch = mock.fn(async (url, init) => {
      assert.equal(
        String(url),
        'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true'
      );
      assert.equal(init?.method ?? 'GET', 'GET');

      return jsonResponse({
        jobs: [
          greenhouseJob('gh-seoul', 'Seoul SRE', 'Seoul, South Korea'),
          greenhouseJob('gh-busan', 'Busan Engineer', 'Busan'),
        ],
      });
    });
    const adapter = createForeignAtsAdapterRegistry({ fetch }).getAdapter('greenhouse');

    const jobs = await adapter.search({ company: 'Acme', boardToken: 'acme' });

    assert.equal(fetch.mock.calls.length, 1);
    assert.deepEqual(
      jobs.map((job) => [job.id, job.applicationUrl, job.normalizedLocations]),
      [['greenhouse:gh-seoul', 'https://boards.greenhouse.io/acme/jobs/gh-seoul', ['seoul']]]
    );
    assert.equal(jobs[0].sourceUrl.includes('example.invalid'), false);
    assert.equal(jobs[0].dryRunOnly, true);
    assert.equal(jobs[0].submissionSkipped, true);
  });

  it('Given default Lever adapter When searching Then it fetches and filters public postings', async () => {
    const fetch = mock.fn(async (url, init) => {
      assert.equal(String(url), 'https://api.lever.co/v0/postings/leverco?mode=json');
      assert.equal(init?.method ?? 'GET', 'GET');

      return jsonResponse([
        leverJob('lever-remote', 'Remote Staff Engineer', 'Remote'),
        leverJob('lever-busan', 'Busan Staff Engineer', 'Busan'),
      ]);
    });
    const adapter = createForeignAtsAdapterRegistry({ fetch }).getAdapter('lever');

    const jobs = await adapter.search({ company: 'LeverCo' });

    assert.equal(fetch.mock.calls.length, 1);
    assert.deepEqual(
      jobs.map((job) => [job.id, job.applicationUrl, job.normalizedLocations]),
      [['lever:lever-remote', 'https://jobs.lever.co/leverco/lever-remote/apply', ['remote']]]
    );
    assert.equal(jobs[0].sourceUrl.includes('example.invalid'), false);
  });

  it('Given default Ashby adapter When searching Then it uses backend fetch and redacts credentials', async () => {
    const backendApiKey = 'ashby_test_backend_key';
    const fetch = mock.fn(async (url, init) => {
      assert.equal(String(url), 'https://api.ashbyhq.com/posting-api/job-board/ashbyco');
      assert.equal(init?.method ?? 'GET', 'GET');
      assert.equal(init.headers.Authorization, `Bearer ${backendApiKey}`);
      assert.equal(init.body, undefined);

      return jsonResponse({
        jobs: [
          ashbyJob('ashby-incheon', 'Incheon Product Engineer', '인천'),
          ashbyJob('ashby-daegu', 'Daegu Product Engineer', 'Daegu'),
        ],
      });
    });
    const adapter = createForeignAtsAdapterRegistry({
      fetch,
      ashbyApiKey: backendApiKey,
    }).getAdapter('ashby');

    const jobs = await adapter.search({ company: 'AshbyCo' });
    const serialized = JSON.stringify(jobs);

    assert.equal(fetch.mock.calls.length, 1);
    assert.deepEqual(
      jobs.map((job) => [job.id, job.applicationUrl, job.normalizedLocations]),
      [
        [
          'ashby:ashby-incheon',
          'https://jobs.ashbyhq.com/ashbyco/ashby-incheon/application',
          ['incheon'],
        ],
      ]
    );
    assert.equal(adapter.capabilities.backendApiKeyOnly, true);
    assert.equal(serialized.includes(backendApiKey), false);
    assert.equal(serialized.includes('example.invalid'), false);
  });
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

function greenhouseJob(id, title, location) {
  return {
    id,
    title,
    absolute_url: `https://boards.greenhouse.io/acme/jobs/${id}`,
    location: { name: location },
  };
}

function leverJob(id, text, location) {
  return {
    id,
    text,
    hostedUrl: `https://jobs.lever.co/leverco/${id}`,
    applyUrl: `https://jobs.lever.co/leverco/${id}/apply`,
    categories: { location },
  };
}

function ashbyJob(id, title, locationName) {
  return {
    id,
    title,
    locationName,
    jobUrl: `https://jobs.ashbyhq.com/ashbyco/${id}`,
    applyUrl: `https://jobs.ashbyhq.com/ashbyco/${id}/application`,
  };
}
