import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  storeCredentials,
  getCredentials,
  hasCredentials,
  removeCredentials,
  listCredentialPlatforms,
  loadFromEnv,
} from '../credential-manager.js';

const TEST_ENV_KEYS = [
  'ENCRYPTION_KEY',
  'GITHUB_USERNAME',
  'GITHUB_PASSWORD',
  'GITHUB_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_SECRET',
  'MY_PLATFORM_USERNAME',
  'MY_PLATFORM_PASSWORD',
  'MY_PLATFORM_API_KEY',
  'MY_PLATFORM_TOKEN',
  'MY_PLATFORM_SECRET',
  'EMPTY_USERNAME',
  'EMPTY_PASSWORD',
  'EMPTY_API_KEY',
  'EMPTY_TOKEN',
  'EMPTY_SECRET',
];

function clearCredentialStore() {
  for (const platform of listCredentialPlatforms()) {
    removeCredentials(platform);
  }
}

function clearTestEnv() {
  for (const key of TEST_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('credential-manager', () => {
  beforeEach(() => {
    clearCredentialStore();
    clearTestEnv();
    mock.restoreAll();
  });

  it('stores and retrieves credentials round-trip', () => {
    const credentials = { username: 'alice', password: 'pw', token: 't1' };
    storeCredentials('github', credentials, 'secret-a');

    const result = getCredentials('github', 'secret-a');

    assert.deepEqual(result, credentials);
  });

  it('returns null for unknown platform', () => {
    assert.equal(getCredentials('missing', 'secret-a'), null);
  });

  it('returns null and logs error when decryption fails with wrong key', () => {
    const logger = { error: mock.fn() };
    storeCredentials('github', { username: 'alice', password: 'pw' }, 'secret-a');

    const result = getCredentials('github', 'wrong-secret', { logger });

    assert.equal(result, null);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.error.mock.calls[0].arguments[0], 'Failed to decrypt credentials:');
    assert.ok(logger.error.mock.calls[0].arguments[1] instanceof Error);
  });

  it('tracks presence and removal of stored credentials', () => {
    assert.equal(hasCredentials('github'), false);

    storeCredentials('github', { api_key: 'abc' }, 'secret-a');
    assert.equal(hasCredentials('github'), true);
    assert.equal(removeCredentials('github'), true);
    assert.equal(hasCredentials('github'), false);
    assert.equal(removeCredentials('github'), false);
  });

  it('lists all stored credential platforms', () => {
    storeCredentials('github', { username: 'a' }, 'secret-a');
    storeCredentials('wanted', { username: 'b' }, 'secret-b');

    const platforms = listCredentialPlatforms().sort();

    assert.deepEqual(platforms, ['github', 'wanted']);
  });

  it('loads credentials from environment variables and stores them', () => {
    process.env.GITHUB_USERNAME = 'alice';
    process.env.GITHUB_PASSWORD = 'pw';
    process.env.GITHUB_API_KEY = 'k1';
    process.env.GITHUB_TOKEN = 't1';
    process.env.GITHUB_SECRET = 's1';

    const loaded = loadFromEnv('github', 'secret-a');
    const credentials = getCredentials('github', 'secret-a');

    assert.equal(loaded, true);
    assert.deepEqual(credentials, {
      username: 'alice',
      password: 'pw',
      api_key: 'k1',
      token: 't1',
      secret: 's1',
    });
  });

  it('returns false when no environment variables are present', () => {
    const loaded = loadFromEnv('empty', 'secret-a');

    assert.equal(loaded, false);
    assert.equal(hasCredentials('empty'), false);
  });

  it('normalizes platform names for environment variable lookup', () => {
    process.env.MY_PLATFORM_USERNAME = 'normalized-user';
    process.env.MY_PLATFORM_TOKEN = 'normalized-token';

    const loaded = loadFromEnv('my-platform', 'secret-a');
    const credentials = getCredentials('my-platform', 'secret-a');

    assert.equal(loaded, true);
    assert.deepEqual(credentials, {
      username: 'normalized-user',
      token: 'normalized-token',
    });
  });

  it('uses encryption key fallback chain: explicit secret over env secret', () => {
    process.env.ENCRYPTION_KEY = 'env-secret';
    storeCredentials('github', { username: 'alice' }, 'explicit-secret');

    assert.deepEqual(getCredentials('github', 'explicit-secret'), { username: 'alice' });
    assert.equal(getCredentials('github'), null);
  });

  it('uses encryption key from environment variable when explicit secret is missing', () => {
    process.env.ENCRYPTION_KEY = 'env-secret';
    storeCredentials('github', { username: 'alice' });

    assert.deepEqual(getCredentials('github'), { username: 'alice' });
    assert.equal(getCredentials('github', 'different-secret'), null);
  });

  it('uses default development key when explicit and env secrets are missing', () => {
    delete process.env.ENCRYPTION_KEY;
    storeCredentials('github', { username: 'alice' });

    assert.deepEqual(getCredentials('github'), { username: 'alice' });
  });
});
