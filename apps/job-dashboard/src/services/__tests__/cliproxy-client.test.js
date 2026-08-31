import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { CliproxyClient } from '../cliproxy-client.js';

function createCliproxyResponse(content) {
  return {
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify(content),
            },
          },
        ],
      };
    },
  };
}

describe('CliproxyClient', () => {
  it('calls the default fetcher with the Worker global receiver', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });
    globalThis.fetch = async function () {
      assert.equal(this, globalThis);
      return createCliproxyResponse({ jobs: [] });
    };
    const client = new CliproxyClient({
      CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
      CLIPROXY_API_KEY: 'secret-test-key',
    });

    const result = await client.searchJobs('security', { limit: 1 });

    assert.deepEqual(result, { jobs: [] });
  });

  it('uses gpt-sol as the default model for Cliproxy requests', async () => {
    let requestBody = null;
    const fetcher = mock.fn(async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return createCliproxyResponse({
        jobs: [
          {
            id: 'enterprise-job',
            company: 'Enterprise Co',
            position: 'Security Engineer',
            sourceUrl: 'https://jobs.example/enterprise',
            companyScale: 'enterprise',
          },
        ],
      });
    });
    const client = new CliproxyClient(
      {
        CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
        CLIPROXY_API_KEY: 'secret-test-key',
      },
      { fetcher }
    );

    await client.searchJobs('security', { limit: 1 });

    assert.equal(requestBody.model, 'gpt-sol');
  });

  it('allows CLIPROXY_MODEL to override the default model', async () => {
    let requestBody = null;
    const fetcher = mock.fn(async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return createCliproxyResponse({ jobs: [] });
    });
    const client = new CliproxyClient(
      {
        CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
        CLIPROXY_API_KEY: 'secret-test-key',
        CLIPROXY_MODEL: 'custom-model',
      },
      { fetcher }
    );

    await client.searchJobs('security', { limit: 1 });

    assert.equal(requestBody.model, 'custom-model');
  });

  it('keeps only HTTP large-company postings when Cliproxy returns mixed jobs', async () => {
    const fetcher = mock.fn(async () =>
      createCliproxyResponse({
        jobs: [
          {
            id: 'enterprise-job',
            company: 'Enterprise Co',
            position: 'Security Engineer',
            sourceUrl: 'https://jobs.example/enterprise',
            companyScale: 'enterprise',
          },
          {
            id: 'startup-job',
            company: 'Tiny Startup',
            position: 'Platform Engineer',
            sourceUrl: 'https://jobs.example/startup',
            companyScale: 'startup',
          },
          {
            id: 'bad-url-job',
            company: 'Large Bad URL Co',
            position: 'SRE',
            sourceUrl: 'javascript:alert(1)',
            companyScale: 'large',
          },
        ],
      })
    );
    const client = new CliproxyClient(
      {
        CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
        CLIPROXY_API_KEY: 'secret-test-key',
      },
      { fetcher }
    );

    const result = await client.searchJobs('security', { limit: 10 });

    assert.equal(fetcher.mock.callCount(), 1);
    assert.deepEqual(
      result.jobs.map((job) => job.id),
      ['enterprise-job']
    );
    assert.equal(result.jobs[0].sourceUrl, 'https://jobs.example/enterprise');
  });

  it('throws when Cliproxy returns non-JSON assistant content', async () => {
    const fetcher = mock.fn(async () => ({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "I don't have any tools available to search a job database.",
              },
            },
          ],
        };
      },
    }));
    const client = new CliproxyClient(
      {
        CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
        CLIPROXY_API_KEY: 'secret-test-key',
      },
      { fetcher }
    );

    await assert.rejects(
      () => client.searchJobs('security', { limit: 1 }),
      /Cliproxy returned non-JSON job content/
    );
  });

  it('throws when Cliproxy returns an HTTP error', async () => {
    const fetcher = mock.fn(async () => ({
      ok: false,
      status: 400,
      async text() {
        return JSON.stringify({
          error: { message: '`temperature` is deprecated for this model.' },
        });
      },
    }));
    const client = new CliproxyClient(
      {
        CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
        CLIPROXY_API_KEY: 'secret-test-key',
      },
      { fetcher }
    );

    await assert.rejects(
      () => client.searchJobs('security', { limit: 1 }),
      /Cliproxy job search failed with HTTP 400/
    );
  });
});
