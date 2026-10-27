import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { syncRememberFromSsot } from '../remember.js';
import { createPhotoFixture } from './remember-photo-fixture.js';

const ssot = { careers: [{ company: '에이', period: '2025.03 ~ 2026.02', role: 'SRE' }] };

function profileFetch(puts) {
  let photo = null;
  return async (url, init = {}) => {
    if (String(url).endsWith('/v2/open_profiles/me')) {
      return Response.json({
        code: 'ok',
        data: {
          open_profile: {
            id: 7,
            profile_image: photo,
            careers_attributes: [
              { id: 1, company: '비', joined_date: '2026-06-01', present: true, main: true },
            ],
          },
        },
      });
    }
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body).open_profile;
      puts.push(body);
      if (body.profile_image) {
        photo = { id: 101, url: 'https://images.example.com/photo.jpg' };
      }
      return Response.json({ code: 'ok', data: {} });
    }
    throw new Error(`unexpected request ${url}`);
  };
}

describe('syncRememberFromSsot', () => {
  it('moves the main flag before it removes the career the SSoT does not list', async () => {
    const { env } = await createPhotoFixture();
    const puts = [];

    const result = await syncRememberFromSsot(env, ssot, {
      dryRun: false,
      fetchImpl: profileFetch(puts),
    });

    assert.equal(result.success, true);
    assert.deepEqual(
      puts
        .filter((body) => body.careers_attributes)
        .map((body) =>
          body.careers_attributes.map((career) => [
            career.id,
            career.company,
            career.main,
            career._destroy,
          ])
        ),
      [[[undefined, '에이', true, undefined]], [[1, undefined, undefined, true]]]
    );
  });

  it('saves nothing on a dry run', async () => {
    const { env } = await createPhotoFixture();
    const puts = [];

    const result = await syncRememberFromSsot(env, ssot, {
      dryRun: true,
      fetchImpl: profileFetch(puts),
    });

    assert.deepEqual(result.changes, { careers_attributes: 2, profile_image: 1 });
    assert.equal(puts.length, 0);
  });
});
