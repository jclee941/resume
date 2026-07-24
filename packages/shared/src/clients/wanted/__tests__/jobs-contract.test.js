import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JobsEndpoint } from '../endpoints/jobs.js';

describe('JobsEndpoint Contract', () => {
  let mockHttpClient;
  let jobsEndpoint;

  beforeEach(() => {
    mockHttpClient = {
      request: mock.fn(),
    };
    jobsEndpoint = new JobsEndpoint(mockHttpClient);
  });

  test('search returns expected structure for tools', async () => {
    // Mock response matching Wanted API shape
    const mockResponse = {
      data: [
        {
          id: 123,
          position: 'DevOps Engineer',
          company: { name: 'Test Corp', id: 1 },
          address: { location: 'Seoul' },
          reward: { formatted_total: '1,000,000' },
          due_time: '2023-12-31',
        },
      ],
      links: {
        next: '/api/v4/jobs?offset=20',
      },
      total: 100,
    };

    mockHttpClient.request.mock.mockImplementation(async () => mockResponse);

    const result = await jobsEndpoint.search({
      tag_type_ids: [674],
      locations: 'seoul',
      limit: 20,
    });

    // Verify the structure expected by search-jobs.js tool
    assert.ok(result.jobs, 'Result should have jobs array');
    assert.ok(Array.isArray(result.jobs), 'jobs should be an array');
    assert.equal(result.jobs[0].id, 123);
    assert.equal(result.jobs[0].company, 'Test Corp'); // Normalized

    // CRITICAL: Tool expects 'links' property to check for 'next'
    assert.ok(result.links, 'Result should have links object');
    assert.ok(result.links.next, 'links should have next property');

    // CRITICAL: Tool expects 'total'
    assert.ok(result.total !== undefined, 'Result should have total count');

    // Verify params mapping
    const calls = mockHttpClient.request.mock.calls;
    assert.equal(calls.length, 1);
    const url = calls[0].arguments[0];

    assert.match(url, /tag_type_ids=674/);
    assert.match(url, /locations=seoul/);
    assert.match(url, /country=kr/);
  });

  test('getTags returns unwrapped array', async () => {
    const mockResponse = {
      data: [
        { id: 1, title: 'IT' },
        { id: 2, title: 'Design' },
      ],
    };
    mockHttpClient.request.mock.mockImplementation(async () => mockResponse);

    const tags = await jobsEndpoint.getTags();

    assert.ok(Array.isArray(tags), 'getTags should return an array');
    assert.equal(tags.length, 2);
    assert.equal(tags[0].title, 'IT');
  });
});
