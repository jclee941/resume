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
  });
});
