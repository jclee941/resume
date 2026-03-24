import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { SessionManager } from '../../session/index.js';
import { ProfileAggregator, UNIFIED_PROFILE_SCHEMA } from '../index.js';

describe('UNIFIED_PROFILE_SCHEMA', () => {
  it('exports expected baseline structure', () => {
    assert.equal(UNIFIED_PROFILE_SCHEMA.basic.name, null);
    assert.deepEqual(UNIFIED_PROFILE_SCHEMA.meta.sources, ['wanted', 'linkedin']);
    assert.equal(UNIFIED_PROFILE_SCHEMA.meta.syncStatus.wanted.status, 'synced');
    assert.equal(UNIFIED_PROFILE_SCHEMA.meta.syncStatus.saramin.status, 'auth_required');
  });
});

describe('ProfileAggregator.fetchUnifiedProfile', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('handles synced, auth_required, not_implemented, and no-crawler paths', async () => {
    mock.method(SessionManager, 'load', (platform) => {
      if (platform === 'wanted') return { token: 'ok' };
      if (platform === 'saramin') return null;
      if (platform === 'linkedin') return { token: 'ok' };
      return null;
    });

    const crawlers = {
      wanted: {
        getProfile: mock.fn(async () => ({
          success: true,
          profile: {
            name: 'Kim',
            email: 'kim@example.com',
            headline: 'Engineer',
            avatar: 'avatar.png',
            careers: [{ company: 'A Corp', startDate: '2020-01-01' }],
            skills: [{ name: 'Node.js' }],
          },
        })),
      },
      saramin: {
        getProfile: mock.fn(async () => ({
          success: true,
          profile: { name: 'NeverUsedWithoutSession' },
        })),
      },
      linkedin: {},
    };

    const aggregator = new ProfileAggregator(crawlers);
    const unified = await aggregator.fetchUnifiedProfile();

    assert.equal(unified.basic.name, 'Kim');
    assert.equal(unified.basic.email, 'kim@example.com');
    assert.equal(unified.meta.syncStatus.wanted.status, 'synced');
    assert.equal(unified.meta.syncStatus.saramin.status, 'auth_required');
    assert.equal(unified.meta.syncStatus.linkedin.status, 'not_implemented');
    assert.equal(unified.meta.syncStatus.jobkorea, undefined);
    assert.ok(typeof unified.meta.lastUpdated === 'string');
    assert.ok(typeof unified.meta.syncStatus.wanted.lastSync === 'string');
    assert.deepEqual(unified.meta.sources, ['wanted', 'linkedin']);
    assert.equal(UNIFIED_PROFILE_SCHEMA.meta.lastUpdated, 'ISO_DATE');
  });

  it('handles profile error and thrown error and adds new source when needed', async () => {
    mock.method(SessionManager, 'load', () => ({ token: 'ok' }));

    const crawlers = {
      wanted: {
        getProfile: mock.fn(async () => ({ success: false, error: 'bad-response' })),
      },
      saramin: {
        getProfile: mock.fn(async () => ({
          success: true,
          profile: {
            name: 'Lee',
            careers: [{ company: 'B Corp', startDate: '2021-01-01' }],
            skills: [{ name: 'TypeScript' }],
          },
        })),
      },
      jobkorea: {
        getProfile: mock.fn(async () => {
          throw new Error('network-down');
        }),
      },
      linkedin: {
        getProfile: mock.fn(async () => ({ success: true, profile: { name: 'Linked Name' } })),
      },
    };

    const aggregator = new ProfileAggregator(crawlers);
    const unified = await aggregator.fetchUnifiedProfile();

    assert.equal(unified.meta.syncStatus.wanted.status, 'error');
    assert.equal(unified.meta.syncStatus.wanted.error, 'bad-response');
    assert.equal(unified.meta.syncStatus.jobkorea.status, 'error');
    assert.equal(unified.meta.syncStatus.jobkorea.error, 'network-down');
    assert.equal(unified.meta.syncStatus.saramin.status, 'synced');
    assert.ok(unified.meta.sources.includes('saramin'));
    assert.equal(unified.basic.name, 'Linked Name');
  });
});

describe('ProfileAggregator.mergeProfile', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('merges basic fields for wanted and linkedin when name is missing', () => {
    const aggregator = new ProfileAggregator({});
    const unified = JSON.parse(JSON.stringify(UNIFIED_PROFILE_SCHEMA));

    aggregator.mergeProfile(
      unified,
      { name: 'Wanted Name', email: 'wanted@example.com', headline: 'h1', avatar: 'a1' },
      'wanted'
    );

    unified.basic.name = null;
    aggregator.mergeProfile(
      unified,
      { name: 'Linked Name', email: 'linked@example.com', headline: 'h2', avatar: 'a2' },
      'linkedin'
    );

    unified.basic.name = 'KeepName';
    aggregator.mergeProfile(
      unified,
      { email: 'updated@example.com', headline: 'h3', avatar: 'a3' },
      'wanted'
    );

    assert.equal(unified.basic.name, 'KeepName');
    assert.equal(unified.basic.email, 'updated@example.com');
    assert.equal(unified.basic.headline, 'h3');
    assert.equal(unified.basic.avatar, 'a3');
  });

  it('skips basic merge for linkedin with existing name and for non-wanted platforms, and de-duplicates careers/skills', () => {
    const aggregator = new ProfileAggregator({});
    const unified = JSON.parse(JSON.stringify(UNIFIED_PROFILE_SCHEMA));
    unified.basic.name = 'Existing';
    unified.basic.email = 'existing@example.com';

    aggregator.mergeProfile(
      unified,
      {
        name: 'ShouldNotOverride',
        email: 'nope@example.com',
        careers: [
          { company: 'Acme', startDate: '2022-01-01' },
          { company: 'acme', startDate: '2022-01-01' },
        ],
        skills: [{ name: 'JavaScript' }, { name: 'javascript' }],
      },
      'linkedin'
    );

    aggregator.mergeProfile(unified, { name: 'NoBasicChange' }, 'saramin');

    assert.equal(unified.basic.name, 'Existing');
    assert.equal(unified.basic.email, 'existing@example.com');
    assert.equal(unified.careers.length, 1);
    assert.equal(unified.careers[0].platform, 'linkedin');
    assert.equal(unified.skills.length, 1);
    assert.equal(unified.skills[0].platform, 'linkedin');
  });
});
