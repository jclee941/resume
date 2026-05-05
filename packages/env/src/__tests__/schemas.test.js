import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateEnv, EnvValidationError } from '../parse.js';
import { portfolioEnvSchema } from '../schemas/portfolio.js';
import { jobDashboardEnvSchema } from '../schemas/job-dashboard.js';
import { jobServerEnvSchema } from '../schemas/job-server.js';

describe('portfolioEnvSchema', () => {
  it('accepts an empty env (every key is optional today)', () => {
    const env = validateEnv(portfolioEnvSchema, {}, { appName: 'portfolio' });
    assert.equal(typeof env, 'object');
  });

  it('coerces RATE_LIMIT_RPM string to int', () => {
    const env = validateEnv(portfolioEnvSchema, { RATE_LIMIT_RPM: '60' });
    assert.equal(env.RATE_LIMIT_RPM, 60);
  });

  it('rejects bad ELASTICSEARCH_URL', () => {
    assert.throws(
      () => validateEnv(portfolioEnvSchema, { ELASTICSEARCH_URL: 'not a url' }),
      EnvValidationError
    );
  });

  it('rejects bad DEPLOY_ENV enum', () => {
    assert.throws(() => validateEnv(portfolioEnvSchema, { DEPLOY_ENV: 'qa' }), EnvValidationError);
  });
});

describe('jobDashboardEnvSchema', () => {
  it('rejects when ENCRYPTION_KEY is missing', () => {
    assert.throws(
      () => validateEnv(jobDashboardEnvSchema, {}, { appName: 'job-dashboard' }),
      (err) => {
        assert.ok(err instanceof EnvValidationError);
        assert.match(err.message, /ENCRYPTION_KEY/);
        return true;
      }
    );
  });

  it('accepts a minimal valid env', () => {
    const env = validateEnv(jobDashboardEnvSchema, { ENCRYPTION_KEY: 'k' });
    assert.equal(env.ENCRYPTION_KEY, 'k');
  });

  it('accepts ENABLE_TEST_AUTH_MOCK="1" or "true"', () => {
    const env1 = validateEnv(jobDashboardEnvSchema, {
      ENCRYPTION_KEY: 'k',
      ENABLE_TEST_AUTH_MOCK: '1',
    });
    assert.equal(env1.ENABLE_TEST_AUTH_MOCK, '1');
    const env2 = validateEnv(jobDashboardEnvSchema, {
      ENCRYPTION_KEY: 'k',
      ENABLE_TEST_AUTH_MOCK: 'true',
    });
    assert.equal(env2.ENABLE_TEST_AUTH_MOCK, 'true');
  });

  it('rejects ENABLE_TEST_AUTH_MOCK="yes"', () => {
    assert.throws(
      () =>
        validateEnv(jobDashboardEnvSchema, {
          ENCRYPTION_KEY: 'k',
          ENABLE_TEST_AUTH_MOCK: 'yes',
        }),
      EnvValidationError
    );
  });
});

describe('jobServerEnvSchema', () => {
  it('accepts an empty env (everything optional in job-server today)', () => {
    const env = validateEnv(jobServerEnvSchema, {});
    assert.equal(typeof env, 'object');
  });

  it('rejects malformed SESSION_ENCRYPTION_KEY (must be 64-char hex)', () => {
    assert.throws(
      () => validateEnv(jobServerEnvSchema, { SESSION_ENCRYPTION_KEY: 'short' }),
      EnvValidationError
    );
  });

  it('accepts a 64-char hex SESSION_ENCRYPTION_KEY', () => {
    const key = 'a'.repeat(64);
    const env = validateEnv(jobServerEnvSchema, { SESSION_ENCRYPTION_KEY: key });
    assert.equal(env.SESSION_ENCRYPTION_KEY, key);
  });

  it('rejects bad LOG_LEVEL', () => {
    assert.throws(
      () => validateEnv(jobServerEnvSchema, { LOG_LEVEL: 'verbose' }),
      EnvValidationError
    );
  });

  it('accepts each valid LOG_LEVEL', () => {
    for (const level of ['DEBUG', 'INFO', 'WARN', 'ERROR']) {
      const env = validateEnv(jobServerEnvSchema, { LOG_LEVEL: level });
      assert.equal(env.LOG_LEVEL, level);
    }
  });
});
