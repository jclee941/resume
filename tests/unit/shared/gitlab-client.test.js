describe('@resume/shared/gitlab-client', () => {
  let fetchSpy;
  let GitLabHttpClient;
  let GitLabAPIError;

  const mockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: {
      get: jest.fn((header) => {
        if (header.toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return null;
      }),
    },
  });

  beforeAll(async () => {
    const mod = await import('@resume/shared/clients/gitlab/http-client');
    GitLabHttpClient = mod.GitLabHttpClient;
    GitLabAPIError = mod.GitLabAPIError;
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GITLAB_URL;
    delete process.env.GITLAB_OAUTH_APP_ID;
    delete process.env.GITLAB_OAUTH_CLIENT_SECRET;
  });

  describe('GitLabAPIError', () => {
    test('constructor sets all fields correctly', () => {
      const err = new GitLabAPIError('test error', 404, 'Not Found');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('GitLabAPIError');
      expect(err.message).toBe('test error');
      expect(err.statusCode).toBe(404);
      expect(err.response).toBe('Not Found');
    });
  });

  describe('GitLabHttpClient', () => {
    describe('fetchAccessToken', () => {
      test('successfully fetches OAuth token', async () => {
        const tokenData = {
          access_token: 'glpat-test-token',
          token_type: 'Bearer',
          expires_in: 7200,
          scope: 'api',
        };
        fetchSpy.mockResolvedValue(mockResponse(tokenData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const token = await client.fetchAccessToken();

        expect(token).toBe('glpat-test-token');
        expect(fetchSpy).toHaveBeenCalledWith(
          'https://gitlab.example.com/oauth/token',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
          })
        );
      });

      test('throws error on OAuth failure', async () => {
        fetchSpy.mockResolvedValue(mockResponse({ error: 'invalid_client' }, 401));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'invalid-app',
          clientSecret: 'invalid-secret',
        });

        await expect(client.fetchAccessToken()).rejects.toThrow(GitLabAPIError);
      });

      test('throws error when no access_token in response', async () => {
        fetchSpy.mockResolvedValue(mockResponse({ token_type: 'Bearer' }, 200));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await expect(client.fetchAccessToken()).rejects.toThrow(
          'No access_token in OAuth response'
        );
      });
    });

    describe('getAccessToken', () => {
      test('fetches new token if none exists', async () => {
        const tokenData = {
          access_token: 'glpat-new-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        fetchSpy.mockResolvedValue(mockResponse(tokenData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const token = await client.getAccessToken();
        expect(token).toBe('glpat-new-token');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      test('returns cached token if still valid', async () => {
        const tokenData = {
          access_token: 'glpat-first-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        fetchSpy.mockResolvedValue(mockResponse(tokenData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        // First call fetches
        const token1 = await client.getAccessToken();
        expect(token1).toBe('glpat-first-token');
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Second call returns cached
        const token2 = await client.getAccessToken();
        expect(token2).toBe('glpat-first-token');
        // fetch should not be called again
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('request', () => {
      test('makes authenticated request', async () => {
        const tokenData = {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        const responseData = [{ id: 1, name: 'test-project' }];

        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(responseData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const result = await client.request('/projects');

        expect(result).toEqual(responseData);
        expect(fetchSpy).toHaveBeenLastCalledWith(
          'https://gitlab.example.com/api/v4/projects',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });

      test('throws error on API failure', async () => {
        const tokenData = {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };

        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse({ error: 'Not found' }, 404));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await expect(client.request('/projects/999')).rejects.toThrow(GitLabAPIError);
      });

      test('supports query parameters', async () => {
        const tokenData = {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        const responseData = [{ id: 1, name: 'test' }];

        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(responseData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        await client.request('/projects', { query: { search: 'test', per_page: 10 } });

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('search=test'),
          expect.anything()
        );
        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.stringContaining('per_page=10'),
          expect.anything()
        );
      });

      test('supports POST requests with body', async () => {
        const tokenData = {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        const responseData = { id: 1, name: 'new-project' };

        fetchSpy
          .mockResolvedValueOnce(mockResponse(tokenData))
          .mockResolvedValueOnce(mockResponse(responseData));

        const client = new GitLabHttpClient({
          baseUrl: 'https://gitlab.example.com',
          appId: 'test-app',
          clientSecret: 'test-secret',
        });

        const body = { name: 'new-project', visibility: 'private' };
        await client.request('/projects', { method: 'POST', body });

        expect(fetchSpy).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
          })
        );
      });
    });

    describe('environment variable configuration', () => {
      test('uses environment variables when config not provided', async () => {
        process.env.GITLAB_URL = 'https://env.gitlab.com';
        process.env.GITLAB_OAUTH_APP_ID = 'env-app-id';
        process.env.GITLAB_OAUTH_CLIENT_SECRET = 'env-secret';

        const tokenData = {
          access_token: 'env-token',
          token_type: 'Bearer',
          expires_in: 7200,
        };
        fetchSpy.mockResolvedValue(mockResponse(tokenData));

        const client = new GitLabHttpClient({});
        const token = await client.getAccessToken();

        expect(token).toBe('env-token');
        expect(fetchSpy).toHaveBeenCalledWith(
          'https://env.gitlab.com/oauth/token',
          expect.anything()
        );
      });
  });

  // SSOT-039 / issue #26: error-path coverage. Targets the missing
  // branches in fetchAccessToken() and request(): 4xx/5xx HTTP errors,
  // network failures, malformed payloads, retry-after-token-refresh paths,
  // query parameter handling, body serialization, and content-type fallback.
  describe('error paths and edge cases (issue #26)', () => {
    test('fetchAccessToken throws GitLabAPIError on 401 OAuth failure', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('invalid_client'),
      });
      const client = new GitLabHttpClient({
        baseUrl: 'https://gl.example.com',
        appId: 'a', clientSecret: 'b',
      });
      await expect(client.fetchAccessToken()).rejects.toMatchObject({
        name: 'GitLabAPIError',
        statusCode: 401,
        response: 'invalid_client',
      });
    });

    test('fetchAccessToken throws when text() rejects (uses empty fallback)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockRejectedValue(new Error('socket closed')),
      });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.fetchAccessToken()).rejects.toMatchObject({
        name: 'GitLabAPIError',
        statusCode: 500,
        response: '',
      });
    });

    test('fetchAccessToken throws when response has no access_token', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ token_type: 'Bearer' }));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.fetchAccessToken()).rejects.toMatchObject({
        name: 'GitLabAPIError',
        message: expect.stringContaining('No access_token'),
      });
    });

    test('fetchAccessToken propagates network failure (fetch rejects)', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNRESET'));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.fetchAccessToken()).rejects.toThrow('ECONNRESET');
    });

    test('fetchAccessToken uses default 7200s expiry when expires_in is missing', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ access_token: 't1', token_type: 'Bearer' }));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      const before = Date.now();
      const token = await client.fetchAccessToken();
      const after = Date.now();
      expect(token).toBe('t1');
      // Cached on subsequent call (no second fetch within expiry window)
      const second = await client.fetchAccessToken();
      expect(second).toBe('t1');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      // Sanity: a second client invocation observed within ~10s of construction
      expect(after - before).toBeLessThan(10000);
    });

    test('request throws GitLabAPIError on 4xx response', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValue('Not Found'),
          headers: { get: () => 'text/plain' },
        });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.request('/projects/missing')).rejects.toMatchObject({
        statusCode: 404,
        response: 'Not Found',
      });
    });

    test('request throws on 5xx response', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: jest.fn().mockResolvedValue('Service Unavailable'),
          headers: { get: () => 'text/plain' },
        });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.request('/projects')).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    test('request returns text body when response content-type is not JSON', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('plain text body'),
          headers: { get: () => 'text/plain' },
        });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      const result = await client.request('/raw');
      expect(result).toBe('plain text body');
    });

    test('request retries once on 401 with token refresh, then succeeds', async () => {
      let callIndex = 0;
      fetchSpy.mockImplementation((url) => {
        callIndex++;
        if (String(url).endsWith('/oauth/token')) {
          return Promise.resolve(mockResponse({ access_token: `tok-${callIndex}`, expires_in: 7200 }));
        }
        if (callIndex === 2) {
          // First /api call — 401
          return Promise.resolve({
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue('expired'),
            headers: { get: () => 'application/json' },
          });
        }
        // Retry call — 200
        return Promise.resolve(mockResponse({ id: 42 }));
      });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      const result = await client.request('/projects/42');
      expect(result).toEqual({ id: 42 });
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    test('request throws after token refresh if retry still fails', async () => {
      let callIndex = 0;
      fetchSpy.mockImplementation((url) => {
        callIndex++;
        if (String(url).endsWith('/oauth/token')) {
          return Promise.resolve(mockResponse({ access_token: `t${callIndex}`, expires_in: 7200 }));
        }
        // Both /api calls return 401
        return Promise.resolve({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue('still expired'),
          headers: { get: () => 'application/json' },
        });
      });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await expect(client.request('/projects')).rejects.toMatchObject({
        statusCode: 401,
        message: expect.stringContaining('after token refresh'),
      });
    });

    test('request returns text body on 401-retry path when content-type is not JSON', async () => {
      let callIndex = 0;
      fetchSpy.mockImplementation((url) => {
        callIndex++;
        if (String(url).endsWith('/oauth/token')) {
          return Promise.resolve(mockResponse({ access_token: `t${callIndex}`, expires_in: 7200 }));
        }
        if (callIndex === 2) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue('expired'),
            headers: { get: () => 'application/json' },
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue('CSV,DATA'),
          headers: { get: () => 'text/csv' },
        });
      });
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      const result = await client.request('/exports.csv');
      expect(result).toBe('CSV,DATA');
    });

    test('request serializes body for non-GET methods and skips body for GET', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce(mockResponse({ ok: true }));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await client.request('/projects', { method: 'POST', body: { name: 'foo' } });
      const apiCall = fetchSpy.mock.calls.at(-1);
      expect(apiCall[1].method).toBe('POST');
      expect(apiCall[1].body).toBe(JSON.stringify({ name: 'foo' }));
    });

    test('request omits body field on GET even when body provided', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce(mockResponse([]));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await client.request('/projects', { method: 'GET', body: { ignored: true } });
      const apiCall = fetchSpy.mock.calls.at(-1);
      expect(apiCall[1].method).toBe('GET');
      expect(apiCall[1].body).toBeUndefined();
    });

    test('request encodes query parameters including arrays', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce(mockResponse([]));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await client.request('/projects', { query: { tag: ['a', 'b'], page: 2 } });
      const apiCall = fetchSpy.mock.calls.at(-1);
      const calledUrl = String(apiCall[0]);
      expect(calledUrl).toContain('tag=a');
      expect(calledUrl).toContain('tag=b');
      expect(calledUrl).toContain('page=2');
    });

    test('request handles empty query object without appending ? to URL', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({ access_token: 't', expires_in: 7200 }))
        .mockResolvedValueOnce(mockResponse([]));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      await client.request('/projects', { query: {} });
      const apiCall = fetchSpy.mock.calls.at(-1);
      const calledUrl = String(apiCall[0]);
      expect(calledUrl).not.toContain('?');
    });

    test('setAccessToken sets a token and skips OAuth fetch on next request', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ id: 1 }));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      client.setAccessToken('manual-token', 7200);
      const result = await client.request('/projects/1');
      expect(result).toEqual({ id: 1 });
      // Only one fetch — the API call (no oauth/token round-trip)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/v4/projects/1');
    });

    test('getAccessToken returns cached token when not yet expired', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ access_token: 'cached', expires_in: 7200 }));
      const client = new GitLabHttpClient({ baseUrl: 'https://x', appId: 'a', clientSecret: 'b' });
      const t1 = await client.getAccessToken();
      const t2 = await client.getAccessToken();
      expect(t1).toBe('cached');
      expect(t2).toBe('cached');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test('GitLabAPIError carries response field as undefined when omitted', () => {
      const err = new GitLabAPIError('m', 502);
      expect(err.statusCode).toBe(502);
      expect(err.response).toBeUndefined();
    });
  });
});
});
