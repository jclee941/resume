import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SecretsClient } from '../index.js';

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

beforeEach(() => {
  mock.restoreAll();
  restoreEnv();
});

describe('SecretsClient', () => {
  it('uses default base URL and default logger paths when optional args are omitted', async () => {
    delete process.env.INFISICAL_API_URL;

    const client = new SecretsClient('token-default', 'prod', 'project-default');
    assert.equal(client.baseURL, 'https://infisical.jclee.me/api/v3');
    assert.equal(client.logger, console);

    process.env.INFISICAL_TOKEN = 'token-env';
    process.env.INFISICAL_PROJECT_ID = 'project-env';
    delete process.env.INFISICAL_ENVIRONMENT;
    const envClient = SecretsClient.fromEnv();
    assert.ok(envClient instanceof SecretsClient);
    assert.equal(envClient.logger, console);

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({}),
    }));
    const emptySecrets = await client.fetchSecrets();
    assert.deepEqual(emptySecrets, []);
  });

  it('constructor and fromEnv select clients for all env branches', () => {
    process.env.INFISICAL_API_URL = 'https://env-api.example';

    const logger = { warn: mock.fn() };
    const withExplicitBase = new SecretsClient(
      'token-1',
      'stage',
      'project-1',
      'https://custom.example',
      logger
    );
    const withEnvBase = new SecretsClient('token-2', 'prod', 'project-2', null, logger);

    assert.equal(withExplicitBase.token, 'token-1');
    assert.equal(withExplicitBase.environment, 'stage');
    assert.equal(withExplicitBase.projectID, 'project-1');
    assert.equal(withExplicitBase.baseURL, 'https://custom.example');
    assert.equal(withExplicitBase.logger, logger);
    assert.equal(withEnvBase.baseURL, 'https://env-api.example');

    delete process.env.INFISICAL_TOKEN;
    delete process.env.INFISICAL_PROJECT_ID;
    const fallbackNoToken = SecretsClient.fromEnv(logger);
    assert.equal(fallbackNoToken.constructor.name, 'FallbackSecretsClient');

    process.env.INFISICAL_TOKEN = 'token-x';
    delete process.env.INFISICAL_PROJECT_ID;
    const fallbackNoProject = SecretsClient.fromEnv(logger);
    assert.equal(fallbackNoProject.constructor.name, 'FallbackSecretsClient');
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.equal(
      logger.warn.mock.calls[0].arguments[0],
      '[SecretsClient] INFISICAL_PROJECT_ID not set, using env fallback'
    );

    process.env.INFISICAL_TOKEN = 'token-y';
    process.env.INFISICAL_PROJECT_ID = 'project-y';
    process.env.INFISICAL_ENVIRONMENT = 'dev';
    const realClient = SecretsClient.fromEnv(logger);
    assert.ok(realClient instanceof SecretsClient);
    assert.equal(realClient.token, 'token-y');
    assert.equal(realClient.projectID, 'project-y');
    assert.equal(realClient.environment, 'dev');

    delete process.env.INFISICAL_ENVIRONMENT;
    const defaultEnvClient = SecretsClient.fromEnv(logger);
    assert.equal(defaultEnvClient.environment, 'prod');
  });

  it('get uses cache before expiry, refetches after expiry, and falls back to env on fetch error', async () => {
    const client = new SecretsClient('token', 'prod', 'workspace', 'https://vault.example', {
      warn: mock.fn(),
    });

    let now = 1_000;
    mock.method(Date, 'now', () => now);

    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ secrets: [{ secretKey: 'API_KEY', secretValue: 'remote-1' }] }),
    }));

    const first = await client.get('API_KEY');
    const second = await client.get('API_KEY');

    now += 6 * 60 * 1000;
    fetchMock.mock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ secrets: [{ secretKey: 'API_KEY', secretValue: 'remote-2' }] }),
    }));

    const third = await client.get('API_KEY');

    process.env.ONLY_ENV = 'env-value';
    fetchMock.mock.mockImplementationOnce(async () => {
      throw new Error('network-down');
    });

    const fallback = await client.get('ONLY_ENV');

    assert.equal(first, 'remote-1');
    assert.equal(second, 'remote-1');
    assert.equal(third, 'remote-2');
    assert.equal(fallback, 'env-value');
    assert.equal(fetchMock.mock.callCount(), 3);
    assert.equal(client.logger.warn.mock.callCount(), 1);
    assert.match(
      client.logger.warn.mock.calls[0].arguments[0],
      /Infisical fetch failed: network-down/
    );
  });

  it('fetchSecrets, fallbackToEnv, mustGet, getWithDefault, and getPlatformCredentials cover success and failure paths', async () => {
    const client = new SecretsClient('token', 'prod', 'workspace', 'https://vault.example', {
      warn: mock.fn(),
    });

    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({
        secrets: [
          { secretKey: 'LINKEDIN_EMAIL', secretValue: 'linkedin@example.com' },
          { secretKey: 'LINKEDIN_PASSWORD', secretValue: 'linkedin-pass' },
          { secretKey: 'LINKEDIN_COOKIES', secretValue: 'linkedin-cookie' },
          { secretKey: 'SARAMIN_EMAIL', secretValue: 'saramin@example.com' },
          { secretKey: 'SARAMIN_PASSWORD', secretValue: 'saramin-pass' },
          { secretKey: 'SARAMIN_COOKIES', secretValue: 'saramin-cookie' },
          { secretKey: 'JOBKOREA_EMAIL', secretValue: 'jobkorea@example.com' },
          { secretKey: 'JOBKOREA_PASSWORD', secretValue: 'jobkorea-pass' },
          { secretKey: 'JOBKOREA_COOKIES', secretValue: 'jobkorea-cookie' },
          { secretKey: 'WANTED_SESSION_COOKIE', secretValue: 'wanted-cookie' },
        ],
      }),
    }));

    const secrets = await client.fetchSecrets();
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(
      fetchMock.mock.calls[0].arguments[0],
      'https://vault.example/secrets?environment=prod&workspaceId=workspace'
    );
    assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, 'Bearer token');
    assert.equal(fetchMock.mock.calls[0].arguments[1].headers['Content-Type'], 'application/json');
    assert.equal(secrets.length, 10);

    fetchMock.mock.mockImplementationOnce(async () => ({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    }));
    await assert.rejects(client.fetchSecrets(), /Infisical API error: 503 unavailable/);

    process.env.ENV_ONLY = 'env-only-value';
    assert.equal(client.fallbackToEnv('ENV_ONLY'), 'env-only-value');
    assert.equal(client.fallbackToEnv('MISSING_ENV_ONLY'), null);

    const getSpy = mock.method(client, 'get', async (key) => {
      if (key === 'REQUIRED_SECRET') {
        return 'required-value';
      }
      if (key === 'WITH_DEFAULT') {
        return null;
      }
      const values = {
        LINKEDIN_EMAIL: 'linkedin@example.com',
        LINKEDIN_PASSWORD: 'linkedin-pass',
        LINKEDIN_COOKIES: 'linkedin-cookie',
        SARAMIN_EMAIL: 'saramin@example.com',
        SARAMIN_PASSWORD: 'saramin-pass',
        SARAMIN_COOKIES: 'saramin-cookie',
        JOBKOREA_EMAIL: 'jobkorea@example.com',
        JOBKOREA_PASSWORD: 'jobkorea-pass',
        JOBKOREA_COOKIES: 'jobkorea-cookie',
        WANTED_SESSION_COOKIE: 'wanted-cookie',
      };
      return values[key] || null;
    });

    assert.equal(await client.mustGet('REQUIRED_SECRET'), 'required-value');
    await assert.rejects(
      client.mustGet('MISSING_REQUIRED_SECRET'),
      /Required secret "MISSING_REQUIRED_SECRET" not found/
    );

    assert.equal(await client.getWithDefault('WITH_DEFAULT', 'default-value'), 'default-value');
    assert.equal(await client.getWithDefault('REQUIRED_SECRET', 'default-value'), 'required-value');

    const creds = await client.getPlatformCredentials();
    assert.deepEqual(creds, {
      linkedin: {
        email: 'linkedin@example.com',
        password: 'linkedin-pass',
        cookies: 'linkedin-cookie',
      },
      saramin: {
        email: 'saramin@example.com',
        password: 'saramin-pass',
        cookies: 'saramin-cookie',
      },
      jobkorea: {
        email: 'jobkorea@example.com',
        password: 'jobkorea-pass',
        cookies: 'jobkorea-cookie',
      },
      wanted: {
        sessionCookie: 'wanted-cookie',
      },
    });
    assert.ok(getSpy.mock.callCount() >= 12);
  });

  it('FallbackSecretsClient methods work for get, mustGet, getWithDefault, and getPlatformCredentials', async () => {
    delete process.env.INFISICAL_TOKEN;
    delete process.env.INFISICAL_PROJECT_ID;

    process.env.REQUIRED_ENV = 'required-env-value';
    process.env.EXISTING_ENV = 'existing-env-value';
    process.env.LINKEDIN_EMAIL = 'l@e.com';
    process.env.LINKEDIN_PASSWORD = 'l-pass';
    process.env.LINKEDIN_COOKIES = 'l-cookie';
    process.env.SARAMIN_EMAIL = 's@e.com';
    process.env.SARAMIN_PASSWORD = 's-pass';
    process.env.SARAMIN_COOKIES = 's-cookie';
    process.env.JOBKOREA_EMAIL = 'j@e.com';
    process.env.JOBKOREA_PASSWORD = 'j-pass';
    process.env.JOBKOREA_COOKIES = 'j-cookie';
    process.env.WANTED_SESSION_COOKIE = 'w-cookie';

    const client = SecretsClient.fromEnv({ warn: mock.fn() });

    assert.equal(await client.get('EXISTING_ENV'), 'existing-env-value');
    assert.equal(await client.get('MISSING_ENV'), null);
    assert.equal(await client.mustGet('REQUIRED_ENV'), 'required-env-value');
    await assert.rejects(
      client.mustGet('MISSING_REQUIRED_ENV'),
      /Required env var "MISSING_REQUIRED_ENV" not found/
    );

    assert.equal(
      await client.getWithDefault('EXISTING_ENV', 'fallback-default'),
      'existing-env-value'
    );
    assert.equal(await client.getWithDefault('NOT_SET', 'fallback-default'), 'fallback-default');

    const creds = await client.getPlatformCredentials();
    assert.deepEqual(creds, {
      linkedin: {
        email: 'l@e.com',
        password: 'l-pass',
        cookies: 'l-cookie',
      },
      saramin: {
        email: 's@e.com',
        password: 's-pass',
        cookies: 's-cookie',
      },
      jobkorea: {
        email: 'j@e.com',
        password: 'j-pass',
        cookies: 'j-cookie',
      },
      wanted: {
        sessionCookie: 'w-cookie',
      },
    });
  });
});
